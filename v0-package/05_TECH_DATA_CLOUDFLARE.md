# 05 — Technical Architecture & Cloudflare Infrastructure

> Ahan Asa | آهن آسا — v0 canonical package
> Consolidated from: `TECHNICAL_ARCHITECTURE.md`, `STACK.md`, `FOLDER_STRUCTURE.md`, `COMPONENT_ARCHITECTURE.md`, `ENVIRONMENT_VARIABLES.md`, `DEPLOYMENT_ARCHITECTURE.md`, `SECURITY_GUIDELINES.md`, `API_INTEGRATIONS.md`, `TESTING_STRATEGY.md`, `QA_CHECKLIST.md`, `PRE_DEPLOY_CHECKLIST.md`, `POST_DEPLOY_CHECKLIST.md`, `CODING_STANDARDS.md` — reconciled against `PROJECT_OVERRIDES.md` and `CLAUDE.md`.
> Scope: confirmed Cloudflare runtime, dependency rules, folder/component conventions, environment variables and secrets, deployment, security, API-adapter principles, testing, release gates, and coding standards. Data model, catalog/pricing schema, CMS, and full Odoo/RFQ integration detail live in `06_PRODUCTS_CMS_ODOO_RFQ.md` — this file references that content rather than duplicating it. Caching/performance budgets and SEO mechanics are owned by `04_SEO_PERFORMANCE_ANALYTICS.md`.

---

## 1. Confirmed architecture overview

The runtime is verified directly against the live repository (`package.json`, `wrangler.jsonc`), not aspirational:

```text
Next.js App Router, driven by Vite (@cloudflare/vite-plugin, @vitejs/plugin-rsc),
deployed to Cloudflare Workers + Static Assets via the vinext adapter (vinext + @vinext/cloudflare),
released with wrangler (^4.126.0).
```

This **supersedes** any source-document preference for `@opennextjs/cloudflare` / OpenNext as the launch adapter, `@cloudflare/next-on-pages`, or Vercel as a hosting target. All three are prohibited, not alternatives to weigh — `PROJECT_OVERRIDES.md` §2.

### 1.1 Request flow

```text
Visitor / search crawler
      ↓
Cloudflare Edge (DNS, TLS, WAF, cache, rate limits, bot controls, Turnstile)
      ↓
Web Worker — Next.js on Workers (vinext)
      ├── D1 DB_PUBLIC   — published articles, SEO overlays, public catalog + price read model
      ├── D1 DB_OPS      — RFQs, contacts, consent, attachment metadata, outbox, audit
      ├── R2 public media bucket
      ├── R2 private RFQ-attachment bucket
      ├── Queue producer → ODOO_SYNC_QUEUE
      └── Admin auth (approved identity provider or Cloudflare Access where practical)
      ↓ (async only)
Integration Worker — Queue consumer
      ├── Server-only Odoo adapter
      ├── Odoo Sync DLQ (exhausted retries)
      └── Scheduled reconciliation (Cron Triggers)
      ↓
odoo.ahanassa.com (ERP, server-to-server only)
```

Two Workers deploy and roll back **independently**: the web Worker (public rendering, admin UI, RFQ intake, upload authorization) and the integration Worker (Odoo adapter, sync, reconciliation). The web Worker must never hold Odoo credentials or call Odoo directly — it only produces typed integration events onto the queue.

**Non-negotiable invariant:** a visitor request is never served by synchronously calling Odoo. Public pages, price/catalog routes, and RFQ acknowledgement all read from D1/R2/edge cache. An Odoo outage must never prevent a page from loading or a valid RFQ from receiving a durable reference.

### 1.2 Target bindings (scaffolded in `wrangler.jsonc`, not yet fully built out)

