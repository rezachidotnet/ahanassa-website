"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { controlClass } from "@/components/ui/form-control";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";
import { trackEvent } from "@/lib/analytics/events";
import { isEmptyQuery, matchesSizeQuery, normalizeSearchText, parseSizeQuery } from "@/lib/downloads/search";
import {
  DOWNLOAD_FILE_TYPES,
  EMPTY_DOWNLOAD_FILTER,
  downloadFilterSearch,
  parseDownloadFilter,
  sameDownloadFilter,
  type DownloadFileType,
  type DownloadFilterState,
} from "@/lib/downloads/filter-state";

/**
 * W20.8 — the Download Center's filter bar (sticky; a bottom sheet at ≤ 480 px). The results are server-rendered
 * static HTML (app/[locale]/downloads/page.tsx); this island only shows/hides them by their data-* attributes,
 * so no file list travels in the props (only the family chip labels and counts). Without JavaScript the bar's
 * controls are hidden (a <noscript> rule) and every family stays visible, with a plain anchor list instead.
 *
 * The state mirrors `?q=&type=&family=` (lib/downloads/filter-state.ts): a chip pushes a history entry, typing
 * replaces the current one, and back/forward re-applies the URL. The visible-size count is announced only after
 * a change, so the server and the first browser render are identical.
 *
 * It also reports the page's events from one delegated listener: download_file, download_zip, download_to_rfq
 * (data-dl-file / data-dl-zip / data-dl-rfq on the server-rendered links) and download_filter.
 */

export interface DownloadFilterFamily {
  code: string;
  segment: string;
  label: string;
  count: number;
}

export interface DownloadFilterCopy {
  filterLabel: string;
  search: string;
  searchPlaceholder: string;
  searchHint: string;
  typeLegend: string;
  types: Record<DownloadFileType, string>;
  familyLegend: string;
  allFamilies: string;
  count: string;
  noMatch: string;
  clear: string;
  openFilters: string;
  closeFilters: string;
  showResults: string;
}

const CHIP =
  "inline-flex min-h-10 items-center gap-2 rounded-[var(--aa-radius-control)] border px-3.5 text-sm font-semibold transition-colors duration-[160ms] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-copper";
const chipClass = (active: boolean) => cn(CHIP, active ? "border-navy bg-navy text-white" : "border-border-control text-muted-foreground hover:border-navy hover:text-navy");

/** Which result parts each file type shows (data-dl-kind on the server markup). */
const KIND_VISIBLE: Record<DownloadFileType, ReadonlySet<string>> = {
  all: new Set(["dxf", "pdf", "zip", "sheet", "catalog"]),
  dxf: new Set(["dxf", "zip"]),
  pdf: new Set(["pdf", "zip", "sheet"]),
  catalog: new Set(["catalog"]),
};

