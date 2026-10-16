import type { Locale } from "../../config/locales.ts";

/**
 * W20.2 — office map pins and route links for /about. No Google Business listing is possible (sanctions), so the
 * map is an OpenStreetMap embed behind a click-to-load facade (components/about/office-map.tsx).
 *
 * Coordinates are the owner's own (2026-10-16, WGS 84 decimal degrees) — never geocoded or guessed from the
 * address. `null` would ship that office without a map; the facade, the OSM embed and the four route buttons are
 * built from these numbers alone.
 */
export interface Coordinates {
  lat: number;
  lng: number;
}

export const OFFICE_COORDINATES: Record<"head" | "tehran", Coordinates | null> = {
  head: { lat: 32.593888, lng: 51.669859 },
  tehran: { lat: 35.720067, lng: 51.357633 },
};

/** Iran's bounding box; a pin outside it is a typo (swapped lat/lng, a missing digit). */
export function isPlausibleIranCoordinate({ lat, lng }: Coordinates): boolean {
  return Number.isFinite(lat) && Number.isFinite(lng) && lat >= 25 && lat <= 40 && lng >= 44 && lng <= 64;
}

const fixed = (n: number) => n.toFixed(6);

/** OpenStreetMap's own embed (export/embed.html): a ~1 km box around the pin, with the marker. */
export function osmEmbedUrl({ lat, lng }: Coordinates): string {
  const d = 0.005;
  const bbox = [lng - d, lat - d, lng + d, lat + d].map(fixed).join(",");
  return `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${fixed(lat)}%2C${fixed(lng)}`;
}

/** The full OpenStreetMap page for the pin (the attribution link and the "larger map" link). */
export function osmPageUrl({ lat, lng }: Coordinates): string {
  return `https://www.openstreetmap.org/?mlat=${fixed(lat)}&mlon=${fixed(lng)}#map=17/${fixed(lat)}/${fixed(lng)}`;
}

export type RouteApp = "neshan" | "balad" | "google" | "waze";

/**
 * Route links, built from the coordinates only (no address text, no place id). Google Maps and Waze use their
 * documented URL schemes (maps/dir/?api=1&destination=…, ul?ll=…&navigate=yes). Neshan and Balad publish no URL
 * scheme; these are the location-page forms their web maps open — check each against the owner's own shared link
 * when the coordinates are added.
 */
export function routeUrl(app: RouteApp, { lat, lng }: Coordinates): string {
  const ll = `${fixed(lat)},${fixed(lng)}`;
  switch (app) {
    case "neshan":
      return `https://neshan.org/maps/@${ll},16z`;
    case "balad":
      return `https://balad.ir/location?latitude=${fixed(lat)}&longitude=${fixed(lng)}&zoom=16`;
    case "google":
      return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(ll)}`;
    case "waze":
      return `https://waze.com/ul?ll=${encodeURIComponent(ll)}&navigate=yes`;
  }
}

export const ROUTE_APPS: readonly RouteApp[] = ["neshan", "balad", "google", "waze"];

export const OFFICE_MAP_COPY: Record<Locale, { routeWith: string; apps: Record<RouteApp, string>; load: string; loadHint: string; mapTitle: (office: string) => string; attribution: string; largerMap: string; newTab: string }> = {
  fa: {
    routeWith: "مسیریابی با",
    apps: { neshan: "نشان", balad: "بلد", google: "Google Maps", waze: "Waze" },
    load: "نمایش نقشه",
    loadHint: "با نمایش نقشه، نقشه از OpenStreetMap بارگذاری می‌شود.",
    mapTitle: (office) => `نقشهٔ ${office}`,
    attribution: "© مشارکت‌کنندگان OpenStreetMap",
    largerMap: "نقشهٔ بزرگ‌تر",
    newTab: "(در زبانهٔ جدید باز می‌شود)",
  },
  en: {
    routeWith: "Directions with",
    apps: { neshan: "Neshan", balad: "Balad", google: "Google Maps", waze: "Waze" },
    load: "Show map",
    loadHint: "Showing the map loads it from OpenStreetMap.",
    mapTitle: (office) => `Map of the ${office}`,
    attribution: "© OpenStreetMap contributors",
    largerMap: "Larger map",
    newTab: "(opens in a new tab)",
  },
  ar: {
    routeWith: "الاتجاهات عبر",
    apps: { neshan: "نشان", balad: "بلد", google: "Google Maps", waze: "Waze" },
    load: "عرض الخريطة",
    loadHint: "عند عرض الخريطة يتم تحميلها من OpenStreetMap.",
    mapTitle: (office) => `خريطة ${office}`,
    attribution: "© المساهمون في OpenStreetMap",
    largerMap: "خريطة أكبر",
    newTab: "(يُفتح في علامة تبويب جديدة)",
  },
};
