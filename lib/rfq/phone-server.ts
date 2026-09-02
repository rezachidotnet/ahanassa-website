import { getCountryCallingCode, parsePhoneNumberFromString } from "libphonenumber-js";
import { normalizeDigits } from "./quantity.ts";

/**
 * Server-side, authoritative phone validation/composition (RFQ Phone Field
 * hardening, 01-sources/DECISIONS.md-adjacent owner instruction). This is
 * the SOLE place a phone number is validated or composed into E.164 — the
 * client never sends a pre-composed number, and a client-supplied dial code
 * (if one ever leaked through) is never trusted over this module's own
 * ISO-2 -> calling-code resolution (via `libphonenumber-js`'s own
 * metadata, never a hand-maintained duplicate).
 *
 * IMPORTANT: never import this module from a `"use client"` file —
 * `libphonenumber-js`'s full metadata build must never reach the browser
 * bundle. `lib/rfq/phone-country-registry.ts` is the client-safe sibling
 * (UI labels/dial-code display only, no validation authority).
 *
 * Leading-zero handling is country-specific, not global (a leading zero is
 * a significant part of the national number in some numbering plans, e.g.
 * Italian landlines) — see the two branches below.
 */

export interface PhoneValidationResult {
  ok: boolean;
  e164?: string;
  callingCode?: string;
  nationalNumber?: string;
}

const IR_IQ_LOCAL_LENGTH = 10;

export function validateAndComposeE164(iso2: string, rawLocal: string): PhoneValidationResult {
  const iso2Upper = iso2.trim().toUpperCase();
  const digits = normalizeDigits(rawLocal).replace(/[\s()-]/g, "");
  if (!iso2Upper || !digits) return { ok: false };

  let callingCode: string;
  try {
    callingCode = getCountryCallingCode(iso2Upper as Parameters<typeof getCountryCallingCode>[0]);
  } catch {
    return { ok: false };
  }

  if (iso2Upper === "IR" || iso2Upper === "IQ") {
    // Owner's explicit mobile-number convention for Iran/Iraq: exactly 10
    // digits, no leading trunk zero (the zero is never part of the E.164
    // number — it's the domestic dialing prefix, stripped by convention
    // before the country code is prepended). This rule is intentionally
    // NOT applied to any other country below.
    if (digits.startsWith("0") || digits.length !== IR_IQ_LOCAL_LENGTH) return { ok: false };
    const candidate = `+${callingCode}${digits}`;
    const parsed = parsePhoneNumberFromString(candidate);
    if (!parsed || !parsed.isValid() || parsed.country !== iso2Upper) return { ok: false };
    return { ok: true, e164: parsed.number, callingCode, nationalNumber: digits };
  }

  // Every other country: never strip/reject a leading zero — parse the
  // digits AS A NATIONAL NUMBER in this country's own metadata context, so
  // libphonenumber-js applies that country's real trunk-prefix/length
  // rules (e.g. Italy's landline leading zero is significant and required;
  // stripping it would make an otherwise-valid number invalid).
  const parsed = parsePhoneNumberFromString(digits, iso2Upper as Parameters<typeof parsePhoneNumberFromString>[1]);
  if (!parsed || !parsed.isValid()) return { ok: false };
  if (parsed.country && parsed.country !== iso2Upper) return { ok: false };
  return { ok: true, e164: parsed.number, callingCode, nationalNumber: digits };
}
