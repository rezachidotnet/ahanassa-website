import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { groupProductFamilies, groupShowcaseCategories, SHEET_NAV_FAMILY } from "../content/category-nav.ts";
import { HOMEPAGE_SHOWCASE_MAX_CARDS } from "./homepage-showcase-layout.ts";
import { categoryListingPath } from "./public-categories.ts";

/**
 * W17.5 (owner decision 2026-10-14) — the Homepage Product Showcase shows the sheet categories as ONE «ورق» card,
 * grouped exactly as the Header groups them, so Pipe and the other categories stay inside the frozen 8-card cap.
 * Category list = the W9.8 fixture's fa categories, in Odoo's order (fixtures/snapshot/w98-flat-2026-10-14.snapshot.json).
 */

const repo = path.resolve(import.meta.dirname, "../..");
const ODOO_ORDER = ["REBAR", "BEAM", "ANGLE", "CHANNEL", "BOX_SECTION", "SHEET_PLATE", "GALVANIZED_SHEET", "PREPAINTED_SHEET", "HOT_ROLLED_COIL", "COLD_ROLLED", "PIPE"];
const items = ODOO_ORDER.map((code) => ({ code, name: `name:${code}` }));

test("the five sheet categories are one card at the first one's place; Pipe and every other category keep their card", () => {
  const cards = groupShowcaseCategories(items, "fa");
  assert.deepEqual(cards.map((c) => c.code), ["REBAR", "BEAM", "ANGLE", "CHANNEL", "BOX_SECTION", "SHEET_PLATE", "PIPE"]);
  assert.equal(cards[5].name, "ورق");
  assert.equal(groupShowcaseCategories(items, "en")[5].name, "Sheet & coil");
  assert.equal(groupShowcaseCategories(items, "ar")[5].name, "الصاج واللفائف");
  assert.ok(cards.length <= HOMEPAGE_SHOWCASE_MAX_CARDS);
  // Without the grouping the cap would have dropped HOT_ROLLED_COIL, COLD_ROLLED and PIPE.
  assert.ok(!items.slice(0, HOMEPAGE_SHOWCASE_MAX_CARDS).some((c) => c.code === "PIPE"));
});

test("the card uses the Header's grouping: same label, same members, and it opens the first member's listing", () => {
  const family = groupProductFamilies(items, "fa").find((e) => "children" in e && e.children);
  assert.ok(family && "children" in family && family.children);
  assert.equal(family.name, SHEET_NAV_FAMILY.label.fa);
  const card = groupShowcaseCategories(items, "fa").find((c) => c.name === family.name)!;
  assert.equal(card.code, family.children[0].code);
  assert.equal(categoryListingPath(card.code), "/products/category/sheet-plate");
});

test("the cap is applied to cards and never raised; with a lone sheet category (production today) nothing changes", () => {
  assert.equal(HOMEPAGE_SHOWCASE_MAX_CARDS, 8);
  const many = [...items, ...["WIRE_ROD", "ROUND_BAR", "FLAT_BAR"].map((code) => ({ code, name: code }))];
  assert.deepEqual(groupShowcaseCategories(many, "fa").slice(0, HOMEPAGE_SHOWCASE_MAX_CARDS).map((c) => c.code), ["REBAR", "BEAM", "ANGLE", "CHANNEL", "BOX_SECTION", "SHEET_PLATE", "PIPE", "WIRE_ROD"]);
  const today = ["REBAR", "SHEET_PLATE", "PIPE"].map((code) => ({ code, name: code === "SHEET_PLATE" ? "ورق" : code }));
  assert.deepEqual(groupShowcaseCategories(today, "fa"), today);
});

test("ProductShowcase groups before it caps, and still renders each card through the shared builders", () => {
  const source = fs.readFileSync(path.join(repo, "components/home/product-showcase.tsx"), "utf8");
  assert.match(source, /const cards = groupShowcaseCategories\(items, locale\)\.slice\(0, HOMEPAGE_SHOWCASE_MAX_CARDS\);/);
  assert.ok(!source.includes("items.slice("), "the cap never applies to the ungrouped category list");
});
