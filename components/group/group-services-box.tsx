import { Fragment } from "react";
import type { Locale } from "@/config/locales";
import { cardVariants } from "@/components/ui/surface-variants";
import { GROUP_SERVICES_COPY, groupCompany } from "@/lib/content/company";

const LINK = "text-navy hover:text-copper font-semibold underline underline-offset-4";

/**
 * W16.6 — «خدمات مکمل گروه»: one sentence linking SiPanel and Aviz Sazeh by their brand names (plain links, same
 * tab). The page decides where it shows (`showGroupServices` in lib/content/company.ts); names and URLs come from
 * GROUP_COMPANIES only. No price, no snapshot read, so it renders the same on both targets.
 */
export function GroupServicesBox({ locale, className = "container-x pb-12" }: { locale: Locale; className?: string }) {
  const t = GROUP_SERVICES_COPY[locale];
  const parts = t.text.split(/(\{sipanel\}|\{avizsazeh\})/);
  return (
    <aside aria-labelledby="group-services" className={className} data-group-services="">
      <div className={cardVariants({ variant: "panel" })}>
        <h2 id="group-services" className="text-navy text-lg font-bold">
          {t.title}
        </h2>
        <p className="text-muted-foreground mt-3 max-w-3xl text-sm leading-relaxed">
          {parts.map((part, i) => {
            const id = part === "{sipanel}" ? "sipanel" : part === "{avizsazeh}" ? "avizsazeh" : null;
            if (!id) return <Fragment key={i}>{part}</Fragment>;
            const company = groupCompany(id);
            return (
              <a key={i} href={company.url ?? undefined} className={LINK}>
                {company.name[locale]}
              </a>
            );
          })}
        </p>
      </div>
    </aside>
  );
}