| Binding class | Resources |
|---|---|
| D1 (×2) | `DB_PUBLIC` (public/website read model), `DB_OPS` (RFQ/operational/PII data) |
| R2 (×2) | public-media bucket, private RFQ-attachment bucket — always separate buckets or strictly separated policies, never one bucket for both |
| Queues | `ODOO_SYNC_QUEUE` (producer/consumer) + a Dead Letter Queue for exhausted retries |
| Bot/identity | Turnstile where enabled for public mutation forms; approved identity provider or Cloudflare Access where practical for admin authentication |
| ERP | server-only Odoo adapter, invoked only from the integration Worker / scheduled Workers |

Full schema, ownership matrix, and sync contract: `06_PRODUCTS_CMS_ODOO_RFQ.md`.

**Naming note:** `ENVIRONMENT_VARIABLES.md` (the binding registry) names the R2 bindings `PUBLIC_MEDIA` / `RFQ_ATTACHMENTS`; `DEPLOYMENT_ARCHITECTURE.md` names them `R2_PUBLIC_MEDIA` / `R2_PRIVATE_RFQ`. Both source documents are dated the same reconciliation pass and neither is marked superseded on this point — treat the exact binding name as an implementation-time decision to fix once in `wrangler.jsonc` and use consistently, not as a resolved fact to assume from either document alone.

---

## 2. Stack and dependency rules

| Layer | Confirmed selection |
|---|---|
| Framework | Next.js App Router, TypeScript strict mode |
| UI runtime | React, aligned to the Next.js line in use |
| Styling | Tailwind CSS + semantic CSS custom properties (no CSS-in-JS runtime) |
| Package manager | `npm`, committed `package-lock.json` |
| Cloudflare adapter | `vinext` + `@vinext/cloudflare`, built with `@cloudflare/vite-plugin` / `@vitejs/plugin-rsc` |
| Deployment CLI | `wrangler` |
| Database | Cloudflare D1, accessed via typed bindings + an ORM (Drizzle per source docs) with migrations |
| Object storage | Cloudflare R2 |
| Async messaging | Cloudflare Queues + Dead Letter Queue |
| Scheduled jobs | Workers Cron Triggers |
| Bot protection | Cloudflare Turnstile, server-side Siteverify |
| Validation | Zod (or equivalent) schemas, authoritative at every server boundary |
| ERP | Odoo, only through a server-only adapter |
| Testing | Vitest + Testing Library, Playwright, axe-core, Lighthouse CI |

**Prohibited / superseded** — do not introduce: Vercel hosting or Vercel functions; `@opennextjs/cloudflare` / OpenNext as the selected launch adapter; `@cloudflare/next-on-pages`; Cloudflare Pages as the full-stack host; the Pages Router; a second package manager or lockfile; direct browser-to-Odoo calls or client-visible ERP credentials; a global client state library (Redux/MobX/Zustand/Apollo Client/React Query/SWR) without a demonstrated cross-route need and a recorded decision; CSS-in-JS; Prisma (unless a future database decision requires it); a generic full UI theme/page-builder; WordPress/Shopify/Magento/a public checkout engine; permanent signed attachment URLs or public RFQ-attachment buckets; blanket cache purges as normal invalidation.

**Adding a new dependency** requires, in order: (1) confirm the need cannot be met by the approved stack or a platform capability; (2) confirm Cloudflare Workers runtime compatibility (a package working in Node.js locally is not proof it works in `workerd`); (3) evaluate bundle/performance impact; (4) evaluate security, license, and maintenance status; (5) evaluate lockfile/build/deployment impact; (6) record an explicit decision when the change is architecture-affecting (new adapter, new state-management approach, new CMS/database strategy). Conditional packages (e.g. `next-intl`, a rich-text editor) are not installed during scaffolding without their approved use case actually being implemented.

---

## 3. Folder structure and component conventions

The base `src/` tree (route groups, `components/`, `features/`, `content/`, `config/`, `lib/`, `server/`, `public/`) predates the D1/R2/Odoo module set — layer the Cloudflare-specific modules below onto it rather than treating either source document alone as complete:

