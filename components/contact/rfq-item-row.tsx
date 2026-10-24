"use client";

import { Fragment } from "react";
import { Trash2, ChevronDown, FileText, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { controlClass, selectClass } from "@/components/ui/form-control";
import type { Locale } from "@/config/locales";
import { RFQ_UOM_LABELS, type RfqUomCode } from "@/lib/rfq/uom";
import { CUSTOM_ITEM_LAUNCH_UOMS, getAllowedUomsForCatalogGroup } from "@/lib/rfq/uom-policy";
import { isLengthMmSupportedForGroup } from "@/lib/rfq/length-policy";
import { isValidLengthMmValue, type RfqRowFieldKey, type RfqRowFields } from "@/lib/rfq/item-row-validation";
import type { CatalogCategoryGroup } from "@/lib/rfq/catalog-selector";
import type { ExtractReviewReason } from "@/lib/rfq/extract/to-rows";

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
  /** POST-P3F RFQ length_mm — optional requested commercial length, shown only for a product group where `isLengthMmSupportedForGroup` is true. */
  lengthLabel: string;
  lengthPlaceholder: string;
  lengthHelp: string;
  lengthInvalid: string;
  /** W25: under the category select while the catalog file is on its way, and if it never arrives. */
  catalogLoading: string;
  catalogFailed: string;
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
    lengthLabel: "طول درخواستی",
    lengthPlaceholder: "مثلاً ۶۰۰۰ (اختیاری، میلی‌متر)",
    lengthHelp: "این مقدار فقط درخواست شماست؛ سایز و طول نهایی توسط کارشناسان آهن آسا بررسی می‌شود.",
    lengthInvalid: "عدد صحیح و مثبت وارد کنید",
    catalogLoading: "در حال بارگذاری فهرست محصولات… تا آن زمان می‌توانید «سایر / کالای سفارشی» را انتخاب کنید.",
    catalogFailed: "فهرست محصولات بارگذاری نشد؛ کالا را با «سایر / کالای سفارشی» شرح دهید.",
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
    lengthLabel: "Requested length",
    lengthPlaceholder: "e.g. 6000 (optional, mm)",
    lengthHelp: "This is your request only — final size and length are reviewed by Ahan Assa's team.",
    lengthInvalid: "Enter a positive whole number",
    catalogLoading: "Loading the product list… Meanwhile you can choose “Other / custom item”.",
    catalogFailed: "The product list could not be loaded — describe the item with “Other / custom item”.",
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
    lengthLabel: "الطول المطلوب",
    lengthPlaceholder: "مثلاً ٦٠٠٠ (اختياري، ملم)",
    lengthHelp: "هذه رغبتك فقط؛ سيراجع فريق آهن آسا المقاس والطول النهائي.",
    lengthInvalid: "أدخل رقمًا صحيحًا موجبًا",
    catalogLoading: "جارٍ تحميل قائمة المنتجات… يمكنك حتى ذلك الحين اختيار «أخرى / صنف مخصص».",
    catalogFailed: "تعذّر تحميل قائمة المنتجات؛ صِف الصنف عبر «أخرى / صنف مخصص».",
  },
};

/**
 * W13.3: a row the form filled from the customer's attached list. Shows where it came from, the
 * customer's own text (plain text, only to the person who attached the file) and, when unsure,
 * «لطفاً بررسی کنید» with what to check.
 */
export interface RfqRowFromFile {
  rawText: string;
  review: boolean;
  reasons: ExtractReviewReason[];
  /** Read from a picture: its numbers always need checking. */
  picture: boolean;
}

