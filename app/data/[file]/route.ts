import { isLocale } from "@/config/locales";
import { buildPublicRfqCatalog } from "@/lib/catalog/public-rfq-catalog";

/**
 * Legacy SSR runtime only: serves `/data/rfq-catalog.<locale>.json` from
 * DB_PUBLIC so the static-style /contact page also works on the current
 * Worker. In the static export, Route Handlers are not exported (vinext
 * skips them) and the same path is a prebuilt file in public-assets/.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ file: string }> }): Promise<Response> {
  const { file } = await params;
  const match = /^rfq-catalog\.([a-z]{2})\.json$/.exec(file);
  if (!match || !isLocale(match[1])) return new Response("Not Found", { status: 404 });
  try {
    const body = await buildPublicRfqCatalog(match[1], null);
    return Response.json(body, { headers: { "Cache-Control": "public, max-age=60" } });
  } catch (error) {
    console.error("RFQ_PUBLIC_CATALOG_READ_ERROR", JSON.stringify({ locale: match[1], message: error instanceof Error ? error.message : String(error) }));
    return Response.json({ schema_version: "rfq-catalog.v1", snapshot_version: null, locale: match[1], items: [] }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