```text
app/                    Routes, layouts, metadata, route handlers — thin, composition only
components/             Reusable server-first UI (foundations → primitives → composites → patterns → shells)
components/client/      Small interactive islands only ('use client' at the smallest boundary)
content/                Seed content and controlled migrations
lib/domain/             Provider-independent types and business rules
lib/content/            CMS schemas, repositories, publication workflow
lib/catalog/            Catalog queries and SEO overlays
lib/pricing/            Public price projection and freshness rules
lib/rfq/                RFQ validation, items, state machine
lib/uploads/            Attachment policy, quarantine, scan state
lib/auth/               Identity and authorization (approved IdP or Cloudflare Access where practical + RBAC)
lib/odoo/               Ports, adapters, mappers, sync services — server-only
lib/outbox/             Transactional outbox and dispatch
lib/cache/              Keys, tags, invalidation
lib/seo/                Metadata, canonical, sitemap, JSON-LD
lib/observability/      Safe structured logs, metrics, alerts
db/migrations/          Ordered D1 migrations
workers/                Queue consumers and scheduled (Cron) jobs
tests/                  Unit, integration, contract, E2E
```

**Server-first / client-boundary discipline:** Server Components are the default everywhere. Add `'use client'` only at the smallest leaf that genuinely needs browser state, event handlers, focus management, or a browser API (RFQ row builder, catalog filter enhancement, mobile navigation, file-selection feedback). Domain modules in `lib/domain/` must not import React, route files, Odoo API details, D1 bindings, or Cloudflare request objects — they stay provider-independent and testable without a framework or runtime. Route files (`app/**/page.tsx`) coordinate rendering only; they must not call Odoo directly, contain business logic, or embed large content objects.

**Where Cloudflare-specific modules live:** the Odoo adapter and its port/mapper/sync-service code live in `lib/odoo/`, used only from `workers/` (queue consumers, scheduled reconciliation) and other server-only code — never imported into a client bundle. The transactional outbox lives in `lib/outbox/` and is written in the same D1 transaction as the RFQ/domain write it protects.

**Component layering** (from `COMPONENT_ARCHITECTURE.md`): dependencies flow strictly downward — `Foundations → Primitives → Composites → Patterns → Shells → Page compositions`, with `Features`/domain modules feeding typed data into this stack rather than bypassing it. A primitive must never import a pattern or feature; a lower layer never knows about a higher one. Enforce with path aliases, ESLint import restrictions, and dependency-cycle detection where tooling allows.

**Forbidden import directions:** `components/ui → features`; `components → app`; `content → app`; `lib → app`; `client component → server`; `server integration → page component`; `provider adapter → public UI`. Circular imports are prohibited everywhere.

---

## 4. Environment variables and secrets management

Four distinct configuration classes exist — do not call every runtime value an "environment variable":

| Class | Examples | Storage | Browser-visible? |
|---|---|---|---|
| Cloudflare resource binding | `DB_PUBLIC`, `DB_OPS`, R2 buckets, `ODOO_SYNC_QUEUE` | `wrangler.jsonc` binding, not a string credential | No |
| Plain runtime variable | `APP_ENV`, `APP_BASE_URL`, timeouts, feature flags | Wrangler `vars` | No, unless explicitly `NEXT_PUBLIC_`-prefixed |
| Secret binding | Odoo API key, signing secrets, Turnstile secret | Cloudflare Secrets | No |
| Build/CI credential | Cloudflare deploy token | CI secret store only | No — never available to application runtime |

**Public-variable rule:** only names beginning `NEXT_PUBLIC_` may reach client JavaScript, and the prefix means *public*, not *safe by default* — never place credentials, internal URLs, recipient lists, or private feature state under it. `NEXT_PUBLIC_*` values are embedded at build time; a runtime change alone does not rewrite an already-built client bundle.

**Environment topology:** local, preview (per pull request), staging (optional; integration/Odoo-sandbox testing), production — each with fully separate D1/R2/Queue/DLQ/Turnstile/secret/Odoo-credential configuration. Preview and staging enforce `noindex, nofollow` server-side and must never write to production Odoo, production storage, or send real customer notifications. `APP_BASE_URL` is the single canonical-origin source for metadata/canonical/OG/sitemap/links; production requires exactly `https://www.ahanassa.com` (the deprecated `SITE_URL` name must not be reintroduced).

