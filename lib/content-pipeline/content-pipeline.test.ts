import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import type { CatalogApiProduct } from "../catalog/odoo-api-client.ts";
import type { SnapshotV1 } from "../contracts/snapshot-v1.ts";
import { assembleSnapshotTables } from "./assemble.ts";
import { compareArtifacts } from "./compare.ts";
import type { D1Source } from "./d1-source.ts";
import { createGuardedFetch, fetchOdooSource, type OdooSource } from "./odoo-source.ts";
import { batchStatements, failStagedSql, mirrorStatements, pruneSql, restorePointerSql, stagedStateSql, switchPointerSql, variantIndexBatches, versionsToPrune } from "./publication-sql.ts";
import { decreaseFindings, sourceCounts, validateSource } from "./validate.ts";
import { isPipelineVersion, nextSnapshotVersion, versionTimestamp } from "./version.ts";
import { buildVersionedSnapshot, parseSnapshot, readSnapshotFile } from "../static/snapshot-io.ts";

const repo = path.resolve(import.meta.dirname, "../..");

// --- fixtures -----------------------------------------------------------------
function product(over: Partial<CatalogApiProduct> & { canonical_id: string; canonical_template_id: string; sku: string }): CatalogApiProduct {
  return {
    id: null,
    template_id: null,
    name: `[${over.sku}] name`,
    template_name: `tmpl ${over.canonical_template_id}`,
    commercial_size: "10",
    section_size: null,
    schedule: "",
    classification: { family: { code: "LONG_PRODUCTS", name: "مقاطع طویل" }, group: { code: "REBAR", name: "میلگرد" }, form: { code: "REBAR_RIBBED", name: "آجدار" } },
    grade: { code: "A3", name: "A3" },
    standard: { code: null, name: null },
    dimensions: { diameter_mm: 10 },
    nominal_weight: { kg_m: 0.617 },
    allowed_commercial_units: "kg, ton",
    inventory_uom: "kg",
    active: true,
    updated_at: "2026-09-27 16:41:38",
    ...over,
  };
}

function odooSource(products: CatalogApiProduct[]): OdooSource {
  const cat = (name: string) => ({ code: "REBAR", name, sequence: 10, group_codes: ["REBAR"], template_count: new Set(products.map((p) => p.canonical_template_id)).size, variant_count: products.length });
  const pg = (name: string) => [{ id: "SHEET_PROCESSING", name, sequence: 10, active: true, updated_at: "2026-09-19 20:31:53" }];
  return {
    schema: "odoo-source.v1",
    base_url: "https://odoo.example",
    fetched_at: "2026-10-03T20:00:00.000Z",
    finished_at: "2026-10-03T20:00:06.000Z",
    requests: [],
    meta: { families: [{ code: "LONG_PRODUCTS", name: "x" }], groups: [{ code: "REBAR", name: "x" }], forms: [{ code: "REBAR_RIBBED", name: "x" }], grades: [{ code: "A3", name: "A3" }], standards: [] },
    categories: { fa: [cat("میلگرد")], en: [cat("Rebar")], ar: [cat("حديد التسليح")] },
    categories_last_modified: { fa: "2026-09-27T16:49:29.000Z", en: "2026-09-27T16:49:29.000Z", ar: "2026-09-27T16:49:29.000Z" },
    products,
    products_reported_total: products.length,
    processing_groups: { fa: pg("فرآوری ورق"), en: pg("Sheet processing"), ar: pg("معالجة الصفائح") },
  };
}

function emptyTables(): SnapshotV1["tables"] {
  return { catalog_public_categories: [], catalog_products: [], product_variants: [], product_seo_contents: [], public_processing_groups: [], route_redirects: [], homepage_product_rank: [], catalog_group_labels: [] };
}

function d1Source(tables: SnapshotV1["tables"], active: string | null = null, counts: Record<string, number> = {}): D1Source {
  return { schema: "d1-source.v1", read_at: "2026-10-03T20:00:00.000Z", tables, publication: { active_version: active, versions: active ? [{ version: active, status: "active", created_at: "2026-10-01T00:00:00.000Z", updated_at: "2026-10-01T00:00:00.000Z", manifest_sha256: null, source_counts: counts }] : [] } };
}