export function DownloadCenterFilter({ resultsId, families, copy, digitsLocale }: { resultsId: string; families: readonly DownloadFilterFamily[]; copy: DownloadFilterCopy; digitsLocale: string }) {
  const id = useId();
  const [state, setState] = useState<DownloadFilterState>(EMPTY_DOWNLOAD_FILTER);
  const [count, setCount] = useState<number | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const touched = useRef(false);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const openButton = useRef<HTMLButtonElement>(null);
  const sheet = useRef<HTMLDivElement>(null);
  const segments = families.map((f) => f.segment);
  const codeOf = (segment: string) => families.find((f) => f.segment === segment)?.code ?? "";

  // A shared or reloaded link, and back/forward: apply the URL's filter.
  useEffect(() => {
    const fromUrl = () => {
      const next = parseDownloadFilter(window.location.search, segments);
      if (!sameDownloadFilter(next, EMPTY_DOWNLOAD_FILTER)) touched.current = true;
      setState(next);
    };
    fromUrl();
    window.addEventListener("popstate", fromUrl);
    return () => window.removeEventListener("popstate", fromUrl);
    // Families are fixed for the page's lifetime (static HTML).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Show/hide the server-rendered results.
  useEffect(() => {
    const root = document.getElementById(resultsId);
    if (!root) return;
    const query = parseSizeQuery(state.q);
    const familyCode = codeOf(state.family);
    const kinds = KIND_VISIBLE[state.type];
    const rowsShown = state.type !== "catalog";
    let visible = 0;
    for (const group of root.querySelectorAll<HTMLElement>("[data-dl-family-group]")) {
      let groupVisible = 0;
      const inFamily = !familyCode || group.dataset.dlFamilyGroup === familyCode;
      for (const row of group.querySelectorAll<HTMLElement>("[data-dl-row]")) {
        const show =
          rowsShown &&
          inFamily &&
          matchesSizeQuery(
            {
              family: row.dataset.dlFamily ?? "",
              form: row.dataset.dlForm ?? "",
              size: row.dataset.dlSize ?? "",
              text: normalizeSearchText(row.dataset.dlQ ?? ""),
            },
            query,
          );
        row.hidden = !show;
        if (show) groupVisible++;
      }
      group.hidden = groupVisible === 0;
      // A filtered family opens, so its matches are never hidden inside a collapsed group.
      if (groupVisible && touched.current && group instanceof HTMLDetailsElement && (familyCode || !isEmptyQuery(query))) group.open = true;
      visible += groupVisible;
    }
    for (const el of root.querySelectorAll<HTMLElement>("[data-dl-kind]")) el.hidden = !kinds.has(el.dataset.dlKind ?? "");
    // Other products' spec sheets: no drawn size to match, so only an unfiltered PDF/all view lists them.
    for (const el of root.querySelectorAll<HTMLElement>("[data-dl-section='sheets']")) el.hidden = !kinds.has("sheet") || Boolean(familyCode) || !isEmptyQuery(query);
    for (const el of root.querySelectorAll<HTMLElement>("[data-dl-section='catalogs']"))
      el.hidden = !kinds.has("catalog") || ((Boolean(familyCode) || !isEmptyQuery(query)) && state.type !== "catalog");
    if (touched.current) setCount(rowsShown ? visible : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resultsId, state]);

  const commit = useCallback((next: DownloadFilterState, how: "push" | "replace") => {
    touched.current = true;
    setState(next);
    const search = downloadFilterSearch(window.location.search, next);
    if (search === window.location.search) return;
    const url = `${window.location.pathname}${search}${window.location.hash}`;
    if (how === "push") window.history.pushState(window.history.state, "", url);
    else window.history.replaceState(window.history.state, "", url);
  }, []);

  const onSearch = (q: string) => {
    commit({ ...state, q }, "replace");
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      if (q.trim()) trackEvent("download_filter", { filter_type: "search" });
    }, 1200);
  };
  const onType = (type: DownloadFileType) => {
    if (type === state.type) return;
    commit({ ...state, type }, "push");
    trackEvent("download_filter", { filter_type: "file_type" });
  };
  const onFamily = (family: string) => {
    if (family === state.family) return;
    commit({ ...state, family }, "push");
    trackEvent("download_filter", { filter_type: "family" });
  };
  const onClear = () => {
    commit(EMPTY_DOWNLOAD_FILTER, "push");
    trackEvent("download_filter", { filter_type: "clear" });
  };

  // Delegated download / RFQ events for the whole page (quick access included).
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const link = e.target instanceof Element ? e.target.closest<HTMLElement>("a[data-dl-file], a[data-dl-zip], a[data-dl-rfq]") : null;
      if (!link) return;
      const family = link.closest<HTMLElement>("[data-dl-family-group]")?.dataset.dlFamilyGroup ?? link.dataset.dlFamily;
      const slug = link.closest<HTMLElement>("[data-dl-row]")?.dataset.dlProduct;
      if (link.dataset.dlFile)
        trackEvent("download_file", {
          file_type: link.dataset.dlFile,
          product_family: family,
          product_slug: slug,
        });
      else if (link.hasAttribute("data-dl-zip")) trackEvent("download_zip", { product_family: family });
      else
        trackEvent("download_to_rfq", {
          product_family: family,
          product_slug: slug,
        });
    };
    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, []);

  // The mobile sheet: Escape closes, Tab stays inside, focus moves in on open and back to its button on close.
  useEffect(() => {
    if (!sheetOpen) return;
    sheet.current?.querySelector<HTMLElement>("button")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSheetOpen(false);
      if (e.key !== "Tab" || !sheet.current) return;
      const buttons = Array.from(sheet.current.querySelectorAll<HTMLElement>("button"));
      const first = buttons[0];
      const last = buttons[buttons.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      openButton.current?.focus();
    };
  }, [sheetOpen]);

  const active = (state.type !== "all" ? 1 : 0) + (state.family ? 1 : 0);
  const fmt = (n: number) => new Intl.NumberFormat(digitsLocale).format(n);
  const filtered = !sameDownloadFilter(state, EMPTY_DOWNLOAD_FILTER);

  const chips = (
    <>
      <div role="group" aria-labelledby={`${id}-type`} className="flex flex-wrap items-center gap-2">
        <span id={`${id}-type`} className="text-muted-foreground text-xs font-semibold max-[480px]:w-full">
          {copy.typeLegend}
        </span>
        {DOWNLOAD_FILE_TYPES.map((t) => (
          <button key={t} type="button" aria-pressed={state.type === t} onClick={() => onType(t)} className={chipClass(state.type === t)}>
            {copy.types[t]}
          </button>
        ))}
      </div>
      <div role="group" aria-labelledby={`${id}-family`} className="flex flex-wrap items-center gap-2">
        <span id={`${id}-family`} className="text-muted-foreground text-xs font-semibold max-[480px]:w-full">
          {copy.familyLegend}
        </span>
        <button type="button" aria-pressed={!state.family} onClick={() => onFamily("")} className={chipClass(!state.family)}>
          {copy.allFamilies}
        </button>
        {families.map((f) => (
          <button key={f.segment} type="button" aria-pressed={state.family === f.segment} onClick={() => onFamily(f.segment)} className={chipClass(state.family === f.segment)}>
            {f.label}
            <span className={cn("text-xs font-normal", state.family === f.segment ? "text-white/80" : "text-tertiary")}>{fmt(f.count)}</span>
          </button>
        ))}
      </div>
    </>
  );

  return (
    <div data-dl-js className="grid gap-2">
      {/* ≥ 481 px: search, file types and families flow in one wrapping row (a compact sticky bar). */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <div className="flex min-w-0 flex-1 basis-72 items-center gap-2 min-[481px]:max-w-md">
          <label htmlFor={`${id}-q`} className="sr-only">
            {copy.search}
          </label>
          <div className="relative min-w-0 flex-1">
            <Search aria-hidden="true" className="text-tertiary pointer-events-none absolute start-3.5 top-1/2 size-4 -translate-y-1/2" />
            <input
              id={`${id}-q`}
              type="search"
              inputMode="search"
              autoComplete="off"
              enterKeyHint="search"
              value={state.q}
              onChange={(e) => onSearch(e.target.value)}
              placeholder={copy.searchPlaceholder}
              aria-describedby={`${id}-hint ${id}-status`}
              aria-controls={resultsId}
              className={cn(controlClass, "ps-10")}
            />
          </div>
          <button
            ref={openButton}
            type="button"
            onClick={() => setSheetOpen(true)}
            aria-expanded={sheetOpen}
            aria-controls={`${id}-sheet`}
            className={cn(buttonVariants({ variant: "secondary", size: "md" }), "px-4 min-[481px]:hidden")}
          >
            <SlidersHorizontal aria-hidden="true" />
            {copy.openFilters}
            {active > 0 && <span className="bg-copper inline-flex size-5 items-center justify-center rounded-full text-xs text-white">{fmt(active)}</span>}
          </button>
        </div>
        <p id={`${id}-hint`} className="sr-only">
          {copy.searchHint}
        </p>
        <div className="contents max-[480px]:hidden">{chips}</div>
      </div>

      {/* In document.body: the sticky bar is a stacking context, and the sheet must cover the header too. */}
      {sheetOpen &&
        createPortal(
          <>
            <div aria-hidden="true" className="bg-navy/40 fixed inset-0 z-[60] min-[481px]:hidden" onClick={() => setSheetOpen(false)} />
            <div
              ref={sheet}
              id={`${id}-sheet`}
              role="dialog"
              aria-modal="true"
              aria-label={copy.filterLabel}
              className="bg-background fixed inset-x-0 bottom-0 z-[70] grid max-h-[85vh] gap-4 overflow-y-auto rounded-t-[var(--aa-radius-panel)] p-4 pb-6 shadow-[var(--aa-shadow-md)] min-[481px]:hidden"
            >
              <div className="flex items-center justify-between">
                <p className="text-navy font-bold">{copy.filterLabel}</p>
                <button type="button" onClick={() => setSheetOpen(false)} className={buttonVariants({ variant: "ghost", size: "icon" })} aria-label={copy.closeFilters}>
                  <X aria-hidden="true" />
                </button>
              </div>
              {chips}
              <button type="button" onClick={() => setSheetOpen(false)} className={cn(buttonVariants({ variant: "primary", size: "md" }), "w-full")}>
                {copy.showResults}
                {count !== null && ` (${fmt(count)})`}
              </button>
            </div>
          </>,
          document.body,
        )}

      <div className="flex min-h-5 flex-wrap items-center gap-x-4">
        <p id={`${id}-status`} role="status" className="text-muted-foreground text-sm">
          {count === null ? null : count === 0 ? copy.noMatch : copy.count.replace("{n}", fmt(count))}
        </p>
        {filtered && (
          <button type="button" onClick={onClear} className={cn(buttonVariants({ variant: "link" }), "min-h-8")}>
            {copy.clear}
          </button>
        )}
      </div>
    </div>
  );
}
