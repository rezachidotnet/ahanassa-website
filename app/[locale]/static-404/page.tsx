import type { Metadata } from "next";
import LocaleNotFound from "../not-found";
import { isStaticExport, localeStaticParams } from "@/lib/static/export-mode";

/**
 * Spike S1 — build-only page. vinext 1.0.0-beta.8's static export writes a
 * bare "Not Found" 404.html instead of rendering app/[locale]/not-found.tsx,
 * so this route renders the real not-found UI inside the locale layout;
 * spike/scripts/postprocess-static.mjs moves it to /404.html, /en/404.html
 * and /ar/404.html (Static Assets serves the nearest 404.html) and removes
 * the route itself from the output. Never generated outside the export.
 */
export function generateStaticParams() {
  return isStaticExport ? localeStaticParams() : [];
}

export const dynamicParams = false;

export const metadata: Metadata = { title: "404", robots: { index: false, follow: false } };

export default function StaticNotFoundPage() {
  return <LocaleNotFound />;
}