**Worker boundary:** the web Worker never receives `ODOO_API_KEY` or any Odoo write credential — those exist only in the integration Worker's secrets. This is enforced by CI (checking the generated Worker environment type), not by convention alone.

**Representative registry** (exact names are an implementation contract, not permission to invent new ones freely):

```text
Plain vars:    APP_ENV, APP_BASE_URL, ALLOWED_HOSTS, ALLOWED_ORIGINS, LOG_LEVEL
Odoo adapter:  ODOO_BASE_URL, ODOO_DATABASE, ODOO_API_MODE, ODOO_COMPANY_ID,
               ODOO_PUBLIC_PRICELIST_ID, ODOO_REQUEST_TIMEOUT_MS
Pricing:       PRICE_FRESHNESS_THRESHOLD_SECONDS
Uploads:       UPLOAD_MAX_BYTES, UPLOAD_MAX_COUNT, SIGNED_URL_TTL_SECONDS
Public:        NEXT_PUBLIC_SITE_ENV, NEXT_PUBLIC_TURNSTILE_SITE_KEY, NEXT_PUBLIC_GTM_ID
Secrets:       TURNSTILE_SECRET_KEY, UPLOAD_SIGNING_SECRET, WEBHOOK_SIGNING_SECRET,
               INQUIRY_REFERENCE_SECRET, ODOO_API_KEY (integration Worker only)
Feature flags: FEATURE_RFQ_SUBMISSION, FEATURE_RFQ_ATTACHMENTS, FEATURE_ODOO_RFQ_SYNC,
               FEATURE_ODOO_CATALOG_SYNC, FEATURE_PUBLIC_PRICES
```

**Never hardcode secrets:** no secret in `wrangler.jsonc`, `.env.example`, `.dev.vars.example`, Markdown, test fixtures, screenshots, or logs. Use exactly one local secret file (`.dev.vars`, gitignored) with a committed `.dev.vars.example` containing empty placeholders. Rotate immediately after suspected exposure, a Git commit of a secret, or a personnel/vendor access change — removing the text from the latest commit is not revocation. Read server secrets only from server-only modules; validate required configuration at startup/build without printing values; fail closed when an enabled feature is missing its required binding or secret.

---

## 5. Deployment architecture

**Environments:** local (disposable/mock resources) → preview (per-PR, immutable versioned Worker URL, isolated non-production resources, Access-protected + `noindex`) → staging (optional, Odoo test database, release rehearsal) → production (`www.ahanassa.com`). No deployment mixes resources across these columns.

**Two independently deployable units:** the web Worker (`ahanassa-web`) and the integration Worker (`ahanassa-odoo-sync`). Each has its own release, rollback, and version history.

**How `wrangler deploy` fits in:** a CI pipeline gates production. Pull-request gate: lint, typecheck, tests, D1 migration tests against a disposable database, production build for both Workers, bundle/runtime-limit checks, SEO/metadata/route checks, an immutable Worker version uploaded without traffic, smoke/E2E against the versioned preview URL. Production gate on merge to protected `main`: re-run deterministic checks, confirm production bindings/secrets, record current known-good Worker versions, apply reviewed backward-compatible migrations, upload new Worker versions without traffic, run non-destructive preview checks with production-equivalent bindings, deploy the integration Worker independently if changed, then stage the web Worker rollout (typically version preview → 5% → 25% → 100%), gated at each stage on error rate, latency, RFQ success, queue/DLQ health, cache behavior, and synthetics.

**D1 migrations** use expand → compatible-code → backfill → switch → contract: add nullable columns/tables/indexes first, ship code that tolerates both old and new schema, backfill in bounded batches outside visitor requests, switch the new path to authoritative, then remove old fields in a later release after the rollback window closes. A migration applied before a gradual rollout must remain compatible with the previous Worker version.

