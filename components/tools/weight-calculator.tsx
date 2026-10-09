"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { ChevronDown, Send } from "lucide-react";
import { localizedPath, type Locale } from "@/config/locales";
import { ButtonLink } from "@/components/ui/button";
import Link from "@/components/ui/link";
import { controlClass, labelClass, selectClass } from "@/components/ui/form-control";
import { badgeVariants, cardVariants } from "@/components/ui/surface-variants";
import { WEIGHT_CALCULATOR_COPY } from "@/lib/weight-calculator/copy";
import { DISPLAY_DECIMALS, formatInputValue, formatNumber, parseDecimalInput } from "@/lib/weight-calculator/format";
import { rfqHandoffHref } from "@/lib/weight-calculator/handoff";
import {
  beamTableKgPerMetre,
  computeWeight,
  CUSTOM_FIELDS,
  customBasis,
  defaultLengthM,
  isLinearShape,
  supportsCustomSize,
  tableOnlySizes,
  type CalculatorProduct,
  type QuantityMode,
  type ShapeKind,
} from "@/lib/weight-calculator/model";
import { estimateCostToman, type CalculatorPrices } from "@/lib/weight-calculator/price";
import { PRICE_DISCLAIMER, type PriceLocale } from "@/lib/pricing/price-locale";
import { PRICE_RFQ_COPY, priceRfqHref } from "@/lib/pricing/price-rfq";

/**
 * Steel weight / conversion calculator (W10.1). Client-side only: every
 * figure is computed in the browser from the build-time catalog payload
 * (`products`); there is no request of any kind. The first render — first
 * product, first size, 1 piece — is also what the static HTML shows, and
 * every number goes through the deterministic formatter (format.ts), so
 * hydration never depends on the browser's ICU data.
 *
 * `?variant=<CVAR>` (the product pages' «محاسبه وزن» link) preselects that
 * size after hydration, the same way /contact reads its `?variant=`.
 *
 * `prices` is the optional W9.4 price data (fa only, variant xid → price);
 * without it the cost row is not rendered at all.
 */
const CUSTOM = "custom";
const variantValue = (xid: string) => `v:${xid}`;
const tableValue = (height: number) => `t:${height}`;

function basisLine(shape: ShapeKind): "rebar" | "plate" | "hollow" | "pipe" | "angle" | "channel" | "beam" {
  if (shape === "shs" || shape === "rhs") return "hollow";
  if (shape === "ipe" || shape === "ipn") return "beam";
  return shape;
}

function Chevron() {
  return <ChevronDown aria-hidden="true" className="text-muted-foreground pointer-events-none absolute end-3.5 top-1/2 size-4 -translate-y-1/2" />;
}

