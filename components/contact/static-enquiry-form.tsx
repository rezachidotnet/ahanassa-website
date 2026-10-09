"use client";

import { useEffect, useState } from "react";
import type { Locale } from "@/config/locales";
import { EnquiryForm } from "@/components/contact/enquiry-form";
import { findCatalogItemByXid, type PublicRfqCatalogItem } from "@/lib/rfq/catalog-selector";
import { publicRfqCatalogPath, PUBLIC_MANIFEST_PATH } from "@/lib/contracts/public-paths";
import { parseRfqRowPrefill } from "@/lib/rfq/rfq-prefill";

interface LoadedCatalog {
  items: PublicRfqCatalogItem[];
}

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
 * W10.1) pre-fills that preselected row only, each value checked against the
 * resolved Variant's group policy (lib/rfq/rfq-prefill.ts); an invalid value
 * is dropped and the row starts empty, as with a plain `?variant=`.
 */
export function StaticEnquiryForm({ locale, turnstileSiteKey, rfqEndpoint }: { locale: Locale; turnstileSiteKey?: string; rfqEndpoint?: string }) {
  const [catalog, setCatalog] = useState<LoadedCatalog | null>(null);
  // The deployed artifact's snapshot version (manifest.public.json) travels with the RFQ so the
  // Worker validates variants against the snapshot the visitor actually saw (architecture §6.1 step 1).
  const [snapshotVersion, setSnapshotVersion] = useState<string | null>(null);
  const [variantXid, setVariantXid] = useState<string | null>(null);
  const [query, setQuery] = useState<URLSearchParams | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setQuery(params);
    setVariantXid(params.get("variant"));
    let cancelled = false;
    fetch(publicRfqCatalogPath(locale))
      .then((response) => (response.ok ? (response.json() as Promise<LoadedCatalog>) : null))
      .then((data) => {
        if (!cancelled && data && Array.isArray(data.items)) setCatalog({ items: data.items });
      })
      .catch(() => {
        // The form still works for free-form items without the catalog list.
      });
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
  }, [locale]);

  const items = catalog?.items ?? [];
  const preselection = variantXid ? findCatalogItemByXid(items, variantXid) : null;
  const prefill = preselection && query ? parseRfqRowPrefill(query, preselection.groupCode) : undefined;

  return (
    <EnquiryForm
      // Remount once the catalog arrives so the initial row picks up the preselection.
      key={catalog ? `ready:${variantXid ?? ""}` : "loading"}
      locale={locale}
      turnstileSiteKey={turnstileSiteKey}
      catalogPreselection={preselection}
      catalogPreselectionInvalid={Boolean(catalog && variantXid && !preselection)}
      catalogPreselectionPrefill={prefill}
      catalogItems={items}
      catalogSnapshotVersion={snapshotVersion}
      rfqEndpoint={rfqEndpoint}
    />
  );
}
