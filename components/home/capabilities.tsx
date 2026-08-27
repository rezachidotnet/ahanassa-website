import Image from "next/image";
import { SectionHeading } from "@/components/ui/section-heading";
import { Reveal } from "@/components/ui/reveal";
import { homepageCopy } from "@/lib/content/homepage";
import { servicesCopy } from "@/lib/content/pages";
import type { Locale } from "@/config/locales";

/**
 * Capabilities ("what we do") — visual pattern matches
 * ahanassa-v0/components/home/capabilities.tsx (Navy hairline-grid section,
 * image + heading on one side, item grid on the other). Item content is the
 * same confirmed service functions used on /services, not v0's fabricated
 * commercial-claim copy.
 */
export function Capabilities({ locale }: { locale: Locale }) {
  const t = homepageCopy[locale].capabilities;
  const functions = servicesCopy[locale].functions;

  return (
    <section className="bg-navy relative isolate overflow-hidden py-20 lg:py-28">
      <div className="hairline-grid absolute inset-0 opacity-60" aria-hidden="true" />
      <div className="container-x relative">
        <div className="grid gap-14 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-5">
            <SectionHeading invert eyebrow={t.eyebrow} title={t.title} body={t.body} />
            <div className="relative mt-12 aspect-4/3 overflow-hidden">
              <Image src="/images/ops/inspection.png" alt="" aria-hidden="true" fill sizes="(min-width: 1024px) 40vw, 100vw" className="object-cover" />
            </div>
          </div>

          <ul className="grid gap-px self-start border-t border-s border-white/10 sm:grid-cols-2 lg:col-span-7">
            {functions.map((f, i) => (
              <Reveal as="li" key={f.title} delay={i * 60}>
                <div className="h-full border-e border-b border-white/10 p-7 transition-colors hover:bg-white/[0.04]">
                  <span className="eyebrow text-copper-400">{String(i + 1).padStart(2, "0")}</span>
                  <h3 className="mt-4 text-lg font-bold text-white">{f.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-white/55">{f.body}</p>
                </div>
              </Reveal>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
