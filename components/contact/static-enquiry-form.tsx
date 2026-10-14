"use client";

import { useEffect, useState } from "react";
import { localizedPath, type Locale } from "@/config/locales";
import { EnquiryForm } from "@/components/contact/enquiry-form";
import { findCatalogItemByXid, type PublicRfqCatalogItem } from "@/lib/rfq/catalog-selector";
import { publicRfqCatalogPath, PUBLIC_MANIFEST_PATH } from "@/lib/contracts/public-paths";
import { parseRfqRowPrefill, RFQ_PREFILL_PARAMS } from "@/lib/rfq/rfq-prefill";
import { isRfqRowEmpty, type RfqRow } from "@/lib/rfq/item-row-validation";
import {
  addCatalogItemToRows,
  readRfqBasket,
  resolveContinueBrowsingHref,
  restoreRfqBasketRows,
  type RfqBasketAddOutcome,
  type RfqBasketCustomer,
} from "@/lib/rfq/rfq-basket";
import { fetchFilesCapability, filesEndpointFor, type FilesCapability } from "@/lib/rfq/upload-files";

interface LoadedCatalog {
  items: PublicRfqCatalogItem[];
}

interface ReadyForm {
  rows: RfqRow[];
  customer: RfqBasketCustomer | undefined;
  focusRowId: string | null;
  notice: RfqBasketAddOutcome | null;
  preselectionInvalid: boolean;
}

/** The hand-off parameters a «استعلام قیمت» / calculator link carries (lib/pricing/price-rfq.ts, lib/rfq/rfq-prefill.ts). */
const HANDOFF_PARAMS = ["variant", ...Object.values(RFQ_PREFILL_PARAMS)];

/**
 * The /contact form on a static page (architecture V1.1 §4.2). The page HTML
 * carries no catalog data; the locale's selectable Variants come from the
 * static `/data/rfq-catalog.<locale>.json` (artifact.v1 publicRfqCatalog,
 * built from the same `listRfqSelectableCatalogItems` read the SSR page
 * used). `?variant=` is read in the browser and resolved ONLY against that
 * list — an unknown/unpublished value shows the same "no longer available"
 * notice, never a fabricated selection. The RFQ endpoint re-validates every
 * submitted variant server-side.
 *
 * `?qty=&unit=&length=` (the weight calculator's «استعلام برای همین مقدار»,
 * W10.1) pre-fills that row only, each value checked against the resolved
 * Variant's group policy (lib/rfq/rfq-prefill.ts); an invalid value is
 * dropped and the row starts empty, as with a plain `?variant=`.
 *
 * W10.5 basket (lib/rfq/rfq-basket.ts): once the catalog request settles,
 * the visitor's rows and fields from this tab's sessionStorage are restored
 * and the `?variant=` item is ADDED to them (same variant → that row is
 * focused, no duplicate). The hand-off parameters are then removed from the
 * address bar, so a reload does not add the item again. The form mounts
 * once more with that state; the first (prerendered) instance never writes
 * storage, so it cannot overwrite the basket.
 *
 * D-RFQ-FILE: the RFQ Worker is asked once (GET <rfqEndpoint>/files) whether
 * it accepts files; only then does the form show «بارگذاری لیست اقلام». The
 * prerendered HTML never has the field, so the staging and production pages
 * stay byte-identical (r4) while upload is on in one and off in the other.
 * The same answer says whether an attached list is read into rows (W13.3).
 */
