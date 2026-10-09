/**
 * W9.4 — a snapshot.v1 WITH prices for local builds and tests: a catalog snapshot plus one
 * pricing-API body, run through the SAME allow-list/validation the content pipeline uses
 * (lib/content-pipeline/pricing.ts). Never part of a publication.
 *
 *   node scripts/static/synthetic-price-snapshot.ts --out <snapshot.json>
 *        [--base fixtures/snapshot/staging-2026-10-01.snapshot.json]
 *        [--pricing fixtures/pricing/synthetic-pricing-current.json]   (the SYNTHETIC fixture)
 *        [--pricing-body <file> --fetched-at <ISO>]                    (a saved real API body, local evidence only)
 *        [--drop-unknown-variants]                                     (local evidence only: skip rows the base snapshot lacks)
 *
 * The output's snapshot_version is content-derived (legacy form), so the static build accepts it.
 */
import fs from "node:fs";
import path from "node:path";
import { validatePricing } from "../../lib/content-pipeline/pricing.ts";
import { buildSnapshot, readSnapshotFile } from "../../lib/static/snapshot-io.ts";

const argv = process.argv.slice(2);
const opt = (name: string) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : undefined;
};
const repo = path.resolve(import.meta.dirname, "../..");
const out = opt("out");
if (!out) throw new Error("--out <snapshot.json> is required");
const base = readSnapshotFile(path.resolve(repo, opt("base") ?? "fixtures/snapshot/staging-2026-10-01.snapshot.json"));

let body: unknown;
let fetchedAt: string;
let label: string;
if (opt("pricing-body")) {
  body = JSON.parse(fs.readFileSync(path.resolve(opt("pricing-body")!), "utf8"));
  fetchedAt = opt("fetched-at") ?? new Date().toISOString();
  label = `Odoo /api/v1/pricing/current body saved ${fetchedAt}`;
} else {
  const fixture = JSON.parse(fs.readFileSync(path.resolve(repo, opt("pricing") ?? "fixtures/pricing/synthetic-pricing-current.json"), "utf8")) as { synthetic: boolean; fetched_at: string; response: unknown };
  if (fixture.synthetic !== true) throw new Error("the --pricing fixture must be marked synthetic: true");
  body = fixture.response;
  fetchedAt = fixture.fetched_at;
  label = "SYNTHETIC test prices (fixtures/pricing/synthetic-pricing-current.json)";
}

// Catalog identity as the pricing check needs it: canonical id, template id, sku of every active variant.
const templateOf = new Map(base.tables.catalog_products.map((p) => [p.id, p.template_xid]));
const catalog = base.tables.product_variants.filter((v) => v.is_active === 1).map((v) => ({ canonical_id: v.xid, canonical_template_id: templateOf.get(v.product_id) ?? "", sku: v.sku }));
if (argv.includes("--drop-unknown-variants")) {
  const known = new Set(catalog.map((c) => c.canonical_id));
  const b = body as { data: { canonical_id: string }[]; meta: { total: number } };
  const dropped = b.data.filter((r) => !known.has(r.canonical_id)).map((r) => r.canonical_id);
  b.data = b.data.filter((r) => known.has(r.canonical_id));
  b.meta.total = b.data.length;
  if (dropped.length) console.error(`[synthetic-price-snapshot] dropped ${dropped.length} row(s) for variants the base snapshot lacks: ${dropped.join(", ")}`);
}

const result = validatePricing({ status: "ok", http_status: 200, etag: null, body }, catalog, fetchedAt);
if (result.errors.length) throw new Error(`pricing validation failed:\n${result.errors.join("\n")}`);
const snapshot = buildSnapshot({ ...base.tables, published_prices: result.rows }, { kind: base.source.kind, description: `${base.source.description} + ${label}`, fetched_at: base.source.fetched_at }, base.created_at);
fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
fs.writeFileSync(path.resolve(out), JSON.stringify(snapshot, null, 1) + "\n");
console.log(JSON.stringify({ snapshot_version: snapshot.snapshot_version, published_prices: result.rows.length, on_request: result.counts.prices_on_request }));
