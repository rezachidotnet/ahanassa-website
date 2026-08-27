import Image from "next/image";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { localizedPath, type Locale } from "@/config/locales";

const homeLabel: Record<Locale, string> = {
  fa: "خانه",
  en: "Home",
  ar: "الرئيسية",
};

export function PageHero({
  locale,
  eyebrow,
  title,
  body,
  image,
  imageAlt = "",
  breadcrumb,
}: {
  locale: Locale;
  eyebrow: string;
  title: string;
  body?: string;
  image?: string;
  imageAlt?: string;
  breadcrumb?: { path: string; label: string }[];
}) {
  return (
    <section className="bg-navy relative isolate overflow-hidden">
      {image && (
        <>
          <Image
            src={image}
            alt={imageAlt}
            fill
            priority
            sizes="100vw"
            className="object-cover opacity-30"
          />
          <div
            className="from-navy via-navy/90 to-navy/45 absolute inset-0 bg-linear-to-r"
            aria-hidden="true"
          />
        </>
      )}
      <div className="hairline-grid absolute inset-0" aria-hidden="true" />

      <div className="container-x relative py-16 lg:py-24">
        {breadcrumb && breadcrumb.length > 0 && (
          <nav aria-label={homeLabel[locale]} className="mb-8">
            <ol className="flex flex-wrap items-center gap-1.5 text-xs text-white/50">
              <li>
                <Link href={localizedPath(locale, "/")} className="transition-colors hover:text-white">
                  {homeLabel[locale]}
                </Link>
              </li>
              {breadcrumb.map((b, i) => (
                <li key={b.path} className="flex items-center gap-1.5">
                  <ChevronRight className="size-3.5 rtl:-scale-x-100" aria-hidden="true" />
                  {i === breadcrumb.length - 1 ? (
                    <span className="text-white/80" aria-current="page">
                      {b.label}
                    </span>
                  ) : (
                    <Link href={localizedPath(locale, b.path)} className="transition-colors hover:text-white">
                      {b.label}
                    </Link>
                  )}
                </li>
              ))}
            </ol>
          </nav>
        )}

        <p className="eyebrow text-copper-400 flex items-center gap-3">
          <span className="h-px w-8 bg-current" aria-hidden="true" />
          {eyebrow}
        </p>
        <h1 className="mt-6 max-w-3xl text-4xl leading-[1.05] font-extrabold text-white sm:text-5xl lg:text-[3.5rem]">
          {title}
        </h1>
        {body && <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/65">{body}</p>}
      </div>
    </section>
  );
}