const existingProduct = { id: "01EXISTINGPRODUCT0000000001", template_xid: "CTMPL-000001", commercial_template_name: "Rebar A3 (en, set once)", name_fa: "میلگرد", slug_fa: "rebar-a3", is_active: 1 as const, is_public: 1 as const, sync_status: "synced", last_synced_at: "2026-08-30T00:00:00.000Z", created_at: "2026-08-30T00:00:00.000Z", updated_at: "2026-09-01T00:00:00.000Z" };
const existingVariant = (xid: string, over: Record<string, unknown> = {}) => ({
  id: `01EXISTINGVARIANT${xid.slice(-6)}0000`, product_id: existingProduct.id, xid, sku: `SKU-${xid}`, commercial_name: "old name", name_fa: "editorial fa", slug_fa: `slug-${xid.toLowerCase()}`, commercial_size: "8", section_size: null, schedule: null,
  family_code: "LONG_PRODUCTS", family_name: "مقاطع طویل", group_code: "REBAR", group_name: "میلگرد", form_code: "REBAR_RIBBED", form_name: "آجدار", grade_code: "A3", grade_name: "A3", standard_code: null, standard_name: null,
  dimensions_json: '{"diameter_mm":8}', nominal_weight_json: '{"kg_m":0.395}', allowed_commercial_units: "kg, ton", inventory_uom: "kg", catalog_updated_at: "2026-09-01T00:00:00.000Z",
  is_active: 1 as const, is_public: 1 as const, is_price_public: 0 as const, sync_status: "synced", sync_version: 3, last_synced_at: "2026-09-01T00:00:00.000Z", created_at: "2026-08-30T00:00:00.000Z", updated_at: "2026-09-02T00:00:00.000Z", ...over,
});

// --- version --------------------------------------------------------------------
test("snapshot version: snap-<16 digits>, monotonic past every pipeline version, legacy hash versions ignored", () => {
  const t = new Date("2026-10-03T22:47:05.123Z");
  assert.equal(nextSnapshotVersion(t, []), "snap-2026100322470500");
  assert.equal(nextSnapshotVersion(t, ["snap-e55d81c754270c1f"]), "snap-2026100322470500");
  assert.equal(nextSnapshotVersion(t, ["snap-2026100322470500"]), "snap-2026100322470501");
  assert.equal(nextSnapshotVersion(new Date("2026-10-01T00:00:00Z"), ["snap-2026100322470500"]), "snap-2026100322470501", "a clock behind the latest version still moves forward");
  assert.ok(isPipelineVersion("snap-2026100322470500") && !isPipelineVersion("snap-e55d81c754270c1f"));
  assert.match(nextSnapshotVersion(t, []), /^snap-[0-9a-f]{16}$/, "fits the unchanged SNAPSHOT_VERSION_PATTERN / publication_state CHECK");
  assert.equal(versionTimestamp("snap-2026100322470500"), "2026-10-03T22:47:05.000Z");
});

// --- guarded Odoo fetch --------------------------------------------------------------
test("Odoo fetch guard: GET only, the Odoo host only, catalog + processing-groups paths only, ≥ 600 ms between requests", async () => {
  const state = { requests: [], lastModified: new Map<string, string>() };
  const waits: number[] = [];
  let clock = 0;
  const guarded = createGuardedFetch("https://odoo.ahanassa.com", state, { fetchImpl: (async () => new Response("{}")) as typeof fetch, sleep: async (ms) => { waits.push(ms); clock += ms; }, now: () => clock });
  await assert.rejects(guarded("https://odoo.ahanassa.com/api/v1/catalog/meta", { method: "POST" }), /GET only/);
  await assert.rejects(guarded("https://odoo.ahanassa.com/api/v1/rfq"), /not an allowed/);
  await assert.rejects(guarded("https://evil.example/api/v1/catalog/meta"), /host/);
  await guarded("https://odoo.ahanassa.com/api/v1/catalog/meta");
  await guarded("https://odoo.ahanassa.com/api/v1/processing/groups?locale=fa");
  assert.equal(state.requests.length, 2);
  assert.ok(waits.length === 1 && waits[0] >= 600, `second request waited ${waits}`);
});

