import { createElement, type Ref } from "react";
import { localizedPath, type Locale } from "../../config/locales.ts";
import { buttonVariants } from "../ui/button-variants.ts";
import { cardVariants } from "../ui/surface-variants.ts";

/**
 * The RFQ success state (owner, W10.3, 2026-10-09): after «ارسال برای بررسی»
 * succeeds, this panel is the only thing left of the request page. It shows
 * the tracking number (prominent), a copy button, one short next-step line
 * and one link back home — nothing else: no form, no "submit another
 * request", no next-steps/office/FAQ sections (EnquiryForm sets
 * `RFQ_SUBMITTED_ATTR` on <html>, and the page marks every other part of
 * itself with `RFQ_HIDE_ON_SUCCESS_ATTR`; styles/theme-extensions.css hides
 * them). The site header and footer are the global shell and stay.
 *
 * Written without JSX so the node test runner can render it
 * (components/contact/rfq-success-panel.test.ts).
 */

/** Set on <html> while the success panel is mounted. */
export const RFQ_SUBMITTED_ATTR = "data-rfq-submitted";
/** Marks a part of the request page that the success state hides. */
export const RFQ_HIDE_ON_SUCCESS_ATTR = "data-rfq-hide-on-success";

export const RFQ_SUCCESS_COPY: Record<Locale, { title: string; referenceLabel: string; copy: string; copied: string; nextStep: string; home: string }> = {
  fa: {
    title: "درخواست شما دریافت شد.",
    referenceLabel: "شماره پیگیری",
    copy: "کپی شماره",
    copied: "کپی شد",
    nextStep: "پس از بررسی درخواست با شما تماس می‌گیریم. این شماره را برای پیگیری نگه دارید.",
    home: "بازگشت به صفحه اصلی",
  },
  en: {
    title: "Your request has been received.",
    referenceLabel: "Reference number",
    copy: "Copy number",
    copied: "Copied",
    nextStep: "We will contact you after reviewing your request. Keep this number for follow-up.",
    home: "Back to home",
  },
  ar: {
    title: "تم استلام طلبك.",
    referenceLabel: "رقم المتابعة",
    copy: "نسخ الرقم",
    copied: "تم النسخ",
    nextStep: "سنتواصل معك بعد مراجعة طلبك. احتفظ بهذا الرقم للمتابعة.",
    home: "العودة إلى الصفحة الرئيسية",
  },
};

export function RfqSuccessPanel({
  locale,
  reference,
  copied = false,
  onCopy,
  headingRef,
}: {
  locale: Locale;
  reference: string;
  copied?: boolean;
  onCopy?: () => void;
  headingRef?: Ref<HTMLHeadingElement>;
}) {
  const t = RFQ_SUCCESS_COPY[locale];
  return createElement(
    "div",
    { className: cardVariants({ variant: "panel", className: "mx-auto max-w-xl text-center" }), "data-rfq-success": "" },
    // Focused on mount (tabIndex -1) so screen readers announce the result and keyboard users start here.
    createElement("h2", { ref: headingRef, tabIndex: -1, className: "text-navy text-xl font-bold outline-hidden" }, t.title),
    createElement(
      "div",
      { className: "mt-6 grid justify-items-center gap-2" },
      createElement("p", { className: "text-neutral-700 text-sm font-semibold", id: "rfq-reference-label" }, t.referenceLabel),
      // dir="ltr": a reference such as "RFQ-2026-000123" must read left-to-right on fa/ar too.
      createElement("p", { dir: "ltr", "aria-labelledby": "rfq-reference-label", className: "text-navy text-3xl font-extrabold tracking-wide select-all", "data-rfq-reference": "" }, reference),
      createElement(
        "button",
        { type: "button", onClick: onCopy, className: buttonVariants({ variant: "secondary", size: "sm", className: "mt-2" }) },
        copied ? t.copied : t.copy,
      ),
      // Announces "copied" without moving focus.
      createElement("span", { role: "status", className: "sr-only" }, copied ? t.copied : ""),
    ),
    createElement("p", { className: "text-muted-foreground mx-auto mt-6 max-w-md text-sm leading-relaxed" }, t.nextStep),
    createElement("a", { href: localizedPath(locale, "/"), className: buttonVariants({ variant: "link", className: "mt-4" }) }, t.home),
  );
}
