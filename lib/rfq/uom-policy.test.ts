import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CUSTOM_ITEM_LAUNCH_UOMS,
  LAUNCH_DEFERRED_UOMS,
  LAUNCH_GROUP_UOM_POLICY,
  getAllowedUomsForCatalogGroup,
  getDefaultUomForCatalogGroup,
  isUomAllowedForCatalogGroup,
  isUomAllowedForCustomItem,
} from "./uom-policy.ts";
import { RFQ_UOM_CODES, type RfqUomCode } from "./uom.ts";

/**
 * The authoritative Phase L test matrix — docs/RFQ_LAUNCH_UOM_ALIGNMENT.md.
 * Source: Odoo Ahan Asa Marketplace production 19.0.27.0.0, confirmed
 * LAUNCH UOM HARDENING LIVE / DYNAMIC PRICING UNIT BASIS LIVE / SETTLEMENT
 * DUAL-SIDED BILLING LIVE all PASS. Every combination in the task's own
 * required matrix is exercised explicitly, one test per (group, unit) pair,
 * so a future regression names the exact broken combination rather than a
 * generic "policy changed" failure.
 */

const ALL_UOMS: readonly RfqUomCode[] = RFQ_UOM_CODES;

// --- Catalog: Rebar (group_code "REBAR") ---

const rebarExpected: Record<RfqUomCode, boolean> = {
  kg: true,
  ton: true,
  branch: true,
  sheet: false,
  meter: false,
  coil: false,
  bundle: false,
  piece: false,
};

for (const unit of ALL_UOMS) {
  test(`Rebar + ${unit} -> ${rebarExpected[unit] ? "PASS" : "FAIL"}`, () => {
    assert.equal(isUomAllowedForCatalogGroup("REBAR", unit), rebarExpected[unit]);
  });
}

// --- Catalog: Plate (group_code "SHEET_PLATE") ---

const plateExpected: Record<RfqUomCode, boolean> = {
  kg: true,
  ton: true,
  sheet: true,
  branch: false,
  meter: false,
  coil: false,
  bundle: false,
  piece: false,
};

for (const unit of ALL_UOMS) {
  test(`Plate + ${unit} -> ${plateExpected[unit] ? "PASS" : "FAIL"}`, () => {
    assert.equal(isUomAllowedForCatalogGroup("SHEET_PLATE", unit), plateExpected[unit]);
  });
}

// --- Catalog: SHS (group_code "SHS") ---

const shsExpected: Record<RfqUomCode, boolean> = {
  kg: true,
  ton: true,
  meter: true,
  branch: false,
  sheet: false,
  coil: false,
  bundle: false,
  piece: false,
};

for (const unit of ALL_UOMS) {
  test(`SHS + ${unit} -> ${shsExpected[unit] ? "PASS" : "FAIL"}`, () => {
    assert.equal(isUomAllowedForCatalogGroup("SHS", unit), shsExpected[unit]);
  });
}

// --- Custom / free-text ---

const customExpected: Record<RfqUomCode, boolean> = {
  kg: true,
  ton: true,
  branch: false,
  sheet: false,
  meter: false,
  coil: false,
  bundle: false,
  piece: false,
};

for (const unit of ALL_UOMS) {
  test(`Custom + ${unit} -> ${customExpected[unit] ? "PASS" : "FAIL"}`, () => {
    assert.equal(isUomAllowedForCustomItem(unit), customExpected[unit]);
  });
}

// --- Cross-family rejection — the exact scenarios named in the task ---

test("Rebar + branch -> valid (explicit cross-check)", () => {
  assert.equal(isUomAllowedForCatalogGroup("REBAR", "branch"), true);
});
test("Rebar + sheet -> invalid (explicit cross-check)", () => {
  assert.equal(isUomAllowedForCatalogGroup("REBAR", "sheet"), false);
});
test("Plate + sheet -> valid (explicit cross-check)", () => {
  assert.equal(isUomAllowedForCatalogGroup("SHEET_PLATE", "sheet"), true);
});
test("Plate + meter -> invalid (explicit cross-check)", () => {
  assert.equal(isUomAllowedForCatalogGroup("SHEET_PLATE", "meter"), false);
});
test("SHS + meter -> valid (explicit cross-check)", () => {
  assert.equal(isUomAllowedForCatalogGroup("SHS", "meter"), true);
});
test("SHS + branch -> invalid (explicit cross-check)", () => {
  assert.equal(isUomAllowedForCatalogGroup("SHS", "branch"), false);
});

// --- Unknown/unconfirmed groups — conservative default, never a guessed product-specific unit ---

test("an unconfirmed group (e.g. Beams — no Odoo-confirmed Launch policy) falls back to the conservative kg/ton default", () => {
  assert.deepEqual(getAllowedUomsForCatalogGroup("BEAMS"), ["kg", "ton"]);
  assert.equal(isUomAllowedForCatalogGroup("BEAMS", "kg"), true);
  assert.equal(isUomAllowedForCatalogGroup("BEAMS", "meter"), false);
});

test("a null/undefined group falls back to the same conservative default, never throws", () => {
  assert.deepEqual(getAllowedUomsForCatalogGroup(null), ["kg", "ton"]);
  assert.deepEqual(getAllowedUomsForCatalogGroup(undefined), ["kg", "ton"]);
});

// --- Deferred units are never allowed anywhere ---

test("every LAUNCH_DEFERRED_UOMS code is rejected for every confirmed Catalog group and for Custom items", () => {
  for (const deferred of LAUNCH_DEFERRED_UOMS) {
    for (const group of Object.keys(LAUNCH_GROUP_UOM_POLICY)) {
      assert.equal(isUomAllowedForCatalogGroup(group, deferred), false, `${group} + ${deferred}`);
    }
    assert.equal(isUomAllowedForCustomItem(deferred), false, `custom + ${deferred}`);
  }
});

test("LAUNCH_DEFERRED_UOMS is exactly coil/bundle/piece", () => {
  assert.deepEqual([...LAUNCH_DEFERRED_UOMS].sort(), ["bundle", "coil", "piece"]);
});

test("CUSTOM_ITEM_LAUNCH_UOMS is exactly kg/ton", () => {
  assert.deepEqual([...CUSTOM_ITEM_LAUNCH_UOMS].sort(), ["kg", "ton"]);
});

// --- Default selection ---

test("getDefaultUomForCatalogGroup returns kg for every confirmed group and for the unconfirmed-group fallback", () => {
  assert.equal(getDefaultUomForCatalogGroup("REBAR"), "kg");
  assert.equal(getDefaultUomForCatalogGroup("SHEET_PLATE"), "kg");
  assert.equal(getDefaultUomForCatalogGroup("SHS"), "kg");
  assert.equal(getDefaultUomForCatalogGroup("BEAMS"), "kg");
  assert.equal(getDefaultUomForCatalogGroup(null), "kg");
});
