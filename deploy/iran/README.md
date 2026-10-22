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
| `install.sh` | one idempotent step per owner OK (`packages`, `users`, `dirs`, `code`, `signers`, `bootstrap`, `tls-snakeoil`, `nginx`, `units`, `tls-letsencrypt`, `status`) |
| `lib/ahanassa_iran.py` | sync agent + root activator + Arvan range check (Python 3 stdlib only) |
| `bin/` | the two entry points (`python3 -I`) |
| `systemd/` | `ahanassa-sync@.{service,timer}`, `ahanassa-activate@.{path,service}`, `ahanassa-arvan-check.{service,timer}` |
| `nginx/` | `conf.d` (common + per-env maps), `snippets` (static semantics, headers, TLS, ACME, Arvan real IP), `sites`, `render-templates.sh` |
| `etc/` | `iran.json.example`, `allowed_signers.example` |
| `FIREWALL.md`, `TLS_PLAN.md` | the ufw state P1 relies on (unchanged), drills; the origin certificate plan |
| `tests/` | `test_activator.py` (unittest), `grammar-cases.json` (shared with the TS renderer), `docker-rehearsal.sh` |

CI side: `scripts/iran/{bundle,render-nginx,parity,zip}.ts` (+ tests). Tests: `npm test` runs the Python suite too;
`bash deploy/iran/tests/docker-rehearsal.sh <artifact dir>` runs the whole install + sync + activation on Ubuntu 26.04
with `--network none`.
