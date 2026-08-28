# Ahan Asa Website — Customer Account Architecture

> **Brand:** Ahan Asa | آهن آسا
> **Domain:** `https://ahanassa.com`
> **ERP:** `https://odoo.ahanassa.com`
> **Document:** `CUSTOMER_ACCOUNT_ARCHITECTURE.md`
> **Status:** Accepted — future-phase architecture; not a Phase 1 implementation authorization
> **Last updated:** 2026-08-28
> **Approved by:** Project owner, 2026-08-28
> **Scope:** Identity, account, and customer conceptual model; guest-RFQ-to-account linking; Odoo customer mapping; authentication requirements

---

## 1. Purpose

This document formalizes the approved conceptual architecture for customer identity, website accounts, and their relationship to RFQs, Odoo customers, and a future Customer Portal (`CUSTOMER_PORTAL.md`).

It is **architecture, not implementation**. It does not authorize building authentication, account UI, or a portal now. Per `PROJECT_BRIEF.md` §24–§25 and `DECISIONS.md` ADR-002, a customer account system remains an explicit Phase 1 non-goal; this document defines the future-phase design so that Phase 1 work (including the RFQ backend already implemented per `DOCUMENT_AUDIT_REPORT.md` DAR-023/DAR-024) does not have to be redesigned or migrated disruptively when the account phase begins. See `DECISIONS.md` ADR-017 for the formal decision record.

## 2. Binding principle: guest RFQ is never blocked

The primary business conversion is RFQ submission (`ارسال فاکتور / لیست خرید`), and it must remain available without registration or login, indefinitely — not only until an account system ships.

```text
Visitor
  ↓
Submit steel purchase list / RFQ  (no account required)
  ↓
RFQ accepted
  ↓
Customer receives stable RFQ reference
```

Rules:

- Registration/login MUST NOT become a mandatory prerequisite for RFQ submission, now or after the account/portal phase ships.
- Any future "sign in to submit" variant of the RFQ flow (if ever proposed) requires its own explicit approved decision; it is not implied by this document.
- The current RFQ intake (`app/`, `POST /api/rfqs`, `migrations/0001_rfq_ops_schema.sql`) is unaffected by this document and requires no changes to remain compliant with it.

## 3. Conceptual identity model

Four distinct concepts must not be collapsed into one database row without analysis:

```text
Auth Identity
  │   (how a person proves who they are: passkey, magic link, OTP, password — provider TBD, §7)
  ▼
Website Account
  │   (a website-side principal: verified contact channel, session, preferences)
  ▼
Customer
  │   (the business/commercial party the account acts for or on behalf of)
  ├── RFQs
  ├── Quotations   (future — see CUSTOMER_PORTAL.md §3)
  └── Orders       (future — see CUSTOMER_PORTAL.md §3)
  │
  ▼
Odoo Partner Mapping   (res.partner, via integration_mappings — §6)
```

| Concept | Owns | Notes |
| --- | --- | --- |
| Auth Identity | Proof of "who is signing in" (credential, verified email/phone, session subject) | Provider-specific; not yet selected (§7) |
| Website Account | A website principal linked to one Auth Identity | May exist before any RFQ, or be activated from a guest RFQ (§4) |
| Customer | The business/commercial party (an individual purchaser, or a company) | The entity RFQs/quotations/orders belong to |
| Odoo Partner | Commercial system-of-record identity | `res.partner`; mapped, never duplicated (§6) |

Rationale for keeping these separate rather than one `users` row:

- An Auth Identity can change (a user resets/rotates credentials, or a future second login method is added) without altering who the Customer is.
- A Customer may eventually be **a company with more than one contact/purchaser** (§3.1) — a 1:1 `Website Account == Customer` row cannot express that without a disruptive migration later.
- The Odoo Partner is external commercial truth (§5) and must be mapped, not owned, by the website (`PROJECT_OVERRIDES.md` §3).

Naming in a future physical schema may differ from the labels above; `DATABASE_SCHEMA.md`'s eventual account-phase migration is authoritative for exact table/column names when that phase is scoped. Conceptually expected future entities (not created in this pass — see §8):

```text
accounts              (or auth_identities, depending on the selected auth provider's data model)
customers
customer_contacts      (only if/when multi-contact company accounts are built — §3.1)
customer_memberships    (only if/when multi-contact company accounts are built — §3.1)
```

### 3.1 Individual vs. company accounts — do not over-design, do not block

An account may eventually represent:

- an individual purchaser acting for themselves, or
- one contact belonging to a company, or
- (later) one of several contacts associated with the same company/business customer.

**Do not build multi-user organization support now.** The MVP account phase (see `CUSTOMER_PORTAL.md` §2) may ship with a simple 1:1 account-to-customer model. But the schema and conceptual model above (Customer as a distinct concept from Website Account) must not structurally prevent adding a `customer_memberships`-style join later — i.e., do not hardcode a `customer_id` as a column on the auth/session table itself in a way that assumes exactly one account per customer forever.

