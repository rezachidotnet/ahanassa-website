# RUNBOOK P1 — the domestic copy on iransrv (static site + signed sync)

W30 implements W29 phase P1 (`~/claude-reports/ahanassa/W29_DESIGN.md` §1–§2, §8 P1) with the owner decisions of
2026-10-22. Server facts: `~/claude-reports/iran-ops/INVENTORY_20261022.md`, `P0_REACHABILITY_20261022.md`,
`CHANGES_20261022.md`.

## 0. Rules for this runbook

- **Who:** an agent (Claude ops session) or the owner, as **root over SSH by key** (`ssh iransrv`), under the **host
  lock** (`/var/lib/host-change/LOCK.d` + `LOCK`, same format as newsrv/sipsrv), with **the owner's OK for each
  numbered step**. Every step lists its check and its rollback; stop at the first unexpected output.
- **Hard rules (owner, 2026-10-22):**
  1. **Nothing in this runbook switches the Arvan origin of `www.ahanassa.ir`, `ahanassa.ir` or `api.ahanassa.ir`.**
     P1 is built and proven on `staging.ahanassa.ir` and the shadow host `new.ahanassa.ir`. The switch is §10, a
     later owner decision.
  2. Canonical, hreflang, og:url, JSON-LD and sitemaps stay `https://www.ahanassa.com` on **both** hosts (enforced
     by the artifact gate, `lib/static/seo-host-lock.ts`). The domestic copy serves the same bytes.
  3. The server runs **no Node**: CI ships ready files; the server has nginx, a stdlib Python activator and systemd.
  4. www.ahanassa.com never waits for Iran: every CI step for the copy is `continue-on-error` (W30 main PR #93).
- **Code on the server** always comes from a reviewed commit of this repository (`deploy/iran/`), copied by
  `install.sh code` — never from a bundle (a bundle is data).

## 1. Owner prerequisites (before §3)

| # | What | Where it goes |
|---|---|---|
| O1 | **GitHub fine-grained PAT**, repository `rezachidotnet/ahanassa-website` only, permission **Actions: Read-only**, 90-day expiry (calendar reminder at 75 days). | pasted by the owner into `/etc/ahanassa/credentials/github-token` (step 3.4) — never into chat |
| O2 | **Two ed25519 signing keys**, generated on the owner's Mac (no passphrase: CI must use them unattended): `ssh-keygen -t ed25519 -N "" -C "ahanassa-ir-release staging" -f ~/ahanassa-ir-staging` and the same with `production`. | private halves → GitHub **environment secrets** `IRAN_ACTIVATION_SIGNING_KEY`: the staging key in environment `staging`; the production key in **both** `production-v11` and `production-v11-content`. Public halves → `allowed_signers` (step 3.5). Then delete the private files from the Mac. |
| O3 | **R2 bucket for the mirror**, e.g. `ahanassa-iran-mirror` (separate from the RFQ files bucket; no public access, no custom domain). Two API tokens: **write** (Object Read & Write, this bucket) for CI, **read** (Object Read, this bucket) for iransrv. | write: repository secrets `IRAN_MIRROR_R2_ACCESS_KEY_ID` / `IRAN_MIRROR_R2_SECRET_ACCESS_KEY`, variables `IRAN_MIRROR_R2_ENDPOINT` (`https://<account>.r2.cloudflarestorage.com`) and `IRAN_MIRROR_R2_BUCKET`. read: `/etc/ahanassa/credentials/r2-read` (two lines: key id, secret). Optional: an R2 lifecycle rule deleting `iran/*/bundles/` after 30 days. |
| O4 | *(Optional)* Arvan Object Storage bucket in `ir-thr-at1` as a third source (domestic: reachable during a cutoff, so a publish made just before a cutoff can still arrive if CI could upload it). | CI: `IRAN_MIRROR_ARVAN_*` (same shape as O3); server: `/etc/ahanassa/credentials/arvan-read`, `"enabled": true` in `iran.json` |
| O5 | **Arvan DNS/CDN records** `new.ahanassa.ir` and `staging.ahanassa.ir`: origin = iransrv's IPv4 (`~/claude-reports/iran-ops/INVENTORY_20261022.md`), protocol **HTTPS**, port 443, **Host header = the requested host**; cache: "use origin Cache-Control", do not cache 404 (or ≤ 10 s); HTTP→HTTPS redirect off for `/.well-known/acme-challenge/` (TLS_PLAN.md). **Do not touch `www.`, the apex or `api.`** | Arvan panel |
| O6 | **Turnstile widget** `ahanassa-v11-production`: add hostname `new.ahanassa.ir`; then the owner-approved **RFQ Worker deploy** (§20.6) that carries this PR's `ALLOWED_ORIGINS` / `TURNSTILE_EXPECTED_HOSTNAMES` (+ `new.ahanassa.ir`). Needed only for the MCI-phone form test (go/no-go 5). | Cloudflare dashboard + Worker deploy |
| O7 | *(Optional now, P2 anyway)* Bale bot token + private staff group chat id for activation alerts. | `/etc/ahanassa/credentials/bale-token`; `"bale": {"chat_id": "…", "credential": "bale-token"}` in `iran.json` |

Merge order: PR #90 → PR #92 (this code; HIGH, normal merge → staging → Approve path) → PR #93 (the workflows on `main`).
After the installation (§3–§5), the owner sets the repository variable `IRAN_COPY_CHECK=on` (ops-health `iran-copy`).
Until the main PR (#93) is merged, no activation exists and the server keeps serving its bootstrap page.

## 2. Pre-checks (read-only)

```bash
ssh iransrv 'set -e; cat /var/lib/host-change/LOCK.d/LOCK 2>/dev/null && echo "LOCK HELD — stop" || echo "no lock";
  lsb_release -ds; python3 --version; df -h / | tail -1; free -m | sed -n 2p;
  ufw status numbered | head -25; ss -tlnp | grep -E ":(80|443) " || echo "nothing on 80/443"'
```

Expect: no lock; Ubuntu 26.04; Python 3.14; ≥ 20 GB free; ufw active with 22 from the two admin IPs and 80,443 from
the 14 Arvan ranges; nothing listening on 80/443 yet.

Take the lock (owner OK) exactly as the hardening rounds did (`CHANGES_20261022.md` step 0): `mkdir
/var/lib/host-change/LOCK.d` (atomic; fails if held) plus the sibling one-line `LOCK` file in the newsrv/sipsrv format,
task `w30-p1-install`, expiry ≤ 4 h. Release it at the end the same way (step f: `LOCK` → `LAST_LOCK.<ts>` with
`released=`, `rmdir LOCK.d`). Keep a ControlMaster session open for rollbacks (hardening plan step 1b).

Copy the reviewed commit to the server (no git credentials on the server):

```bash
git -C <checkout> archive --format=tar <merged-commit> deploy/iran | ssh iransrv 'rm -rf /root/w30 && mkdir -p /root/w30 && tar -x -C /root/w30 && ls /root/w30/deploy/iran'
```

## 3. Install (one owner OK per step)

All commands: `ssh iransrv 'bash /root/w30/deploy/iran/install.sh <step>'`.

| Step | Command | Check | Rollback |
|---|---|---|---|
| 3.1 | `packages` | `nginx -v` → 1.28.x; `systemctl is-active nginx` → active; `curl -sI http://127.0.0.1` → Ubuntu default page (firewall keeps it from the world) | `apt-get purge nginx* libnginx-mod-http-brotli-static brotli certbot ssl-cert` |
| 3.2 | `users` | `id ahanassa-sync` (system, nologin) | `userdel ahanassa-sync` |
| 3.3 | `dirs` | `ls -la /srv/ahanassa/incoming /etc/ahanassa/credentials` | `rm -rf /srv/ahanassa /etc/ahanassa` |
| 3.4 | `code`, then edit `/etc/ahanassa/iran.json` (R2 endpoint/bucket, or `"enabled": false`), then the owner fills the credentials: `ssh -t iransrv 'umask 077; cat > /etc/ahanassa/credentials/github-token'` (paste, Ctrl-D) and the same for `r2-read` | `python3 -I -c 'import json;json.load(open("/etc/ahanassa/iran.json"))'`; `stat -c '%a %U %s' /etc/ahanassa/credentials/*` → `600 root`, non-zero sizes | `rm -rf /usr/local/lib/ahanassa /usr/local/bin/ahanassa-sync /usr/local/sbin/ahanassa-activate` |
| 3.5 | copy the two public lines to `/root/w30/allowed_signers`, then `signers /root/w30/allowed_signers` | prints both fingerprints | `rm /etc/ahanassa/allowed_signers` |
| 3.6 | `bootstrap` | `ahanassa-activate status production` → `"current": "bootstrap"` | `rm -rf /srv/ahanassa/site/*/releases/bootstrap /srv/ahanassa/site/*/current` |
| 3.7 | `tls-snakeoil` | `ls -l /etc/ahanassa/tls/*/` | `rm -rf /etc/ahanassa/tls` |
| 3.8 | `nginx` (renders + installs `conf.d/ahanassa-*`, `snippets/ahanassa-*`, sites `00-ahanassa-default`, `new.ahanassa.ir`, `staging.ahanassa.ir`; removes `sites-enabled/default`; `nginx -t`; reload) | `curl -sk --resolve new.ahanassa.ir:443:127.0.0.1 https://new.ahanassa.ir/` → the bootstrap page «در حال آماده‌سازی»; `curl -sk --resolve x.example:443:127.0.0.1 https://x.example/` → handshake refused | `rm /etc/nginx/sites-enabled/{00-ahanassa-default,new.ahanassa.ir,staging.ahanassa.ir}.conf /etc/nginx/conf.d/ahanassa-* /etc/nginx/snippets/ahanassa-*; ln -s ../sites-available/default /etc/nginx/sites-enabled/default; nginx -t && systemctl reload nginx` |
| 3.9 | `units` (sync timers, activation path units, weekly Arvan range check) | `install.sh status`; `journalctl -u 'ahanassa-sync@staging' -n 20` → `source_failed`/`no_source` until the main PR publishes a first activation, then `handed_off` | `systemctl disable --now 'ahanassa-sync@*.timer' 'ahanassa-activate@*.path' ahanassa-arvan-check.timer` |

Every step was rehearsed on Ubuntu 26.04 by `deploy/iran/tests/docker-rehearsal.sh` (same `install.sh`).

## 4. Origin certificates (owner OK; after O5)

`ssh iransrv 'bash /root/w30/deploy/iran/install.sh tls-letsencrypt staging.ahanassa.ir <owner email>'`, then the
same for `new.ahanassa.ir`. Check: `curl -sv https://new.ahanassa.ir/ 2>&1 | grep -E "subject|issuer"` from outside
shows Arvan's edge certificate (visitor side) and `openssl s_client -connect 127.0.0.1:443 -servername new.ahanassa.ir`
on the server shows Let's Encrypt. Details and the cutoff case: `TLS_PLAN.md`.

## 5. First activations (staging first)

1. Merge any change on the application branch (or dispatch `content-publish.yml`, target `staging`). The staging
   `publish` job ends with "Iran: sign + publish the staging activation" (#93).
2. On the server: `journalctl -fu 'ahanassa-sync@staging' -u 'ahanassa-activate@staging'` → `handed_off`, `unpacked`,
   `activated`. `ahanassa-activate status staging` → the staging snapshot.
3. Production follows the next production publish (an Approved release or the daily 11:30 content run):
   `ahanassa-activate status production` → www's snapshot (`curl -s https://www.ahanassa.com/manifest.public.json`).

Release dirs: `/srv/ahanassa/site/<env>/releases/<snapshot>-<code12>-<seq>/` (root, read-only to nginx; unchanged files
hard-linked between releases; 5 kept + current + previous). `state.json` (root 0600) and `status.json` (0644).

## 6. What the activator checks (and refuses on)

In order, any failure → refused, `current` unchanged (or put back), alert, `.ready` consumed (no retry loop):
operator hold file `/etc/ahanassa/hold-<env>` → signature (`ssh-keygen -Y verify`, principal `ci-<env>`, namespace
`ahanassa-ir-release`) → strict activation schema + `env` → `seq` newer than the last applied → bundle size + sha256 =
the signed values → zip safety (no `..`, absolute, symlink, device, duplicate, encrypted entries; size caps) →
`manifest.json` sha256 = signed `manifest_sha256` (= the artifact www serves) → **exactly** the files the manifest +
`bundle.json` list, each sha256/bytes checked while written → nginx include grammar → `nginx -t` on the candidate →
switch → `nginx -t` → reload → smoke (`/`, `/contact`, `/en`, `/ar` 200; `/` = this release's bytes;
`/manifest.public.json` = the signed snapshot; a hashed chunk immutable; an unknown chunk 404 **without** immutable;
`/fa/x` → 308 `/x`), retried for 15 s while the reload settles.

Operator commands: `ahanassa-activate status <env>`, `ahanassa-activate rollback <env>` (back to `previous`, local,
no signature needed — it was verified when activated), `touch /etc/ahanassa/hold-<env>` (refuse new activations),
`ahanassa-activate clear-refused <env>` (let the agent offer a refused seq again after fixing the cause).

## 7. Verification (go/no-go evidence)

1. **Parity** (go/no-go 1), from a machine outside Iran *and* from an Iranian network, with the content artifact of
   the run whose snapshot both hosts serve (Actions → the content-publish run → artifact `content-<snapshot>`):
   ```bash
   node scripts/iran/parity.ts --a https://www.ahanassa.com --b https://new.ahanassa.ir \
     --artifact content/artifact-production/public-assets --out parity-production.json
   node scripts/iran/parity.ts --a https://ahanassa-v11-static-staging.nova-b1e6f0.workers.dev --b https://staging.ahanassa.ir \
     --artifact content/artifact/public-assets --out parity-staging.json
   ```
   Gate: exit 0 (zero unexplained differences). A difference that is a Cloudflare behaviour nginx does not have yet is
   fixed in `deploy/iran/nginx/snippets/ahanassa-static.conf.in` (new PR), never waved through. A difference that is
   accepted by the owner goes into an `--explain` file with its reason.
2. **Freshness** (go/no-go 2): 3 consecutive publishes reach `.ir` within 10 min of www's finalize — staging before
   production, at least one daily 11:30 run and one code release. Evidence: the publish job's `SWITCHED_AT` vs
   `activated_at` in `status.json`; the ops-health `iran-copy` job (main PR) shows the drift.
3. **Critical path** (cutoff readiness): the build log line `[iran] critical path: no unexplained foreign host`
   (`bundle.json` → `critical_path_externals`). Today's only finding is the accepted, non-blocking Turnstile preload on
   `/contact` (`scripts/iran/bundle.ts` ACCEPTED_EXTERNAL_LOADS). Browser check with every other host unreachable:
   `google-chrome --user-data-dir=$(mktemp -d) --host-resolver-rules="MAP * ~NOTFOUND, EXCLUDE new.ahanassa.ir" https://new.ahanassa.ir/`
   → pages render with fonts, images and scripts; analytics and chat fail silently.
4. **MCI phone** (go/no-go 5, owner): `new.ahanassa.ir` home, `/prices`, `/contact`, a form submit (still through
   `api.ahanassa.ir` → the Worker; needs O6).

## 8. Forced-failure drills (go/no-go 3–4; owner OK each; `FIREWALL.md` §4 for the rules)

Every drill first arms the dead-man's switch: `systemd-run --on-active=15min --unit=w30-drill-undo nft delete table inet w30drill`.

| Drill | How | Expected |
|---|---|---|
| D1 GitHub filtered | `nft add table inet w30drill; nft add chain inet w30drill out '{ type filter hook output priority 0; }'; nft add rule inet w30drill out meta skuid ahanassa-sync meta nfproto ipv4 drop`; then a staging publish | agent log: `source_failed github`, `source_ok r2`, `bundle_ok r2` (over IPv6); staging activates |
| D2 all sources cut | rule `meta skuid ahanassa-sync oifname != "lo" drop`; a staging publish | `no_source`; staging keeps the old copy; ops-health `IR_COPY_DRIFT` after 45 min (staging pair) ; after `nft delete table inet w30drill` it catches up by itself on the next tick |
| D3 full cutoff | `nft add rule inet w30drill out ct state established,related accept; … oifname lo accept; … drop` (whole server) | `new.ahanassa.ir` still serves through Arvan (MCI phone, curl from Iran); `ss -tn` shows no new outbound; nginx logs show the requests; nothing on the critical path fails (§7.3) |
| D4 tampered bundle | `systemctl stop ahanassa-activate@staging.path`; wait for `handed_off`; `printf X \| dd of=/srv/ahanassa/incoming/staging/<seq>/bundle.zip bs=1 seek=100 conv=notrunc`; `systemctl start ahanassa-activate@staging.service`; `systemctl start ahanassa-activate@staging.path` | `refused … sha256 differs from the signed activation`, alert, staging unchanged; `ahanassa-activate clear-refused staging` → next tick re-downloads and activates |
| D5 rollback | Actions → **v11 iran activation** (main PR) → env `staging`, operation `previous` (or, only if the owner chooses, `v11-release-watch.yml` operation=rollback for production) | agent `bundle_local`, activator `reuse_release`, no download; `.ir` serves the previous snapshot |

## 9. Removing P1 (nothing outside the server depends on it)

`systemctl disable --now 'ahanassa-sync@*.timer' 'ahanassa-activate@*.path' ahanassa-arvan-check.timer`; remove the
three site links + `conf.d/ahanassa-*` + `snippets/ahanassa-*`; restore `sites-enabled/default`; `nginx -t && systemctl reload nginx`.
www.ahanassa.com, api.ahanassa.ir and the Arvan records of www/apex/api are unaffected at every point of P1.

## 10. LATER — **owner decision, not now**: Arvan origin switch for `www.ahanassa.ir` (and `ahanassa.ir`)

> **Do not run any of this in P1.** It needs the owner's explicit decision after the go/no-go below is met.

Go/no-go (W29 §8 P1): parity exit 0 on `new.ahanassa.ir` (outside + inside Iran); 3 publishes ≤ 10 min including a
daily run and a code release; drills D1–D5 passed; MCI phone test passed; TLS decision for www made (TLS_PLAN.md).

1. Certificate for `www.ahanassa.ir` + `ahanassa.ir` per TLS_PLAN.md option (a) or (b).
2. `install -m 0644 /root/w30/deploy/iran/nginx/sites/www.ahanassa.ir.conf.later /etc/nginx/sites-available/www.ahanassa.ir.conf && ln -s ../sites-available/www.ahanassa.ir.conf /etc/nginx/sites-enabled/ && nginx -t && systemctl reload nginx`;
   check with `curl -sk --resolve www.ahanassa.ir:443:127.0.0.1 https://www.ahanassa.ir/manifest.public.json`.
3. **Owner, Arvan panel:** origin of `www.ahanassa.ir` (and `ahanassa.ir`) → iransrv's IPv4, HTTPS 443, Host
   passthrough (was `www.ahanassa.com`). Purge the Arvan cache for both.
4. Verify within 5 min: `curl -sI https://www.ahanassa.ir/` from outside and an MCI phone; the response no longer has
   Cloudflare headers (`cf-ray`); `manifest.public.json` = www.ahanassa.com's. Set the GitHub variable
   `IRAN_COPY_PAIRS` to `https://www.ahanassa.com=https://new.ahanassa.ir https://www.ahanassa.com=https://www.ahanassa.ir https://ahanassa-v11-static-staging.nova-b1e6f0.workers.dev=https://staging.ahanassa.ir`
   so the drift check covers it.
5. **Rollback (minutes):** Arvan origin of `www.ahanassa.ir` / `ahanassa.ir` back to `www.ahanassa.com`, purge.
   Nothing else depends on the switch; the server keeps syncing.

`api.ahanassa.ir` stays on the RFQ Worker until P2 (domestic RFQ intake) — a separate design, PR and owner decision.
