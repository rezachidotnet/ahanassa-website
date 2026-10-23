# RUNBOOK P2 — the domestic RFQ intake on iransrv

W32 implements W29 phase P2 (`~/claude-reports/ahanassa/W29_DESIGN.md` §3–§4, §8 P2) with the owner rules of
2026-10-22; **W35** (owner decisions 2026-10-23) replaces arCaptcha with the intake's own **ALTCHA** and the .ir R2
bucket with **ArvanCloud Object Storage** in Iran (`~/claude-reports/ahanassa/W35_REPORT.md`). It builds on P1 (`RUNBOOK_P1.md`): same server, same signed activation channel, same host lock.
Server facts: `~/claude-reports/iran-ops/P0_REACHABILITY_20261022.md`.

```
new.ahanassa.ir  (page, production release) ──form──► api-new.ahanassa.ir   ──Arvan──► iransrv nginx ─► 127.0.0.1:8711
staging.ahanassa.ir (page, staging release) ──form──► api-staging.ahanassa.ir ──Arvan──► iransrv nginx ─► 127.0.0.1:8712
                                         (the form asks GET /api/rfqs/capabilities → ALTCHA, challenge from the same host)
  ahanassa-rfq@<env>          intake: the RFQ Worker's own code (rfq-ir.mjs from the signed release), Node 24,
                              SQLite (the D1 migrations), files on disk; 201 only after the commit is on disk;
                              ALTCHA challenges issued + verified here (no captcha service anywhere)
  ahanassa-rfq-forward@<env>  outbox → Odoo over IPv6 ONLY (rfq-ir-<ulid>, oldest first, one in flight, no max age);
                              files → the Arvan bucket ahanassa-rfq-files-ir[-staging] first (IPv4, domestic);
                              notes list after files_store_wait_ms (2 h). Odoo (abroad) reads the files from Arvan.
  timers                      health 5 min (Bale), backup hourly (age) + daily offsite (Arvan ahanassa-backup-ir), maintain daily
www.ahanassa.ir / ahanassa.ir ──form──► api.ahanassa.ir ──Arvan──► api.ahanassa.com (the Worker)   ← UNCHANGED in P2
```

## 0. Rules

- **Who / how:** as P1 §0 — root over SSH by key, under the host lock, **one owner OK per numbered step**, stop at the
  first unexpected output. Code and config come from a reviewed commit (`deploy/iran/`), never from a bundle.
- **Hard rules (owner, 2026-10-22):**
  1. **`api.ahanassa.ir` is NOT switched.** P2 is proven on `staging.ahanassa.ir → api-staging.ahanassa.ir` and on
     `new.ahanassa.ir → api-new.ahanassa.ir` (the shadow API host). The switch is §9, a later owner decision.
  2. Canonical / hreflang / sitemaps stay `https://www.ahanassa.com` (the SEO host lock is untouched by W32).
  3. Node 24 on the server runs **one bundled file** built in CI and shipped inside the signed release — no npm, no
     node_modules, no repository checkout. Node itself comes from the official tarball, sha256-checked twice.
  4. **W35:** no arCaptcha and no external captcha service on .ir: the intake's own ALTCHA (proof of work, HMAC key
     from a systemd credential made on this server, challenges ≤ 10 min and single-use, fail-closed). Turnstile stays
     on .com, unchanged. The form takes the captcha from the API's answer; the widget is part of our own static assets.
  6. **W35:** RFQ files from .ir stay in Iran (Arvan Object Storage, `ir-thr-at1`); Odoo stays abroad and reads them
     (verified reachable over IPv4 from the Odoo host/container). Odoo delivery stays IPv6-only.
  5. Data on this server is a **buffer** (D-IR-1): purged 30 days after Odoo confirms; nothing undelivered is ever
     purged. No personal data in logs or Bale messages.
- **Changes P1 rule 3** ("the server runs no Node"): P2 adds Node 24 for the RFQ intake only, by owner rule.

## 1. Owner prerequisites (before §3)

