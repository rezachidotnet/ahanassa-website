import type { Metadata } from "next";
import { notFound } from "next/navigation";
import "../globals.css";
import { locales, isLocale, getDirection, type Locale } from "@/config/locales";
import { getFontFamily } from "@/lib/fonts";
import { siteConfig } from "@/lib/metadata/site";
import { SkipLink } from "@/components/layout/SkipLink";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export const dynamicParams = false;

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.baseUrl),
  title: {
    default: siteConfig.name,
    template: `%s | ${siteConfig.name}`,
  },
};

const skipLinkLabel: Record<Locale, string> = {
  fa: "رفتن به محتوای اصلی",
  en: "Skip to main content",
  ar: "الانتقال إلى المحتوى الرئيسي",
};

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;

  if (!isLocale(rawLocale)) {
    notFound();
  }

  const locale = rawLocale;
  const direction = getDirection(locale);

  return (
    <html lang={locale} dir={direction}>
      <body style={{ fontFamily: getFontFamily(locale) }}>
        <SkipLink label={skipLinkLabel[locale]} />
        <SiteHeader locale={locale} />
        <main id="main-content">{children}</main>
        <SiteFooter locale={locale} />
      </body>
    </html>
  );
}