## 4. Guest RFQ → account linking

A guest customer may later create or activate an account. The architecture must support associating their historical guest RFQs with that verified account.

```text
Guest
  ↓
RFQ 001  (submitted with a verified contact: email or phone)
  ↓
Optional account activation
  ↓
Customer Account
  ├── RFQ 001   (linked retroactively)
  ├── RFQ 002
  └── RFQ 003
```

### 4.1 Linking requires verified ownership, not knowledge of a reference

**Binding rule:** historical RFQ linking requires verified ownership of the relevant identity/contact channel used at submission time (the email address or phone number captured in `rfq_contacts`, per `DATABASE_SCHEMA.md` §6.1). Knowing an RFQ's public reference number (`rfqs.reference_number`) is **never**, by itself, sufficient authorization to claim or view it.

This directly follows the existing IDOR-prevention posture already required for RFQ status pages and admin (`CLAUDE.md` §19, `TECHNICAL_ARCHITECTURE.md` §12.4 — the public reference is a lookup key for the submitter's own confirmation flow, not a bearer credential).

### 4.2 Claim mechanism is deliberately not specified here

This document intentionally does **not** define the exact secure claim/verification procedure (e.g., "email OTP sent to the address on file matches," "phone verification via the account's verified number," or another approved mechanism). That is an implementation decision for the account-phase design, made with the actual selected auth provider's verification primitives in hand (§7).

What is binding now:

- The claim mechanism MUST verify the claimant controls the same contact channel (email or phone) that was captured on the RFQ at submission time.
- The claim mechanism MUST NOT accept the RFQ reference number, an email address typed into a form with no verification step, or a customer-supplied ID as sufficient proof.
- Linking an RFQ to an account is a privileged, audited write (`audit_logs`, per `DATABASE_SCHEMA.md` §6.4), not a silent side effect of viewing a status page.
- A guest RFQ that is never claimed remains fully valid and fully processed through Odoo exactly as today — claiming is additive, not required for RFQ fulfillment.

## 5. Customer ↔ Odoo customer mapping

Odoo remains the commercial system of record for customers (`PROJECT_OVERRIDES.md` §3, `TECHNICAL_ARCHITECTURE.md` §5). The website Customer concept (§3) is a projection/reference, not a competing source of truth.

```text
Website Customer
  ↓
integration_mappings   (provider = "odoo", local_entity_type = "customer")
  ↓
Odoo Partner (res.partner)
```

Rules:

- The mapping mechanism is the same `integration_mappings` table already defined in `DATABASE_SCHEMA.md` §6.3 (`(provider, local_entity_type, local_entity_id)` / `(provider, remote_model, remote_id)` uniqueness) — a future Customer entity is simply a new `local_entity_type` value in that existing table, not a new integration mechanism.
- **Do not create a new Odoo partner on every RFQ.** Synchronization must resolve/reuse an existing mapped `res.partner` whenever the contact already maps to one, following the same deduplication rule already stated in `TECHNICAL_ARCHITECTURE.md` §14.3: verified phone, email, company registration data, or a deliberate composite key — never display-name equality alone. Ambiguous matches require human review, not automatic merge.
- The exact final Odoo model/API mapping for a *website Customer* (as opposed to a single RFQ's contact snapshot, already scoped in §14.3) remains unresolved pending Odoo module inspection. `DOCUMENT_AUDIT_REPORT.md` DAR-013 is the authoritative record of this gate and remains fully in force — this document does not close it, it extends the same open gate to the future Customer-mapping case.
- A Customer may exist on the website (e.g., an activated account with no synced Odoo partner yet) before any Odoo mapping is established; the mapping is created/resolved asynchronously, consistent with `PROJECT_OVERRIDES.md` §3's "public rendering never synchronously depends on Odoo."

## 6. RFQ schema remains account-ready without changes now

Per `DOCUMENT_AUDIT_REPORT.md` DAR-024 (customer-account forward-compatibility review performed during RFQ backend provisioning): `migrations/0001_rfq_ops_schema.sql` was reviewed and confirmed compatible with a future account link, with **no schema change made in that pass**. This document reaffirms that conclusion and does not change it:

- `rfqs.id` (ULID) is the only real primary key; there is no `NOT NULL` guest-identity constraint anywhere in the current schema.
- A future nullable `account_id TEXT` (or `customer_id TEXT`) column can be added to `rfqs` via a plain additive migration at zero cost to existing rows — SQLite/D1 supports this directly.
- Current guest RFQs remain valid indefinitely; they simply have no account link, exactly like today.
- `rfqs.reference_number` (the public, non-sequential reference — `DATABASE_SCHEMA.md` §6.1/§3.3) is generated at submission time and is never regenerated by Odoo sync or by later account linking. Linking an RFQ to an account after the fact MUST NOT change its public reference.
- **No `account_id`/`customer_id` column is added to the production/staging schema by this document.** That migration is deferred to the account-implementation phase, per the owner's explicit instruction, because nothing today is structurally blocking it.

## 7. Authentication requirements (provider not yet selected)

Per the owner's explicit instruction, **no authentication provider is selected by this document.** Auth.js, Clerk, Supabase Auth, Firebase, Odoo login, Cloudflare Access, custom password auth, and any other provider all remain open. The provider decision is a separate future implementation decision (`DECISIONS.md` review trigger, §9).

The following requirements are binding on whichever provider is eventually selected — they are architecture constraints, not a product recommendation:

| Requirement | Binding rule |
| --- | --- |
| Session handling | Secure, revocable sessions; no long-lived bearer tokens readable by JavaScript where a safer pattern (httpOnly cookie, provider-managed session) is available. |
| Account verification | An account must be tied to a verified contact channel (email and/or phone) before it can claim guest RFQs (§4.2) or view Customer data. |
| Passwordless vs. password | Either is acceptable; if password auth is selected, `DATABASE_SCHEMA.md` §6.2's existing rule for `staff_users` applies equally here: hashing and recovery require a dedicated security review, and plaintext/reversible storage is forbidden. |
| Account recovery | Must not allow account or RFQ-history takeover via a weaker channel than the one used to create/verify the account. |
| CSRF protection | Required for any cookie-authenticated state-changing request, consistent with `SECURITY_GUIDELINES.md` §12.4 and `CLAUDE.md` §19. |
| Rate limiting / brute-force protection | Required on login, verification-code, and account-recovery endpoints, consistent with the existing anti-abuse posture for RFQ submission (`DOCUMENT_AUDIT_REPORT.md` DAR-023's honeypot/timing controls are a Phase 1 RFQ-specific example, not a substitute for real auth rate limiting). |
| Email/mobile verification | Required before an Auth Identity can claim historical RFQs (§4.2) or be treated as "verified" for Customer purposes. |
| Account linking | Must follow §4's verified-ownership rule; must be audited (`audit_logs`). |
| Privacy | Must follow `CLAUDE.md` §19/§20 privacy rules and this document's §8 below; account data is personal data. |
| Multi-locale UX | Auth/account flows must work correctly in `fa` (RTL, default), `en` (LTR), and `ar` (RTL), per `PROJECT_OVERRIDES.md` §1 — no locale may be treated as auth-incomplete while others are complete. |
| No Odoo credential/browser leakage | The account system MUST NOT reuse or expose Odoo credentials for website login, and MUST NOT let browser code call Odoo directly (unchanged from `TECHNICAL_ARCHITECTURE.md` §3.2/§8/`CLAUDE.md` §9). |

## 8. Security architecture — authorization rule

This rule is binding the moment any account/portal feature is built, and is recorded now so implementation cannot silently default to something weaker:

> A logged-in user may only view RFQs, quotations, or orders belonging to a Customer identity they are authorized to access.

Explicitly prohibited authorization shortcuts:

- Authorizing access using the RFQ public reference alone.
- Authorizing access using an `email` query parameter or client-supplied identifier.
- Authorizing access using a customer ID supplied by the browser without a server-side ownership/membership check.
- Authorizing access using an Odoo record ID supplied by or derived from client input.

All Customer Portal access requires an authenticated session **and** a server-side authorization check that the session's account is linked to (or a verified member of) the Customer that owns the requested record. This is the same default-deny, server-enforced posture already required for `/admin` (`TECHNICAL_ARCHITECTURE.md` §17) and is not a new security model — it is that same model applied to a new, non-staff principal type.

## 9. Review / supersession trigger

This document must be revisited when:

- an authentication provider is selected (§7);
- the account-implementation phase is formally scoped (at which point `DATABASE_SCHEMA.md` receives the actual additive migration referenced in §6, and `CUSTOMER_PORTAL.md`'s MVP boundary is implemented);
- Odoo modules are inspected and the customer/partner mapping in §5 can be finalized (closes the Customer-mapping portion of DAR-013);
- multi-contact company accounts (§3.1) are approved as in-scope.

## 10. Related documents

- `CUSTOMER_PORTAL.md` — portal MVP/future-capability boundary and no-live-Odoo-read architecture.
- `DATABASE_SCHEMA.md` §6 — current `DB_OPS` schema this document is compatible with.
- `TECHNICAL_ARCHITECTURE.md` §5, §12, §14, §17 — system-of-record matrix, RFQ architecture, Odoo integration, admin/authorization.
- `PROJECT_OVERRIDES.md` §3, new §13 — Odoo commercial-truth scope and this decision's cross-project record.
- `DECISIONS.md` ADR-002, ADR-017.
- `DOCUMENT_AUDIT_REPORT.md` DAR-013, DAR-023, DAR-024, and the new entry recording this pass.
- `SECURITY_GUIDELINES.md` §17 — existing authentication/administrative-access controls this document extends to a customer principal.

---

**End of `CUSTOMER_ACCOUNT_ARCHITECTURE.md`**
