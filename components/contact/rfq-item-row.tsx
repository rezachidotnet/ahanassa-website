"use client";

import { Trash2, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Locale } from "@/config/locales";
import { RFQ_UOM_LABELS, type RfqUomCode } from "@/lib/rfq/uom";
import { CUSTOM_ITEM_LAUNCH_UOMS, getAllowedUomsForCatalogGroup } from "@/lib/rfq/uom-policy";
import type { RfqRowFieldKey, RfqRowFields } from "@/lib/rfq/item-row-validation";
import type { CatalogCategoryGroup } from "@/lib/rfq/catalog-selector";

/**
 * One RFQ line — rendered twice by the parent (`enquiry-form.tsx`), once as
 * a `<tr>` (desktop table, `layout="table"`) and once as a stacked card
 * (mobile, `layout="card"`), toggled purely via CSS (`hidden lg:table-row` /
 * `lg:hidden`) so there is exactly one row-state source of truth and no
 * duplicated field logic — only the two DOM shapes differ
 * (docs/RFQ_MULTI_ITEM_FORM.md "Mobile layout"). Field ids are prefixed with
 * `layout` since both renders exist in the DOM simultaneously (one just
 * visually hidden) and ids must stay unique.
 *
 * The Category select doubles as the Catalog/Custom mode switch — choosing
 * a real Category puts the row in "catalog" mode (Product/Spec become
 * cascading selects fed by `catalogGroups`, already publication-safe —
 * lib/catalog/editorial-repository.ts#listRfqSelectableCatalogItems);
 * choosing the trailing "Other / custom item" option puts the row in
 * "custom" mode (Product/Spec become free-text inputs). Quantity/Unit/Notes
 * are preserved across a mode switch — only the identity fields reset.
 */

const CUSTOM_CATEGORY_VALUE = "__custom__";
const UNCATEGORIZED_VALUE = "__uncategorized__";

interface RowCopy {
  rowLabel: string;
  categoryPlaceholder: string;
  customCategoryOption: string;
  productPlaceholder: string;
  productCustomPlaceholder: string;
  specPlaceholder: string;
  specSelectPlaceholder: string;
  specCustomPlaceholder: string;
  skuLabel: string;
  quantityPlaceholder: string;
  /** Localized "Select unit" — the unit `<select>` is deliberately never blank (Launch UoM policy safety, withUnitResetIfInvalid), so this is surfaced as an aria-label/title only, never a selectable empty option. */
  unitPlaceholder: string;
  notesPlaceholder: string;
  remove: string;
  fieldRequired: string;
  quantityInvalid: string;
}

const copy: Record<Locale, RowCopy> = {
  fa: {
    rowLabel: "ردیف",
    categoryPlaceholder: "دسته محصول",
    customCategoryOption: "سایر / کالای سفارشی",
    productPlaceholder: "انتخاب محصول",
    productCustomPlaceholder: "مثلاً میلگرد آجدار، ورق سیاه",
    specPlaceholder: "سایز / مشخصات فنی",
    specSelectPlaceholder: "انتخاب سایز",
    specCustomPlaceholder: "ضخامت، ابعاد، گرید و…",
    skuLabel: "کد کالا",
    quantityPlaceholder: "مثلاً ۵۰۰۰",
    unitPlaceholder: "انتخاب واحد",
    notesPlaceholder: "توضیحات اختیاری…",
    remove: "حذف ردیف",
    fieldRequired: "این فیلد را تکمیل کنید",
    quantityInvalid: "مقدار را وارد کنید",
  },
  en: {
    rowLabel: "Row",
    categoryPlaceholder: "Product category",
    customCategoryOption: "Other / custom item",
    productPlaceholder: "Select product",
    productCustomPlaceholder: "e.g. ribbed rebar, hot-rolled sheet",
    specPlaceholder: "Size / specification",
    specSelectPlaceholder: "Select size",
    specCustomPlaceholder: "Thickness, dimensions, grade…",
    skuLabel: "SKU",
    quantityPlaceholder: "e.g. 5000",
    unitPlaceholder: "Select unit",
    notesPlaceholder: "Optional notes…",
    remove: "Remove row",
    fieldRequired: "This field is required",
    quantityInvalid: "Enter a quantity",
  },
  ar: {
    rowLabel: "الصف",
    categoryPlaceholder: "فئة المنتج",
    customCategoryOption: "أخرى / صنف مخصص",
    productPlaceholder: "اختر المنتج",
    productCustomPlaceholder: "مثال: حديد تسليح، صاج أسود",
    specPlaceholder: "المقاس / المواصفات الفنية",
    specSelectPlaceholder: "اختر المقاس",
    specCustomPlaceholder: "السماكة، الأبعاد، الدرجة…",
    skuLabel: "رمز المنتج",
    quantityPlaceholder: "مثلاً ٥٠٠٠",
    unitPlaceholder: "اختر الوحدة",
    notesPlaceholder: "ملاحظات اختيارية…",
    remove: "حذف الصف",
    fieldRequired: "هذا الحقل مطلوب",
    quantityInvalid: "أدخل الكمية",
  },
};