const fromFileCopy: Record<Locale, { chip: string; review: string; inFile: string; picture: string; reasons: Record<ExtractReviewReason, string> }> = {
  fa: {
    chip: "از فایل شما",
    review: "لطفاً بررسی کنید",
    inFile: "در فایل شما:",
    picture: "اعداد خوانده‌شده از عکس را با فایل خود مقایسه کنید.",
    reasons: {
      check_product: "محصول یا سایز دقیق را از فهرست انتخاب کنید.",
      not_in_catalog: "در فهرست محصولات ما نبود؛ به‌صورت کالای سفارشی ثبت شد.",
      quantity_missing: "مقدار را وارد کنید.",
      unit_missing: "واحد را بررسی کنید.",
      unit_not_offered: "این واحد برای این ردیف در فهرست نیست؛ مقدار را با یکی از واحدهای فهرست وارد کنید.",
    },
  },
  en: {
    chip: "From your file",
    review: "Please check",
    inFile: "In your file:",
    picture: "Compare the numbers read from the picture with your file.",
    reasons: {
      check_product: "Choose the exact product or size from the list.",
      not_in_catalog: "Not in our product list — kept as a custom item.",
      quantity_missing: "Enter the quantity.",
      unit_missing: "Check the unit.",
      unit_not_offered: "That unit is not offered for this row; enter the quantity in one of the listed units.",
    },
  },
  ar: {
    chip: "من ملفك",
    review: "يرجى المراجعة",
    inFile: "في ملفك:",
    picture: "قارن الأرقام المقروءة من الصورة بملفك.",
    reasons: {
      check_product: "اختر المنتج أو المقاس بدقة من القائمة.",
      not_in_catalog: "غير موجود في قائمة منتجاتنا؛ أُضيف كصنف مخصص.",
      quantity_missing: "أدخل الكمية.",
      unit_missing: "تحقق من الوحدة.",
      unit_not_offered: "هذه الوحدة غير متاحة لهذا الصف؛ أدخل الكمية بإحدى الوحدات المتاحة.",
    },
  },
};

function FromFileNote({ fromFile, locale, id }: { fromFile: RfqRowFromFile; locale: Locale; id: string }) {
  const t = fromFileCopy[locale];
  const hints = [...fromFile.reasons.map((r) => t.reasons[r]), ...(fromFile.picture ? [t.picture] : [])];
  return (
    <div id={id} className="grid gap-1 text-xs leading-relaxed" data-rfq-from-file={fromFile.review ? "review" : ""}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="border-border text-navy inline-flex items-center gap-1 rounded-[var(--aa-radius-badge)] border bg-white px-2 py-0.5 font-semibold">
          <FileText className="text-copper size-3.5" aria-hidden="true" />
          {t.chip}
        </span>
        {fromFile.review && (
          <span className="inline-flex items-center gap-1 rounded-[var(--aa-radius-badge)] bg-[var(--aa-color-warning-800)] px-2 py-0.5 font-bold text-white">
            <AlertTriangle className="size-3.5" aria-hidden="true" />
            {t.review}
          </span>
        )}
        {hints.length > 0 && <span className="text-[var(--aa-color-warning-800)]">{hints.join(" ")}</span>}
      </div>
      <p className="text-muted-foreground min-w-0 break-words">
        {t.inFile} <bdi dir="auto" className="text-navy">{fromFile.rawText}</bdi>
      </p>
    </div>
  );
}

// Shared control styles (components/ui/form-control.ts, W10.2) — the same 48px / 8px / 3:1-border controls as the customer fields.
const cellInput = controlClass;

/**
 * `<select>`-specific variant of `cellInput` — Go-Live Readiness RTL-select
 * clipping fix. The browser's native dropdown affordance does not reliably
 * reserve enough space for long selected text in every browser once the
 * page direction is RTL (found live: text extended underneath the arrow on
 * the left side). `appearance-none` removes the inconsistent native
 * rendering; the select is always wrapped in a `relative` container with an
 * explicit `<ChevronDown>` positioned via `end-3` (a CSS logical property —
 * "inline-end", which resolves to the LEFT in RTL and the RIGHT in LTR
 * automatically, unlike a hardcoded `right-3`), and `pe-10` (form-control.ts) guarantees fixed,
 * generous padding-inline-end so text can never render under the icon in
 * either direction. `truncate` lets a genuinely long value elide with an
 * ellipsis instead of overflowing; the select's own `title` attribute (set
 * by the caller to the full selected label) exposes the untruncated value
 * on hover/assistive tech.
 */
