"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Script from "next/script";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Locale } from "@/config/locales";
import type { RfqItemInput, RfqResponse } from "@/lib/rfq/types";
import { MAX_ITEMS } from "@/lib/rfq/validation";
import type { RfqCatalogSelection } from "@/lib/catalog/editorial-repository";
import { TURNSTILE_RFQ_ACTION } from "@/lib/security/turnstile-action";
import { groupCatalogItemsForSelector, type RfqSelectableCatalogItem } from "@/lib/rfq/catalog-selector";
import {
  buildRfqItemInput,
  createCatalogRowFromSelection,
  createEmptyCatalogRow,
  validateRfqRow,
  type RfqRow,
  type RfqRowFieldKey,
  type RfqRowFields,
} from "@/lib/rfq/item-row-validation";
import { RfqItemRow } from "@/components/contact/rfq-item-row";

/**
 * Multi-item RFQ / purchase-list form (docs/RFQ_MULTI_ITEM_FORM.md).
 * Redesigned from the single-item form (DAR-039) into a true 1..MAX_ITEMS
 * line-item editor — the backend contract, honeypot/timing signals,
 * idempotency key, and Turnstile flow below are otherwise UNCHANGED from
 * that prior implementation; only the items array is now data-driven and
 * user-editable instead of a fixed one-item shape.
 *
 * Deliberately has no file upload — attachment handling stays disabled
 * until a scanning pipeline is selected (PROJECT_OVERRIDES.md §8 item 8);
 * this task's own instruction is explicit: never render a fake/accepting
 * upload control.
 */

interface TurnstileRenderOptions {
  sitekey: string;
  action: string;
  language?: string;
  callback: (token: string) => void;
  "error-callback": () => void;
  "expired-callback": () => void;
}

