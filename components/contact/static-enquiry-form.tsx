"use client";

import { useEffect, useState } from "react";
import type { Locale } from "@/config/locales";
import { EnquiryForm } from "@/components/contact/enquiry-form";
import { findCatalogItemByXid, type PublicRfqCatalogItem } from "@/lib/rfq/catalog-selector";
import { publicRfqCatalogPath } from "@/lib/contracts/public-paths";

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
 */
export function StaticEnquiryForm({ locale, turnstileSiteKey }: { locale: Locale; turnstileSiteKey?: string }) {
  const [catalog, setCatalog] = useState<LoadedCatalog | null>(null);
  const [variantXid, setVariantXid] = useState<string | null>(null);

  useEffect(() => {
    setVariantXid(new URLSearchParams(window.location.search).get("variant"));
    let cancelled = false;
    fetch(publicRfqCatalogPath(locale))
      .then((response) => (response.ok ? (response.json() as Promise<LoadedCatalog>) : null))
      .then((data) => {
        if (!cancelled && data && Array.isArray(data.items)) setCatalog({ items: data.items });
      })
      .catch(() => {
        // The form still works for free-form items without the catalog list.
      });
    return () => {
      cancelled = true;
    };
  }, [locale]);

  const items = catalog?.items ?? [];
  const preselection = variantXid ? findCatalogItemByXid(items, variantXid) : null;

  return (
    <EnquiryForm
      // Remount once the catalog arrives so the initial row picks up the preselection.
      key={catalog ? `ready:${variantXid ?? ""}` : "loading"}
      locale={locale}
      turnstileSiteKey={turnstileSiteKey}
      catalogPreselection={preselection}
      catalogPreselectionInvalid={Boolean(catalog && variantXid && !preselection)}
      catalogItems={items}
    />
  );
}
