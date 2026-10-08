import Image from "next/image";
import Link from "@/components/ui/link";
import { ChevronRight } from "lucide-react";
import { localizedPath, type Locale } from "@/config/locales";

/** Breadcrumb links: 44px tall tap targets (W10.0 P1-4), underline on hover. */
const CRUMB = "inline-flex min-h-11 items-center transition-colors hover:text-white hover:underline underline-offset-4";

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
    <section className="bg-navy on-inverse relative isolate overflow-hidden">
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
            // Darkest where the text starts: mirrored in RTL (fa/ar text sits on the right), W10.0 P1-3.
            className="from-navy via-navy/90 to-navy/45 absolute inset-0 bg-linear-to-r rtl:bg-linear-to-l"
            aria-hidden="true"
          />
        </>
      )}
      <div className="hairline-grid absolute inset-0" aria-hidden="true" />

      <div className="container-x relative py-16 lg:py-24">
        {breadcrumb && breadcrumb.length > 0 && (
          <nav aria-label={homeLabel[locale]} className="mb-8">
            <ol className="text-on-inverse-muted flex flex-wrap items-center gap-x-1.5 text-xs">
              <li>
                <Link href={localizedPath(locale, "/")} className={CRUMB}>
                  {homeLabel[locale]}
                </Link>
              </li>
              {breadcrumb.map((b, i) => (
                <li key={b.path} className="flex items-center gap-1.5">
                  <ChevronRight className="size-3.5 rtl:-scale-x-100" aria-hidden="true" />
                  {i === breadcrumb.length - 1 ? (
                    <span className="text-white" aria-current="page">
                      {b.label}
                    </span>
                  ) : (
                    <Link href={localizedPath(locale, b.path)} className={CRUMB}>
                      {b.label}
                    </Link>
                  )}
                </li>
              ))}
            </ol>
          </nav>
        )}

        <p className="eyebrow text-accent-on-inverse flex items-center gap-3">
          <span className="h-px w-8 bg-current" aria-hidden="true" />
          {eyebrow}
        </p>
        <h1 className="mt-6 max-w-3xl text-4xl leading-[1.05] font-extrabold text-white sm:text-5xl lg:text-[3.5rem]">
          {title}
        </h1>
        {body && <p className="mt-6 max-w-2xl text-on-inverse-muted text-lg leading-relaxed">{body}</p>}
      </div>
    </section>
  );
}
