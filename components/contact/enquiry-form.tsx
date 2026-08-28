"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { categories, sampleProducts } from "@/lib/content/catalog-sample";
import type { Locale } from "@/config/locales";
import type { RfqResponse } from "@/lib/rfq/types";

/**
 * RFQ intake form. Deliberately has no file upload — attachment handling
 * stays disabled until a scanning pipeline is selected
 * (PROJECT_OVERRIDES.md §7 item 8). Connected to the real POST /api/rfqs
 * backend (feat/rfq-backend) — the success state only renders after a real
 * D1-durable RFQ is created and a real reference is returned; there is no
 * simulated delay or hardcoded success. See DOCUMENT_AUDIT_REPORT.md.
 */
const copy: Record<
  Locale,
  {
    name: string; company: string; email: string; phone: string; product: string; productPlaceholder: string; other: string;
    grade: string; gradePlaceholder: string; quantity: string; quantityPlaceholder: string; destination: string; destinationPlaceholder: string;
    message: string; messagePlaceholder: string; submit: string; submitting: string;
    successTitle: string; successBody: (reference: string) => string; again: string;
    validationError: string; networkError: string; rateLimited: string;
  }
> = {
  fa: {
    name: "نام و نام خانوادگی", company: "شرکت", email: "ایمیل کاری", phone: "تلفن",
    product: "محصول یا گروه کالایی", productPlaceholder: "یک گروه کالایی انتخاب کنید", other: "سایر / نامشخص",
    grade: "گرید یا استاندارد (در صورت وجود)", gradePlaceholder: "مثلاً B500B، S355JR",
    quantity: "مقدار تقریبی", quantityPlaceholder: "مثلاً 200 تن یا 500 عدد",
    destination: "محل تحویل", destinationPlaceholder: "شهر یا استان",
    message: "شرح نیاز پروژه", messagePlaceholder: "مشخصات، زمان‌بندی مورد نظر و هر جزئیات دیگری که کمک می‌کند.",
    submit: "ارسال برای بررسی", submitting: "در حال ارسال…",
    successTitle: "درخواست شما دریافت شد.",
    successBody: (reference) => `شماره پیگیری شما: ${reference}. این شماره را برای پیگیری‌های بعدی نزد خود نگه دارید.`,
    again: "ثبت درخواست جدید",
    validationError: "لطفاً اطلاعات فرم را بررسی کنید و دوباره تلاش کنید.",
    networkError: "ارسال درخواست ناموفق بود. لطفاً دوباره تلاش کنید.",
    rateLimited: "درخواست‌های زیادی ارسال شده است. کمی بعد دوباره تلاش کنید.",
  },
  en: {
    name: "Full name", company: "Company", email: "Work email", phone: "Phone",
    product: "Product or category", productPlaceholder: "Select a product category", other: "Other / unsure",
    grade: "Grade or standard (if known)", gradePlaceholder: "e.g. B500B, S355JR",
    quantity: "Approximate quantity", quantityPlaceholder: "e.g. 200 tons or 500 units",
    destination: "Delivery location", destinationPlaceholder: "City or region",
    message: "Project requirement", messagePlaceholder: "Specification, desired timing, and any other detail that helps.",
    submit: "Send for review", submitting: "Sending…",
    successTitle: "Your request has been received.",
    successBody: (reference) => `Your reference number: ${reference}. Keep this for any follow-up.`,
    again: "Submit another request",
    validationError: "Please check the form fields and try again.",
    networkError: "Sending your request failed. Please try again.",
    rateLimited: "Too many requests. Please try again shortly.",
  },
  ar: {
    name: "الاسم الكامل", company: "الشركة", email: "البريد الإلكتروني للعمل", phone: "الهاتف",
    product: "المنتج أو الفئة", productPlaceholder: "اختر فئة منتج", other: "أخرى / غير محدد",
    grade: "الدرجة أو المعيار (إن وُجد)", gradePlaceholder: "مثال: B500B، S355JR",
    quantity: "الكمية التقريبية", quantityPlaceholder: "مثال: 200 طن أو 500 قطعة",
    destination: "موقع التسليم", destinationPlaceholder: "المدينة أو المنطقة",
    message: "وصف احتياج المشروع", messagePlaceholder: "المواصفات، التوقيت المطلوب، وأي تفاصيل أخرى مفيدة.",
    submit: "إرسال للمراجعة", submitting: "جارٍ الإرسال…",
    successTitle: "تم استلام طلبك.",
    successBody: (reference) => `رقم المتابعة الخاص بك: ${reference}. يرجى الاحتفاظ به لأي متابعة لاحقة.`,
    again: "إرسال طلب جديد",
    validationError: "يرجى مراجعة حقول النموذج والمحاولة مرة أخرى.",
    networkError: "فشل إرسال طلبك. يرجى المحاولة مرة أخرى.",
    rateLimited: "عدد كبير جدًا من الطلبات. يرجى المحاولة لاحقًا.",
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

export function EnquiryForm({ locale }: { locale: Locale }) {
  const [status, setStatus] = useState<Status>("idle");
  const [reference, setReference] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const idempotencyKeyRef = useRef(generateIdempotencyKey());
  const formRenderedAtRef = useRef(Date.now());
  const t = copy[locale];

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status === "submitting") return;

    const form = e.currentTarget;
    const data = new FormData(form);
    const productValue = String(data.get("product") ?? "");

    const payload = {
      idempotencyKey: idempotencyKeyRef.current,
      locale,
      fullName: String(data.get("name") ?? ""),
      companyName: String(data.get("company") ?? ""),
      email: String(data.get("email") ?? ""),
      phone: String(data.get("phone") ?? "") || undefined,
      deliveryLocation: String(data.get("destination") ?? "") || undefined,
      message: String(data.get("message") ?? "") || undefined,
      items: [
        {
          productSlug: productValue && productValue !== "other" ? productValue : undefined,
          freeformTitle: productValue === "other" ? t.other : undefined,
          gradeOrStandard: String(data.get("grade") ?? "") || undefined,
          quantityText: String(data.get("quantity") ?? ""),
        },
      ],
      website: String(data.get("website") ?? ""),
      formRenderedAt: formRenderedAtRef.current,
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
      } else if (body.code === "VALIDATION_ERROR" || body.code === "VERIFICATION_FAILED") {
        setErrorMessage(t.validationError);
      } else {
        setErrorMessage(t.networkError);
      }
      setStatus("error");
    } catch {
      setErrorMessage(t.networkError);
      setStatus("error");
    }
  }

  function startNewRequest() {
    idempotencyKeyRef.current = generateIdempotencyKey();
    formRenderedAtRef.current = Date.now();
    setStatus("idle");
    setReference(null);
    setErrorMessage(null);
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

  return (
    <form onSubmit={handleSubmit} className="grid gap-6" noValidate={false}>
      {/*
       * Honeypot — invisible to real users, catches automated submissions
       * (FORM_ARCHITECTURE.md §18.3 "passive controls first"). Uses the
       * classic clip-based "visually hidden" pattern (not off-screen
       * absolute positioning) so it can never contribute to page-level
       * horizontal overflow regardless of its positioning-context ancestor.
       */}
      <div
        style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0,0,0,0)", whiteSpace: "nowrap" }}
        aria-hidden="true"
      >
        <label htmlFor="website">Website</label>
        <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
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
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="grid gap-2">
          <label className={label} htmlFor="product">{t.product}</label>
          <select id="product" name="product" required disabled={submitting} className={field} defaultValue="">
            <option value="" disabled>{t.productPlaceholder}</option>
            {categories.map((c) => (
              <optgroup key={c.id} label={c.label}>
                {sampleProducts.filter((p) => p.category === c.id).map((p) => (
                  <option key={p.slug} value={p.slug}>{p.name}</option>
                ))}
              </optgroup>
            ))}
            <option value="other">{t.other}</option>
          </select>
        </div>
        <div className="grid gap-2">
          <label className={label} htmlFor="grade">{t.grade}</label>
          <input id="grade" name="grade" placeholder={t.gradePlaceholder} disabled={submitting} className={field} />
        </div>
        <div className="grid gap-2">
          <label className={label} htmlFor="quantity">{t.quantity}</label>
          <input id="quantity" name="quantity" required placeholder={t.quantityPlaceholder} disabled={submitting} className={field} />
        </div>
        <div className="grid gap-2">
          <label className={label} htmlFor="destination">{t.destination}</label>
          <input id="destination" name="destination" placeholder={t.destinationPlaceholder} disabled={submitting} className={field} />
        </div>
      </div>

      <div className="grid gap-2">
        <label className={label} htmlFor="message">{t.message}</label>
        <textarea id="message" name="message" rows={5} placeholder={t.messagePlaceholder} disabled={submitting} className={`${field} resize-y`} />
      </div>

      {status === "error" && errorMessage && (
        <p role="alert" className="text-sm font-medium text-[var(--aa-color-danger-700)]">
          {errorMessage}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-5 pt-2">
        <Button type="submit" size="lg" disabled={submitting} aria-busy={submitting}>
          {submitting ? t.submitting : t.submit}
        </Button>
      </div>
    </form>
  );
}
