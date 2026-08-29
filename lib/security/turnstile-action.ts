/**
 * Turnstile `action` identifier for the RFQ submission widget. Shared, pure
 * constant (no server-only imports) so both the client widget
 * (components/contact/enquiry-form.tsx) and the server-side Siteverify
 * validation (lib/security/turnstile.ts) stay in sync without pulling
 * server-only code into the client bundle.
 */
export const TURNSTILE_RFQ_ACTION = "rfq_submit";