test("full fetch: every page, all locales; a total that changes mid-pagination fails the fetch", async () => {
  const all = Array.from({ length: 150 }, (_, i) => product({ canonical_id: `CVAR-${String(i).padStart(6, "0")}`, canonical_template_id: "CTMPL-000001", sku: `S${i}` }));
  let shrink = false;
  const fake = (async (url: string) => {
    const u = new URL(url);
    const json = (b: unknown) => new Response(JSON.stringify(b), { headers: { "content-type": "application/json", "last-modified": "Sun, 27 Sep 2026 16:49:29 GMT" } });
    if (u.pathname === "/api/v1/catalog/meta") return json({ data: { families: [], groups: [], forms: [], grades: [], standards: [] }, meta: {} });
    if (u.pathname === "/api/v1/catalog/categories") return json({ data: [{ code: "REBAR", name: "x", sequence: 1, group_codes: ["REBAR"], template_count: 1, variant_count: 150 }], meta: { count: 1 } });
    if (u.pathname === "/api/v1/catalog/products") {
      const page = Number(u.searchParams.get("page"));
      const total = shrink && page === 2 ? 149 : 150;
      return json({ data: all.slice((page - 1) * 100, page * 100), meta: { page, page_size: 100, total, pages: 2 } });
    }
    if (u.pathname === "/api/v1/processing/groups") return json({ data: [{ id: "SHEET_PROCESSING", name: "x", sequence: 1, active: true, updated_at: "2026-09-19 20:31:53" }], meta: { total: 1 } });
    return new Response("nope", { status: 404 });
  }) as typeof fetch;
  const source = await fetchOdooSource({ baseUrl: "https://odoo.ahanassa.com", fetchImpl: fake, minIntervalMs: 0 });
  assert.equal(source.products.length, 150);
  assert.equal(source.requests.length, 1 + 3 + 2 + 3);
  assert.ok(source.requests.every((r) => r.method === "GET"));
  assert.equal(source.categories_last_modified.en, "2026-09-27T16:49:29.000Z");
  shrink = true;
  await assert.rejects(fetchOdooSource({ baseUrl: "https://odoo.ahanassa.com", fetchImpl: fake, minIntervalMs: 0 }), /changed during pagination/);
});

// --- assemble ---------------------------------------------------------------------------
test("assemble: Odoo columns from the fetch, editorial columns carried, new rows not public, removed rows deactivated, deterministic", () => {
  const tables = emptyTables();
  tables.catalog_products = [existingProduct];
  tables.product_variants = [existingVariant("CVAR-000001"), existingVariant("CVAR-000002")];
  const odoo = odooSource([
    product({ canonical_id: "CVAR-000001", canonical_template_id: "CTMPL-000001", sku: "SKU-CVAR-000001", commercial_size: "10" }),
    product({ canonical_id: "CVAR-000009", canonical_template_id: "CTMPL-000009", sku: "NEW-9", template_name: "New template" }),
  ]);
  const out = assembleSnapshotTables(odoo, d1Source(tables), "2026-10-03T20:00:00.000Z");
  const v1 = out.product_variants.find((v) => v.xid === "CVAR-000001")!;
  assert.equal(v1.id, existingVariant("CVAR-000001").id, "row id carried");
  assert.equal(v1.name_fa, "editorial fa");
  assert.equal(v1.is_public, 1);
  assert.equal(v1.commercial_size, "10", "Odoo column updated");
  assert.equal(v1.schedule, null, "empty Odoo string stored as null (not rendered, §8.2)");
  assert.equal(v1.sync_version, 4);
  const removed = out.product_variants.find((v) => v.xid === "CVAR-000002")!;
  assert.equal(removed.is_active, 0, "a variant Odoo no longer returns is soft-deactivated");
  const added = out.product_variants.find((v) => v.xid === "CVAR-000009")!;
  assert.equal(added.id, "pv-CVAR-000009");
  assert.equal(added.is_public, 0);
  const tmpl = out.catalog_products.find((p) => p.template_xid === "CTMPL-000001")!;
  assert.equal(tmpl.commercial_template_name, "Rebar A3 (en, set once)", "template name set once, as the former sync did");
  const newTmpl = out.catalog_products.find((p) => p.template_xid === "CTMPL-000009")!;
  assert.deepEqual([newTmpl.id, newTmpl.is_public, newTmpl.slug_fa], ["cp-CTMPL-000009", 0, "ctmpl-000009"]);
  assert.equal(out.catalog_public_categories.length, 3);
  assert.equal(out.catalog_public_categories[0].synced_at, "2026-09-27T16:49:29.000Z", "category timestamp from Odoo Last-Modified, not the clock");
  assert.equal(JSON.stringify(assembleSnapshotTables(odoo, d1Source(tables), "2099-01-01T00:00:00.000Z").catalog_products.filter((p) => p.is_active)), JSON.stringify(out.catalog_products.filter((p) => p.is_active)), "deterministic");
  assert.equal(JSON.stringify(assembleSnapshotTables(odoo, d1Source(tables), "2026-10-03T20:00:00.000Z")), JSON.stringify(out));
});

