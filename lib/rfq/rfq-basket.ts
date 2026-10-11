import { localizedPath, locales, type Locale } from "../../config/locales.ts";
import { RFQ_UOM_CODES, DEFAULT_RFQ_UOM, type RfqUomCode } from "./uom.ts";
import { createCatalogRowFromSelection, createEmptyCatalogRow, isRfqRowEmpty, MAX_ITEMS, nextRfqRowId, type RfqRow, type RfqRowFields } from "./item-row-validation.ts";
import type { RfqRowPrefill } from "./rfq-prefill.ts";
import type { PublicRfqCatalogItem } from "./catalog-selector.ts";

/**
 * W10.5 — the RFQ basket (owner, 2026-10-11). Client-side only.
 *
 * Every «استعلام قیمت» / «استعلام قیمت نهایی» / calculator link still opens
 * /contact?variant=…[&qty=&unit=&length=&factory=] (lib/pricing/price-rfq.ts,
 * lib/rfq/rfq-prefill.ts — unchanged). What changes is the form: it now
 * ADDS that item to the rows the visitor already has (`addCatalogItemToRows`)
 * instead of starting over, and keeps rows + the customer fields in the
 * tab's sessionStorage so leaving to browse more products loses nothing.
 *
 * - Nothing is sent anywhere before submit; the RFQ Worker, its API and the
 *   submitted wire shape are unchanged (rows still go through
 *   item-row-validation.ts#buildRfqItemInput).
 * - Every storage access is wrapped: private mode, a full quota or a blocked
 *   storage just means "no basket" — the form works exactly as before.
 * - The stored value is untrusted on read (`parseRfqBasket`): wrong types,
 *   unknown units, over-long strings and extra rows are dropped, and catalog
 *   rows are re-resolved against the locale's published list
 *   (`restoreRfqBasketRows`) — a stored variant is never trusted on its own.
 * - One basket per locale: the RFQ catalog, its categories and units are
 *   per-locale files (/data/rfq-catalog.<locale>.json).
 */

export const RFQ_BASKET_VERSION = 1;
/** Fired on window after the basket is written or cleared (the header badge listens). */
export const RFQ_BASKET_EVENT = "ahanassa:rfq-basket";
export const rfqBasketStorageKey = (locale: Locale) => `ahanassa.rfq-basket.v${RFQ_BASKET_VERSION}.${locale}`;
/** The page the visitor came to the form from — kept so a reload of /contact still knows it. */
export const RFQ_BACK_STORAGE_KEY = "ahanassa.rfq-back.v1";

export interface RfqBasketCustomer {
  name: string;
  company: string;
  email: string;
  phoneCountry: string;
  phoneLocal: string;
  message: string;
}

export interface RfqBasket {
  rows: RfqRowFields[];
  customer: RfqBasketCustomer;
}

export const EMPTY_RFQ_CUSTOMER: RfqBasketCustomer = { name: "", company: "", email: "", phoneCountry: "", phoneLocal: "", message: "" };

const SHORT = 200;
const LONG = 2000;

function str(value: unknown, max: number): string {
  return typeof value === "string" ? value.slice(0, max) : "";
}

function strOrNull(value: unknown, max: number): string | null {
  return typeof value === "string" && value ? value.slice(0, max) : null;
}

function unitOf(value: unknown): RfqUomCode {
  return typeof value === "string" && (RFQ_UOM_CODES as readonly string[]).includes(value) ? (value as RfqUomCode) : DEFAULT_RFQ_UOM;
}

function parseRowFields(value: unknown): RfqRowFields | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  if (v.mode === "catalog") {
    return {
      mode: "catalog",
      categoryCode: strOrNull(v.categoryCode, SHORT),
      templateXid: strOrNull(v.templateXid, SHORT),
      variantXid: strOrNull(v.variantXid, SHORT),
      quantityValue: str(v.quantityValue, 32),
      unit: unitOf(v.unit),
      notes: str(v.notes, LONG),
      lengthMm: str(v.lengthMm, 16),
    };
  }
  if (v.mode === "custom") {
    return { mode: "custom", productTitle: str(v.productTitle, SHORT), sizeSpec: str(v.sizeSpec, SHORT), quantityValue: str(v.quantityValue, 32), unit: unitOf(v.unit), notes: str(v.notes, LONG) };
  }
  return null;
}