export function StaticEnquiryForm({ locale, turnstileSiteKey, rfqEndpoint }: { locale: Locale; turnstileSiteKey?: string; rfqEndpoint?: string }) {
  const [catalog, setCatalog] = useState<LoadedCatalog | null>(null);
  const [catalogSettled, setCatalogSettled] = useState(false);
  // The deployed artifact's snapshot version (manifest.public.json) travels with the RFQ so the
  // Worker validates variants against the snapshot the visitor actually saw (architecture §6.1 step 1).
  const [snapshotVersion, setSnapshotVersion] = useState<string | null>(null);
  const [ready, setReady] = useState<ReadyForm | null>(null);
  // The prerendered href is the fallback; the referrer is only known in the browser.
  const [continueHref, setContinueHref] = useState(() => localizedPath(locale, "/products"));
  const [filesEndpoint, setFilesEndpoint] = useState<string | null>(null);
  const [extractCapability, setExtractCapability] = useState<FilesCapability["extract"] | null>(null);

  useEffect(() => {
    setContinueHref(resolveContinueBrowsingHref(locale, document.referrer, window.location.origin));
    let cancelled = false;
    fetch(publicRfqCatalogPath(locale))
      .then((response) => (response.ok ? (response.json() as Promise<LoadedCatalog>) : null))
      .then((data) => {
        if (!cancelled && data && Array.isArray(data.items)) setCatalog({ items: data.items });
      })
      .catch(() => {
        // The form still works for free-form items without the catalog list.
      })
      .finally(() => {
        if (!cancelled) setCatalogSettled(true);
      });
    if (rfqEndpoint) {
      const endpoint = filesEndpointFor(rfqEndpoint);
      void fetchFilesCapability(endpoint).then((capability) => {
        if (!cancelled && capability) {
          setFilesEndpoint(endpoint);
          setExtractCapability(capability.extract);
        }
      });
    }
    fetch(PUBLIC_MANIFEST_PATH)
      .then((response) => (response.ok ? (response.json() as Promise<{ snapshot_version?: unknown }>) : null))
      .then((manifest) => {
        if (!cancelled && manifest && typeof manifest.snapshot_version === "string") setSnapshotVersion(manifest.snapshot_version);
      })
      .catch(() => {
        // Legacy SSR runtime: no manifest; the RFQ is validated against the active snapshot.
      });
    return () => {
      cancelled = true;
    };
  }, [locale, rfqEndpoint]);

  // Runs once, after the catalog request settles (loaded or failed).
  useEffect(() => {
    if (!catalogSettled || ready) return;
    const items = catalog?.items ?? [];
    const query = new URLSearchParams(window.location.search);
    const variantXid = query.get("variant");
    const stored = readRfqBasket(locale);
    let rows = restoreRfqBasketRows(stored?.rows ?? [], items);
    let focusRowId: string | null = null;
    let notice: RfqBasketAddOutcome | null = null;
    const preselection = variantXid ? findCatalogItemByXid(items, variantXid) : null;
    if (preselection) {
      const hadItems = rows.some((r) => !isRfqRowEmpty(r.fields));
      const result = addCatalogItemToRows(
        rows,
        // The selector groups by public category; the Variant comes from `items`, so its category is read from there — no extra query.
        { categoryCode: preselection.publicCategoryCode, templateXid: preselection.templateXid, variantXid: preselection.variantXid },
        parseRfqRowPrefill(query, preselection.groupCode, locale),
      );
      rows = result.rows;
      focusRowId = result.rowId;
      // A first item on an empty form needs no message; joining a list, a duplicate or a full list does.
      notice = result.outcome === "added" && !hadItems ? null : result.outcome;
    }
    if (variantXid) {
      for (const name of HANDOFF_PARAMS) query.delete(name);
      const search = query.toString();
      try {
        window.history.replaceState(window.history.state, "", `${window.location.pathname}${search ? `?${search}` : ""}${window.location.hash}`);
      } catch {
        // The address bar keeps the parameters; a reload finds the same variant and adds no duplicate.
      }
    }
    setReady({ rows, customer: stored?.customer, focusRowId, notice, preselectionInvalid: Boolean(catalog && variantXid && !preselection) });
  }, [catalogSettled, catalog, locale, ready]);

  return (
    <EnquiryForm
      // Remount once the basket is restored so the initial rows/fields pick it up.
      key={ready ? "ready" : "loading"}
      locale={locale}
      turnstileSiteKey={turnstileSiteKey}
      initialRows={ready?.rows}
      initialCustomer={ready?.customer}
      focusRowId={ready?.focusRowId ?? null}
      basketNotice={ready?.notice ?? null}
      persistBasket={Boolean(ready)}
      continueBrowsingHref={continueHref}
      catalogPreselectionInvalid={ready?.preselectionInvalid ?? false}
      catalogItems={catalog?.items ?? []}
      catalogSnapshotVersion={snapshotVersion}
      rfqEndpoint={rfqEndpoint}
      filesEndpoint={filesEndpoint}
      extractCapability={extractCapability}
    />
  );
}
