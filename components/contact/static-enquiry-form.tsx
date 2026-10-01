"use client";

import { useEffect, useState } from "react";
import type { Locale } from "@/config/locales";
import { EnquiryForm } from "@/components/contact/enquiry-form";
import { findCatalogItemByXid, type RfqSelectableCatalogItem } from "@/lib/rfq/catalog-selector";

interface StaticRfqCatalog {
  snapshot_version: string;
  locale: Locale;
  items: RfqSelectableCatalogItem[];
}

/**
 * Spike S1: the static /contact page's form. The page HTML carries no
 * catalog data; the per-locale selectable-variant list is a static JSON
 * asset (`/data/rfq-catalog.<locale>.json`, written at build time from the
 * same `listRfqSelectableCatalogItems` repository call the SSR page used).
 * `?variant=` is read in the browser and resolved ONLY against that list —
 * an unknown/unpublished value gives the same "not available" notice as
 * the SSR page, never a fabricated selection. The server still re-validates
 * every submitted variant (RFQ Worker).
 */
export function StaticEnquiryForm({ locale, turnstileSiteKey, rfqEndpoint }: { locale: Locale; turnstileSiteKey?: string; rfqEndpoint?: string }) {
  const [catalog, setCatalog] = useState<StaticRfqCatalog | null>(null);
  const [variantXid, setVariantXid] = useState<string | null>(null);

  useEffect(() => {
    setVariantXid(new URLSearchParams(window.location.search).get("variant"));
    let cancelled = false;
    fetch(`/data/rfq-catalog.${locale}.json`)
      .then((r) => (r.ok ? (r.json() as Promise<StaticRfqCatalog>) : null))
      .then((data) => {
        if (!cancelled && data) setCatalog(data);
      })
      .catch(() => {
        /* the form still works for free-form items without the catalog list */
      });
    return () => {
      cancelled = true;
    };
  }, [locale]);

  const items = catalog?.items ?? [];
  const preselection = variantXid ? (findCatalogItemByXid(items, variantXid) ?? null) : null;

  return (
    <EnquiryForm
      // Remount once the static catalog arrives so the initial row picks up the preselection.
      key={catalog ? `ready:${variantXid ?? ""}` : "loading"}
      locale={locale}
      turnstileSiteKey={turnstileSiteKey}
      catalogPreselection={preselection}
      catalogPreselectionInvalid={Boolean(catalog && variantXid && !preselection)}
      catalogItems={items}
      catalogSnapshotVersion={catalog?.snapshot_version}
      rfqEndpoint={rfqEndpoint}
    />
  );
}