test("assemble: an unchanged variant keeps its bookkeeping (a second run is a no-op)", () => {
  const tables = emptyTables();
  tables.catalog_products = [existingProduct];
  const odoo = odooSource([product({ canonical_id: "CVAR-000001", canonical_template_id: "CTMPL-000001", sku: "SKU-CVAR-000001" })]);
  tables.product_variants = [existingVariant("CVAR-000001")];
  const first = assembleSnapshotTables(odoo, d1Source(tables), "2026-10-03T20:00:00.000Z");
  const second = assembleSnapshotTables(odoo, d1Source(first), "2026-10-04T20:00:00.000Z");
  assert.deepEqual(second, first);
});

// --- validate + decrease gate -----------------------------------------------------------
test("validate: category counts must match the fetched products; Persian names on en/ar categories block", () => {
  const odoo = odooSource([product({ canonical_id: "CVAR-000001", canonical_template_id: "CTMPL-000001", sku: "A" })]);
  const ok = validateSource(odoo, assembleSnapshotTables(odoo, d1Source(emptyTables()), odoo.fetched_at));
  assert.deepEqual(ok.errors, []);
  const bad = structuredClone(odoo);
  bad.categories.fa[0].variant_count = 5;
  bad.categories.en[0].variant_count = 5;
  bad.categories.ar[0].variant_count = 5;
  bad.categories.en[0].name = "میلگرد";
  const result = validateSource(bad, assembleSnapshotTables(bad, d1Source(emptyTables()), bad.fetched_at));
  assert.ok(result.errors.some((e) => /Odoo says 5 variants/.test(e)));
  assert.ok(result.errors.some((e) => /categories en: REBAR: name .* is not English/.test(e)));
  assert.equal(sourceCounts(assembleSnapshotTables(odoo, d1Source(emptyTables()), odoo.fetched_at)).variants_active, 1);
});

test("decrease gate: > 20 % blocks, exactly 20 % passes, legacy count names are compared", () => {
  assert.deepEqual(decreaseFindings({ variants_active: 80 }, { product_variants: 100 }), [], "exactly 20 % is allowed");
  const f = decreaseFindings({ variants_active: 79, rfq_catalog_en: 100, sitemap_urls: 4 }, { product_variants: 100, rfq_catalog_en: 100, sitemap_urls: 6 });
  assert.deepEqual(f.map((x) => [x.key, x.previousKey]), [["variants_active", "product_variants"], ["sitemap_urls", "sitemap_urls"]]);
  assert.deepEqual(decreaseFindings({ variants_active: 1 }, null), [], "no active publication: nothing to compare");
  assert.deepEqual(decreaseFindings({ variants_active: 300 }, { variants_active: 100 }), [], "increases never block");
});

