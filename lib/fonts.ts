import type { Locale } from "@/config/locales";

/**
 * Per-locale font-family CSS custom property. See styles/tokens.css for the
 * fallback stacks and the non-blocking font-decision dependency this
 * documents (DOCUMENT_AUDIT_REPORT.md DAR-017).
 */
const fontFamilyVar: Record<Locale, string> = {
  fa: "var(--aa-font-family-fa)",
  en: "var(--aa-font-family-en)",
  ar: "var(--aa-font-family-ar)",
};

export function getFontFamily(locale: Locale): string {
  return fontFamilyVar[locale];
}
