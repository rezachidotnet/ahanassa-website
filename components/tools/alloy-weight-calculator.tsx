"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { ChevronDown, Send } from "lucide-react";
import type { Locale } from "@/config/locales";
import { ButtonLink } from "@/components/ui/button";
import { controlClass, labelClass, selectClass } from "@/components/ui/form-control";
import { cardVariants } from "@/components/ui/surface-variants";
import { ALLOY_CALCULATOR_PARAM, ALLOY_GRADE_SLUGS, ALLOY_GRADES, isAlloyGradeSlug, type AlloyGradeSlug } from "@/lib/alloy/grades";
import { ALLOY_CALCULATOR_COPY } from "@/lib/alloy/calculator-copy";
import { alloyRfqHref, ALLOY_RFQ_TITLES } from "@/lib/alloy/rfq";
import { ALLOY_FORM_FIELDS, ALLOY_FORMS, alloyWeight, isBarForm, type AlloyForm } from "@/lib/alloy/weight";
import { localizeNumbers } from "@/lib/content/locale-digits";
import { DISPLAY_DECIMALS, formatInputValue, formatNumber, parseDecimalInput, roundHalfAwayFromZero } from "@/lib/weight-calculator/format";

/**
 * W43 (D-ALLOY-6) — the weight calculator's alloy/tool steel section: grade × form × dimensions, computed at the
 * GRADE's density (lib/alloy/weight.ts) and saying which density it used. Client-side only, no request. The first
 * render (first grade, round Ø50, 6 m, 1 piece) is also the static HTML, and every number goes through the
 * deterministic formatter, so hydration never depends on the browser's ICU data. `?grade=<slug>` (the guides'
 * «ماشین‌حساب وزن» link) preselects that grade after hydration.
 */
const DEFAULT_DIMS: Readonly<Record<string, number>> = { d: 50, a: 50, b: 100, t: 20, s: 30, l: 300, w: 200, h: 100 };
const DEFAULT_PLATE: Readonly<Record<string, number>> = { t: 20, w: 2, l: 6 };

function Chevron() {
  return <ChevronDown aria-hidden="true" className="text-muted-foreground pointer-events-none absolute end-3.5 top-1/2 size-4 -translate-y-1/2" />;
}

/** ASCII size text for the RFQ row (lib/alloy/rfq.ts SPEC): "Ø 50 mm × 6 m", "t 20 mm, 2 × 6 m". */
function specText(form: AlloyForm, dims: Record<string, number>, lengthM: number): string {
  const v = (x: number) => String(roundHalfAwayFromZero(x, 2));
  const len = ` × ${v(lengthM)} m`;
  switch (form) {
    case "round":
      return `Ø ${v(dims.d)} mm${len}`;
    case "square":
      return `${v(dims.a)} × ${v(dims.a)} mm${len}`;
    case "flat":
      return `${v(dims.b)} × ${v(dims.t)} mm${len}`;
    case "hex":
      return `HEX ${v(dims.s)} mm${len}`;
    case "plate":
      return `t ${v(dims.t)} mm, ${v(dims.w)} × ${v(dims.l)} m`;
    case "block":
      return `${v(dims.l)} × ${v(dims.w)} × ${v(dims.h)} mm`;
    case "disc":
      return `Ø ${v(dims.d)} × ${v(dims.h)} mm`;
  }
}

