import type { Metadata } from "next";
import { siteHomepageUrl, siteUrl } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "آهن آسا | تأمین آهن‌آلات مطابق نیاز شما",
  description: "آهن آسا؛ تأمین آهن‌آلات مطابق نیاز شما.",
  alternates: {
    canonical: siteHomepageUrl,
  },
  openGraph: {
    type: "website",
    locale: "fa_IR",
    url: siteHomepageUrl,
    siteName: "آهن آسا",
    title: "آهن آسا | تأمین آهن‌آلات مطابق نیاز شما",
    description: "آهن آسا؛ تأمین آهن‌آلات مطابق نیاز شما.",
  },
  twitter: {
    card: "summary",
    title: "آهن آسا | تأمین آهن‌آلات مطابق نیاز شما",
    description: "آهن آسا؛ تأمین آهن‌آلات مطابق نیاز شما.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fa" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