| # | What | Where it goes |
|---|---|---|
| R1 | **Odoo change deployed** (Odoo PR #38 = W33, plus the W35 follow-up of `W35_REPORT.md` §5: the IR bucket as a generic S3 endpoint + region, i.e. Arvan, instead of an R2 account id + jurisdiction). Then generate the iransrv bearer value. | Odoo config; the value → `/etc/ahanassa/credentials/rfq-production/odoo-token` (step 3.5). Staging: the staging Odoo stub's bearer → `rfq-staging/odoo-token`. |
| R2 | **Arvan Object Storage** (W35, D-IR-4 + D-IR-9), region **`ir-thr-at1`**, endpoint `https://s3.ir-thr-at1.arvanstorage.ir`, all **private** (no public ACL, no public link): `ahanassa-rfq-files-ir` (production RFQ files), `ahanassa-rfq-files-ir-staging` (staging RFQ files), `ahanassa-backup-ir` (backups of both envs, keys `ahanassa-rfq/<env>/…`). Two **machine users** and the bucket policies of §1.1. Suggested lifecycle: files buckets 90 days, backup bucket 30 days. | `ahanassa-iransrv` key → `rfq-<env>/files-s3` **and** `rfq-<env>/backup-s3` (same JSON `{"access_key_id":"…","secret_access_key":"…"}`, one file per unit). Endpoint + buckets are already in `deploy/iran/etc/rfq-<env>.json.example`. `ahanassa-odoo-reader` key → Odoo's IR-bucket settings (R1). |
| R3 | **ALTCHA key** — nothing for the owner to do: `install.sh rfq-dirs` (step 3.4) generates `rfq-<env>/altcha-hmac-key` (32 random bytes, hex, root 0600) on the server. It is never pasted, printed or copied anywhere. No account, no site key, no external service. | `/etc/ahanassa/credentials/rfq-<env>/altcha-hmac-key` (intake only) |
| R4 | **Bale**: a bot (or the W23 one) and a **private staff group**; the group's chat id. | token → `rfq-<env>/bale-token`; chat id → `bale.chat_id` |
| R5 | **Arvan records** `api-staging.ahanassa.ir` and **`api-new.ahanassa.ir`** (the shadow API host): origin = iransrv IPv4, HTTPS 443, Host passthrough, **cache: bypass**, WAF rate rule on `POST /api/rfqs*` (e.g. 30 / min / IP), ACME path not force-redirected. **Not `api.ahanassa.ir`.** | Arvan panel |
| R6 | **Backups** (D-IR-9): the bucket `ahanassa-backup-ir` (§1 R2 above); the owner's **age** public key `age18an8579663dnnpznpqvwcm5w8h9z9cx5tutavuzq582k90h0udhsellxh6` (already in the example configs; the private key stays offline on the owner's machine). | `backup.age_recipient`, `backup.offsite` (examples); key → `rfq-<env>/backup-s3` (§1 R2) |
| R7 | **Privacy copy** (D-IR-1): the privacy page must name the storage in Iran before `api.ahanassa.ir` is switched (§9). Not needed for the shadow hosts. | content change, owner text |
| R8 | **Worker deploy** (§20.6, owner-approved) carrying `GET /api/rfqs/capabilities`. Not a precondition for P2 on the shadow hosts (an old Worker answers 404 = Turnstile); needed before §9 so the form switches back by itself on a rollback. | `wrangler deploy` of workers/rfq |
| R9 | **Activator from the W32/W35 commit** (`install.sh code`, step 3.1) BEFORE a W32 release reaches the staging publish: a P1-era activator refuses a bundle with `rfq/` (safe — it keeps the old copy and alerts — but the copy then stops updating). | iransrv |

### 1.1 Arvan machine users and bucket policies (W35)

Least privilege, one user per side. The forwarder only PUTs and HEADs (HEAD needs `s3:GetObject`); it never deletes in the
files buckets (their lifecycle rule does). The backup job also prunes nothing today, but `Delete` on the backup bucket
is granted so a later retention job needs no policy change (owner decision). Odoo only reads, and only production.