const selectInput = selectClass;

function SelectChevron() {
  return <ChevronDown aria-hidden="true" className="text-muted-foreground pointer-events-none absolute end-3.5 top-1/2 size-4 -translate-y-1/2" />;
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
  /** W25: the catalog file is still loading, or failed — `catalogGroups` is empty meanwhile and the row says so. */
  catalogStatus?: "loading" | "ready" | "failed";
  /** W13.3: set when the row was filled from an attached list. */
  fromFile?: RfqRowFromFile | null;
  onChange: (fields: RfqRowFields) => void;
  onRemove: () => void;
  canRemove: boolean;
  rowRef?: (el: HTMLTableRowElement | HTMLDivElement | null) => void;
}

export function RfqItemRow({ layout, index, fields, locale, disabled, errors, catalogGroups, catalogStatus = "ready", fromFile = null, onChange, onRemove, canRemove, rowRef }: RfqItemRowProps) {
  const t = copy[locale];
  const hasProductError = errors.includes("product");
  const hasQuantityError = errors.includes("quantity");
  const hasLengthError = errors.includes("length");
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

  /**
   * Product-aware visibility (docs/POST_P3F_RFQ_LENGTH_MM_FULL_STACK_REPORT.md
   * "Product-Aware Visibility") — the optional requested-length input only
   * ever appears for a Catalog row whose resolved product group's own
   * commercial dimensions do NOT already include a length
   * (`lib/rfq/length-policy.ts`, currently ANGLE/CHANNEL only). A Custom
   * row, or a Catalog row with no product chosen yet, never shows it.
   */
  const showLengthInput = fields.mode === "catalog" && isLengthMmSupportedForGroup(selectedTemplate?.groupCode);

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
          {
            mode: "catalog",
            categoryCode: value === UNCATEGORIZED_VALUE ? null : value,
            templateXid: null,
            variantXid: null,
            quantityValue: fields.quantityValue,
            unit: fields.unit,
            notes: fields.notes,
            lengthMm: fields.mode === "catalog" ? fields.lengthMm : "",
          },
          CUSTOM_ITEM_LAUNCH_UOMS,
        ),
      );
    }
  }

  function handleTemplateChange(templateXid: string) {
    if (fields.mode !== "catalog") return;
    const newTemplate = selectedCategory?.templates.find((tpl) => tpl.templateXid === templateXid);
    const nextAllowedUnits = getAllowedUomsForCatalogGroup(newTemplate?.groupCode);
    // A previously-typed length must never silently survive a switch to a
    // product group that doesn't offer this input (it would otherwise be
    // submitted invisibly — the input disappears from the UI but
    // `buildRfqItemInput` has no group awareness of its own to drop it).
    // Mirrors `withUnitResetIfInvalid`'s own "never let a stale value
    // survive a product change" discipline for `unit`.
    const nextLengthMm = isLengthMmSupportedForGroup(newTemplate?.groupCode) ? fields.lengthMm : "";
    onChange(withUnitResetIfInvalid({ ...fields, templateXid: templateXid || null, variantXid: null, lengthMm: nextLengthMm }, nextAllowedUnits));
  }

  function handleVariantChange(variantXid: string) {
    if (fields.mode !== "catalog") return;
    onChange({ ...fields, variantXid: variantXid || null });
  }

  function handleLengthMmChange(value: string) {
    if (fields.mode !== "catalog") return;
    onChange({ ...fields, lengthMm: value });
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
  const catalogNote = fields.mode === "catalog" && catalogGroups.length === 0 && catalogStatus !== "ready" ? (catalogStatus === "loading" ? t.catalogLoading : t.catalogFailed) : null;
  const categorySelect = (
    <>
      <SelectField>
        <select
          id={`${idPrefix}-category`}
          aria-label={t.categoryPlaceholder}
          aria-describedby={catalogNote ? `${idPrefix}-catalog-note` : undefined}
          aria-busy={catalogStatus === "loading" || undefined}
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
      {catalogNote && (
        <p id={`${idPrefix}-catalog-note`} className="text-muted-foreground mt-1 text-[11px] leading-relaxed" data-rfq-catalog-status={catalogStatus}>
          {catalogNote}
        </p>
      )}
    </>
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
        {showLengthInput && (
          <div className="grid gap-1">
            <label htmlFor={`${idPrefix}-length`} className="text-muted-foreground text-[11px] font-medium">
              {t.lengthLabel}
            </label>
            <input
              id={`${idPrefix}-length`}
              aria-label={t.lengthLabel}
              aria-invalid={hasLengthError}
              aria-describedby={`${idPrefix}-length-help`}
              type="text"
              inputMode="numeric"
              value={fields.lengthMm}
              placeholder={t.lengthPlaceholder}
              disabled={disabled}
              onChange={(e) => handleLengthMmChange(e.target.value)}
              className={cn(cellInput, "text-sm", hasLengthError && "border-[var(--aa-color-danger-700)]")}
            />
            <p id={`${idPrefix}-length-help`} className="text-muted-foreground text-[11px] leading-snug">
              {t.lengthHelp}
            </p>
            {hasLengthError && <p className="text-[11px] font-medium text-[var(--aa-color-danger-700)]">{t.lengthInvalid}</p>}
          </div>
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
    <Button
      variant="ghost"
      size="icon"
      onClick={onRemove}
      disabled={disabled || !canRemove}
      aria-label={`${t.remove} ${index + 1}`}
      className="text-muted-foreground hover:bg-danger-50 hover:text-danger"
    >
      <Trash2 className="size-4" aria-hidden="true" />
    </Button>
  );

  const hasError = hasProductError || hasQuantityError || hasLengthError;
  const review = Boolean(fromFile?.review);
  const fromFileId = `${idPrefix}-from-file`;

  if (layout === "table") {
    return (
      <Fragment>
      <tr
        ref={rowRef as (el: HTMLTableRowElement | null) => void}
        aria-describedby={fromFile ? fromFileId : undefined}
        className={cn("align-top", fromFile ? "" : "border-border border-b", hasError ? "bg-[var(--aa-color-danger-50)]/40" : review && "bg-[var(--aa-color-warning-50)]")}
      >
        <td className="text-muted-foreground px-3 py-3 text-center text-sm font-semibold">{index + 1}</td>
        <td className="px-2 py-3">{categorySelect}</td>
        <td className="px-2 py-3">{productCell}</td>
        <td className="px-2 py-3">{specCell}</td>
        <td className="px-2 py-3">{quantityInput}</td>
        <td className="px-2 py-3">{unitSelect}</td>
        <td className="px-2 py-3">{notesInput}</td>
        <td className="px-2 py-3 text-center">{removeButton}</td>
      </tr>
      {fromFile && (
        <tr className={cn("border-border border-b", hasError ? "bg-[var(--aa-color-danger-50)]/40" : review && "bg-[var(--aa-color-warning-50)]")}>
          <td />
          <td colSpan={7} className="px-2 pb-3">
            <FromFileNote fromFile={fromFile} locale={locale} id={fromFileId} />
          </td>
        </tr>
      )}
      </Fragment>
    );
  }

  return (
    <div
      ref={rowRef as (el: HTMLDivElement | null) => void}
      aria-describedby={fromFile ? fromFileId : undefined}
      className={cn(
        "border-border grid gap-3 rounded-[var(--aa-radius-md)] border bg-white p-4 shadow-[var(--aa-shadow-xs)]",
        review && "border-[var(--aa-color-warning-800)] border-s-4 bg-[var(--aa-color-warning-50)]",
        hasError && "border-[var(--aa-color-danger-700)]",
      )}
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
      {fromFile && <FromFileNote fromFile={fromFile} locale={locale} id={fromFileId} />}
    </div>
  );
}
