/**
 * Owner-supplied contact channel — confirmed directly by the project owner
 * in-session (RFQ/UX polish task, 2026-09-02). No phone/WhatsApp number
 * existed anywhere in this repository before this — `PROJECT_OVERRIDES.md`
 * §7.2/§10 required an owner-supplied number before one could be published
 * anywhere in production (footer, contact page, tel:/wa.me links). This is
 * the single source of truth — never hardcode the number a second time.
 *
 * One business mobile number, two channels: a plain `tel:` action for the
 * Persian locale, a WhatsApp deep link for en/ar (components/layout/SiteHeader.tsx,
 * components/home/hero.tsx).
 */
export const CONTACT_PHONE_E164 = "+989120656528";
export const CONTACT_WHATSAPP_URL = "https://wa.me/989120656528";
