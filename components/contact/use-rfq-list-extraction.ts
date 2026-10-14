"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Locale } from "@/config/locales";
import { fileExtension } from "@/lib/rfq/attachment-policy";
import type { PublicRfqCatalogItem } from "@/lib/rfq/catalog-selector";
import { trackExtractEvent } from "@/lib/rfq/extract/analytics";
import { extractEndpointFor, extractKindFor, preparePicture, readListFile, requestExtract, type ExtractFailureReason, type ExtractResult } from "@/lib/rfq/extract/browser";
import { lineToRow, type ExtractedRfqRow } from "@/lib/rfq/extract/to-rows";
import { TURNSTILE_EXTRACT_ACTION } from "@/lib/security/turnstile-action";

/**
 * W13.3 — reads each attached list into draft rows (docs/RFQ_INSTANT_EXTRACT.md).
 *
 * One file at a time, in the order attached. Typed lists are read in the
 * browser; pictures and PDFs go to the RFQ Worker with a token from a SECOND,
 * invisible Turnstile widget (action rfq_extract, execute mode — it shows a
 * challenge only if Cloudflare asks for one), so the submit widget's token is
 * never spent here. Reading never blocks or changes the submit: a failure is
 * a message next to the file, which stays attached either way.
 */

export type ExtractStatus =
  | { state: "reading" }
  | { state: "done"; added: number; review: number; overflow: number }
  | { state: "empty" }
  | { state: "failed"; reason: ExtractFailureReason };

export interface ListExtractionCapability {
  /** Typed lists, read in the browser. */
  lists: boolean;
  /** Pictures and PDFs, read by POST /api/rfqs/extract. */
  pictures: boolean;
}

const turnstileLanguage: Record<Locale, string> = { fa: "fa", en: "en", ar: "ar" };
const TOKEN_TIMEOUT_MS = 30_000;

let fileKeyCounter = 0;
const fileKeys = new WeakMap<File, string>();
/** A stable key per attached File object — never derived from its name. */
export function fileKeyOf(file: File): string {
  let key = fileKeys.get(file);
  if (!key) {
    fileKeyCounter += 1;
    key = `file-${fileKeyCounter}`;
    fileKeys.set(file, key);
  }
  return key;
}