interface TurnstileApi {
  render(container: HTMLElement, options: TurnstileRenderOptions): string;
  reset(widgetId?: string): void;
  remove(widgetId?: string): void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const turnstileLanguage: Record<Locale, string> = { fa: "fa", en: "en", ar: "ar" };

const copy: Record<
  Locale,
  {
    customerInfoTitle: string;
    name: string; company: string; email: string; phone: string; message: string; messagePlaceholder: string;
    itemsTitle: string; itemsBody: string;
    counter: (n: number, max: number) => string;
    maxReached: string;
    addRow: string;
    tableHeadIndex: string; tableHeadCategory: string; tableHeadProduct: string; tableHeadSpec: string; tableHeadUnit: string; tableHeadQuantity: string; tableHeadNotes: string; tableHeadActions: string;
    errorSummaryTitle: string;
    rowPrefix: (n: number) => string;
    errorProductCatalog: string; errorProductCustom: string; errorQuantity: string;
    assurance: string;
    submit: string; submitting: string; clearForm: string;
    successTitle: string; successBody: (reference: string) => string; again: string;
    validationError: string; networkError: string; rateLimited: string;
    verificationError: string; serviceUnavailable: string;
    catalogPreselectionInvalid: string;
  }
> = {
  fa: {
    customerInfoTitle: "اطلاعات شما",
    name: "نام و نام خانوادگی", company: "شرکت", email: "ایمیل", phone: "شماره موبایل",
    message: "توضیحات / نکات", messagePlaceholder: "هر نکته‌ای که در بررسی درخواست شما مؤثر است بنویسید.",
    itemsTitle: "لیست محصولات درخواستی",
    itemsBody: "جزئیات و مقدار هر محصول را در ردیف‌های زیر وارد کنید (حداکثر ۲۰ ردیف).",
    counter: (n, max) => `تعداد ردیف‌ها: ${n} / ${max}`,
    maxReached: "به حداکثر تعداد ردیف (۲۰) رسیده‌اید.",
    addRow: "افزودن ردیف جدید",
    tableHeadIndex: "#", tableHeadCategory: "دسته محصول", tableHeadProduct: "نام / نوع محصول", tableHeadSpec: "سایز / مشخصات فنی", tableHeadUnit: "واحد", tableHeadQuantity: "مقدار", tableHeadNotes: "نکات / توضیحات", tableHeadActions: "عملیات",
    errorSummaryTitle: "لطفاً موارد زیر را تکمیل کنید:",
    rowPrefix: (n) => `ردیف ${n}:`,
    errorProductCatalog: "محصول را انتخاب کنید",
    errorProductCustom: "نام محصول را وارد کنید",
    errorQuantity: "مقدار را وارد کنید",
    assurance: "اطلاعات شما صرفاً برای بررسی این درخواست استفاده می‌شود.",
    submit: "ارسال برای بررسی", submitting: "در حال ارسال…", clearForm: "پاک‌کردن فرم",
    successTitle: "درخواست شما دریافت شد.",
    successBody: (reference) => `شماره پیگیری شما: ${reference}. این شماره را برای پیگیری‌های بعدی نزد خود نگه دارید.`,
    again: "ثبت درخواست جدید",
    validationError: "لطفاً اطلاعات فرم را بررسی کنید و دوباره تلاش کنید.",
    networkError: "ارسال درخواست ناموفق بود. لطفاً دوباره تلاش کنید.",
    rateLimited: "درخواست‌های زیادی ارسال شده است. کمی بعد دوباره تلاش کنید.",
    verificationError: "تأیید ناموفق بود. لطفاً دوباره تلاش کنید.",
    serviceUnavailable: "امکان تأیید درخواست در حال حاضر وجود ندارد. لطفاً کمی بعد دوباره تلاش کنید.",
    catalogPreselectionInvalid: "قلم انتخاب‌شده از کاتالوگ دیگر برای انتخاب در دسترس نیست. می‌توانید نیاز خود را به‌صورت دستی شرح دهید.",
  },
  en: {
    customerInfoTitle: "Your information",
    name: "Full name", company: "Company", email: "Email", phone: "Mobile number",
    message: "Notes", messagePlaceholder: "Anything else that helps us review your request.",
    itemsTitle: "Requested product list",
    itemsBody: "Enter the specification and quantity for each item below (up to 20 rows).",
    counter: (n, max) => `Rows: ${n} / ${max}`,
    maxReached: "You've reached the maximum of 20 rows.",
    addRow: "Add new row",
    tableHeadIndex: "#", tableHeadCategory: "Category", tableHeadProduct: "Product / type", tableHeadSpec: "Size / specification", tableHeadUnit: "Unit", tableHeadQuantity: "Quantity", tableHeadNotes: "Notes", tableHeadActions: "Actions",
    errorSummaryTitle: "Please complete the following:",
    rowPrefix: (n) => `Row ${n}:`,
    errorProductCatalog: "Select a product",
    errorProductCustom: "Enter a product name",
    errorQuantity: "Enter a quantity",
    assurance: "Your information is used only to review this request.",
    submit: "Send for review", submitting: "Sending…", clearForm: "Clear form",
    successTitle: "Your request has been received.",
    successBody: (reference) => `Your reference number: ${reference}. Keep this for any follow-up.`,
    again: "Submit another request",
    validationError: "Please check the form fields and try again.",
    networkError: "Sending your request failed. Please try again.",
    rateLimited: "Too many requests. Please try again shortly.",
    verificationError: "Verification failed. Please try again.",
    serviceUnavailable: "Verification is temporarily unavailable. Please try again shortly.",
    catalogPreselectionInvalid: "The selected catalog item is no longer available for selection. You can still describe your requirement manually.",
  },
  ar: {
    customerInfoTitle: "معلوماتك",
    name: "الاسم الكامل", company: "الشركة", email: "البريد الإلكتروني", phone: "رقم الجوال",
    message: "ملاحظات", messagePlaceholder: "أي تفاصيل أخرى تساعدنا في مراجعة طلبك.",
    itemsTitle: "قائمة المنتجات المطلوبة",
    itemsBody: "أدخل المواصفات والكمية لكل صنف أدناه (حتى 20 صفًا).",
    counter: (n, max) => `عدد الصفوف: ${n} / ${max}`,
    maxReached: "لقد وصلت إلى الحد الأقصى (20 صفًا).",
    addRow: "إضافة صف جديد",
    tableHeadIndex: "#", tableHeadCategory: "الفئة", tableHeadProduct: "المنتج / النوع", tableHeadSpec: "المقاس / المواصفات", tableHeadUnit: "الوحدة", tableHeadQuantity: "الكمية", tableHeadNotes: "ملاحظات", tableHeadActions: "إجراءات",
    errorSummaryTitle: "يرجى إكمال ما يلي:",
    rowPrefix: (n) => `الصف ${n}:`,
    errorProductCatalog: "اختر منتجًا",
    errorProductCustom: "أدخل اسم المنتج",
    errorQuantity: "أدخل الكمية",
    assurance: "تُستخدم معلوماتك فقط لمراجعة هذا الطلب.",
    submit: "إرسال للمراجعة", submitting: "جارٍ الإرسال…", clearForm: "مسح النموذج",
    successTitle: "تم استلام طلبك.",
    successBody: (reference) => `رقم المتابعة الخاص بك: ${reference}. يرجى الاحتفاظ به لأي متابعة لاحقة.`,
    again: "إرسال طلب جديد",
    validationError: "يرجى مراجعة حقول النموذج والمحاولة مرة أخرى.",
    networkError: "فشل إرسال طلبك. يرجى المحاولة مرة أخرى.",
    rateLimited: "عدد كبير جدًا من الطلبات. يرجى المحاولة لاحقًا.",
    verificationError: "فشل التحقق. يرجى المحاولة مرة أخرى.",
    serviceUnavailable: "التحقق غير متاح مؤقتًا. يرجى المحاولة لاحقًا.",
    catalogPreselectionInvalid: "الصنف المحدد من الكتالوج لم يعد متاحًا للاختيار. لا يزال بإمكانك وصف احتياجك يدويًا.",
  },
};

const field =
  "w-full border border-border bg-background px-4 py-3 text-sm text-navy outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-copper disabled:opacity-60";
const label = "block text-[11px] font-bold uppercase tracking-[0.14em] text-navy";

type Status = "idle" | "submitting" | "success" | "error";

function generateIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `key-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function EnquiryForm({
  locale,
  turnstileSiteKey,
  catalogPreselection = null,
  catalogPreselectionInvalid = false,
  catalogItems = [],
}: {
  locale: Locale;
  turnstileSiteKey?: string;
  /** Already server-resolved by app/[locale]/contact/page.tsx — every field here is real Website-derived Catalog data, never a raw URL value (docs/CATALOG_RFQ_INTEGRATION.md). */
  catalogPreselection?: RfqCatalogSelection | null;
  /** True when a `?variant=` was present in the URL but did not resolve to a real, currently RFQ-eligible Variant. */
  catalogPreselectionInvalid?: boolean;
  /** Every RFQ-selectable Catalog Variant for this locale, fetched once server-side and shared across every Catalog row's selects — never re-fetched per row (docs/RFQ_MULTI_ITEM_FORM.md "Performance"). */
  catalogItems?: RfqSelectableCatalogItem[];
}) {
  const [status, setStatus] = useState<Status>("idle");
  const [reference, setReference] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileScriptLoaded, setTurnstileScriptLoaded] = useState(false);
  const [rows, setRows] = useState<RfqRow[]>(() => [
    catalogPreselection
      ? createCatalogRowFromSelection({ categoryCode: catalogPreselection.categoryCode, templateXid: catalogPreselection.templateXid, variantXid: catalogPreselection.variantXid })
      : createEmptyCatalogRow(),
  ]);
  const [rowErrors, setRowErrors] = useState<Record<string, RfqRowFieldKey[]>>({});
  const idempotencyKeyRef = useRef(generateIdempotencyKey());
  const formRenderedAtRef = useRef(Date.now());
  const turnstileContainerRef = useRef<HTMLDivElement>(null);
  const turnstileWidgetIdRef = useRef<string | null>(null);
  const rowElementRefs = useRef<Record<string, HTMLElement | null>>({});
  const t = copy[locale];

  const catalogGroups = useMemo(() => groupCatalogItemsForSelector(catalogItems, locale), [catalogItems, locale]);

  const resetTurnstile = useCallback(() => {
    setTurnstileToken(null);
    if (turnstileWidgetIdRef.current) {
      window.turnstile?.reset(turnstileWidgetIdRef.current);
    }
  }, []);

  // Render the Turnstile widget once its script has loaded. A single-use
  // token must never be silently reused across attempts (CLAUDE.md "Token
  // Lifecycle") — each render/reset call fetches a fresh one via `callback`.
  useEffect(() => {
    if (!turnstileSiteKey || !turnstileScriptLoaded || !turnstileContainerRef.current) return;
    if (!window.turnstile) return;

    const widgetId = window.turnstile.render(turnstileContainerRef.current, {
      sitekey: turnstileSiteKey,
      action: TURNSTILE_RFQ_ACTION,
      language: turnstileLanguage[locale],
      callback: (token) => setTurnstileToken(token),
      "error-callback": () => setTurnstileToken(null),
      "expired-callback": () => setTurnstileToken(null),
    });
    turnstileWidgetIdRef.current = widgetId;

    return () => {
      window.turnstile?.remove(widgetId);
      turnstileWidgetIdRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turnstileSiteKey, turnstileScriptLoaded, locale]);

  function updateRow(id: string, fields: RfqRowFields) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, fields } : r)));
    setRowErrors((prev) => {
      if (!prev[id]) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }

  function addRow() {
    setRows((prev) => (prev.length >= MAX_ITEMS ? prev : [...prev, createEmptyCatalogRow()]));
  }

  function removeRow(id: string) {
    setRows((prev) => (prev.length <= 1 ? prev : prev.filter((r) => r.id !== id)));
    setRowErrors((prev) => {
      if (!prev[id]) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }

  function scrollToRow(id: string) {
    const el = rowElementRefs.current[`table-${id}`]?.offsetParent ? rowElementRefs.current[`table-${id}`] : rowElementRefs.current[`card-${id}`];
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.querySelector<HTMLElement>("input, select")?.focus();
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status === "submitting") return;

    const form = e.currentTarget;
    const data = new FormData(form);

    // Per-row client-side pre-check (a conservative subset of the server's
    // own authoritative validation — never a stricter/looser rule, see
    // lib/rfq/item-row-validation.ts). Never submits a row the customer has
    // not actually finished — and points at the exact first offending row
    // rather than a generic error.
    const nextRowErrors: Record<string, RfqRowFieldKey[]> = {};
    let firstInvalidId: string | null = null;
    for (const row of rows) {
      const errs = validateRfqRow(row.fields);
      if (errs.length > 0) {
        nextRowErrors[row.id] = errs;
        if (!firstInvalidId) firstInvalidId = row.id;
      }
    }
    setRowErrors(nextRowErrors);
    if (firstInvalidId) {
      setStatus("error");
      setErrorMessage(t.errorSummaryTitle);
      scrollToRow(firstInvalidId);
      return;
    }

    const items: RfqItemInput[] = rows.map((row) => buildRfqItemInput(row.fields, locale)).filter((item): item is RfqItemInput => item !== null);

    const payload = {
      idempotencyKey: idempotencyKeyRef.current,
      locale,
      fullName: String(data.get("name") ?? ""),
      companyName: String(data.get("company") ?? ""),
      email: String(data.get("email") ?? ""),
      phone: String(data.get("phone") ?? "") || undefined,
      message: String(data.get("message") ?? "") || undefined,
      items,
      website: String(data.get("website") ?? ""),
      formRenderedAt: formRenderedAtRef.current,
      turnstileToken: turnstileToken ?? undefined,
    };

    setStatus("submitting");
    setErrorMessage(null);

    try {
      const res = await fetch("/api/rfqs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body: RfqResponse = await res.json();

      if (body.ok) {
        setReference(body.reference);
        setStatus("success");
        return;
      }

      if (body.code === "RATE_LIMITED") {
        setErrorMessage(t.rateLimited);
      } else if (body.code === "VERIFICATION_FAILED") {
        setErrorMessage(t.verificationError);
      } else if (body.code === "SERVICE_UNAVAILABLE") {
        setErrorMessage(t.serviceUnavailable);
      } else if (body.code === "VALIDATION_ERROR") {
        setErrorMessage(t.validationError);
      } else {
        setErrorMessage(t.networkError);
      }
      setStatus("error");
      // A consumed/rejected token must never silently remain "valid" in UI
      // state for a retry (CLAUDE.md "Token Lifecycle") — fetch a fresh one.
      resetTurnstile();
    } catch {
      setErrorMessage(t.networkError);
      setStatus("error");
      resetTurnstile();
    }
  }

  function startNewRequest() {
    idempotencyKeyRef.current = generateIdempotencyKey();
    formRenderedAtRef.current = Date.now();
    setStatus("idle");
    setReference(null);
    setErrorMessage(null);
    setRows([createEmptyCatalogRow()]);
    setRowErrors({});
    resetTurnstile();
  }

  if (status === "success" && reference) {
    return (
      <div className="border-border bg-surface border p-10">
        <h3 className="text-navy text-xl font-bold">{t.successTitle}</h3>
        <p className="text-muted-foreground mt-4 max-w-md text-sm leading-relaxed">{t.successBody(reference)}</p>
        <Button variant="outline" className="mt-8" onClick={startNewRequest}>
          {t.again}
        </Button>
      </div>
    );
  }

  const submitting = status === "submitting";
  const turnstileBlocking = Boolean(turnstileSiteKey) && !turnstileToken;
  const errorRowEntries = Object.entries(rowErrors);
  const rowIndexById = new Map(rows.map((r, i) => [r.id, i]));

  return (
    <form onSubmit={handleSubmit} className="grid gap-8" noValidate={false}>
      {turnstileSiteKey && (
        <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" strategy="afterInteractive" onLoad={() => setTurnstileScriptLoaded(true)} />
      )}
      {/*
       * Honeypot — invisible to real users, catches automated submissions
       * (FORM_ARCHITECTURE.md §18.3 "passive controls first"). Uses the
       * classic clip-based "visually hidden" pattern (not off-screen
       * absolute positioning) so it can never contribute to page-level
       * horizontal overflow regardless of its positioning-context ancestor.
       */}
      <div style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0,0,0,0)", whiteSpace: "nowrap" }} aria-hidden="true">
        <label htmlFor="website">Website</label>
        <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      {/* Customer Information card */}
      <fieldset className="border-border bg-surface rounded-[var(--aa-radius-lg)] border p-6 sm:p-8">
        <legend className="text-navy px-1 text-base font-bold">{t.customerInfoTitle}</legend>
        <div className="mt-5 grid gap-6 sm:grid-cols-2">
          <div className="grid gap-2">
            <label className={label} htmlFor="name">{t.name}</label>
            <input id="name" name="name" required autoComplete="name" disabled={submitting} className={field} />
          </div>
          <div className="grid gap-2">
            <label className={label} htmlFor="company">{t.company}</label>
            <input id="company" name="company" required autoComplete="organization" disabled={submitting} className={field} />
          </div>
          <div className="grid gap-2">
            <label className={label} htmlFor="email">{t.email}</label>
            <input id="email" name="email" type="email" required autoComplete="email" disabled={submitting} className={field} />
          </div>
          <div className="grid gap-2">
            <label className={label} htmlFor="phone">{t.phone}</label>
            <input id="phone" name="phone" type="tel" autoComplete="tel" disabled={submitting} className={field} />
          </div>
          <div className="grid gap-2 sm:col-span-2">
            <label className={label} htmlFor="message">{t.message}</label>
            <textarea id="message" name="message" rows={3} placeholder={t.messagePlaceholder} disabled={submitting} className={`${field} resize-y`} />
          </div>
        </div>
      </fieldset>

      {catalogPreselectionInvalid && (
        <p role="status" className="border-[var(--aa-color-warning-800)] bg-[var(--aa-color-warning-50)] text-[var(--aa-color-warning-800)] border px-5 py-3 text-sm leading-relaxed">
          {t.catalogPreselectionInvalid}
        </p>
      )}

      {/* Items card */}
      <div className="border-border bg-surface rounded-[var(--aa-radius-lg)] border p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h3 className="text-navy text-base font-bold">{t.itemsTitle}</h3>
            <p className="text-muted-foreground mt-1 text-sm leading-relaxed">{t.itemsBody}</p>
          </div>
          <span className="bg-navy shrink-0 rounded-[var(--aa-radius-pill)] px-4 py-1.5 text-xs font-bold text-white" aria-live="polite">
            {t.counter(rows.length, MAX_ITEMS)}
          </span>
        </div>

        {/* Desktop table */}
        <div className="mt-6 hidden overflow-x-auto lg:block">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-border text-muted-foreground border-b text-xs font-bold uppercase tracking-wide">
                <th className="px-3 py-2 text-center">{t.tableHeadIndex}</th>
                <th className="px-2 py-2 text-start">{t.tableHeadCategory}</th>
                <th className="px-2 py-2 text-start">{t.tableHeadProduct}</th>
                <th className="px-2 py-2 text-start">{t.tableHeadSpec}</th>
                <th className="px-2 py-2 text-start">{t.tableHeadUnit}</th>
                <th className="px-2 py-2 text-start">{t.tableHeadQuantity}</th>
                <th className="px-2 py-2 text-start">{t.tableHeadNotes}</th>
                <th className="px-2 py-2 text-center">{t.tableHeadActions}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <RfqItemRow
                  key={row.id}
                  layout="table"
                  index={index}
                  fields={row.fields}
                  locale={locale}
                  disabled={submitting}
                  errors={rowErrors[row.id] ?? []}
                  catalogGroups={catalogGroups}
                  onChange={(fields) => updateRow(row.id, fields)}
                  onRemove={() => removeRow(row.id)}
                  canRemove={rows.length > 1}
                  rowRef={(el) => {
                    rowElementRefs.current[`table-${row.id}`] = el;
                  }}
                />
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile / tablet stacked cards */}
        <div className="mt-6 grid gap-4 lg:hidden">
          {rows.map((row, index) => (
            <RfqItemRow
              key={row.id}
              layout="card"
              index={index}
              fields={row.fields}
              locale={locale}
              disabled={submitting}
              errors={rowErrors[row.id] ?? []}
              catalogGroups={catalogGroups}
              onChange={(fields) => updateRow(row.id, fields)}
              onRemove={() => removeRow(row.id)}
              canRemove={rows.length > 1}
              rowRef={(el) => {
                rowElementRefs.current[`card-${row.id}`] = el;
              }}
            />
          ))}
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-4">
          <button
            type="button"
            onClick={addRow}
            disabled={submitting || rows.length >= MAX_ITEMS}
            className="border-copper text-copper hover:bg-copper inline-flex items-center gap-2 rounded-[var(--aa-radius-sm)] border border-dashed px-5 py-2.5 text-sm font-semibold transition-colors hover:text-white disabled:pointer-events-none disabled:opacity-40"
          >
            <Plus className="size-4" aria-hidden="true" />
            {t.addRow}
          </button>
          {rows.length >= MAX_ITEMS && <p className="text-muted-foreground text-xs">{t.maxReached}</p>}
        </div>

        {errorRowEntries.length > 0 && (
          <div role="alert" className="border-[var(--aa-color-danger-700)] bg-[var(--aa-color-danger-50)] mt-6 border p-4">
            <p className="text-sm font-bold text-[var(--aa-color-danger-700)]">{t.errorSummaryTitle}</p>
            <ul className="mt-2 grid gap-1 text-sm text-[var(--aa-color-danger-700)]">
              {errorRowEntries.map(([rowId, fieldErrors]) => {
                const rowIndex = rowIndexById.get(rowId);
                if (rowIndex === undefined) return null;
                const row = rows.find((r) => r.id === rowId);
                return fieldErrors.map((fieldKey) => (
                  <li key={`${rowId}-${fieldKey}`}>
                    <button type="button" onClick={() => scrollToRow(rowId)} className="underline decoration-dotted underline-offset-2">
                      {t.rowPrefix(rowIndex + 1)} {fieldKey === "quantity" ? t.errorQuantity : row?.fields.mode === "catalog" ? t.errorProductCatalog : t.errorProductCustom}
                    </button>
                  </li>
                ));
              })}
            </ul>
          </div>
        )}
      </div>

      {turnstileSiteKey && <div ref={turnstileContainerRef} />}

      {status === "error" && errorMessage && errorRowEntries.length === 0 && (
        <p role="alert" className="text-sm font-medium text-[var(--aa-color-danger-700)]">
          {errorMessage}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-5 border-t border-border pt-6">
        <p className="text-muted-foreground max-w-md text-xs leading-relaxed">{t.assurance}</p>
        <div className="flex items-center gap-4">
          <Button type="button" variant="ghost" size="sm" disabled={submitting} onClick={startNewRequest}>
            {t.clearForm}
          </Button>
          <Button type="submit" size="lg" disabled={submitting || turnstileBlocking} aria-busy={submitting}>
            {submitting ? t.submitting : t.submit}
          </Button>
        </div>
      </div>
    </form>
  );
}
