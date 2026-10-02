/**
 * CI fallback reconciler (architecture V1.1 §4.3 "reconciler پشتیبان در CI",
 * R2-5): an independent, monitored recovery path with NO Worker CPU limit.
 * Same logic as the Worker: lib/rfq-worker/delivery.ts (pickDueRfq + deliverOne,
 * one RFQ per delivery, all post-delivery writes in one batch, same
 * idempotency key and payload), with DB_OPS accessed through
 * `wrangler d1 execute --remote` (lib/rfq-worker/wrangler-d1.ts).
 *
 *   node scripts/rfq/ci-reconciler.ts --config workers/rfq/wrangler.jsonc --env staging --database DB_OPS [--max 10] [--older-than-minutes 30]
 * Env: ODOO_BASE_URL, ODOO_RFQ_API_TOKEN, ODOO_INTAKE_V11 ("1"), plus wrangler auth (CLOUDFLARE_API_TOKEN/ACCOUNT_ID in CI).
 */
import { deliverOne, pickDueRfq } from "../../lib/rfq-worker/delivery.ts";
import { wranglerD1 } from "../../lib/rfq-worker/wrangler-d1.ts";

const args = new Map<string, string>();
for (let i = 2; i < process.argv.length; i += 2) args.set(process.argv[i].replace(/^--/, ""), process.argv[i + 1]);
const config = args.get("config") ?? "workers/rfq/wrangler.jsonc";
const env = args.get("env");
const database = args.get("database") ?? "DB_OPS";
const max = Number(args.get("max") ?? 10);
// Architecture §4.3: the CI path handles RFQs older than [30 min] — the Worker paths own the recent ones.
const olderThanMs = Number(args.get("older-than-minutes") ?? 30) * 60_000;
const odooBaseUrl = process.env.ODOO_BASE_URL;
if (!odooBaseUrl) throw new Error("ODOO_BASE_URL is required");

const db = wranglerD1({ database, config, env });
const results = [];
for (let i = 0; i < max; i++) {
  // "Due" as of (now - olderThan): only RFQs that the Worker paths have not delivered for that long.
  const id = await pickDueRfq(db, new Date(Date.now() - olderThanMs));
  if (!id) break;
  const result = await deliverOne(db, id, { odooBaseUrl, token: process.env.ODOO_RFQ_API_TOKEN ?? null, intakeV11: process.env.ODOO_INTAKE_V11 === "1" });
  results.push(result);
  console.log(JSON.stringify(result));
  if (result.status === "skipped") break;
}
console.log(JSON.stringify({ operation: "rfq.ci_reconcile", delivered: results.filter((r) => r.status === "done" && r.classification === "DELIVERED").length, attempted: results.length }));
