import { localizedPath, type Locale } from "@/config/locales";
import { ButtonLink } from "@/components/ui/button";
import { ALLOY_GRADES, type AlloyGradeSlug } from "@/lib/alloy/grades";
import { alloyRfqHref } from "@/lib/alloy/rfq";
import { flatKgPerMetre, plateKgPerSquareMetre, plateSheetKg, roundKgPerMetre, squareKgPerMetre } from "@/lib/alloy/weight";
import { ALLOY_FACTS, ALLOY_UI, alloyDensityLabel } from "@/lib/content/alloy-steel";
import { formatNumber } from "@/lib/weight-calculator/format";
import { cn } from "@/lib/utils";

const HEAD = "border-border text-muted-foreground border-b bg-surface px-4 py-3 text-start text-xs font-bold whitespace-nowrap";
const CELL = "border-b border-[var(--aa-color-neutral-100)] px-4 py-2.5 text-start group-last:border-b-0";

/**
 * W43 — the «قیمت با استعلام» banner of the alloy pages (D-ALLOY-5): no price, only the request path. On a guide
 * the button opens /contact with a custom row naming that grade (lib/alloy/rfq.ts); on the hub, the plain form.
 */
export function AlloyRfqBanner({ locale, slug }: { locale: Locale; slug?: AlloyGradeSlug }) {
  const t = ALLOY_UI[locale];
  return (
    <aside aria-label={t.bannerTitle} data-aa-rfq-only="" className="border-copper bg-background rounded-[var(--aa-radius-card)] border-s-4 p-5 shadow-[var(--aa-shadow-sm)]">
      <p className="text-navy font-bold">{t.bannerTitle}</p>
      <p className="text-muted-foreground mt-2 text-sm leading-relaxed">{t.bannerBody}</p>
      <ButtonLink href={slug ? alloyRfqHref(locale, slug) : localizedPath(locale, "/contact")} variant="primary" size="md" className="mt-4 h-auto min-h-12 py-3" data-aa-alloy-rfq={slug ?? ""}>
        {t.cta}
      </ButtonLink>
    </aside>
  );
}

function WeightTable({ caption, head, rows }: { caption: string; head: readonly string[]; rows: readonly (readonly string[])[] }) {
  return (
    <div role="region" aria-label={caption} tabIndex={0} className="border-border bg-background relative overflow-x-auto rounded-[var(--aa-radius-card)] border">
      <table className="text-ui w-full border-separate border-spacing-0 text-start text-sm">
        <caption className="text-navy px-4 pt-3 pb-1 text-start text-sm font-bold">{caption}</caption>
        <thead>
          <tr>
            {head.map((h) => (
              <th key={h} scope="col" className={HEAD}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(([size, ...values]) => (
            <tr key={size} className="group">
              <th scope="row" className={cn(CELL, "font-semibold whitespace-nowrap")}>
                <bdi>{size}</bdi>
              </th>
              {values.map((v, i) => (
                <td key={i} className={cn(CELL, "whitespace-nowrap")}>
                  {v}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * The nominal weight tables of a guide, at the GRADE's density (lib/alloy/weight.ts, W39 §3.5): kg/m for
 * round, square and flat; kg/m² and one 2000×6000 sheet for plate. Numbers through the deterministic formatter.
 */
export function AlloyWeightTables({ locale, slug }: { locale: Locale; slug: AlloyGradeSlug }) {
  const t = ALLOY_UI[locale];
  const rho = ALLOY_GRADES[slug].density;
  const w = ALLOY_FACTS[slug].weights;
  const n = (value: number, decimals = 2) => formatNumber(locale, value, decimals);
  const kgM = (value: number) => n(value, value < 10 ? 3 : 2);
  return (
    <div className="grid gap-5">
      <p className="text-muted-foreground max-w-3xl text-sm leading-relaxed" data-aa-alloy-density={rho.toFixed(2)}>
        {t.weightNote(alloyDensityLabel(locale, slug), ALLOY_GRADES[slug].wnr)}
      </p>
      <div className="grid gap-5 md:grid-cols-2">
        {w.round && <WeightTable caption={t.weightCaption.round} head={[t.weightHead.round, t.weightHead.kgPerMetre]} rows={w.round.map((d) => [`Ø ${n(d)}`, kgM(roundKgPerMetre(rho, d))])} />}
        {w.square && <WeightTable caption={t.weightCaption.square} head={[t.weightHead.square, t.weightHead.kgPerMetre]} rows={w.square.map((a) => [`${n(a)} × ${n(a)}`, kgM(squareKgPerMetre(rho, a))])} />}
        {w.flat && <WeightTable caption={t.weightCaption.flat} head={[t.weightHead.flat, t.weightHead.kgPerMetre]} rows={w.flat.map(([b, th]) => [`${n(b)} × ${n(th)}`, kgM(flatKgPerMetre(rho, b, th))])} />}
        {w.plate && (
          <WeightTable caption={t.weightCaption.plate} head={[t.weightHead.plate, t.weightHead.kgPerSquareMetre, t.weightHead.sheet]} rows={w.plate.map((th) => [n(th), kgM(plateKgPerSquareMetre(rho, th)), n(plateSheetKg(rho, th, 2, 6), 1)])} />
        )}
      </div>
    </div>
  );
}