const cellInput =
  "w-full border border-border bg-background px-3 py-2.5 text-sm text-navy outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-copper disabled:opacity-60 disabled:bg-muted";

/**
 * `<select>`-specific variant of `cellInput` — Go-Live Readiness RTL-select
 * clipping fix. The browser's native dropdown affordance does not reliably
 * reserve enough space for long selected text in every browser once the
 * page direction is RTL (found live: text extended underneath the arrow on
 * the left side). `appearance-none` removes the inconsistent native
 * rendering; the select is always wrapped in a `relative` container with an
 * explicit `<ChevronDown>` positioned via `end-3` (a CSS logical property —
 * "inline-end", which resolves to the LEFT in RTL and the RIGHT in LTR
 * automatically, unlike a hardcoded `right-3`), and `pe-9` guarantees fixed,
 * generous padding-inline-end so text can never render under the icon in
 * either direction. `truncate` lets a genuinely long value elide with an
 * ellipsis instead of overflowing; the select's own `title` attribute (set
 * by the caller to the full selected label) exposes the untruncated value
 * on hover/assistive tech.
 */
const selectInput = cn(cellInput, "appearance-none truncate pe-9");

function SelectChevron() {
  return <ChevronDown aria-hidden="true" className="text-muted-foreground pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2" />;
}

/** Wraps a native `<select>` with the positioning context `SelectChevron` needs — never changes the select's own semantics/behavior. */
function SelectField({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("relative", className)}>
      {children}
      <SelectChevron />
    </div>
  );
}

export interface RfqItemRowProps {
  layout: "table" | "card";
  index: number;
  fields: RfqRowFields;
  locale: Locale;
  disabled: boolean;
  errors: RfqRowFieldKey[];
  catalogGroups: CatalogCategoryGroup[];
  onChange: (fields: RfqRowFields) => void;
  onRemove: () => void;
  canRemove: boolean;
  rowRef?: (el: HTMLTableRowElement | HTMLDivElement | null) => void;
}

