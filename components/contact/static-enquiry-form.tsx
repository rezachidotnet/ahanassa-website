"use client";

import { useCallback, useEffect, useState } from "react";
import { basketAddSource, sameOriginReferrerPath, trackEvent } from "@/lib/analytics/events";
import { localizedPath, type Locale } from "@/config/locales";
import { EnquiryForm, type CatalogArrival } from "@/components/contact/enquiry-form";
import { findCatalogItemByXid, type PublicRfqCatalogItem } from "@/lib/rfq/catalog-selector";
import { decodeRfqCatalog } from "@/lib/rfq/catalog-wire";
import { publicRfqCatalogPath } from "@/lib/contracts/public-paths";
import { parseRfqRowPrefill, RFQ_PREFILL_PARAMS } from "@/lib/rfq/rfq-prefill";
import { isRfqRowEmpty, type RfqRow } from "@/lib/rfq/item-row-validation";
import {
  addCatalogItemToRows,
  readRfqBasket,
  resolveContinueBrowsingHref,
  resolveRowsAgainstCatalog,
  restoreRfqBasketRows,
  type RfqBasketAddOutcome,
  type RfqBasketCustomer,
} from "@/lib/rfq/rfq-basket";
import { fetchFilesCapability, filesEndpointFor, type FilesCapability } from "@/lib/rfq/upload-files";

interface LoadedCatalog {
  items: PublicRfqCatalogItem[];
  snapshotVersion: string | null;
}

interface RestoredBasket {
  rows: RfqRow[];
  customer: RfqBasketCustomer | undefined;
}

/** The hand-off parameters a «استعلام قیمت» / calculator link carries (lib/pricing/price-rfq.ts, lib/rfq/rfq-prefill.ts). */
const HANDOFF_PARAMS = ["variant", ...Object.values(RFQ_PREFILL_PARAMS)];

/**
 * The /contact form on a static page (architecture V1.1 §4.2). The page HTML
 * carries no catalog data; the locale's selectable Variants come from a
 * static file — `catalogPath`, the build's compact, content-hashed
 * `/data/rfq-catalog.<locale>.<hash>.json` (rfq-catalog.v2,
 * lib/rfq/catalog-wire.ts; preloaded by the page), else the v1
 * `/data/rfq-catalog.<locale>.json` (legacy SSR runtime). Both are built
 * from the same `listRfqSelectableCatalogItems` read the SSR page used.
 * `?variant=` is read in the browser and resolved ONLY against that list —
 * an unknown/unpublished value shows the same "no longer available" notice,
 * never a fabricated selection. The RFQ endpoint re-validates every
 * submitted variant server-side.
 *
 * W25 (owner, 2026-10-21: on a slow mobile network the product list took a
 * long time to appear): the form never waits for the catalog. It is usable
 * from hydration — free-text rows, contact fields, file upload and submit;
 * the category select shows a loading option until the list arrives. When it
 * does (or fails), `catalogArrival` is applied ONCE to the rows the form
 * holds at that moment: stored catalog rows are re-resolved and the
 * `?variant=` item is added, so nothing the visitor typed meanwhile is lost.
 *
 * `catalogSnapshotVersion`: the snapshot.v1 version of this build (the page
 * HTML, which is never cached stale), sent with the RFQ so the Worker
 * validates variants against the snapshot the visitor actually saw
 * (architecture §6.1 step 1; docs/contracts/RFQ_SUBMIT_V1.md). On the legacy
 * SSR runtime it is null and the v1 file's own `snapshot_version` is used.
 *
 * `?qty=&unit=&length=` (the weight calculator's «استعلام برای همین مقدار»,
 * W10.1) pre-fills that row only, each value checked against the resolved
 * Variant's group policy (lib/rfq/rfq-prefill.ts); an invalid value is
 * dropped and the row starts empty, as with a plain `?variant=`.
 *
 * W10.5 basket (lib/rfq/rfq-basket.ts): on mount the visitor's rows and
 * fields from this tab's sessionStorage are restored (the form mounts once
 * more with them; the first, prerendered instance never writes storage, so it
 * cannot overwrite the basket), and the `?variant=` item is ADDED to them
 * when the catalog arrives (same variant → that row is focused, no
 * duplicate). The hand-off parameters are then removed from the address bar,
 * so a reload does not add the item again.
 *
 * D-RFQ-FILE: the RFQ Worker is asked once (GET <rfqEndpoint>/files) whether
 * it accepts files; only then does the form show «بارگذاری لیست اقلام». The
 * prerendered HTML never has the field, so the staging and production pages
 * stay byte-identical (r4) while upload is on in one and off in the other.
 * The same answer says whether an attached list is read into rows (W13.3).
 */