// --- snapshot io -------------------------------------------------------------------------
test("snapshot: pipeline snapshots carry content_sha256 (tamper rejected); the legacy fixture still validates", () => {
  const legacy = readSnapshotFile(path.join(repo, "fixtures/snapshot/staging-2026-10-01.snapshot.json"));
  assert.equal(legacy.snapshot_version, "snap-e55d81c754270c1f");
  const s = buildVersionedSnapshot(legacy.tables, legacy.source, "snap-2026100322470500", "2026-10-03T22:47:05.000Z");
  assert.equal(s.content_sha256?.slice(0, 16), "e55d81c754270c1f", "same content, same hash as the legacy version");
  const tampered = structuredClone(s);
  tampered.tables.catalog_products[0].name_fa = "x";
  assert.throws(() => parseSnapshot(tampered), /content_sha256/);
});

// --- publication SQL on the real schema --------------------------------------------------
function publicSchemaDb(): DatabaseSync {
  const db = new DatabaseSync(":memory:");
  const dir = path.join(repo, "migrations_public");
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".sql")).sort()) db.exec(fs.readFileSync(path.join(dir, f), "utf8"));
  return db;
}
const one = (db: DatabaseSync, sql: string) => db.prepare(sql).get() as Record<string, unknown>;

test("publication SQL: staged load, guarded atomic switch, restore, fail-staged, retention (real migrations_public schema)", () => {
  const db = publicSchemaDb();
  const t = "2026-10-03T20:00:00.000Z";
  db.exec(stagedStateSql({ version: "snap-e55d81c754270c1f", manifestSha256: "a".repeat(64), createdAt: "2026-10-01T00:00:00.000Z", counts: {}, now: t }));
  db.exec(switchPointerSql("snap-e55d81c754270c1f", null, t));
  assert.equal(one(db, "SELECT active_version FROM publication_pointer").active_version, "snap-e55d81c754270c1f");

  const v = "snap-2026100320000000";
  db.exec(stagedStateSql({ version: v, manifestSha256: "b".repeat(64), createdAt: "2026-10-03T20:00:00.000Z", counts: { variants_active: 2 }, now: t }));
  db.exec(stagedStateSql({ version: v, manifestSha256: "c".repeat(64), createdAt: "x", counts: {}, now: t }));
  assert.equal(one(db, `SELECT manifest_sha256 FROM publication_state WHERE version = '${v}'`).manifest_sha256, "b".repeat(64), "an existing version row is never overwritten");
  const rows = ["fa", "en", "ar"].map((locale) => ({ snapshot_version: v, locale: locale as "fa", canonical_variant_id: "CVAR-000001", template_id: "CTMPL-000001", group_code: "REBAR", allowed_units: ["kg"], selection_json: "{}" }));
  for (const b of variantIndexBatches(rows)) db.exec(b);
  assert.equal(one(db, `SELECT COUNT(*) AS n FROM rfq_variant_index WHERE snapshot_version = '${v}'`).n, 3);
  assert.equal(one(db, "SELECT active_version FROM publication_pointer").active_version, "snap-e55d81c754270c1f", "loading never moves the pointer");

  db.exec(switchPointerSql(v, "snap-SOMETHING-ELSE", t));
  assert.equal(one(db, "SELECT active_version FROM publication_pointer").active_version, "snap-e55d81c754270c1f", "guard: pointer moved by someone else -> no switch");
  assert.equal(one(db, `SELECT status FROM publication_state WHERE version = 'snap-e55d81c754270c1f'`).status, "active");

  db.exec(switchPointerSql(v, "snap-e55d81c754270c1f", t));
  assert.equal(one(db, "SELECT active_version FROM publication_pointer").active_version, v);
  assert.deepEqual(db.prepare("SELECT version, status FROM publication_state ORDER BY version").all().map((r) => `${r.version}:${r.status}`), [`${v}:active`, "snap-e55d81c754270c1f:superseded"]);

  db.exec(restorePointerSql("snap-e55d81c754270c1f", v, t));
  assert.equal(one(db, "SELECT active_version FROM publication_pointer").active_version, "snap-e55d81c754270c1f");
  assert.deepEqual(db.prepare("SELECT version, status FROM publication_state ORDER BY version").all().map((r) => `${r.version}:${r.status}`), [`${v}:failed`, "snap-e55d81c754270c1f:active"]);

  const w = "snap-2026100321000000";
  db.exec(stagedStateSql({ version: w, manifestSha256: "d".repeat(64), createdAt: "2026-10-03T21:00:00.000Z", counts: {}, now: t }));
  for (const b of variantIndexBatches(rows.map((r) => ({ ...r, snapshot_version: w })))) db.exec(b);
  db.exec(failStagedSql(w, t));
  assert.equal(one(db, `SELECT status FROM publication_state WHERE version = '${w}'`).status, "failed");
  assert.equal(one(db, `SELECT COUNT(*) AS n FROM rfq_variant_index WHERE snapshot_version = '${w}'`).n, 0);
  assert.equal(one(db, "SELECT active_version FROM publication_pointer").active_version, "snap-e55d81c754270c1f", "a pre-switch failure leaves the pointer");

  const versions = db.prepare("SELECT version, created_at, status FROM publication_state").all() as { version: string; created_at: string; status: string }[];
  assert.deepEqual(versionsToPrune([...versions, { version: "snap-2026100322000000", created_at: "2026-10-03T22:00:00.000Z", status: "superseded" }], "snap-e55d81c754270c1f", 3), [], "3 newest kept, active kept");
  assert.deepEqual(versionsToPrune(versions, w, 1), ["snap-2026100320000000", "snap-e55d81c754270c1f"]);
  db.exec(pruneSql(["snap-2026100320000000", "snap-e55d81c754270c1f"], "snap-e55d81c754270c1f")!);
  assert.equal(one(db, "SELECT COUNT(*) AS n FROM publication_state WHERE version = 'snap-e55d81c754270c1f'").n, 1, "the active version is never pruned");
});