export function useRfqListExtraction({
  locale,
  capability,
  catalogItems,
  rfqEndpoint,
  turnstileSiteKey,
  onRows,
}: {
  locale: Locale;
  capability: ListExtractionCapability | null;
  catalogItems: PublicRfqCatalogItem[];
  rfqEndpoint: string;
  turnstileSiteKey?: string;
  /** Called once per file that produced rows (the form merges them). Not called after `stop()`. */
  onRows: (fileKey: string, rows: ExtractedRfqRow[]) => { added: number; overflow: number };
}) {
  const [statuses, setStatuses] = useState<Record<string, ExtractStatus>>({});
  const queueRef = useRef<Promise<void>>(Promise.resolve());
  const activeRef = useRef(true);
  /** Files removed (or the form reset) while queued or being read: their result is dropped. */
  const droppedRef = useRef(new Set<string>());
  const widgetContainerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const waiterRef = useRef<{ resolve: (token: string) => void; reject: () => void } | null>(null);
  const onRowsRef = useRef(onRows);
  onRowsRef.current = onRows;
  const catalogRef = useRef(catalogItems);
  catalogRef.current = catalogItems;

  useEffect(
    () => () => {
      activeRef.current = false;
      if (widgetIdRef.current) window.turnstile?.remove(widgetIdRef.current);
      widgetIdRef.current = null;
    },
    [],
  );

  const setStatus = useCallback((key: string, status: ExtractStatus | null) => {
    setStatuses((prev) => {
      const next = { ...prev };
      if (status) next[key] = status;
      else delete next[key];
      return next;
    });
  }, []);

  /** A fresh single-use token for action rfq_extract (the widget renders on first use, then resets). */
  const extractToken = useCallback(
    () =>
      new Promise<string>((resolve, reject) => {
        const turnstile = window.turnstile;
        const container = widgetContainerRef.current;
        if (!turnstile?.execute || !turnstileSiteKey || !container) return reject();
        const timer = setTimeout(() => {
          waiterRef.current = null;
          reject();
        }, TOKEN_TIMEOUT_MS);
        waiterRef.current = {
          resolve: (token) => {
            clearTimeout(timer);
            waiterRef.current = null;
            resolve(token);
          },
          reject: () => {
            clearTimeout(timer);
            waiterRef.current = null;
            reject();
          },
        };
        try {
          if (!widgetIdRef.current) {
            widgetIdRef.current = turnstile.render(container, {
              sitekey: turnstileSiteKey,
              action: TURNSTILE_EXTRACT_ACTION,
              language: turnstileLanguage[locale],
              execution: "execute",
              appearance: "interaction-only",
              callback: (token) => waiterRef.current?.resolve(token),
              "error-callback": () => waiterRef.current?.reject(),
              "expired-callback": () => {},
              "timeout-callback": () => waiterRef.current?.reject(),
            });
          } else {
            turnstile.reset(widgetIdRef.current);
          }
          turnstile.execute(widgetIdRef.current);
        } catch {
          waiterRef.current?.reject();
        }
      }),
    [locale, turnstileSiteKey],
  );

  const readOne = useCallback(
    async (file: File): Promise<ExtractResult> => {
      const kind = extractKindFor(file.name);
      if (kind === "list") return capability?.lists ? readListFile(file, file.name) : { ok: false, reason: "unsupported" };
      if (!kind || !capability?.pictures) return { ok: false, reason: "unsupported" };
      let body: Blob | null = file;
      let ext: "jpg" | "png" | "webp" | "pdf" = "pdf";
      if (kind === "picture") {
        body = await preparePicture(file);
        ext = "jpg";
      }
      if (!body) return { ok: false, reason: "unsupported" };
      let token: string;
      try {
        token = await extractToken();
      } catch {
        return { ok: false, reason: "verification" };
      }
      return requestExtract(extractEndpointFor(rfqEndpoint), body, ext, token);
    },
    [capability, extractToken, rfqEndpoint],
  );

  /** Queues the files for reading (the ones that cannot be read get "unsupported" at once). */
  const enqueue = useCallback(
    (files: File[]) => {
      if (!capability || (!capability.lists && !capability.pictures)) return;
      for (const file of files) {
        const key = fileKeyOf(file);
        droppedRef.current.delete(key);
        setStatus(key, { state: "reading" });
        queueRef.current = queueRef.current.then(async () => {
          if (!activeRef.current || droppedRef.current.has(key)) return;
          const started = Date.now();
          let result: ExtractResult;
          try {
            result = await readOne(file);
          } catch {
            result = { ok: false, reason: "failed" };
          }
          if (!activeRef.current || droppedRef.current.has(key)) return;
          const fileType = fileExtension(file.name);
          const seconds = Math.round((Date.now() - started) / 100) / 10;
          if (!result.ok) {
            setStatus(key, { state: "failed", reason: result.reason });
            trackExtractEvent("rfq_extract", { extract_result: result.reason, row_count: 0, file_type: fileType, extract_seconds: seconds });
            return;
          }
          const source = result.source;
          const rows = result.lines.map((line) => lineToRow(line, catalogRef.current, source, key));
          if (!rows.length) {
            setStatus(key, { state: "empty" });
            trackExtractEvent("rfq_extract", { extract_result: "empty", row_count: 0, file_type: fileType, extract_seconds: seconds });
            return;
          }
          const merged = onRowsRef.current(key, rows);
          const review = rows.slice(0, merged.added).filter((r) => r.extract.review).length;
          setStatus(key, { state: "done", added: merged.added, review, overflow: merged.overflow });
          trackExtractEvent("rfq_extract", { extract_result: "ok", row_count: merged.added, review_count: review, file_type: fileType, extract_seconds: seconds });
        });
      }
    },
    [capability, readOne, setStatus],
  );

  /** The file was removed: a pending result is dropped and its message goes. */
  const forget = useCallback(
    (file: File) => {
      const key = fileKeyOf(file);
      droppedRef.current.add(key);
      setStatus(key, null);
    },
    [setStatus],
  );

  const reset = useCallback(() => {
    setStatuses((prev) => {
      for (const key of Object.keys(prev)) droppedRef.current.add(key);
      return {};
    });
  }, []);

  return { statuses, enqueue, forget, reset, widgetContainerRef, enabled: Boolean(capability && (capability.lists || capability.pictures)) };
}
