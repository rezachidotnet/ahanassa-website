/**
 * Owner-supplied contact channel — confirmed directly by the project owner
 * in-session (RFQ/UX polish task, 2026-09-02). No phone number existed
 * anywhere in this repository before this — `PROJECT_OVERRIDES.md` §7.2/§10
 * required an owner-supplied number before one could be published anywhere
 * in production (footer, contact page, tel: links). This is the single
 * source of truth — never hardcode the number a second time.
 *
 * One business mobile number, one `tel:` action, uniform across fa/en/ar
 * (Hero V2.3 §30.2 requires a phone action for the Secondary CTA in every
 * locale — components/home/hero.tsx).
 */
export const CONTACT_PHONE_E164 = "+989120656528";
