# Ops alerts — health checks and e-mail (website W6)

Architecture V1.1 §15, r3 (CPU alert, fallback trigger). Staging is live. Production entries are prepared but disabled until W8.

## 1. How an alert reaches the owner

```text
GitHub Actions schedule (every 15 min)
  → .github/workflows/ops-health.yml on main (environment staging)
    → node scripts/ops/health/run.ts --env staging   (on feat/v11-static-site)
      → reads: Cloudflare GraphQL Analytics, D1 REST (SELECT), GitHub REST, Odoo GET /api/v1/catalog/meta
      → ALERT on any check → job fails, with one annotation "ALERT: <check>" per alert
  → GitHub e-mails the failed run
```

- **Independent of what it watches.** No Worker cron, Queue or Worker code is involved. The token is read-only (§5).
- **Who gets the e-mail.**
  - **Scheduled run:** GitHub notifies the user who last changed the workflow's `cron:` line, i.e. `rezachidotnet` (the PR merge).
  - **`workflow_dispatch` run:** GitHub notifies the user who started it.
  - The e-mail goes to that account's **default notifications address**.
- **Confirm the address:**
  1. GitHub → Settings → Emails: `cyansanatiranian@gmail.com` is added and verified.
  2. Settings → Notifications → *Default notifications email*: the same address.
  3. Settings → Notifications → *System* → *Actions*: **Email** ticked and **Only notify for failed workflows** selected.
  4. If the cron line is ever edited by another account, the e-mails go to that account instead. Re-check after any such edit.
- **Subject.** GitHub sets it, not us: `[rezachidotnet/ahanassa-website] Run failed: Ops health (staging) - <branch> (<short sha>)`.
  - The body lists the failed job and its annotations, e.g. `ALERT: cron silent — ahanassa-v11-rfq-staging: 19.3 min (last …) (threshold: last scheduled run ≤ 15 min ago)`.
  - The exact form observed in the W6 alert test is recorded in the W6 report.
- **The same channel covers the other workflows.** A failed `content-publish` run (step failure, decrease-gate block, automatic rollback) carries `ALERT: content <step> failed` / `ALERT: content publish rolled back`. A red `rfq-ci-reconciler` run (RFQ undelivered > 30 min) also e-mails.
- **Repeats.** An unresolved ALERT fails every run, so expect one e-mail per run (about every 15 min) until it clears. A green run does not e-mail.
- **Caveats** (GitHub, not this repo):
  - **Schedules are best-effort.** Runs can be delayed or dropped under load. On 2026-10-03/04 the hourly reconciler ran at 21:23, 00:43 and 07:00 only. The check window therefore starts at the previous run's start (minus 5 min), up to 24 h, so a late run still covers the gap. A run that never happens alerts nobody.
  - **Public repositories:** GitHub disables scheduled workflows after 60 days without repository activity. It e-mails a warning first. Re-enable in Actions → workflow → *Enable workflow*.

## 2. Checks and thresholds

All thresholds live in `scripts/ops/health/config.ts`.

| Check | Source | ALERT when |
|---|---|---|
| cron silent (per v11 Worker with a cron) | GraphQL `workersInvocationsScheduled` (24 h lookback) | last scheduled run > **15 min** ago, or none in 24 h |
| RFQ undelivered | D1 `DB_OPS` (count/min only) | oldest pending/queued/syncing/retry RFQ > **45 min** |
| RFQ in terminal failure | D1 `DB_OPS` | any `manual_review`, or `failed` not closed by an admin (`CLOSED_BY_ADMIN` is reported, not alerted) |
| exceededCpu / 1102 | GraphQL `workersInvocationsAdaptive` status `exceededCpu`/`exceededResources` + scheduled runs | **> 0** in the window |
| cron cpuTime | scheduled runs in the window | never ALERT; **WATCH** when max > 10 ms (r3 watch item 10.49 ms cold) |
| intake 5xx | GraphQL `httpRequestsAdaptiveGroups` by API host | **> 0** in the window |
| intake 400/422 | same, `POST /api/rfqs` | **> 10** in the window |
| content publish stale | GitHub API: newest run whose `publish` job succeeded (dry runs do not count) + `DB_PUBLIC` `active_version` | > **30 h** |
| Odoo unreachable | `GET https://odoo.ahanassa.com/api/v1/catalog/meta` | not 200 within **10 s** |
| CI reconciler last run | GitHub API | INFO only |