export function WeightCalculator({ locale, products, prices }: { locale: Locale; products: CalculatorProduct[]; prices?: CalculatorPrices }) {
  const t = WEIGHT_CALCULATOR_COPY[locale];
  const id = useId();
  const [productIndex, setProductIndex] = useState(0);
  const product = products[productIndex];
  const [sizeValue, setSizeValue] = useState(() => (product?.variants[0] ? variantValue(product.variants[0].xid) : CUSTOM));
  const [customValues, setCustomValues] = useState<Record<string, string>>({});
  const [lengthText, setLengthText] = useState(() => (product ? formatInputValue(locale, defaultLengthM(product, product.variants[0])) : ""));
  const [mode, setMode] = useState<QuantityMode>("pieces");
  const [quantityText, setQuantityText] = useState(() => formatInputValue(locale, 1));

  function selectProduct(index: number, xid?: string) {
    const next = products[index];
    if (!next) return;
    const variant = next.variants.find((v) => v.xid === xid) ?? next.variants[0];
    setProductIndex(index);
    setSizeValue(variant ? variantValue(variant.xid) : CUSTOM);
    setCustomValues({});
    setLengthText(formatInputValue(locale, defaultLengthM(next, variant)));
  }

  function selectSize(value: string) {
    setSizeValue(value);
    if (value === CUSTOM) {
      // Start the custom form from the size that was selected, where the catalog has the dimension.
      const from = product.variants.find((v) => variantValue(v.xid) === sizeValue);
      const prefill: Record<string, string> = {};
      for (const field of CUSTOM_FIELDS[product.shape]) {
        const mm = from?.dimensions[field.dimensionKey];
        if (mm) prefill[field.key] = formatInputValue(locale, mm);
      }
      setCustomValues(prefill);
      return;
    }
    const variant = product.variants.find((v) => variantValue(v.xid) === value);
    setLengthText(formatInputValue(locale, defaultLengthM(product, variant)));
  }

  // ?variant= preselection (product pages), after hydration so the static HTML stays the default.
  useEffect(() => {
    const xid = new URLSearchParams(window.location.search).get("variant");
    if (!xid) return;
    const index = products.findIndex((p) => p.variants.some((v) => v.xid === xid));
    if (index >= 0) selectProduct(index, xid);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const computed = useMemo(() => {
    if (!product) return null;
    const linear = isLinearShape(product.shape);
    const variant = sizeValue.startsWith("v:") ? product.variants.find((v) => variantValue(v.xid) === sizeValue) ?? null : null;
    let source: "catalog" | "table" | "formula";
    let basis: { kgPerMetre: number; kgPerSquareMetre: number; pieceKg: number | null };
    if (variant) {
      source = variant.source;
      basis = variant;
    } else if (sizeValue.startsWith("t:")) {
      source = "table";
      basis = { kgPerMetre: beamTableKgPerMetre(product.shape, Number(sizeValue.slice(2))), kgPerSquareMetre: NaN, pieceKg: null };
    } else {
      source = "formula";
      const values: Record<string, number> = {};
      for (const field of CUSTOM_FIELDS[product.shape]) {
        const raw = customValues[field.key]?.trim() ?? "";
        if (raw || !field.optional) values[field.key] = parseDecimalInput(raw);
      }
      basis = customBasis(product.shape, values);
    }
    const lengthM = linear ? parseDecimalInput(lengthText) : NaN;
    const quantity = parseDecimalInput(quantityText);
    const result = computeWeight({ linear, ...basis, lengthM, mode, quantity });
    return { linear, variant, source, result, lengthM, quantity };
  }, [product, sizeValue, customValues, lengthText, mode, quantityText]);

  if (!product || !computed) return null;
  const { linear, variant, source, result } = computed;
  const pieceKind = linear ? "bar" : "sheet";
  const n = (value: number, decimals: number) => formatNumber(locale, value, decimals);
  // fa and ar only (owner decision change 2026-10-09); en is never given prices.
  const price = (locale === "fa" || locale === "ar") && variant && result ? prices?.[variant.xid] : undefined;
  const tableSizes = tableOnlySizes(product);
  const label = (field: string) => `${id}-${field}`;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:items-start">
      <form className={cardVariants({ variant: "panel" })} aria-labelledby={label("form-title")} onSubmit={(e) => e.preventDefault()} noValidate>
        <h2 id={label("form-title")} className="text-navy text-lg font-bold">
          {t.formTitle}
        </h2>

        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <div className="grid gap-2 sm:col-span-2">
            <label htmlFor={label("product")} className={labelClass}>
              {t.product}
            </label>
            <div className="relative">
              <select id={label("product")} className={selectClass} value={productIndex} onChange={(e) => selectProduct(Number(e.target.value))}>
                {products.map((p, i) => (
                  <option key={p.templateXid} value={i}>
                    {p.label}
                  </option>
                ))}
              </select>
              <Chevron />
            </div>
          </div>

          <div className="grid gap-2 sm:col-span-2">
            <label htmlFor={label("size")} className={labelClass}>
              {t.size}
            </label>
            <div className="relative">
              <select id={label("size")} className={selectClass} value={sizeValue} onChange={(e) => selectSize(e.target.value)}>
                {product.variants.map((v) => (
                  <option key={v.xid} value={variantValue(v.xid)}>
                    {v.size}
                  </option>
                ))}
                {tableSizes.map((h) => (
                  <option key={h} value={tableValue(h)}>
                    {t.tableSize(`${product.shape === "ipe" ? "IPE" : "IPN"} ${h}`)}
                  </option>
                ))}
                {supportsCustomSize(product.shape) && <option value={CUSTOM}>{t.customSize}</option>}
              </select>
              <Chevron />
            </div>
          </div>

          {sizeValue === CUSTOM &&
            CUSTOM_FIELDS[product.shape].map((field) => (
              <div key={field.key} className="grid gap-2">
                <label htmlFor={label(`dim-${field.key}`)} className={labelClass}>
                  {t.fields[product.shape][field.key]}
                </label>
                <input
                  id={label(`dim-${field.key}`)}
                  className={controlClass}
                  inputMode="decimal"
                  autoComplete="off"
                  dir="ltr"
                  value={customValues[field.key] ?? ""}
                  aria-invalid={!field.optional && !(parseDecimalInput(customValues[field.key] ?? "") > 0) ? true : undefined}
                  onChange={(e) => setCustomValues((prev) => ({ ...prev, [field.key]: e.target.value }))}
                />
              </div>
            ))}

          {linear && (
            <div className="grid gap-2 sm:col-span-2">
              <label htmlFor={label("length")} className={labelClass}>
                {t.length}
              </label>
              <input
                id={label("length")}
                className={controlClass}
                inputMode="decimal"
                autoComplete="off"
                dir="ltr"
                value={lengthText}
                aria-invalid={!(parseDecimalInput(lengthText) > 0) ? true : undefined}
                onChange={(e) => setLengthText(e.target.value)}
              />
            </div>
          )}

          <div className="grid gap-2">
            <label htmlFor={label("quantity")} className={labelClass}>
              {t.quantity}
            </label>
            <input
              id={label("quantity")}
              className={controlClass}
              inputMode="decimal"
              autoComplete="off"
              dir="ltr"
              value={quantityText}
              aria-invalid={!(parseDecimalInput(quantityText) > 0) ? true : undefined}
              onChange={(e) => setQuantityText(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <label htmlFor={label("mode")} className={labelClass}>
              {t.unit}
            </label>
            <div className="relative">
              <select id={label("mode")} className={selectClass} value={mode} onChange={(e) => setMode(e.target.value as QuantityMode)}>
                <option value="pieces">{t.piece[pieceKind]}</option>
                <option value="kg">{t.kg}</option>
                <option value="ton">{t.ton}</option>
              </select>
              <Chevron />
            </div>
          </div>
        </div>
      </form>

      <section aria-labelledby={label("result-title")} className={cardVariants({ variant: "panel", tone: "subtle" })}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id={label("result-title")} className="text-navy text-lg font-bold">
            {t.resultTitle}
          </h2>
          <span className={badgeVariants({ tone: source === "catalog" ? "info" : "tag" })}>{t.source[source]}</span>
        </div>

        {/* One live region for every figure: announced politely, as a whole, after each change. */}
        <div aria-live="polite" aria-atomic="true" className="mt-5">
          {result ? (
            <dl className="divide-border grid divide-y text-sm">
              <div className="flex items-baseline justify-between gap-4 py-3">
                <dt className="text-neutral-700">{linear ? t.perMetre : t.perSquareMetre}</dt>
                <dd className="text-navy font-semibold">
                  {n(result.perUnit, DISPLAY_DECIMALS.perMetre)} {linear ? t.unitKgPerMetre : t.unitKgPerSquareMetre}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-4 py-3">
                <dt className="text-neutral-700">{t.perPiece[pieceKind]}</dt>
                <dd className="text-navy font-semibold">
                  {n(result.perPiece, DISPLAY_DECIMALS.perPiece)} {t.unitKg}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-4 py-3">
                <dt className="text-neutral-700">{mode === "pieces" ? t.pieces[pieceKind] : t.piecesNeeded[pieceKind]}</dt>
                <dd className="text-navy text-end font-semibold">
                  {n(result.piecesWhole, 0)} {t.piece[pieceKind]}
                  {/* The exact count only when it differs at display precision (4.512 t of IPE 180 is 19.999… pieces, shown as 20). */}
                  {mode !== "pieces" && n(result.pieces, DISPLAY_DECIMALS.pieces) !== n(result.piecesWhole, 0) && (
                    <span className="text-tertiary block text-xs font-normal">{t.exactPieces(n(result.pieces, DISPLAY_DECIMALS.pieces))}</span>
                  )}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-4 py-3">
                <dt className="text-neutral-700">{t.total}</dt>
                <dd className="text-navy text-lg font-extrabold">
                  {n(result.totalKg, DISPLAY_DECIMALS.totalKg)} {t.unitKg}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-4 py-3">
                <dt className="text-neutral-700">{t.totalTon}</dt>
                <dd className="text-navy font-semibold">
                  {n(result.totalTon, DISPLAY_DECIMALS.totalTon)} {t.unitTon}
                </dd>
              </div>
              {price && (
                <div className="grid gap-1 py-3">
                  <div className="flex items-baseline justify-between gap-4">
                    <dt className="text-neutral-700">
                      {t.priceLabel.before}
                      {price.datetime ? <time dateTime={price.datetime}>{price.dateLabel}</time> : price.dateLabel}
                      {t.priceLabel.after}
                    </dt>
                    <dd className="text-navy font-semibold">
                      ≈ {n(estimateCostToman(result.totalKg, price), 0)} {t.priceUnit}
                    </dd>
                  </div>
                  <p className="text-tertiary text-xs leading-relaxed">{t.priceDisclaimer}</p>
                  {/* W9.6: the price disclaimer (fa/ar) and «استعلام قیمت نهایی» — the RFQ form with this variant and quantity (+ the factory on fa). */}
                  <p className="text-tertiary text-xs leading-relaxed">{PRICE_DISCLAIMER[locale as PriceLocale]}</p>
                  <Link
                    href={priceRfqHref(locale as PriceLocale, variant!.xid, price.factory, rfqHandoffHref(locale, { variantXid: variant!.xid, groupCode: product.groupCode, mode, quantity: computed.quantity, result: result!, lengthM: linear ? computed.lengthM : null }).split("?")[1])}
                    className="text-copper justify-self-start text-sm font-semibold underline underline-offset-4"
                  >
                    {PRICE_RFQ_COPY[locale as PriceLocale]}
                  </Link>
                </div>
              )}
            </dl>
          ) : (
            <p className="text-neutral-700 text-sm">{t.invalid}</p>
          )}
        </div>

        <p className="text-tertiary mt-4 text-xs leading-relaxed">{source === "catalog" ? t.basisCatalog : t.basis[basisLine(product.shape)]}</p>

        {variant && result ? (
          <ButtonLink
            href={rfqHandoffHref(locale, { variantXid: variant.xid, groupCode: product.groupCode, mode, quantity: computed.quantity, result, lengthM: linear ? computed.lengthM : null })}
            variant="primary"
            className="mt-6 h-auto min-h-12 w-full py-3"
          >
            <Send aria-hidden="true" />
            {t.rfqCta}
          </ButtonLink>
        ) : (
          <p className="text-neutral-700 mt-6 text-sm">
            {t.rfqCustomNote}{" "}
            <Link href={localizedPath(locale, "/contact")} className="text-copper font-semibold underline underline-offset-4">
              {t.rfqCustomLink}
            </Link>
          </p>
        )}
      </section>
    </div>
  );
}
