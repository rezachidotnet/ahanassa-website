/**
 * Owner-supplied contact channel. Originally confirmed 2026-09-02 (RFQ/UX
 * polish task) as a mobile E.164 number; replaced 2026-09-14
 * (HP-CONTENT-P1, owner-approved) with the exact number below — a local
 * landline-style number, not E.164. Preserved verbatim, exactly as supplied
 * by the owner: never reject, expand, normalize, or reformat it. This
 * remains the single source of truth — never hardcode the number a second
 * time.
 *
 * One business phone number, one `tel:` action, uniform across fa/en/ar
 * (Hero V2.3 §30.2 requires a phone action for the Secondary CTA in every
 * locale — components/home/hero.tsx).
 */
export const CONTACT_PHONE_E164 = "03135134";