- **Window:** previous ops-health run start − 5 min → now, clamped to 15 min … 24 h.
- **A source that cannot be read** (token, API error) is an ALERT. A blind check never passes.
- **Output:** a job summary table (check, value, threshold, OK/ALERT/WATCH/INFO). Counts, ages and timestamps only: no RFQ reference, contact or other personal data. The repository is public, and so are its logs.

## 3. Runbooks

Local commands assume a checkout of `feat/v11-static-site` with `npx wrangler login` done.

### cron silent

**Meaning:** Cloudflare has not run the Worker's cron for over 15 minutes. RFQs then wait for the hourly CI reconciler.

**Seen before:** 2026-10-03 17:55Z → 2026-10-04 07:16Z. Triggers looked correct, but no runs happened until the triggers were re-applied.

1. Check the registered schedule. It should say `*/5 * * * *`:
   ```bash
   curl -s -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
     "https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/workers/scripts/ahanassa-v11-rfq-staging/schedules" | jq .result
   ```
2. Re-apply the triggers from the tracked config. This creates no new Worker version:
   ```bash
   npx wrangler triggers deploy --config workers/rfq/wrangler.jsonc --env staging
   ```
3. Verify two scheduled runs, ~5 and ~10 minutes later. Either use `npx wrangler tail ahanassa-v11-rfq-staging --format json` and look for `"scheduled"` events, or dispatch *Ops health (staging)* once the runs are due. It must be green.
4. If the account is at 5/5 cron triggers, the re-apply can fail. Count the triggers: production 3, old staging 1, v11 1. Do not remove another Worker's trigger without the owner.

### RFQ undelivered (> 45 min)

**Meaning:** an accepted RFQ is in D1 but not in Odoo. No lead is lost, because the Outbox keeps it.

1. Check *cron silent* first. It is the usual cause.
2. List undelivered RFQs (admin endpoint, `ADMIN_TOKEN`):
   ```bash
   curl -s -H "Authorization: Bearer $ADMIN_TOKEN" "https://api-staging.ahanassa.com/__admin/manual-review?status=pending"
   ```
   Repeat with `status=retry`, `queued` and `syncing`.
3. Deliver now: Actions → *RFQ CI reconciler (staging)* → *Run workflow*. Or `POST /__admin/reconcile` with `{"reason": "..."}`, which runs one Worker-side delivery.
4. Odoo/stub down? See *Odoo unreachable*.

### RFQ in terminal failure

**Meaning:** delivery gave up (`manual_review`), or an RFQ is `failed` without an admin closure. A person must decide.

1. Inspect: `GET /__admin/manual-review?status=manual_review` (and `status=failed`).
2. Fix the cause (the error code is in `last_sync_error_code`). Then either `POST /__admin/manual-review/retry` or `POST /__admin/manual-review/close`, each with `{"rfqId": "...", "reason": "..."}`. Both are logged in `rfq_admin_actions`.
3. The alert clears once no such RFQ remains.

### exceededCpu / 1102

**Meaning:** a Worker invocation hit the CPU/resource limit (Free: 10 ms).

- **r3:** the first one in production starts the signed-snapshot fallback (c). Three alerts in one week on staging do the same.
- **First:** find the invocation in Cloudflare → Workers → `ahanassa-v11-rfq-staging` → Metrics/Logs (status, entry point: fetch/cron/queue), and in `npx wrangler tail`.
- **If it is an intake call:** the browser retries with the same Idempotency-Key. Confirm the RFQ exists once (no duplicate).
- **Record it in the r3 watch list.** In production, open the fallback review.