| Machine user | `ahanassa-rfq-files-ir` | `ahanassa-rfq-files-ir-staging` | `ahanassa-backup-ir` | Key goes to |
|---|---|---|---|---|
| `ahanassa-iransrv` | Get, Put, List | Get, Put, List | Get, Put, List, Delete | iransrv `rfq-<env>/files-s3` + `rfq-<env>/backup-s3` |
| `ahanassa-odoo-reader` | Get, List | — | — | Odoo env (R1) |

Policy of `ahanassa-rfq-files-ir` (S3 policy grammar; Arvan Object Storage accepts S3 bucket policies — paste each
user's principal exactly as the Arvan panel shows it, the `<…>` values below are placeholders, not real ids):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    { "Sid": "IranSrvWrite", "Effect": "Allow", "Principal": { "AWS": ["<principal of ahanassa-iransrv>"] },
      "Action": ["s3:GetObject", "s3:PutObject"], "Resource": ["arn:aws:s3:::ahanassa-rfq-files-ir/rfq-files/*"] },
    { "Sid": "IranSrvList", "Effect": "Allow", "Principal": { "AWS": ["<principal of ahanassa-iransrv>"] },
      "Action": ["s3:ListBucket"], "Resource": ["arn:aws:s3:::ahanassa-rfq-files-ir"] },
    { "Sid": "OdooRead", "Effect": "Allow", "Principal": { "AWS": ["<principal of ahanassa-odoo-reader>"] },
      "Action": ["s3:GetObject"], "Resource": ["arn:aws:s3:::ahanassa-rfq-files-ir/rfq-files/*"] },
    { "Sid": "OdooList", "Effect": "Allow", "Principal": { "AWS": ["<principal of ahanassa-odoo-reader>"] },
      "Action": ["s3:ListBucket"], "Resource": ["arn:aws:s3:::ahanassa-rfq-files-ir"] }
  ]
}
```

`ahanassa-rfq-files-ir-staging`: the two `IranSrv*` statements only (bucket name changed). `ahanassa-backup-ir`:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    { "Sid": "IranSrvBackup", "Effect": "Allow", "Principal": { "AWS": ["<principal of ahanassa-iransrv>"] },
      "Action": ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"], "Resource": ["arn:aws:s3:::ahanassa-backup-ir/ahanassa-rfq/*"] },
    { "Sid": "IranSrvList", "Effect": "Allow", "Principal": { "AWS": ["<principal of ahanassa-iransrv>"] },
      "Action": ["s3:ListBucket"], "Resource": ["arn:aws:s3:::ahanassa-backup-ir"] }
  ]
}
```

Checks after setting them (from any machine with the two keys; `aws --endpoint-url https://s3.ir-thr-at1.arvanstorage.ir`):
iransrv key → `put-object` + `head-object` on both files buckets OK, `delete-object` on a files bucket **denied**;
reader key → `get-object` on `ahanassa-rfq-files-ir` OK, `put-object` **denied**, anything on the staging/backup
bucket **denied**. Anonymous `curl https://s3.ir-thr-at1.arvanstorage.ir/ahanassa-rfq-files-ir/` → 403.

## 2. Pre-checks (read-only)

```sh
id ahanassa-rfq; ls -ld /var/lib/ahanassa-rfq /srv/ahanassa/site/*/current
curl -6 -sS -o /dev/null -w '%{http_code}\n' -X POST https://odoo.ahanassa.com/api/v1/rfq         # 401 (P0 T3)
curl -4 -sS -o /dev/null -w '%{http_code}\n' https://s3.ir-thr-at1.arvanstorage.ir/ahanassa-rfq-files-ir/   # 403 (private, anonymous)
curl -4 -sS -o /dev/null -w '%{http_code}\n' https://tapi.bale.ai/                                  # 404 (P0 T4)
df -h /var/lib /var/backups; free -m
```

## 3. Install (one owner OK per step; `install.sh` is idempotent)

