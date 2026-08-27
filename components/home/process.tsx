import Link from "next/link";
import { SectionHeading } from "@/components/ui/section-heading";
import { Reveal } from "@/components/ui/reveal";
import { homepageCopy } from "@/lib/content/homepage";
import { localizedPath, type Locale } from "@/config/locales";

/**
 * Procurement Process — HOMEPAGE_SPEC.md §12. Six-stage model; DOM order is
 * fixed step 1→6 regardless of visual direction (§12.4).
 */
export function Process({ locale }: { locale: Locale }) {
  const t = homepageCopy[locale].process;
  const labels =
    locale === "fa"
      ? { input: "ورودی شما", activity: "اقدام آهن آسا", output: "خروجی" }
      : locale === "ar"
        ? { input: "مُدخلك", activity: "إجراء آهن آسا", output: "المخرج" }
        : { input: "Your input", activity: "Ahan Asa's activity", output: "Output" };

  return (
    <section id="process" className="border-border bg-surface scroll-mt-18 border-b py-20 lg:py-28">
      <div className="container-x">
        <SectionHeading eyebrow={t.eyebrow} title={t.title} body={t.body} />

        <ol className="border-border mt-14 grid gap-px border-t border-s sm:grid-cols-2 lg:grid-cols-3">
          {t.steps.map((step, i) => (
            <Reveal as="li" key={step.title} delay={i * 60}>
              <div className="border-border bg-background h-full border-e border-b p-7">
                <div className="flex items-baseline gap-4">
                  <span className="text-surface-2 text-4xl font-bold">{String(i + 1).padStart(2, "0")}</span>
                  <h3 className="text-navy text-lg font-bold">{step.title}</h3>
                </div>
                <dl className="mt-4 space-y-2 text-sm">
                  <div>
                    <dt className="text-muted-foreground">{labels.input}</dt>
                    <dd className="text-navy-600 mt-0.5">{step.input}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">{labels.activity}</dt>
                    <dd className="text-navy-600 mt-0.5">{step.activity}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">{labels.output}</dt>
                    <dd className="text-navy-600 mt-0.5">{step.output}</dd>
                  </div>
                </dl>
              </div>
            </Reveal>
          ))}
        </ol>

        <Link href={localizedPath(locale, "/contact")} className="text-copper mt-8 inline-block text-sm font-semibold underline-offset-4 hover:underline">
          {t.cta}
        </Link>
      </div>
    </section>
  );
}
