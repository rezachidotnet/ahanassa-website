"use client";

import { useRef, useState } from "react";
import { MapPin } from "lucide-react";
import type { Locale } from "@/config/locales";
import { OFFICE_MAP_COPY, osmEmbedUrl, osmPageUrl, ROUTE_APPS, routeUrl, type Coordinates } from "@/lib/content/office-locations";

/**
 * W20.2 — one office's map: a click-to-load facade (no third-party request until the visitor asks), then
 * OpenStreetMap's own embed, the OSM attribution, and four route buttons built from the coordinates only.
 * The 16:9 box is the same before and after loading (no layout shift).
 */
export function OfficeMap({ locale, office, coordinates }: { locale: Locale; office: string; coordinates: Coordinates }) {
  const t = OFFICE_MAP_COPY[locale];
  const [loaded, setLoaded] = useState(false);
  const frame = useRef<HTMLIFrameElement>(null);

  return (
    <div className="mt-4">
      <div className="border-border bg-surface relative aspect-video overflow-hidden rounded-[var(--aa-radius-card)] border">
        {loaded ? (
          <iframe ref={frame} src={osmEmbedUrl(coordinates)} title={t.mapTitle(office)} className="absolute inset-0 size-full border-0" referrerPolicy="strict-origin-when-cross-origin" sandbox="allow-scripts allow-same-origin allow-popups" />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[linear-gradient(var(--aa-color-neutral-100)_1px,transparent_1px),linear-gradient(90deg,var(--aa-color-neutral-100)_1px,transparent_1px)] bg-[size:24px_24px] p-4 text-center">
            <MapPin aria-hidden="true" className="text-copper size-8" />
            <button
              type="button"
              onClick={() => {
                setLoaded(true);
                requestAnimationFrame(() => frame.current?.focus());
              }}
              className="bg-navy hover:bg-navy-700 focus-visible:outline-ring min-h-11 rounded-[var(--aa-radius-card)] px-5 text-sm font-bold text-white focus-visible:outline-2 focus-visible:outline-offset-3"
            >
              {t.load}
            </button>
            <p className="text-muted-foreground text-xs">{t.loadHint}</p>
          </div>
        )}
      </div>
      <p className="text-tertiary mt-2 flex flex-wrap justify-between gap-x-4 text-xs">
        <a href={osmPageUrl(coordinates)} target="_blank" rel="noopener noreferrer" className="hover:text-navy underline underline-offset-2">
          {t.attribution}
          <span className="sr-only"> {t.newTab}</span>
        </a>
        <a href={osmPageUrl(coordinates)} target="_blank" rel="noopener noreferrer" className="hover:text-navy underline underline-offset-2">
          {t.largerMap}
          <span className="sr-only"> {t.newTab}</span>
        </a>
      </p>
      <p className="text-navy mt-4 text-sm font-bold">{t.routeWith}</p>
      <ul className="mt-2 flex flex-wrap gap-2">
        {ROUTE_APPS.map((app) => (
          <li key={app}>
            <a
              href={routeUrl(app, coordinates)}
              target="_blank"
              rel="noopener noreferrer"
              className="border-border-control text-navy hover:border-navy focus-visible:outline-ring inline-flex min-h-11 items-center rounded-[var(--aa-radius-card)] border px-4 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-3"
            >
              <span dir="auto">{t.apps[app]}</span>
              <span className="sr-only"> {t.newTab}</span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
