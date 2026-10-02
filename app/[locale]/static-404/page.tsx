import type { Metadata } from "next";
import { notFound } from "next/navigation";
import LocaleNotFound from "../not-found";
import { generateLocaleStaticParams, isStaticExportBuild } from "@/lib/static/locale-params";

/**
 * Build-only route (architecture V1.1 appendix D, V4). vinext's export
 * writes a bare "Not Found" 404.html instead of rendering
 * app/[locale]/not-found.tsx, so this page renders the real not-found UI
 * inside each locale's layout; the static build moves it to /404.html,
 * /en/404.html and /ar/404.html (Static Assets serves the nearest one with
 * status 404) and removes this route from the output. Outside the static
 * build it does not exist.
 */
export function generateStaticParams() {
  return isStaticExportBuild() ? generateLocaleStaticParams() : [];
}

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function StaticNotFoundPage() {
  if (!isStaticExportBuild()) notFound();
  return <LocaleNotFound />;
}
