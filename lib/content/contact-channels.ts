import { isValidWhatsAppNumber, WHATSAPP_BUSINESS_NUMBER } from "./whatsapp.ts";

/**
 * Owner-supplied contact channel. Originally confirmed 2026-09-02 (RFQ/UX
 * polish task) as a mobile E.164 number; replaced 2026-09-14
 * (HP-CONTENT-P1, owner-approved) with the Isfahan landline 031-35134.
 * Decision D-COMPANY-INFO (2026-10-13, owner): the number is confirmed as
 * 031 + 5 digits; every `tel:` link and the JSON-LD use the international
 * form `+983135134`, and every visible rendering uses `031-35134` (fa/en/ar,
 * Latin digits, inside an LTR run). These two constants are the single
 * source of truth — never hardcode the number a second time.
 *
 * One business phone number, one `tel:` action, uniform across fa/en/ar
 * (Hero V2.3 §30.2 requires a phone action for the Secondary CTA in every
 * locale — components/home/hero.tsx). The Tehran coordination office has no
 * separate number.
 */
export const CONTACT_PHONE_E164 = "+983135134";

/** The same number as it is shown to visitors (D-COMPANY-INFO). */
export const CONTACT_PHONE_DISPLAY = "031-35134";

/** Every company number that may appear on public pages — the leak scan allows exactly these (WhatsApp only when configured). */
export const COMPANY_PUBLIC_NUMBERS: readonly string[] = [CONTACT_PHONE_E164, CONTACT_PHONE_DISPLAY, ...(isValidWhatsAppNumber(WHATSAPP_BUSINESS_NUMBER) ? [WHATSAPP_BUSINESS_NUMBER] : [])];