test("publication SQL: the catalog mirror updates Odoo-owned columns only; editorial columns survive", () => {
  const db = publicSchemaDb();
  const tables = emptyTables();
  tables.catalog_products = [existingProduct];
  tables.product_variants = [existingVariant("CVAR-000001")];
  for (const s of mirrorStatements(tables)) db.exec(s);
  db.exec(`UPDATE product_variants SET is_public = 0, name_fa = 'edited after the fetch'`);
  const changed = structuredClone(tables);
  changed.product_variants[0] = { ...changed.product_variants[0], commercial_size: "99", is_public: 1, name_fa: "stale" };
  for (const s of mirrorStatements(changed)) db.exec(s);
  const row = one(db, "SELECT commercial_size, is_public, name_fa FROM product_variants");
  assert.deepEqual({ ...row }, { commercial_size: "99", is_public: 0, name_fa: "edited after the fetch" });
});

test("batchStatements: size-bounded, never splits a statement", () => {
  const b = batchStatements(["a".repeat(40), "b".repeat(40), "c".repeat(40)], 100);
  assert.equal(b.length, 2);
  assert.throws(() => batchStatements(["x".repeat(200)], 100), /exceeds/);
});

// --- determinism comparison ----------------------------------------------------------------
test("compareArtifacts: version-stamp-only differences pass, anything else fails", () => {
  const mk = (version: string, files: Record<string, string>) => ({
    manifest: { snapshot_version: version, public_assets: Object.entries(files).map(([p, c]) => ({ path: p, bytes: c.length, sha256: Buffer.from(c).toString("hex").padEnd(64, "0").slice(0, 64) })) } as never,
    createdAt: `${version}-time`,
    contentSha256: "x",
    read: (p: string) => Buffer.from(files[p]),
  });
  const a = mk("snap-1", { "a.html": "same", "m.json": '{"v":"snap-1","t":"snap-1-time"}' });
  const b = mk("snap-2", { "a.html": "same", "m.json": '{"v":"snap-2","t":"snap-2-time"}' });
  const ok = compareArtifacts(a, b);
  assert.deepEqual([ok.identical_files, ok.stamp_only_files, ok.identical_except_stamp], [1, ["m.json"], true]);
  const c = mk("snap-2", { "a.html": "different", "m.json": '{"v":"snap-2","t":"snap-2-time"}' });
  assert.equal(compareArtifacts(a, c).identical_except_stamp, false);
});
