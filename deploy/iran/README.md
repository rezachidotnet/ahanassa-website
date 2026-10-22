# deploy/iran — the domestic copy of www.ahanassa.com on iransrv (W30 = W29 phase P1)

The same static artifact as www.ahanassa.com, served from Tehran behind ArvanCloud, kept current by a **pull** of a
**signed activation** — first from the GitHub artifact, then from an R2 (and optionally Arvan Object Storage) mirror
of the same bytes. During an international cutoff it keeps serving the last good copy, with nothing on the critical
path abroad.

```
content-publish.yml (main) ──build──► iran-bundle-<env>-<snap>  (scripts/iran/bundle.ts: deterministic zip)
          │ after www finalize ──► activation.json + ssh-keygen -Y sign ──► GitHub artifact iran-activation-<env>
          │                                                             └─► R2 mirror  iran/<env>/{activation.json,.sig,bundles/<sha>.zip}
          ▼
iransrv: ahanassa-sync@<env>.timer (user ahanassa-sync) ── pulls, verifies, hands over ──► incoming/<env>/<seq>.ready
         ahanassa-activate@<env>.path → .service (root) ── verifies everything, unpacks, nginx -t, switch, reload, smoke
         nginx ── new.ahanassa.ir / staging.ahanassa.ir (www.ahanassa.ir only after §10, an owner decision)
```

| Path | What |
|---|---|
| `RUNBOOK_P1.md` | install, verification, drills, rollback, and the LATER Arvan switch (owner decision, not now) |
| `RUNBOOK_P2.md` | **W32**: the domestic RFQ intake — owner prerequisites, install, drills (cutoff, crash, R2 down, captcha down, restore), data rules, the LATER `api.ahanassa.ir` switch |
| `install.sh` | one idempotent step per owner OK (`packages`, `users`, `dirs`, `code`, `signers`, `bootstrap`, `tls-snakeoil`, `nginx`, `units`, `tls-letsencrypt`, `status`; W32: `rfq-packages`, `node`, `rfq-users`, `rfq-dirs`, `rfq-config`, `rfq-nginx`, `rfq-units`, `rfq-enable`, `rfq-status`) |
| `lib/ahanassa_iran.py` | sync agent + root activator + Arvan range check (Python 3 stdlib only) |
| `bin/` | the two entry points (`python3 -I`) |
| `systemd/` | `ahanassa-sync@.{service,timer}`, `ahanassa-activate@.{path,service}`, `ahanassa-arvan-check.{service,timer}`; W32: `ahanassa-rfq@`, `ahanassa-rfq-forward@`, `ahanassa-rfq-{health,maintain,backup,backup-offsite}@.{service,timer}` |
| `nginx/` | `conf.d` (common + per-env maps; W32 `ahanassa-rfq.conf`), `snippets` (static semantics, headers, TLS, ACME, Arvan real IP; W32 `ahanassa-rfq-proxy.conf.in`), `sites` (W32: `api-staging`, `api-new`, `api.ahanassa.ir.conf.later`), `render-templates.sh` |
| `etc/` | `iran.json.example`, `allowed_signers.example`; W32: `rfq-{staging,production}.json.example`, `rfq-admin-allow.conf.example`, `logrotate-ahanassa-rfq` |
| `FIREWALL.md`, `TLS_PLAN.md` | the ufw state P1 relies on (unchanged), drills; the origin certificate plan |
| `tests/` | `test_activator.py` (unittest), `grammar-cases.json` (shared with the TS renderer), `docker-rehearsal.sh`; W32: `docker-rehearsal-p2.sh` + `rehearsal-p2-inside.sh` (cutoff / crash / backup drills against TLS stubs), `p2-prep.ts`, `p2-stubs.ts`, `systemctl-shim.sh` |

CI side: `scripts/iran/{bundle,render-nginx,parity,zip}.ts` (+ tests). Tests: `npm test` runs the Python suite too;
`bash deploy/iran/tests/docker-rehearsal.sh <artifact dir>` runs the whole install + sync + activation on Ubuntu 26.04
with `--network none`.

**W32 (P2): the domestic RFQ intake.** The release now also carries `rfq/rfq-ir.mjs` — the RFQ Worker's own code as
one Node 24 file (`scripts/iran/build-rfq-service.ts`, `lib/rfq-node/`, `services/rfq-ir/main.ts`), verified by the
activator like every other file. It serves `api-staging.ahanassa.ir` and the shadow `api-new.ahanassa.ir`;
`api.ahanassa.ir` is not switched (RUNBOOK_P2.md §9, later). Rehearsal:
`bash deploy/iran/tests/docker-rehearsal-p2.sh <node-v24.x.y-linux-<arch>.tar.xz> <sha256>`.