**Rollback expectations:** Worker rollback changes *code only* — it does not roll back D1, R2, queues, secrets, routes, custom domains, Cron, DNS, Access, or WAF configuration. Recover data separately using D1 Time Travel or a validated export/restore. Internal targets (not contractual SLAs): begin rollback within 10 minutes of a confirmed release-caused critical incident; restore a known-good application within 30 minutes when Cloudflare itself is healthy; every RFQ that received a success reference must be preserved regardless of rollback. A queue-consumer rollback pauses/reduces consumption first (never deletes or blindly replays messages), deploys the last compatible or corrected consumer, verifies idempotency, then resumes in controlled batches and reconciles Odoo.

**Odoo integration deployment rule:** because Queues provide at-least-once delivery (not exactly-once), the consumer must remain idempotent under redelivery, timeout, and manual replay at every deploy. Changing the event schema deploys the consumer first (accepting old and new versions), then the producer, then drains/expires old messages before removing old-version support in a later release.

---

## 6. Security guidelines

**Baseline:** OWASP ASVS 5.0 Level 1 for the public site, with selected Level 2 controls for RFQ/inquiry processing, personal data, integrations, and uploaded documents.

**Data classification** — use throughout schemas, storage, logs, and retention:

| Class | Examples | Minimum handling |
|---|---|---|
| Public | published pages, verified contact channels | Integrity review, safe caching |
| Internal | drafts, operational metrics | Authorized staff only |
| Confidential | name, phone, email, company, RFQ message | Encrypted in transit/at rest, least privilege, never in analytics/logs |
| Restricted | uploaded invoices/BOQs, consent/audit records, access logs | Private storage, explicit authorization, malware controls, retention policy |
| Secret | API tokens, signing keys, DB credentials | Secret store only, narrow scope, rotation plan |

**Mandatory secure architecture:** the browser never calls D1, R2, Queues, or Odoo directly — everything confidential passes through an Ahan Asa server-controlled endpoint. Dynamic endpoints handling confidential data use `Cache-Control: no-store` and are never statically or shared-cached. Production RFQ submission stays disabled until a durable persistence path, privacy text, retention policy, access roles, and abuse controls all exist; upload stays disabled until private storage, a scan workflow, access control, and retention are verified end to end — an attractive upload control without that complete workflow is prohibited.

**Transport and headers baseline:** HTTPS-only production; canonical-host redirects validated server-side (never trust the request `Host` header for canonical/callback URLs); HSTS only after all subdomains are verified HTTPS-safe. Required headers: `Content-Security-Policy` (enforced after a report-only period; no `'unsafe-eval'`, no unreviewed permanent `'unsafe-inline'`, per-origin allowlisting only), `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: DENY` (CSP `frame-ancestors` is authoritative), `Permissions-Policy` denying unused capabilities.

**Input validation and output safety:** every request header, query parameter, cookie, form value, uploaded file, CMS value, and provider response is untrusted; validate server-side with explicit schemas, reject unknown fields at confidential write boundaries, use parameterized D1 access, and never construct SQL/shell/URLs via unsafe string concatenation. Treat SVG as executable content — never accept SVG in public uploads. Rich/CMS content renders only through an allowlisted, sanitized pipeline; arbitrary executable MDX/HTML/scripts are prohibited.

**Upload security posture (pending final security approval):** the intended pipeline is: short-lived upload authorization → private quarantine object with a server-generated opaque key → file-signature/MIME/structure verification → malware scan → clean-state promotion → D1 metadata linkage → authorized-only download via short-lived signed access. The UX intent is that customers may submit an existing purchase-list document or image, but the production accepted file-type allowlist is not owner-approved yet. Final server-side allowlist, MIME/signature validation, file-count and size limits, scanning policy, retention, and production enablement are security gates. Everything not explicitly approved is denied by default; SVG, HTML, scripts, executables, archives, macro-enabled Office files beyond any approved policy, disk images, and active content remain prohibited. **`OPEN DECISION — DO NOT INVENT`: the malware-scanning provider and the uncertain-result/quarantine workflow are not yet selected.** This is confirmed non-blocking for foundation work (`PROJECT_OVERRIDES.md` §8) but is a hard gate before production uploads: if the scanning pipeline isn't approved and implemented when that feature is reached, the upload control must remain disabled rather than ship insecurely — never invent a provider or a "temporary" bypass.

