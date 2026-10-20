/**
 * W18.3 — the build-time share images (og:image / twitter:image) of the fa chart pages and the en/ar market
 * indicators page: URL paths and size only, so a page's metadata can name its image without loading the
 * builder (lib/og/share-images.ts). scripts/static/build.ts writes both formats; og:image is the PNG (WhatsApp,
 * Telegram and X all read PNG; WebP is the lighter copy for anything that takes it).
 *
 *   /images/og/prices-chart/<slug>.png|webp            a fa chart page, /prices/chart/<slug>
 *   /images/og/market-indicators-<en|ar>.png|webp      /en/market-indicators, /ar/market-indicators
 */
export const SHARE_IMAGE_SIZE = { width: 1200, height: 630 } as const;
export type ShareImageFormat = "png" | "webp";

export const chartShareImagePath = (slug: string, format: ShareImageFormat) => `/images/og/prices-chart/${slug}.${format}`;
export const indicatorsShareImagePath = (locale: "en" | "ar", format: ShareImageFormat) => `/images/og/market-indicators-${locale}.${format}`;
