import { locales, type Locale } from "@/config/locales";
import { getSampleProduct } from "@/lib/content/catalog-sample";
import { isValidIdempotencyKey } from "@/lib/rfq/idempotency";
import { normalizeDigits, parseLeadingQuantity } from "@/lib/rfq/quantity";
import type { RfqItemInput, RfqSubmissionInput } from "@/lib/rfq/types";

/**
 * Server-side RFQ validation. Hand-rolled rather than a schema-validation
 * dependency — no such library is installed in this project (package.json
 * stays dependency-minimal throughout), and this schema is small and
 * flat enough to validate correctly by hand without one.
 *
 * Limits reconciled against 01-sources/FORM_ARCHITECTURE.md §7.5/§8
 * ("Recommended maximums" table) — that document specs a richer form
 * (document upload, structured attribution) than the currently approved
 * RFQ UI collects; only the field-length numbers that map onto fields the
 * approved form actually has were carried over. See DOCUMENT_AUDIT_REPORT.md.
 */

export const MAX_ITEMS = 20;
export const MAX_BODY_BYTES = 20_000;

const LIMITS = {
  fullName: { min: 2, max: 100 },
  companyName: { max: 160 },
  email: { max: 254 },
  phone: { max: 32 },
  deliveryLocation: { max: 200 },
  message: { max: 3000 },
  gradeOrStandard: { max: 100 },
  quantityText: { max: 100 },
  freeformTitle: { max: 160 },
  categoryLabel: { max: 100 },
  description: { max: 1000 },
} as const;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface ValidationResult {
  ok: boolean;
  fieldErrors: Record<string, string[]>;
  /** Present only when ok — normalized, safe-to-persist values. */
  value?: {
    idempotencyKey: string;
    locale: Locale;
    fullName: string;
    companyName: string;
    email: string;
    phone: string | null;
    deliveryLocation: string | null;
    message: string | null;
    items: Array<{
      source: "selected" | "freeform";
      productRef: string | null;
      productLabel: string | null;
      categoryLabel: string | null;
      freeformTitle: string | null;
      sizeText: string | null;
      quantityText: string;
      quantityValue: number | null;
      quantityScale: number | null;
      description: string | null;
    }>;
  };
}

function pushError(errors: Record<string, string[]>, field: string, message: string) {
  (errors[field] ??= []).push(message);
}