**Auth/authorization model (admin surface):** Admin authentication must use an approved identity provider or Cloudflare Access where practical. Cloudflare Access is an allowed implementation option, not a mandatory selected product decision. The application layers its own D1-backed RBAC on top — an outer identity provider alone never substitutes for application authorization. Representative roles: `super_admin`, `content_editor`/`content_approver`, `seo_manager`, `rfq_operator`, `sales_operator`, `price_viewer`/price operator, `integration_operator`, `auditor`. Deny by default; check authorization server-side on every action and object; require MFA for privileged users; audit actor/action/target/timestamp/correlation ID for every material mutation; no shared admin accounts; never reuse Odoo credentials for website authentication.

**Secrets handling:** see §4 — the security-specific additions are: least-privilege scoping for every provider token (Odoo bot user, deploy token, email/analytics credentials), no server secret in client chunks/source maps/build logs, and secret scanning running in CI on every pull request.

**Logging/analytics prohibitions:** never log or send to analytics — full request bodies, RFQ text, names/phone/email/address, filenames, signed URLs, private object keys, Odoo database name or raw response bodies, cookies, authorization headers, Turnstile tokens, or webhook secrets. Analytics may receive only stable event names and non-sensitive parameters.

**Legal/business facts:** `OPEN DECISION — DO NOT INVENT` — company legal entity name, registration/tax ID, invoicing identity, retention-period specifics, and privacy/consent legal wording are not confirmed. Do not invent them for security headers, `security.txt`, terms/privacy pages, or incident-communication templates; treat them as pending owner/legal input.

---

## 7. API integration principles

All external integrations — Odoo included — pass through a **server-only, typed adapter**. UI components and domain services never construct a provider call or import a vendor SDK directly; a route handler validates the transport request, a service layer applies business rules, and an adapter translates to the external system. No layer skips the one below it to reach a provider directly.

**Idempotency:** every retryable business write (RFQ creation, contact upsert) uses an idempotency key created once per intentional client action and reused on retry. The server stores the key with a normalized request fingerprint for an approved window; a replay with the same payload returns the original result, a replay with a conflicting payload is a stable conflict error. Duplicate Queue delivery — expected under Cloudflare's at-least-once guarantee — must never create a duplicate downstream record.

**Standard error handling:** typed internal error classes (validation, policy violation, rate limit, persistence, provider-authentication, provider-transient, provider-permanent, webhook-signature, configuration) map to a small set of stable public error codes. Public responses never include provider payloads, stack traces, internal identifiers, or credentials.

**Webhooks (if/when used):** accept only on a dedicated endpoint over HTTPS; verify the provider signature over the exact raw body before parsing; validate timestamp/age and reject replayed event IDs; enforce body-size/content-type limits; process slow work asynchronously after a fast acknowledgement; never rely on a secret URL path alone for authenticity.

**Outbound requests / SSRF prevention:** never fetch an arbitrary user-supplied URL; use an explicit allowlist of hosts/schemes/ports for server-side outbound calls; deny loopback, link-local, metadata-service, and private-network targets; revalidate the destination after redirects; apply short timeouts and response-size limits; retry only idempotent operations or operations protected by an idempotency key, with bounded exponential backoff and jitter, respecting `Retry-After` where safe.

**Odoo is the confirmed integration target** — this supersedes any source-document framing that leaves the CRM provider or inquiry destination broadly unknown. The adapter boundary and RFQ durability/outbox contract are detailed in `06_PRODUCTS_CMS_ODOO_RFQ.md`; Odoo version, installed modules, API/protocol, model mapping, field mapping, authentication, and integration details remain open until verified against the live instance. This file only establishes that the adapter pattern above governs how the integration is built.