export function StaticEnquiryForm({
  locale,
  catalogPath,
  catalogSnapshotVersion = null,
  turnstileSiteKey,
  rfqEndpoint,
}: {
  locale: Locale;
  catalogPath?: string;
  catalogSnapshotVersion?: string | null;
  turnstileSiteKey?: string;
  rfqEndpoint?: string;
}) {
  const [catalog, setCatalog] = useState<LoadedCatalog | null>(null);
  const [catalogSettled, setCatalogSettled] = useState(false);
  const [ready, setReady] = useState<RestoredBasket | null>(null);
  // The prerendered href is the fallback; the referrer is only known in the browser.
  const [continueHref, setContinueHref] = useState(() => localizedPath(locale, "/products"));
  const [filesEndpoint, setFilesEndpoint] = useState<string | null>(null);
  const [extractCapability, setExtractCapability] = useState<FilesCapability["extract"] | null>(null);

  useEffect(() => {
    setContinueHref(resolveContinueBrowsingHref(locale, document.referrer, window.location.origin));
    // The stored basket at once — its catalog rows are re-resolved when the catalog arrives (catalogArrival).
    const stored = readRfqBasket(locale);
    setReady({ rows: restoreRfqBasketRows(stored?.rows ?? [], []), customer: stored?.customer });
    let cancelled = false;
    fetch(catalogPath ?? publicRfqCatalogPath(locale))
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        const decoded = decodeRfqCatalog(data);
        if (!cancelled && decoded) setCatalog(decoded);
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
    return () => {
      cancelled = true;
    };
  }, [locale, catalogPath, rfqEndpoint]);

  // Applied once by the form, to the rows it holds when the catalog request settles (loaded or failed).
  const catalogArrival = useCallback(
    (current: RfqRow[]): CatalogArrival => {
      const items = catalog?.items ?? [];
      const query = new URLSearchParams(window.location.search);
      const variantXid = query.get("variant");
      let rows = resolveRowsAgainstCatalog(current, items);
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
        // W16.4: a product joined the basket (not a duplicate, not a full list; a reload finds it and adds nothing).
        // D-ARTICLE-METRICS: + its catalog family and product slug, and the page it came from (same-origin referrer path only).
        if (result.outcome === "added")
          trackEvent("basket_add", {
            basket_size: rows.filter((r) => !isRfqRowEmpty(r.fields)).length,
            product_family: preselection.publicCategoryCode ?? undefined,
            product_slug: preselection.templateSlug,
            add_source: basketAddSource(sameOriginReferrerPath(document.referrer, window.location.origin)) ?? undefined,
          });
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
      return { rows, focusRowId, notice, preselectionInvalid: Boolean(catalog && variantXid && !preselection) };
    },
    [catalog, locale],
  );

  return (
    <EnquiryForm
      // Remount once the stored basket is restored so the initial rows/fields pick it up.
      key={ready ? "ready" : "loading"}
      locale={locale}
      turnstileSiteKey={turnstileSiteKey}
      initialRows={ready?.rows}
      initialCustomer={ready?.customer}
      persistBasket={Boolean(ready)}
      continueBrowsingHref={continueHref}
      catalogItems={catalog?.items ?? []}
      catalogStatus={catalog ? "ready" : catalogSettled ? "failed" : "loading"}
      catalogArrival={ready && catalogSettled ? catalogArrival : null}
      catalogSnapshotVersion={catalogSnapshotVersion ?? catalog?.snapshotVersion ?? null}
      rfqEndpoint={rfqEndpoint}
      filesEndpoint={filesEndpoint}
      extractCapability={extractCapability}
    />
  );
}