### cron cpuTime WATCH (> 10 ms)

**Meaning:** report only. A cold cron delivery measured 10.49 ms on 2026-10-04.

- No action unless it comes with exceededCpu.
- Track the frequency in the r3 watch list.

### intake 5xx / intake 400/422

- **5xx:** the RFQ Worker failed. Likely causes: D1 unavailable, a missing rate-limit binding (503, fail-closed), or an exception.
  - Use `npx wrangler tail ahanassa-v11-rfq-staging --env staging --format json` and Cloudflare → Workers → Logs.
  - The browser retries 5xx twice with the same key.
- **400/422 above the threshold:** malformed or invalid submissions. Likely causes: a form/contract mismatch after a content publish (`catalogSnapshotVersion`), or a bot.
  - Compare the time with the last content publish.
  - Check the static form loads the current `snap-…`.

### content publish stale (> 30 h)

**Meaning:** no successful staging publish for over 30 h. The daily run is at 22:47 UTC.

1. Actions → *Content publish (staging)*. Open the latest run's summary. Common causes:
   - an Odoo fetch failure;
   - a decrease-gate block (`validate` BLOCKED);
   - a smoke failure with automatic rollback;
   - the schedule did not fire.
2. Decrease gate: confirm the decrease is real in Odoo. Then re-run with `allow_decrease` (it is recorded in the manifest).
3. Otherwise fix the cause and *Run workflow*. The previous version stays live meanwhile (§7.2).

### Odoo unreachable

**Meaning:** `GET /api/v1/catalog/meta` did not return 200 within 10 s from GitHub's runners.

- **Effects:**
  - the public site stays up (static);
  - RFQs stay in the Outbox;
  - the next content publish fails safely.
- **What to do:**
  1. Check `curl -sS -o /dev/null -w '%{http_code} %{time_total}\n' https://odoo.ahanassa.com/api/v1/catalog/meta` from another network.
  2. Check the Odoo server and its reverse proxy.
  3. Note: reachability from outside Iran is a known risk (§16).

### ops health could not run / check could not run

**Meaning:** a source returned an error, e.g. token revoked or expired, missing permission, or an API outage.

- The table names the failing check and the API error code.
- **Token:** `V11_STAGING_CLOUDFLARE_MONITOR_TOKEN` in environment `staging`. It needs Account Analytics Read and D1 Read on the v11 account (§5).

## 4. Alert test (staging only)

Run Actions → *Ops health (staging)* → *Run workflow* with `test_force_alert` = `cron` | `rfq` | `cpu` | `intake` | `content` | `odoo`.

- That one check gets a test threshold (`TEST_FORCE` in `config.ts`) that forces ALERT against real data. Nothing is written anywhere.
- The input exists only on this staging workflow. It is refused for `--env production` and on `schedule`.

## 5. Token and API permissions

| Check | API | Permission |
|---|---|---|
| cron liveness, CPU | GraphQL `workersInvocationsScheduled`, `workersInvocationsAdaptive` | Account › Account Analytics › Read |
| intake codes | GraphQL `httpRequestsAdaptiveGroups` (account scope, filtered by host) | Account › Account Analytics › Read |
| RFQ state, active_version | `POST /accounts/{id}/d1/database/{uuid}/query`, one `SELECT` (enforced in `sources.ts`) | Account › D1 › Read |
| content publish, window, reconciler | GitHub REST | `GITHUB_TOKEN` with `actions: read` |
| Odoo | public GET | none |

## 6. Production (W8)

- `OPS_TARGETS.production` in `config.ts` is prepared with `enabled: false`. Fill in before enabling:
  - the RFQ Worker name;
  - `api.ahanassa.com`;
  - the `DB_OPS`/`DB_PUBLIC` UUIDs.
- Add a `health-production` job in `ops-health.yml`:
  - environment `production`;
  - its own read-only monitor token;
  - **no** `test_force_alert`.
- r3: production exceededCpu/1102 → immediate alert, then the fallback review.