---

## 8. Testing strategy

| Layer | Purpose | Default execution |
|---|---|---|
| Static | Lint, TypeScript, schema validation, forbidden-import checks, secret scan | Every pull request |
| Unit | Pure rules — validation, normalization, mapping, cache keys, retry classification | Every pull request |
| Component | RFQ builder, admin forms, navigation, RTL/LTR states | Every pull request |
| Worker integration | D1 (real migrations), R2, Cache API, Queue producer/consumer, route handlers — run in the actual Workers runtime, not Node-only emulation | Relevant pull requests |
| Contract | Odoo adapter, Turnstile, analytics payload shape | Relevant changes + scheduled |
| E2E (Playwright) | Critical journeys — RFQ, publishing, price update, RBAC | Preview/release |
| Non-functional | SEO, accessibility, performance, security, visual regression | Preview/release |
| Resilience | Odoo outage, queue duplicate/replay, cache/D1/R2 failure | Release candidate/scheduled |
| Production smoke | Read-only checks on the deployed release | After deployment |

**Idempotency/retry/DLQ expectations:** treat every Queue message as possibly delivered more than once, out of order, or after a redeploy. Required test scenarios include: first delivery creates the intended record once; identical redelivery is a no-op or returns the same mapping; concurrent duplicate deliveries cannot create duplicates; a timeout *after* Odoo commits but before the Worker sees the response is reconciled by external ID rather than re-created; permanent validation/mapping failures do not retry forever; exhausted retries reach the DLQ with safe diagnostic metadata and an actionable alert; authorized replay is idempotent and preserves original event identity.

**RTL/locale coverage across fa/en/ar:** all three locales are required at launch, not phased (`PROJECT_OVERRIDES.md` §1) — any source-document framing of English/Arabic testing as future-only is superseded on that point. Required coverage: `<html lang dir>` correctness per locale; logical CSS/direction-aware layout (no reversed arrays, no `ComponentRtl`/`ComponentLtr` forks); correct bidi isolation for phone numbers, URLs, product codes, dimensions, and mixed Persian/Latin/Arabic content; automated axe checks on home, category/product/price, article, and RFQ default/error/upload/success states in each active locale; manual keyboard, 320px reflow, and 200% zoom checks per locale.

**Coverage targets:** repository-wide minimums of 80% statements/lines/functions and 75% branches; RFQ, Odoo mapping/idempotency, queue-consumer, RBAC, cache-policy, and metadata modules should reach at least 90% lines/statements and 85% branches with material failure paths explicitly asserted. Coverage is a diagnostic, not proof of quality — tests written only to hit lines are prohibited.

**Mandatory commands** (adapt exact script names to the repository, do not assume): `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:integration` (Worker/D1/R2/Queue boundaries), `npm run test:e2e`, `npm run build` (Cloudflare-targeted). A green build alone never validates UI, accessibility, SEO, localization, cache, RFQ, or failure-handling behavior.

---

## 9. QA and release gates

**Pre-deploy — non-negotiable before production:** no unresolved critical/high-severity defect (data loss, duplicate commercial record, authorization bypass, secret exposure); clean production build; lint/typecheck/unit/integration/E2E pass; D1 migrations verified both clean and upgrade-from-prior-schema; RFQ submission succeeds with Odoo available *and* with Odoo unavailable (durable capture, later queue recovery verified); queue idempotency and DLQ handling verified; admin authentication/RBAC verified; upload validation and protected access verified or the feature stays disabled; performance budget met on representative routes (`04_SEO_PERFORMANCE_ANALYTICS.md`); minimum technical-SEO checks pass; no known critical accessibility blocker; monitoring, alerts, backups, and a tested rollback path are operational; every P0 item passes and every P1 exception is named, owned, and time-bounded.

