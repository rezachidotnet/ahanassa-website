import type { Locale } from "@/config/locales";

const copy: Record<Locale, string> = {
  fa: "این کاتالوگ داده نمونه است و صرفاً ساختار صفحه محصولات را نشان می‌دهد. پیش از انتشار نهایی، با داده واقعی از سامانه محصولات جایگزین می‌شود.",
  en: "This catalog shows sample data only, to demonstrate the products page layout. It will be replaced with real product-system data before final publication.",
  ar: "يعرض هذا الكتالوج بيانات نموذجية فقط لتوضيح تخطيط صفحة المنتجات، وسيتم استبدالها ببيانات حقيقية من نظام المنتجات قبل النشر النهائي.",
};

/**
 * Required disclosure for the placeholder catalog — CLAUDE.md §11 forbids
 * presenting invented catalog data as fact; PROJECT_OVERRIDES.md §4 makes a
 * D1-backed catalog owner-confirmed scope, not yet built.
 */
export function SampleDataNotice({ locale }: { locale: Locale }) {
  return (
    <div className="container-x mt-6" role="note">
      <p className="border-[var(--aa-color-warning-800)] bg-[var(--aa-color-warning-50)] text-[var(--aa-color-warning-800)] border px-5 py-3 text-sm leading-relaxed">
        {copy[locale]}
      </p>
    </div>
  );
}