function trimmed(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function validateItem(raw: unknown, index: number, errors: Record<string, string[]>) {
  const prefix = `items[${index}]`;
  if (typeof raw !== "object" || raw === null) {
    pushError(errors, prefix, "invalid item");
    return null;
  }
  const item = raw as Record<string, unknown>;

  const quantityTextRaw = trimmed(item.quantityText);
  if (!quantityTextRaw) {
    pushError(errors, `${prefix}.quantityText`, "required");
  } else if (quantityTextRaw.length > LIMITS.quantityText.max) {
    pushError(errors, `${prefix}.quantityText`, "too_long");
  }

  const productSlug = trimmed(item.productSlug);
  const freeformTitleRaw = trimmed(item.freeformTitle);
  let source: "selected" | "freeform" = "freeform";
  let productRef: string | null = null;
  let productLabel: string | null = null;
  let categoryLabel: string | null = null;

  if (productSlug && productSlug !== "other") {
    const sample = getSampleProduct(productSlug);
    if (!sample) {
      pushError(errors, `${prefix}.productSlug`, "unknown_product");
    } else {
      // Deliberately NOT set as source: "selected" with a real product_ref —
      // the catalog is disclosed sample data, not a published catalog
      // (CLAUDE.md §11 / DAR-020). Treated as a freeform snapshot so nothing
      // downstream mistakes it for a real catalog/product ID.
      source = "freeform";
      productLabel = sample.name;
      categoryLabel = sample.category;
    }
  } else if (freeformTitleRaw) {
    if (freeformTitleRaw.length > LIMITS.freeformTitle.max) {
      pushError(errors, `${prefix}.freeformTitle`, "too_long");
    }
    productLabel = freeformTitleRaw;
  } else if (!productSlug) {
    pushError(errors, `${prefix}.productSlug`, "required");
  }

  const gradeOrStandard = trimmed(item.gradeOrStandard);
  if (gradeOrStandard.length > LIMITS.gradeOrStandard.max) {
    pushError(errors, `${prefix}.gradeOrStandard`, "too_long");
  }

  const description = trimmed(item.description);
  if (description.length > LIMITS.description.max) {
    pushError(errors, `${prefix}.description`, "too_long");
  }

  const parsedQuantity = quantityTextRaw ? parseLeadingQuantity(quantityTextRaw) : null;

  // freeform_title is always populated (sample-catalog display name, or the
  // customer's own typed title) — every item here is source: "freeform" by
  // design (no product_ref/variant_ref is ever set; see the comment above),
  // so freeform_title is the DB's only "this item has a subject" signal and
  // must never be left null when a label exists.
  return {
    source,
    productRef,
    productLabel,
    categoryLabel,
    freeformTitle: productLabel || freeformTitleRaw || null,
    sizeText: gradeOrStandard || null,
    quantityText: quantityTextRaw,
    quantityValue: parsedQuantity?.value ?? null,
    quantityScale: parsedQuantity?.scale ?? null,
    description: description || null,
  };
}

export function validateRfqSubmission(input: unknown): ValidationResult {
  const errors: Record<string, string[]> = {};

  if (typeof input !== "object" || input === null) {
    return { ok: false, fieldErrors: { _: ["invalid_body"] } };
  }
  const body = input as Record<string, unknown>;

  if (!isValidIdempotencyKey(body.idempotencyKey)) {
    pushError(errors, "idempotencyKey", "invalid");
  }

  const locale = trimmed(body.locale);
  if (!locales.includes(locale as Locale)) {
    pushError(errors, "locale", "invalid");
  }

  const fullName = trimmed(body.fullName);
  if (fullName.length < LIMITS.fullName.min || fullName.length > LIMITS.fullName.max) {
    pushError(errors, "fullName", "invalid_length");
  } else if (/^\d+$/.test(fullName)) {
    pushError(errors, "fullName", "numeric_only");
  }

  const companyName = trimmed(body.companyName);
  if (!companyName) {
    pushError(errors, "companyName", "required");
  } else if (companyName.length > LIMITS.companyName.max) {
    pushError(errors, "companyName", "too_long");
  }

  const email = trimmed(body.email).toLowerCase();
  if (!email) {
    pushError(errors, "email", "required");
  } else if (email.length > LIMITS.email.max || !EMAIL_PATTERN.test(email)) {
    pushError(errors, "email", "invalid");
  }

  const phoneRaw = trimmed(body.phone);
  const phone = phoneRaw ? normalizeDigits(phoneRaw).replace(/[\s()-]/g, "") : "";
  if (phone && (phone.length > LIMITS.phone.max || !/^[+\d][\d]{5,20}$/.test(phone))) {
    pushError(errors, "phone", "invalid");
  }

  const deliveryLocation = trimmed(body.deliveryLocation);
  if (deliveryLocation.length > LIMITS.deliveryLocation.max) {
    pushError(errors, "deliveryLocation", "too_long");
  }

  const message = trimmed(body.message);
  if (message.length > LIMITS.message.max) {
    pushError(errors, "message", "too_long");
  }

  // Honeypot: must be empty. A filled value is treated as a validation
  // failure indistinguishable from a normal error to the bot, without
  // revealing the anti-abuse mechanism.
  if (trimmed(body.website)) {
    pushError(errors, "_", "rejected");
  }

  const itemsRaw = Array.isArray(body.items) ? body.items : [];
  if (itemsRaw.length === 0) {
    pushError(errors, "items", "required");
  } else if (itemsRaw.length > MAX_ITEMS) {
    pushError(errors, "items", "too_many");
  }

  const items = itemsRaw.slice(0, MAX_ITEMS).map((raw, i) => validateItem(raw, i, errors));

  if (Object.keys(errors).length > 0 || items.some((i) => i === null)) {
    return { ok: false, fieldErrors: errors };
  }

  return {
    ok: true,
    fieldErrors: {},
    value: {
      idempotencyKey: body.idempotencyKey as string,
      locale: locale as Locale,
      fullName,
      companyName,
      email,
      phone: phone || null,
      deliveryLocation: deliveryLocation || null,
      message: message || null,
      items: items as NonNullable<ReturnType<typeof validateItem>>[],
    },
  };
}

export type { RfqItemInput, RfqSubmissionInput };