**Release record** for every candidate: environment, commit SHA, Cloudflare deployment/Worker-version IDs, D1 migration version, Odoo version/module info if known, test window, QA/engineering/product owner sign-off, and an explicit Go / No-Go / Conditional-Go decision. Deployment fails closed when production configuration is invalid.

**Post-deploy verification cadence:** 0–5 min (deploy status/commit match, clean build log, homepage reachable, no `5xx`, critical assets load); 0–15 min (domain/DNS/TLS/redirect convergence to canonical `www`, no stale-cache leakage); 5–30 min (route/UI smoke across critical pages and devices); 10–45 min (RFQ submission end to end with a clearly labeled test record, exactly one downstream record created, no PII in logs/analytics); 15–60 min (SEO indexability, hreflang, security headers, Core Web Vitals lab check, analytics realtime event); then scheduled reviews at 24h, 72h, and 7 days comparing error rate, conversion rate, Search Console signals, and Core Web Vitals field data against baseline. Every release ends in a written Post-Deploy Report naming P0/P1 pass counts, open issues with owner/severity/deadline, and a final Keep / Fix-forward / Rollback decision.

**Rollback vs. fix-forward:** roll back immediately if the site or a primary flow is materially unavailable, data is lost/corrupted/misrouted, a secret or personal data is exposed, sustained 5xx/crash/high-latency occurs, a critical form/integration is fully broken without a safe fast fix, or a broad SEO regression occurs (site-wide `noindex`, wrong canonical domain, sitemap loss). Fix-forward is acceptable only when impact is narrow and precisely known, data/security are not at risk, the fix is smaller and faster than a rollback, rollback itself would cause worse data incompatibility, and the release owner and technical lead both record the decision.

**Severity model** (used consistently across pre-deploy, post-deploy, and testing gates): **S0/P0 — critical** (active data exposure, destructive behavior, security compromise, site-wide outage) blocks release or triggers immediate incident response; **S1/P1 — high** (lost/duplicate RFQ, authorization bypass, broken canonical/critical journey) blocks merge/release; **S2 — medium** (material defect with workaround) requires a documented, owned, time-bound exception; **S3/P2 — low** (localized/minor) may ship with an owner and target date.

---

## 10. Coding standards (summary)

- **TypeScript strict mode always on.** No `any` in production code — use `unknown` and narrow explicitly. Public functions, component props, and every integration boundary have explicit types. Prefer `type` over `interface` except where declaration merging is genuinely needed; prefer discriminated unions over multiple booleans; avoid non-null assertions and unjustified `as` casts.
- **External input is never trusted by type alone** — parse and validate at runtime (Zod or equivalent) at every server boundary, Queue message, and Odoo response.
- **Server Components by default**; `'use client'` only at the smallest interactive boundary; client components must never import server-only modules, secrets, or privileged integrations.
- **Naming:** PascalCase components/types, camelCase functions/variables, kebab-case route segments and non-component files, `use`-prefixed hooks, `handle`-prefixed event handlers, `on`-prefixed callback props. No `I`/`T` type prefixes.
- **Imports** ordered React/Next → external packages → internal absolute → relative → type-only → styles; no deep private imports across features; no circular dependencies; named exports preferred for reusable modules.
- **Error handling:** no empty catch blocks hiding a failure; user-facing messages are calm and non-technical; production stack traces, provider payloads, and internal identifiers never reach the client; structured logs carry enough context to diagnose without secrets or personal data.
- **Dependencies, forms, security, performance, and SEO rules** in the full `CODING_STANDARDS.md` source restate the architecture already covered in §§2, 6, and `04_SEO_PERFORMANCE_ANALYTICS.md` — the standard is: validate server-side, isolate integrations behind typed adapters, ship the minimum client JavaScript, and never weaken types/tests/lint/security controls merely to make a check pass.
- **Quality gates before any change is "done":** relevant formatter/linter/typecheck/tests/build pass; responsive, RTL/LTR, accessibility, and SEO impact are checked for UI changes; no secret, debug statement, or unrelated change is introduced; the diff is reviewed, not just compiled.
