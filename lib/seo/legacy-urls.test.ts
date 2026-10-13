import { test } from "node:test";
import assert from "node:assert/strict";
import { legacyUrlInventory, parseRedirectRules, resolveRedirects, SSR_PRODUCT_SLUGS } from "./legacy-urls.ts";
import { buildRedirectsFile, routeRedirectRules } from "../static/static-rules.ts";

const rules = parseRedirectRules(buildRedirectsFile());

test("legacy inventory: every SSR-era page, product, /fa variant, /request and ?category= URL in all three locales", () => {
  const rows = legacyUrlInventory();
  const from = new Set(rows.map((r) => r.from));
  for (const p of ["/", "/en", "/ar", "/fa", "/fa/about", "/request", "/en/request", "/fa/request", "/ar/products/rebar-aj400", "/products?category=BOX_SECTION", "https://ahanassa.com/"]) assert.ok(from.has(p), p);
  assert.equal(rows.filter((r) => r.from.includes("/products/") && !r.from.includes("category")).length, SSR_PRODUCT_SLUGS.length * 4, "16 slugs × fa/en/ar + /fa-prefixed fa");
  assert.equal(new Set(rows.map((r) => r.from)).size, rows.length, "no duplicate sources");
});

test("legacy map: every same-path and _redirects row ends on its v11 path through permanent redirects only", () => {
  for (const row of legacyUrlInventory()) {
    if (row.via !== "same_path" && row.via !== "redirects_file") continue;
    const { path, statuses } = resolveRedirects(row.from, rules);
    assert.equal(path, row.to, row.from);
    assert.ok(statuses.every((s) => s === 301 || s === 308), `${row.from}: ${statuses}`);
    if (row.via === "same_path") assert.deepEqual(statuses, [], `${row.from} must not redirect`);
  }
});

test("legacy map: ?category= rows point at the v11 category listing the browser redirect computes", () => {
  const row = legacyUrlInventory().find((r) => r.from === "/en/products?category=SHEET_PLATE")!;
  assert.equal(row.to, "/en/products/category/sheet-plate");
  assert.equal(row.via, "browser_replace");
});

test("resolveRedirects: exact rules, /fa splat, and two-hop chains", () => {
  assert.deepEqual(resolveRedirects("/fa", rules), { path: "/", statuses: [308] });
  assert.deepEqual(resolveRedirects("/fa/products/ipe-beam", rules), { path: "/products/ipe-beam", statuses: [308] });
  assert.deepEqual(resolveRedirects("/fa/request", rules), { path: "/contact", statuses: [308, 308] });
  assert.deepEqual(resolveRedirects("/about", rules), { path: "/about", statuses: [] });
});

test("route_redirects (catalog slug changes) become static rules in the row's locale; 410, unsafe and self rows are skipped", () => {
  const out = routeRedirectRules([
    { locale: "fa", old_path: "/products/old-rebar", target_path: "/products/rebar-aj400", status_code: 308 },
    { locale: "en", old_path: "/products/old-beam", target_path: "/products/ipe-beam", status_code: 308 },
    { locale: "ar", old_path: "/products/gone", target_path: null, status_code: 410 },
    { locale: "fa", old_path: "/products/x y", target_path: "/products/y", status_code: 308 },
    { locale: "fa", old_path: "/products/a?b=1", target_path: "/products/y", status_code: 308 },
    { locale: "fa", old_path: "/products/same", target_path: "/products/same", status_code: 308 },
    { locale: "ar", old_path: "/products/tmp", target_path: "/products/channel-upn", status_code: 302 },
  ]);
  assert.deepEqual(out, ["/ar/products/tmp /ar/products/channel-upn 302", "/en/products/old-beam /en/products/ipe-beam 308", "/products/old-rebar /products/rebar-aj400 308"]);
  const file = buildRedirectsFile([{ locale: "fa", old_path: "/products/old-rebar", target_path: "/products/rebar-aj400", status_code: 308 }]);
  assert.deepEqual(resolveRedirects("/products/old-rebar", parseRedirectRules(file)), { path: "/products/rebar-aj400", statuses: [308] });
  assert.equal(buildRedirectsFile([]), buildRedirectsFile(), "no rows: the file is unchanged");
});
