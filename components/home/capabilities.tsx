import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { SectionHeading } from "@/components/ui/section-heading";
import { homepageCopy } from "@/lib/content/homepage";
import { localizedPath, type Locale } from "@/config/locales";

/**
 * Capabilities / Material Orientation — HOMEPAGE_SPEC.md §16. Four curated
 * links (within the 3–6 max), each explaining a buyer outcome rather than a
 * generic product icon (§16.4); not a catalog grid.
 */
export function Capabilities({ locale }: { locale: Locale }) {
  const t = homepageCopy[locale].capabilities;

  return (
    <section className="border-border bg-surface border-b py-20 lg:py-28">
      <div className="container-x">
        <SectionHeading eyebrow={t.eyebrow} title={t.title} body={t.body} />

        <ul className="border-border mt-14 grid gap-px border-t border-s sm:grid-cols-2 lg:grid-cols-4">
          {t.links.map((link) => (
            <li key={link.path}>
              <Link
                href={localizedPath(locale, link.path)}
                className="group border-border bg-background hover:bg-surface flex h-full flex-col justify-between border-e border-b p-7 transition-colors"
              >
                <div>
                  <h3 className="text-navy flex items-start justify-between gap-3 text-base font-bold">
                    {link.title}
                    <ArrowUpRight className="text-copper mt-0.5 size-4 shrink-0 opacity-0 transition-opacity group-hover:opacity-100 rtl:-scale-x-100" />
                  </h3>
                  <p className="text-muted-foreground mt-3 text-sm leading-relaxed">{link.body}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