/** Reads a stored basket. Anything malformed becomes `null` or is dropped field by field; never throws. */
export function parseRfqBasket(raw: string | null): RfqBasket | null {
  if (!raw) return null;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;
  if (d.v !== RFQ_BASKET_VERSION) return null;
  const rows = (Array.isArray(d.rows) ? d.rows : [])
    .map(parseRowFields)
    .filter((f): f is RfqRowFields => f !== null && !isRfqRowEmpty(f))
    .slice(0, MAX_ITEMS);
  const c = (d.customer && typeof d.customer === "object" ? d.customer : {}) as Record<string, unknown>;
  const customer: RfqBasketCustomer = {
    name: str(c.name, SHORT),
    company: str(c.company, SHORT),
    email: str(c.email, SHORT),
    phoneCountry: str(c.phoneCountry, 8),
    phoneLocal: str(c.phoneLocal, 32),
    message: str(c.message, LONG),
  };
  return { rows, customer };
}

function isCustomerEmpty(customer: RfqBasketCustomer): boolean {
  // The phone country is a pre-selected default, not something the visitor typed.
  return !customer.name.trim() && !customer.company.trim() && !customer.email.trim() && !customer.phoneLocal.trim() && !customer.message.trim();
}

/** The stored string, or `null` when there is nothing worth keeping (the key is then removed). */
export function serializeRfqBasket(basket: RfqBasket): string | null {
  const rows = basket.rows.filter((f) => !isRfqRowEmpty(f)).slice(0, MAX_ITEMS);
  if (rows.length === 0 && isCustomerEmpty(basket.customer)) return null;
  return JSON.stringify({ v: RFQ_BASKET_VERSION, rows, customer: basket.customer });
}

/** The number of filled rows — what the header badge shows. */
export function countRfqBasketItems(basket: RfqBasket | null): number {
  return basket ? basket.rows.filter((f) => !isRfqRowEmpty(f)).length : 0;
}

/**
 * Turns stored row fields back into form rows. A catalog row's identity is
 * re-resolved against the locale's published list: its template/category are
 * taken from the list, and a variant no longer in the list is cleared (the
 * row keeps its quantity and notes, so the visitor can pick again). With no
 * list (the catalog file failed to load) the rows are kept as stored — the
 * RFQ Worker re-validates every variant regardless.
 */
export function restoreRfqBasketRows(stored: RfqRowFields[], catalogItems: PublicRfqCatalogItem[]): RfqRow[] {
  const rows = stored.map((fields): RfqRow => {
    if (fields.mode !== "catalog" || catalogItems.length === 0) return { id: nextRfqRowId(), fields };
    const item = fields.variantXid ? catalogItems.find((i) => i.variantXid === fields.variantXid) : undefined;
    if (item) return { id: nextRfqRowId(), fields: { ...fields, templateXid: item.templateXid, categoryCode: item.publicCategoryCode } };
    const template = fields.templateXid ? catalogItems.find((i) => i.templateXid === fields.templateXid) : undefined;
    return { id: nextRfqRowId(), fields: { ...fields, variantXid: null, templateXid: template?.templateXid ?? null, categoryCode: template?.publicCategoryCode ?? null } };
  });
  return rows.length > 0 ? rows.slice(0, MAX_ITEMS) : [createEmptyCatalogRow()];
}

export type RfqBasketAddOutcome = "added" | "existing" | "full";

/**
 * Adds a catalog item (a `?variant=` hand-off) to the rows.
 *
 * - The same variant already in a row → no new row; that row is returned so
 *   the form can focus it. Only its EMPTY quantity/length/notes are filled
 *   from `prefill`; what the visitor already typed is never overwritten.
 * - Otherwise a new row is appended; untouched empty rows (the form's blank
 *   starting row) are dropped first so they don't block the submit.
 * - At MAX_ITEMS filled rows nothing is added (`"full"`).
 */