| Step | Command | Check |
|---|---|---|
| 3.1 | `install.sh code` (from the W32 commit) | `sha256sum /usr/local/lib/ahanassa/ahanassa_iran.py` = the commit's |
| 3.2 | `install.sh rfq-packages` | `age --version`, `sqlite3 --version` |
| 3.3 | `install.sh node v24.x.y <sha256>` — version and sha256 copied by the owner from `https://nodejs.org/dist/v24.x.y/SHASUMS256.txt` on another machine (`node-v24.x.y-linux-x64.tar.xz` line) | prints `node v24.x.y`; refuses anything but Node 24 and a sha256 mismatch against either source |
| 3.4 | `install.sh rfq-users` then `install.sh rfq-dirs` | user `ahanassa-rfq` (no shell); `/var/lib/ahanassa-rfq/<env>` 0700; empty placeholders `admin-token odoo-token files-s3 bale-token backup-s3` in `/etc/ahanassa/credentials/rfq-<env>/`; **`altcha-hmac-key` generated** (non-empty, root 0600 — `stat`, never `cat`); a rerun keeps it |
| 3.5 | the owner pastes the secrets (R1, R2, R4; the admin token) into `/etc/ahanassa/credentials/rfq-<env>/*` (root 0600) — never in chat | `ls -l` shows non-empty 0600 files; `cat` is never run |
| 3.6 | `install.sh rfq-config`, then fill `/etc/ahanassa/rfq-<env>.json` (only the Bale chat id is left; captcha, Arvan endpoint/buckets and the age recipient are in the example) | `install.sh rfq-config` again prints no `<placeholders>` |
| 3.7 | `install.sh rfq-nginx` (after R5) | `nginx -t` ok; `curl -k --resolve api-staging.ahanassa.ir:443:127.0.0.1 https://api-staging.ahanassa.ir/healthz` → 502 (no service yet) |
| 3.8 | `install.sh tls-letsencrypt api-staging.ahanassa.ir <email>`, then `api-new.ahanassa.ir` | as P1 §4 |
| 3.9 | wait for a staging activation of a W32 release (`ahanassa-activate status staging`: `current/rfq/rfq-ir.mjs` exists) | `ls -l /srv/ahanassa/site/staging/current/rfq/` (root 0644) |
| 3.10 | `install.sh rfq-units staging` | prints `{"ok":true,"outbox_due":0,…}`; `journalctl -u ahanassa-rfq@staging` shows `listening` + `variant_index` |
| 3.11 | `install.sh rfq-enable staging` | `/etc/ahanassa/iran.json` has `"rfq": {"enabled": true, "port": 8712}`; the next staging activation logs `"event": "rfq"` |
| 3.12 | §4 + §5 on staging, then 3.9–3.11 for **production** (`api-new.ahanassa.ir`, port 8711) | |

## 4. Verification

- `https://api-staging.ahanassa.ir/api/rfqs/capabilities` (from outside, Origin `https://staging.ahanassa.ir`) →
  `{"captcha":{"provider":"altcha","challengePath":"/api/rfqs/captcha-challenge"}}`;
  `https://api-staging.ahanassa.ir/api/rfqs/captcha-challenge` → a signed JSON challenge, `Cache-Control: no-store`;
  `https://api.ahanassa.com/api/rfqs/capabilities` → Turnstile (after R8) or 404 (before).
- Open `https://staging.ahanassa.ir/contact` (fa, en, ar): the ALTCHA checkbox «من ربات نیستم» / "I'm not a robot" /
  «أنا لست روبوتاً» shows (RTL in fa/ar; no Turnstile frame); devtools: the widget and its worker come from
  `staging.ahanassa.ir`, the only captcha request goes to `api-staging.ahanassa.ir`. On a low-end phone the tick
  completes in about a second. Submit rows only, file only, rows + 5 files. Each → tracking number; a Bale notice
  «درخواست جدید (سرور داخلی) [staging] AA-RFQ-…»; within ~15 s the staging Odoo stub has it with
  `Idempotency-Key: rfq-ir-…`; the files are in `ahanassa-rfq-files-ir-staging`
  (`aws --endpoint-url https://s3.ir-thr-at1.arvanstorage.ir s3api head-object … --query Metadata.sha256` =
  `rfq_attachments.checksum_sha256`).