export function AlloyWeightCalculator({ locale }: { locale: Locale }) {
  const t = ALLOY_CALCULATOR_COPY[locale];
  const id = useId();
  const label = (name: string) => `${id}-${name}`;
  const [slug, setSlug] = useState<AlloyGradeSlug>(ALLOY_GRADE_SLUGS[0]);
  const [form, setForm] = useState<AlloyForm>("round");
  const [inputs, setInputs] = useState<Record<string, string>>(() => Object.fromEntries(Object.entries(DEFAULT_DIMS).map(([k, v]) => [k, formatInputValue(locale, v)])));
  const [plateInputs, setPlateInputs] = useState<Record<string, string>>(() => Object.fromEntries(Object.entries(DEFAULT_PLATE).map(([k, v]) => [k, formatInputValue(locale, v)])));
  const [lengthInput, setLengthInput] = useState(() => formatInputValue(locale, 6));
  const [quantityInput, setQuantityInput] = useState(() => formatInputValue(locale, 1));

  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get(ALLOY_CALCULATOR_PARAM);
    if (requested && isAlloyGradeSlug(requested)) setSlug(requested);
  }, []);

  const grade = ALLOY_GRADES[slug];
  const fields = ALLOY_FORM_FIELDS[form];
  const source = form === "plate" ? plateInputs : inputs;
  const dims = useMemo(() => Object.fromEntries(fields.map((f) => [f, parseDecimalInput(source[f] ?? "")])), [fields, source]);
  const lengthM = parseDecimalInput(lengthInput);
  const quantity = parseDecimalInput(quantityInput);
  const bar = isBarForm(form);
  const result = alloyWeight(form, grade.density, dims, bar ? lengthM : 1);
  const valid = Number.isFinite(result.pieceKg) && Number.isFinite(quantity) && quantity > 0;
  const totalKg = valid ? result.pieceKg * quantity : NaN;
  const rfqHref = valid ? alloyRfqHref(locale, slug, { spec: specText(form, dims, lengthM), quantity: roundHalfAwayFromZero(totalKg, 1), unit: "kg" }) : alloyRfqHref(locale, slug);
  const setField = (name: string, value: string) => (form === "plate" ? setPlateInputs((s) => ({ ...s, [name]: value })) : setInputs((s) => ({ ...s, [name]: value })));

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:items-start" data-aa-alloy-calculator="">
      <form className={cardVariants({ variant: "panel" })} aria-labelledby={label("title")} onSubmit={(e) => e.preventDefault()} noValidate>
        <h2 id={label("title")} className="text-navy text-lg font-bold">
          {t.title}
        </h2>
        <p className="text-muted-foreground mt-2 text-sm leading-relaxed">{t.intro}</p>
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <div className="grid gap-2 sm:col-span-2">
            <label htmlFor={label("grade")} className={labelClass}>
              {t.grade}
            </label>
            <div className="relative">
              <select id={label("grade")} className={selectClass} value={slug} onChange={(e) => isAlloyGradeSlug(e.target.value) && setSlug(e.target.value)}>
                {ALLOY_GRADE_SLUGS.map((s) => (
                  <option key={s} value={s}>
                    {ALLOY_RFQ_TITLES[s][locale]}
                  </option>
                ))}
              </select>
              <Chevron />
            </div>
          </div>
          <div className="grid gap-2 sm:col-span-2">
            <label htmlFor={label("form")} className={labelClass}>
              {t.form}
            </label>
            <div className="relative">
              <select id={label("form")} className={selectClass} value={form} onChange={(e) => setForm(e.target.value as AlloyForm)}>
                {ALLOY_FORMS.map((f) => (
                  <option key={f} value={f}>
                    {t.forms[f]}
                  </option>
                ))}
              </select>
              <Chevron />
            </div>
          </div>
          {fields.map((name) => (
            <div key={`${form}-${name}`} className="grid gap-2">
              <label htmlFor={label(`dim-${name}`)} className={labelClass}>
                {form === "plate" ? t.plateFields[name] : t.fields[name]}
              </label>
              <input id={label(`dim-${name}`)} className={controlClass} inputMode="decimal" autoComplete="off" dir="ltr" value={source[name] ?? ""} onChange={(e) => setField(name, e.target.value)} />
            </div>
          ))}
          {bar && (
            <div className="grid gap-2">
              <label htmlFor={label("length")} className={labelClass}>
                {t.length}
              </label>
              <input id={label("length")} className={controlClass} inputMode="decimal" autoComplete="off" dir="ltr" value={lengthInput} onChange={(e) => setLengthInput(e.target.value)} />
            </div>
          )}
          <div className="grid gap-2">
            <label htmlFor={label("quantity")} className={labelClass}>
              {t.quantity}
            </label>
            <input id={label("quantity")} className={controlClass} inputMode="decimal" autoComplete="off" dir="ltr" value={quantityInput} onChange={(e) => setQuantityInput(e.target.value)} />
          </div>
        </div>
      </form>

      <section aria-labelledby={label("result")} className={cardVariants({ variant: "panel", tone: "subtle" })}>
        <h2 id={label("result")} className="text-navy text-lg font-bold">
          {t.resultTitle}
        </h2>
        <p className="text-navy mt-3 text-sm font-semibold" data-aa-alloy-density={grade.density.toFixed(2)}>
          {t.densityUsed(localizeNumbers(locale, grade.density.toFixed(2)), grade.wnr)}
        </p>
        <div aria-live="polite" aria-atomic="true" className="mt-4">
          {valid ? (
            <dl className="divide-border grid divide-y text-sm">
              {(bar || form === "plate") && (
                <div className="flex items-baseline justify-between gap-4 py-3">
                  <dt className="text-neutral-700">{bar ? t.perMetre : t.perSquareMetre}</dt>
                  <dd className="text-navy font-semibold">
                    {formatNumber(locale, result.perUnit, DISPLAY_DECIMALS.perMetre)} {bar ? t.unitKgPerMetre : t.unitKgPerSquareMetre}
                  </dd>
                </div>
              )}
              <div className="flex items-baseline justify-between gap-4 py-3">
                <dt className="text-neutral-700">{t.perPiece}</dt>
                <dd className="text-navy font-semibold">
                  {formatNumber(locale, result.pieceKg, DISPLAY_DECIMALS.perPiece)} {t.unitKg}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-4 py-3">
                <dt className="text-neutral-700">{t.total}</dt>
                <dd className="text-navy text-base font-extrabold">
                  {formatNumber(locale, totalKg, DISPLAY_DECIMALS.totalKg)} {t.unitKg}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-4 py-3">
                <dt className="text-neutral-700">{t.totalTon}</dt>
                <dd className="text-navy font-semibold">
                  {formatNumber(locale, totalKg / 1000, DISPLAY_DECIMALS.totalTon)} {t.unitTon}
                </dd>
              </div>
            </dl>
          ) : (
            <p className="text-neutral-700 text-sm">{t.invalid}</p>
          )}
        </div>
        <p className="text-muted-foreground mt-4 text-xs leading-relaxed">{t.weighedNote}</p>
        <ButtonLink href={rfqHref} variant="primary" size="md" className="mt-5 h-auto min-h-12 w-full py-3">
          <Send aria-hidden="true" />
          {t.rfqCta}
        </ButtonLink>
      </section>
    </div>
  );
}