export function addCatalogItemToRows(
  rows: RfqRow[],
  selection: { categoryCode: string | null; templateXid: string; variantXid: string },
  prefill: RfqRowPrefill = {},
): { rows: RfqRow[]; rowId: string | null; outcome: RfqBasketAddOutcome } {
  const existing = rows.find((r) => r.fields.mode === "catalog" && r.fields.variantXid === selection.variantXid);
  if (existing && existing.fields.mode === "catalog") {
    const f = existing.fields;
    const fillQuantity = !f.quantityValue.trim() && prefill.quantityValue !== undefined && prefill.unit !== undefined;
    const fields = {
      ...f,
      quantityValue: fillQuantity ? prefill.quantityValue! : f.quantityValue,
      unit: fillQuantity ? prefill.unit! : f.unit,
      lengthMm: !f.lengthMm.trim() && prefill.lengthMm ? prefill.lengthMm : f.lengthMm,
      notes: !f.notes.trim() && prefill.notes ? prefill.notes : f.notes,
    };
    return { rows: rows.map((r) => (r.id === existing.id ? { ...r, fields } : r)), rowId: existing.id, outcome: "existing" };
  }
  const filled = rows.filter((r) => !isRfqRowEmpty(r.fields));
  if (filled.length >= MAX_ITEMS) return { rows, rowId: null, outcome: "full" };
  const row = createCatalogRowFromSelection(selection, prefill);
  return { rows: [...filled, row], rowId: row.id, outcome: "added" };
}

// ---- Storage (sessionStorage only; every access may throw) ----

function sessionStore(): Storage | null {
  try {
    return typeof window !== "undefined" ? window.sessionStorage : null;
  } catch {
    return null;
  }
}

function notify() {
  try {
    window.dispatchEvent(new Event(RFQ_BASKET_EVENT));
  } catch {
    // No window (tests) — nothing listens.
  }
}

export function readRfqBasket(locale: Locale, store: Storage | null = sessionStore()): RfqBasket | null {
  try {
    return parseRfqBasket(store?.getItem(rfqBasketStorageKey(locale)) ?? null);
  } catch {
    return null;
  }
}

export function writeRfqBasket(locale: Locale, basket: RfqBasket, store: Storage | null = sessionStore()): void {
  if (!store) return;
  try {
    const value = serializeRfqBasket(basket);
    const key = rfqBasketStorageKey(locale);
    if (value === null) store.removeItem(key);
    else store.setItem(key, value);
  } catch {
    // Quota or blocked storage: the form keeps working, the basket just isn't kept.
  }
  notify();
}

/** After a successful submit: the basket, the typed fields and the back target are gone. */
export function clearRfqBasket(locale: Locale, store: Storage | null = sessionStore()): void {
  try {
    store?.removeItem(rfqBasketStorageKey(locale));
    store?.removeItem(RFQ_BACK_STORAGE_KEY);
  } catch {
    // Nothing to clear.
  }
  notify();
}

// ---- «ادامه انتخاب محصول»: back to where the visitor came from ----

const FORM_PATHS = new Set(locales.flatMap((l) => [localizedPath(l, "/contact"), localizedPath(l, "/request")]));

/** A same-origin page path (with query/hash) that is not the form itself, or `null`. */
export function safeBackPath(candidate: string | null | undefined, origin: string): string | null {
  if (!candidate) return null;
  let url: URL;
  try {
    url = new URL(candidate, origin);
  } catch {
    return null;
  }
  if (url.origin !== origin || (url.protocol !== "https:" && url.protocol !== "http:")) return null;
  const path = url.pathname.replace(/\/+$/, "") || "/";
  if (FORM_PATHS.has(path) || FORM_PATHS.has(path.replace(/\.html$/, ""))) return null;
  return `${url.pathname}${url.search}${url.hash}`;
}

/**
 * The «ادامه انتخاب محصول» target: the referrer when it is a same-origin page
 * other than the form, else the one remembered from an earlier visit in this
 * tab, else the locale's /products. Remembers a valid referrer.
 */
export function resolveContinueBrowsingHref(locale: Locale, referrer: string, origin: string, store: Storage | null = sessionStore()): string {
  const fromReferrer = safeBackPath(referrer, origin);
  if (fromReferrer) {
    try {
      store?.setItem(RFQ_BACK_STORAGE_KEY, fromReferrer);
    } catch {
      // Not remembered; the referrer still works for this page view.
    }
    return fromReferrer;
  }
  let remembered: string | null = null;
  try {
    remembered = store?.getItem(RFQ_BACK_STORAGE_KEY) ?? null;
  } catch {
    remembered = null;
  }
  return safeBackPath(remembered, origin) ?? localizedPath(locale, "/products");
}