export function RfqItemRow({ layout, index, fields, locale, disabled, errors, catalogGroups, onChange, onRemove, canRemove, rowRef }: RfqItemRowProps) {
  const t = copy[locale];
  const hasProductError = errors.includes("product");
  const hasQuantityError = errors.includes("quantity");
  const idPrefix = `rfq-item-${layout}-${index}`;

  const hasUncategorizedGroup = catalogGroups.some((g) => g.categoryCode === null);
  const categoryValue =
    fields.mode === "custom" ? CUSTOM_CATEGORY_VALUE : fields.categoryCode !== null ? fields.categoryCode : hasUncategorizedGroup ? UNCATEGORIZED_VALUE : "";
  const selectedCategory = fields.mode === "catalog" ? catalogGroups.find((g) => (g.categoryCode ?? UNCATEGORIZED_VALUE) === categoryValue) : undefined;
  const selectedTemplate = selectedCategory?.templates.find((tpl) => tpl.templateXid === (fields.mode === "catalog" ? fields.templateXid : null));
  const selectedVariant = selectedTemplate?.variants.find((v) => v.variantXid === (fields.mode === "catalog" ? fields.variantXid : null));

  /**
   * The Launch UoM policy for THIS row right now (docs/RFQ_LAUNCH_UOM_ALIGNMENT.md
   * Phase C/H) — a Custom row is always restricted to kg/ton (no
   * authoritative per-unit conversion exists without a real Catalog
   * identity); a Catalog row with a product chosen yet gets its resolved
   * product group's own policy (Rebar->branch, Plate->sheet, SHS->meter);
   * a Catalog row with NO product chosen yet falls back to the same
   * conservative kg/ton set as Custom, never a guessed product-specific
   * unit before the customer has actually picked a product.
   */
  const allowedUnits = fields.mode === "custom" ? CUSTOM_ITEM_LAUNCH_UOMS : getAllowedUomsForCatalogGroup(selectedTemplate?.groupCode);

  /** Resets the row's unit to the new context's default whenever the previously-selected unit is no longer valid for it — never lets an invalid stale unit survive a product change (Phase H's own explicit "do NOT silently submit an invalid stale UoM"). Returns the fields unchanged (aside from the caller's own delta) when the current unit is still valid. */
  function withUnitResetIfInvalid<T extends RfqRowFields>(nextFields: T, nextAllowedUnits: readonly RfqUomCode[]): T {
    if (nextAllowedUnits.includes(nextFields.unit)) return nextFields;
    return { ...nextFields, unit: nextAllowedUnits[0] };
  }

  function handleCategoryChange(value: string) {
    if (!value) return; // the leading placeholder option is disabled/unselectable — defensive only
    if (value === CUSTOM_CATEGORY_VALUE) {
      onChange(withUnitResetIfInvalid({ mode: "custom", productTitle: "", sizeSpec: "", quantityValue: fields.quantityValue, unit: fields.unit, notes: fields.notes }, CUSTOM_ITEM_LAUNCH_UOMS));
    } else {
      // No product chosen yet within the new category -> conservative kg/ton default, same as Custom, until a real Template narrows the policy further.
      onChange(
        withUnitResetIfInvalid(
          { mode: "catalog", categoryCode: value === UNCATEGORIZED_VALUE ? null : value, templateXid: null, variantXid: null, quantityValue: fields.quantityValue, unit: fields.unit, notes: fields.notes },
          CUSTOM_ITEM_LAUNCH_UOMS,
        ),
      );
    }
  }

  function handleTemplateChange(templateXid: string) {
    if (fields.mode !== "catalog") return;
    const newTemplate = selectedCategory?.templates.find((tpl) => tpl.templateXid === templateXid);
    const nextAllowedUnits = getAllowedUomsForCatalogGroup(newTemplate?.groupCode);
    onChange(withUnitResetIfInvalid({ ...fields, templateXid: templateXid || null, variantXid: null }, nextAllowedUnits));
  }

  function handleVariantChange(variantXid: string) {
    if (fields.mode !== "catalog") return;
    onChange({ ...fields, variantXid: variantXid || null });
  }

  function handleQuantityChange(value: string) {
    onChange({ ...fields, quantityValue: value });
  }

  function handleUnitChange(value: string) {
    onChange({ ...fields, unit: value as RfqUomCode });
  }

  function handleNotesChange(value: string) {
    onChange({ ...fields, notes: value });
  }

  const categorySelectedLabel = fields.mode === "custom" ? t.customCategoryOption : (selectedCategory?.categoryLabel ?? t.categoryPlaceholder);
  const categorySelect = (
    <SelectField>
      <select
        id={`${idPrefix}-category`}
        aria-label={t.categoryPlaceholder}
        title={categorySelectedLabel}
        value={categoryValue}
        disabled={disabled}
        onChange={(e) => handleCategoryChange(e.target.value)}
        className={selectInput}
      >
        {categoryValue === "" && (
          <option value="" disabled>
            {t.categoryPlaceholder}
          </option>
        )}
        {catalogGroups.map((group) => (
          <option key={group.categoryCode ?? UNCATEGORIZED_VALUE} value={group.categoryCode ?? UNCATEGORIZED_VALUE}>
            {group.categoryLabel}
          </option>
        ))}
        <option value={CUSTOM_CATEGORY_VALUE}>{t.customCategoryOption}</option>
      </select>
    </SelectField>
  );

  const productCell =
    fields.mode === "catalog" ? (
      <SelectField>
        <select
          id={`${idPrefix}-product`}
          aria-label={t.productPlaceholder}
          aria-invalid={hasProductError && !fields.variantXid}
          title={selectedTemplate?.productLabel ?? t.productPlaceholder}
          value={fields.templateXid ?? ""}
          disabled={disabled || !selectedCategory}
          onChange={(e) => handleTemplateChange(e.target.value)}
          className={cn(selectInput, hasProductError && !fields.variantXid && "border-[var(--aa-color-danger-700)]")}
        >
          <option value="">{t.productPlaceholder}</option>
          {selectedCategory?.templates.map((tpl) => (
            <option key={tpl.templateXid} value={tpl.templateXid}>
              {tpl.productLabel}
            </option>
          ))}
        </select>
      </SelectField>
    ) : (
      <input
        id={`${idPrefix}-product`}
        aria-label={t.productPlaceholder}
        aria-invalid={hasProductError}
        type="text"
        value={fields.productTitle}
        placeholder={t.productCustomPlaceholder}
        disabled={disabled}
        onChange={(e) => onChange({ ...fields, productTitle: e.target.value })}
        className={cn(cellInput, hasProductError && "border-[var(--aa-color-danger-700)]")}
      />
    );

  const specCell =
    fields.mode === "catalog" ? (
      <div className="grid gap-1">
        <SelectField>
          <select
            id={`${idPrefix}-spec`}
            aria-label={t.specPlaceholder}
            title={selectedVariant?.variantSpecLabel ?? t.specSelectPlaceholder}
            value={fields.variantXid ?? ""}
            disabled={disabled || !selectedTemplate}
            onChange={(e) => handleVariantChange(e.target.value)}
            className={selectInput}
          >
            <option value="">{t.specSelectPlaceholder}</option>
            {selectedTemplate?.variants.map((v) => (
              <option key={v.variantXid} value={v.variantXid}>
                {v.variantSpecLabel}
              </option>
            ))}
          </select>
        </SelectField>
        {selectedVariant && (
          <p dir="ltr" className="text-muted-foreground text-left text-[11px]">
            {t.skuLabel}: {selectedVariant.sku}
          </p>
        )}
      </div>
    ) : (
      <input
        id={`${idPrefix}-spec`}
        aria-label={t.specPlaceholder}
        type="text"
        value={fields.sizeSpec}
        placeholder={t.specCustomPlaceholder}
        disabled={disabled}
        onChange={(e) => onChange({ ...fields, sizeSpec: e.target.value })}
        className={cellInput}
      />
    );

  const unitSelect = (
    <SelectField>
      <select
        id={`${idPrefix}-unit`}
        aria-label={t.unitPlaceholder}
        title={RFQ_UOM_LABELS[locale][fields.unit]}
        value={fields.unit}
        disabled={disabled}
        onChange={(e) => handleUnitChange(e.target.value)}
        className={selectInput}
      >
        {allowedUnits.map((code) => (
          <option key={code} value={code}>
            {RFQ_UOM_LABELS[locale][code]}
          </option>
        ))}
      </select>
    </SelectField>
  );

  const quantityInput = (
    <div className="grid gap-1">
      <input
        id={`${idPrefix}-quantity`}
        aria-label={t.quantityPlaceholder}
        aria-invalid={hasQuantityError}
        type="text"
        inputMode="decimal"
        value={fields.quantityValue}
        placeholder={t.quantityPlaceholder}
        disabled={disabled}
        onChange={(e) => handleQuantityChange(e.target.value)}
        className={cn(cellInput, hasQuantityError && "border-[var(--aa-color-danger-700)]")}
      />
      {hasQuantityError && <p className="text-[11px] font-medium text-[var(--aa-color-danger-700)]">{t.quantityInvalid}</p>}
    </div>
  );

  const notesInput = (
    <input
      id={`${idPrefix}-notes`}
      aria-label={t.notesPlaceholder}
      type="text"
      value={fields.notes}
      placeholder={t.notesPlaceholder}
      disabled={disabled}
      onChange={(e) => handleNotesChange(e.target.value)}
      className={cellInput}
    />
  );

  const removeButton = (
    <button
      type="button"
      onClick={onRemove}
      disabled={disabled || !canRemove}
      aria-label={`${t.remove} ${index + 1}`}
      className="text-muted-foreground hover:bg-[var(--aa-color-danger-50)] hover:text-[var(--aa-color-danger-700)] inline-flex size-9 shrink-0 items-center justify-center rounded-[var(--aa-radius-sm)] transition-colors disabled:pointer-events-none disabled:opacity-40"
    >
      <Trash2 className="size-4" aria-hidden="true" />
    </button>
  );

  if (layout === "table") {
    return (
      <tr ref={rowRef as (el: HTMLTableRowElement | null) => void} className={cn("border-border border-b align-top", (hasProductError || hasQuantityError) && "bg-[var(--aa-color-danger-50)]/40")}>
        <td className="text-muted-foreground px-3 py-3 text-center text-sm font-semibold">{index + 1}</td>
        <td className="px-2 py-3">{categorySelect}</td>
        <td className="px-2 py-3">{productCell}</td>
        <td className="px-2 py-3">{specCell}</td>
        <td className="px-2 py-3">{quantityInput}</td>
        <td className="px-2 py-3">{unitSelect}</td>
        <td className="px-2 py-3">{notesInput}</td>
        <td className="px-2 py-3 text-center">{removeButton}</td>
      </tr>
    );
  }

  return (
    <div
      ref={rowRef as (el: HTMLDivElement | null) => void}
      className={cn("border-border grid gap-3 rounded-[var(--aa-radius-md)] border bg-white p-4 shadow-[var(--aa-shadow-xs)]", (hasProductError || hasQuantityError) && "border-[var(--aa-color-danger-700)]")}
    >
      <div className="flex items-center justify-between">
        <span className="text-copper text-xs font-bold uppercase tracking-wide">
          {t.rowLabel} {index + 1}
        </span>
        {removeButton}
      </div>
      <div className="grid gap-2">{categorySelect}</div>
      <div className="grid gap-2">{productCell}</div>
      <div className="grid gap-2">{specCell}</div>
      <div className="grid grid-cols-2 gap-3">
        {quantityInput}
        {unitSelect}
      </div>
      {notesInput}
    </div>
  );
}