- `journalctl -u 'ahanassa-rfq*@staging' | grep -E 'Buyer|@|09[0-9]{9}'` → nothing (no personal data in logs).
- `/var/log/nginx/ahanassa-rfq-staging.access.log`: `x.y.z.0/24 "POST /api/rfqs" 201` (truncated IP, no query).
- `install.sh rfq-status`: both services active; `status.json` `"ok": true`.

## 5. Go/no-go drills (owner OK each; staging first; Docker-rehearsed in `tests/rehearsal-p2-inside.sh`)

| # | Drill | Expected |
|---|---|---|
| D6 | **Cutoff** (everything abroad gone for the RFQ services; Arvan Object Storage and Bale are domestic and stay; the captcha is local): `nft add table inet w32drill; nft 'add chain inet w32drill out { type filter hook output priority 0; }'; nft add rule inet w32drill out meta skuid ahanassa-rfq meta nfproto ipv6 ip6 daddr != ::1 drop` (Odoo is reached over IPv6 only). Submit 10 RFQs (4 with files) on `staging.ahanassa.ir`, wait ≥ 30 min, then `nft delete table inet w32drill`. | all 10 → 201 + Bale notices; **during** the cutoff the files are already in `ahanassa-rfq-files-ir-staging` (sha256 = `checksum_sha256`); the admin view lists the RFQs; after the delete all reach the stub **once** (no 409) within the backoff (≤ 72 min) as v1.2 attachments, `received_at` = submit time |
| D7 | **Crash during delivery:** submit 5 RFQs while `while sleep 3; do systemctl kill -s KILL ahanassa-rfq-forward@staging; done` runs for 60 s; stop the loop. | the stub has exactly 5; any re-send is a `200` replay (stub `/__stats`) |
| D8 | **Arvan Object Storage down, Odoo up:** drop only `s3.ir-thr-at1.arvanstorage.ir`'s IPv4 addresses for uid `ahanassa-rfq` (`… meta skuid ahanassa-rfq ip daddr { <its A records> } drop`); submit one RFQ with a file; set `files_store_wait_ms` to 600000 for the drill (restart the forwarder) and restore after. | after 10 min it reaches Odoo on the `notes` channel naming `api-staging.ahanassa.ir/__admin/ir/`; later retries keep `notes` |
| D9 | **Captcha fail-closed:** `mv` the `altcha-hmac-key` aside, `systemctl restart ahanassa-rfq@staging`; then put it back and restart. Also: submit the same solved payload twice (devtools "copy as curl", new idempotency key). | without the key: capabilities + challenge + submit → 503, the form shows the phone / e-mail / WhatsApp message, nothing stored, `no_altcha_key` in the journal; with it: back to normal. The re-used payload → 403 |
| D10 | **Backup restore:** on a scratch VM (or the owner's machine): download yesterday's `ops.sqlite.age` from Arvan, `age -d -i <owner key>`, `sqlite3 … 'select count(*) from rfqs'`. Start a throwaway intake on it (`rfq-ir.mjs forward` against the staging stub) — the outbox delivers. | counts match `status.json`; no plaintext on the server (`ls /var/backups/ahanassa-rfq/*/.work` empty) |
| D11 | **MCI phone** on `new.ahanassa.ir`: home, /prices, /contact, a submit with a photo. | tracking number; the RFQ in production Odoo (`[website-ir]` note, `rfq-ir-` key) |

## 6. Alerts and monitoring

- `ahanassa-rfq-health@<env>.timer` (5 min) → Bale on a **state change** only: intake down, forwarder down, an RFQ
  waiting > 60 min, MANUAL_REVIEW, Odoo 401/403 (wrong/revoked bearer), the Arvan files-bucket copy failing > 30 min, disk < 25 %.
- Each new RFQ → one Bale notice: reference + item and file counts. No name, phone or e-mail (the sender refuses a
  text that looks like one).
- From outside (follow-up on `main`, not in this PR): ops-health may GET `https://api-new.ahanassa.ir/healthz`
  (`{ok, outbox_due, oldest_due_min}`), in the non-release "domestic-copy" class (§20.2b draft, PR #93).

## 7. Data (D-IR-1)

| Data | Where | Kept |
|---|---|---|
| RFQ rows (contact, items, outbox) | `/var/lib/ahanassa-rfq/<env>/ops.sqlite` (0600, WAL) | personal fields cleared 30 days after Odoo confirmed; the whole RFQ purged then too (`maintain`); undelivered: forever |
| Files | `/var/lib/ahanassa-rfq/<env>/files/rfq-files/<ref>/<slot>.<ext>` (0600) | 30 days after Odoo confirmed them as v1.2 attachments; files that reached Odoo only as a `notes` list: 90 days after acceptance (staff open them in the admin view) |
| Copies in the .ir files bucket | Arvan `ahanassa-rfq-files-ir[-staging]` (Iran, `ir-thr-at1`) | the bucket's lifecycle rule (owner; suggest 90 days) |
| Backups | `/var/backups/ahanassa-rfq/<env>` (age) + Arvan `ahanassa-backup-ir` | 24 hourly + 7 daily locally; Arvan: the bucket's lifecycle rule (suggest 30 days) |
| Used captcha challenges | `ops.sqlite` `ir_captcha_used` (signature + expiry only) | until the challenge expires (≤ 10 min) |
| API access log | `/var/log/nginx/ahanassa-rfq-<env>.access.log` | 14 days; /24 (IPv6 /48) addresses, no query strings |
| Service logs (journal) | journald | the journal's retention; no payload or contact data is ever logged |

The client IP is used only as an in-memory rate-limit key (SHA-256); it is never stored.

## 8. Rollback / removal

- **A bad release:** the activator restarts or HUPs the services after each activation and health-checks them; an
  unhealthy intake makes it put the previous release back (and restart the services on it) and alert. Manual:
  `ahanassa-activate rollback <env>` (P1 local rollback; now also restarts the services).
- **Turn P2 off on a shadow host:** `systemctl disable --now ahanassa-rfq@<env> ahanassa-rfq-forward@<env>` and remove
  the Arvan record `api-new.ahanassa.ir` (owner). Held RFQs: start the forwarder alone until `outbox_due` is 0.
  Nothing on www.ahanassa.com / api.ahanassa.ir depends on P2.

## 9. LATER — owner decision, not now: Arvan origin switch for `api.ahanassa.ir`

Preconditions: §5 drills passed on staging and production; R7 (privacy copy) live; R8 (Worker with capabilities)
deployed. (No captcha account to extend: ALTCHA works for any page origin in `allowed_origins`.)

1. `/etc/ahanassa/rfq-production.json`: `allowed_origins` += `https://www.ahanassa.ir`, `https://ahanassa.ir`;
   `public_origin` stays `https://api-new.ahanassa.ir` until step 3; restart `ahanassa-rfq@production`.
2. Install `nginx/sites/api.ahanassa.ir.conf.later` as `api.ahanassa.ir.conf`; `install.sh tls-snakeoil
   api.ahanassa.ir`; `nginx -t`; reload. (TLS: Let's Encrypt only after the Arvan origin points here — TLS_PLAN.md.)
3. Arvan: origin of `api.ahanassa.ir` → iransrv (cache bypass, WAF rule as R5). The form on www.ahanassa.ir follows by
   itself: capabilities now names ALTCHA.
4. **Rollback:** set the origin back to `api.ahanassa.com`. The form returns to Turnstile within a minute
   (capabilities cache 60 s). RFQs already on iransrv keep forwarding (the forwarder does not depend on Arvan).
   Residual: a visitor who submitted on one side and retried after the switch on the other can create a second RFQ
   (W29 §3.3 — rare, visible to staff as the same phone minutes apart).

## 10. Optional hardening (owner decision; not installed by `install.sh`)

An nftables egress allow-list for uid `ahanassa-rfq` (DNS; Odoo over IPv6; tapi.bale.ai and
s3.ir-thr-at1.arvanstorage.ir over IPv4; loopback — W35: no captcha host at all) would stop a compromised service from talking anywhere else. It is
left out of P2 because ufw/nftables belong to the hardening session (`FIREWALL.md`) and a wrong list stops intake.
