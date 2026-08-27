# Ahan Asa — Quality Assurance Checklist

**Document:** `QA_CHECKLIST.md`  
**Project:** Ahan Asa (`ahanassa.com`)  
**Version:** 2.0  
**Status:** Implementation-ready specification  
**Last updated:** 2026-08-26  
**Primary stack:** Next.js App Router on Cloudflare Workers, D1, R2, Queues, Turnstile, Odoo ERP  

---

## 1. Purpose

This document defines the release-level quality assurance checklist for Ahan Asa. It covers the public website, administration panel, product and price read models, RFQ workflow, file uploads, Cloudflare services, and the integration with `odoo.ahanassa.com`.

This is a **release gate**, not merely a list of suggestions. Every mandatory item must be marked as passed, formally accepted as a documented exception, or linked to a blocking defect before production release.

Detailed search-engine checks belong in `SEO_QA_CHECKLIST.md`. This document still contains the minimum SEO checks required for a general production release.

---

## 2. Quality principles

1. Odoo is the source of truth for commercial data and business processes.
2. The public website must not depend on a live Odoo response to render public pages.
3. A submitted RFQ must be saved before the customer receives a success response.
4. Queue retries must never create duplicate customers, leads, RFQs, or RFQ lines.
5. Public SEO pages must return useful HTML without requiring client-side JavaScript.
6. Security, accessibility, performance, data integrity, and recoverability are release requirements.
7. No lead may be silently lost.
8. No public price may be displayed without its unit, status, and last-update context.
9. No production release is complete without observability and a tested rollback path.

---

## 3. Status and evidence convention

Use one status for each checklist item:

| Status | Meaning |
|---|---|
| `[ ]` | Not tested |
| `[x]` | Passed |
| `[!]` | Failed; release blocker or defect reference required |
| `[~]` | Accepted exception with owner, reason, risk, and expiry date |
| `N/A` | Not applicable; reason required |

Evidence should include, where relevant:

- environment and build identifier;
- test date and tester;
- route, request ID, RFQ ID, queue message ID, or Odoo record ID;
- screenshot, video, automated-test output, log query, or response sample;
- expected result and actual result;
- defect ID for every failure;
- approver for every accepted exception.

---

## 4. Release information

Complete this section for every release candidate.

| Field | Value |
|---|---|
| Release/version | |
| Git commit SHA | |
| Cloudflare deployment ID | |
| Database migration version | |
| Odoo version | |
| Odoo integration module version | |
| Test environment | Development / Preview / Staging / Production |
| Test start/end | |
| QA owner | |
| Engineering owner | |
| Product owner | |
| Release decision | Go / No-Go / Conditional Go |

---

## 5. Mandatory release gates

A production release is blocked unless all applicable gates pass.

- [ ] Production build completes without errors.
- [ ] Type checking, linting, unit tests, integration tests, and required end-to-end tests pass.
- [ ] All D1 migrations apply successfully to a clean test database and the upgrade path is verified against a production-like copy.
- [ ] No unresolved Severity 0 or Severity 1 defect exists.
- [ ] No unresolved data-loss, duplicate-record, authorization-bypass, secret-exposure, or checkout/RFQ-blocking defect exists.
- [ ] Critical public routes return the expected HTTP status and content.
- [ ] RFQ submission succeeds when Odoo is available.
- [ ] RFQ submission remains successful when Odoo is unavailable, with later queue recovery verified.
- [ ] Queue idempotency and dead-letter handling are verified.
- [ ] Admin authentication and role authorization are verified.
- [ ] File upload validation and protected access are verified.
- [ ] Public pages meet the agreed performance budget in the release environment.
- [ ] Minimum technical SEO checks pass.
- [ ] Accessibility has no known critical blocker.
- [ ] Monitoring, alerts, backups, and rollback are operational.
- [ ] Production smoke test is completed after deployment.

---

## 6. Test environments and data isolation

- [ ] Development, preview/staging, and production use separate bindings and secrets.
- [ ] Non-production deployments cannot write to the production D1 database.
- [ ] Non-production deployments cannot write to the production R2 bucket.
- [ ] Non-production queues cannot deliver records to production Odoo unless explicitly using a controlled test tenant/database.
- [ ] Production secrets are not available to preview branches.
- [ ] Test email, SMS, analytics, and notification destinations are clearly separated.
- [ ] Test records are visibly tagged with environment and test-run identifiers.
- [ ] Destructive tests run only against disposable or approved test data.
- [ ] Test files and records have a documented cleanup procedure.
- [ ] Production-like data used in testing is anonymized.
- [ ] Server and application clocks use a defined standard; displayed Persian/local dates remain correct.
- [ ] Time-zone transitions do not alter price update times, audit events, or RFQ ordering incorrectly.

---

## 7. Build and code-quality checks

- [ ] Dependency installation is reproducible from the lockfile.
- [ ] Production build succeeds in a clean environment.
- [ ] TypeScript reports no errors.
- [ ] Linting reports no release-blocking errors.
- [ ] Automated formatting checks pass where configured.
- [ ] Unit tests pass.
- [ ] Integration tests pass.
- [ ] End-to-end tests pass for critical journeys.
- [ ] Database migration tests pass.
- [ ] No test is silently skipped without a documented reason.
- [ ] No development-only route, mock API, debug toolbar, fixture, or feature flag is exposed in production.
- [ ] No source map containing sensitive server code or secrets is publicly accessible.
- [ ] No secret, token, password, private hostname, or personal test data exists in committed files or client bundles.
- [ ] Runtime compatibility is verified against the selected Cloudflare Workers compatibility date and flags.
- [ ] Node-specific APIs not supported by the target runtime are absent or correctly isolated.
- [ ] Bundle analysis identifies no unexpected large client dependency.
- [ ] Hydration warnings and uncaught browser-console errors are absent on critical routes.

---

## 8. Routing, domains, and HTTP behavior

### 8.1 Canonical host and HTTPS

- [ ] `http://ahanassa.com` redirects to the approved HTTPS canonical host.
- [ ] `http://www.ahanassa.com` redirects to the approved HTTPS canonical host.
- [ ] The non-canonical HTTPS hostname redirects in one hop.
- [ ] Redirects preserve valid paths and approved query parameters.
- [ ] Redirect loops do not occur.
- [ ] TLS certificate is valid and complete.
- [ ] HSTS behavior matches the security specification.
- [ ] Mixed-content warnings are absent.

### 8.2 Route behavior

- [ ] Home page returns `200`.
- [ ] Category pages return `200`.
- [ ] Product and variant landing pages return `200` only when publishable.
- [ ] Price landing pages return `200` only when they contain approved public content.
- [ ] Article listing and published article pages return `200`.
- [ ] RFQ page returns `200` and is usable.
- [ ] Admin routes require authentication.
- [ ] Unpublished, disabled, or deleted resources do not leak through predictable URLs.
- [ ] Unknown routes return a real `404`, not a soft 404.
- [ ] Removed resources use the approved `301`, `308`, `404`, or `410` policy.
- [ ] API validation failures return appropriate `4xx` responses.
- [ ] Server failures return controlled `5xx` responses without sensitive details.
- [ ] Method restrictions are enforced; unsupported methods return `405` where appropriate.
- [ ] Trailing-slash and case behavior are consistent.
- [ ] Pagination boundaries behave correctly for page 1, final page, and out-of-range pages.

---

## 9. Global user interface

- [ ] Header, navigation, footer, logo, primary CTA, and contact information are consistent.
- [ ] Navigation labels match the approved information architecture.
- [ ] Current-page and hover/focus states are clear.
- [ ] Mobile menu opens, traps focus where required, closes, and restores focus.
- [ ] Escape key closes dismissible overlays.
- [ ] Back/forward navigation preserves expected page state.
- [ ] Loading, empty, success, error, and offline/degraded states are designed and tested.
- [ ] Skeletons do not cause major layout shifts.
- [ ] Toasts and alerts are readable, dismissible when appropriate, and announced to assistive technology.
- [ ] No content overlaps, clips, or becomes unreachable at supported viewport sizes.
- [ ] Long Persian names, product titles, units, prices, email addresses, and URLs do not break layout.
- [ ] Browser zoom at 200% remains usable.
- [ ] Horizontal scrolling does not occur on standard mobile pages.
- [ ] Touch targets are sufficiently large and spaced.
- [ ] Disabled controls are visually and programmatically identifiable.
- [ ] Confirmations exist for destructive admin actions.
- [ ] Accidental double-clicks do not cause duplicate submissions.

---

## 10. Persian, RTL, and localization

- [ ] Root document language is correct.
- [ ] Persian pages use `dir="rtl"`.
- [ ] Mixed Persian/Latin content, numbers, SKUs, email addresses, and phone numbers render correctly.
- [ ] Quantity, decimal, thousands separator, currency, and unit formatting follow the approved convention.
- [ ] Persian and Gregorian date usage follows the product specification.
- [ ] Phone fields support international country codes without RTL inversion.
- [ ] Form labels, validation messages, placeholders, buttons, and status messages are translated consistently.
- [ ] Icons whose direction carries meaning are mirrored correctly.
- [ ] Breadcrumb order is correct in RTL.
- [ ] Tables remain readable on narrow screens.
- [ ] Uploaded filenames containing Persian characters are handled safely.
- [ ] Search supports Persian characters and approved Arabic/Persian character normalization, including `ی/ي` and `ک/ك`.
- [ ] Zero-width and whitespace normalization do not create duplicate products or failed searches.
- [ ] Copy/paste from common Persian keyboards and Excel works as expected.

---

## 11. Responsive and browser coverage

Test at minimum:

- small mobile: 320–375 px;
- standard mobile: 390–430 px;
- tablet portrait and landscape;
- laptop: 1280–1440 px;
- wide desktop: 1920 px and above.

Browsers:

- latest stable Chrome;
- latest stable Safari on macOS and iOS;
- latest stable Firefox;
- latest stable Edge;
- supported Android Chrome.

Checklist:

- [ ] Core public journeys work on every supported browser.
- [ ] RFQ row editing and file upload work on mobile Safari and Android Chrome.
- [ ] Sticky elements do not cover form controls.
- [ ] On-screen keyboard does not hide the active field or submit button.
- [ ] Date, number, select, and file inputs have usable fallbacks.
- [ ] Hover-only information has a touch and keyboard alternative.
- [ ] Landscape orientation remains usable.
- [ ] Print behavior is acceptable for RFQ confirmation and relevant admin views, if supported.

---

## 12. Public content and CMS

### 12.1 Article lifecycle

- [ ] Authorized operator can create an article draft.
- [ ] Drafts are not publicly accessible or indexable.
- [ ] Required fields are enforced.
- [ ] Slug uniqueness is enforced.
- [ ] Preview accurately represents the public page.
- [ ] Publish action records actor and timestamp.
- [ ] Scheduled publication, if supported, uses the correct time zone.
- [ ] Editing a published article updates the public page after the defined cache invalidation window.
- [ ] Unpublishing removes the public page according to the approved status-code policy.
- [ ] Article categories can be created, edited, ordered, and disabled according to role permissions.
- [ ] Rich text cannot inject unsafe HTML or scripts.
- [ ] Headings, lists, tables, links, captions, and alt text survive save and render correctly.
- [ ] Autosave or unsaved-change warning works as specified.
- [ ] Concurrent edits have defined conflict behavior.
- [ ] Revision/audit information is retained as specified.

### 12.2 Media

- [ ] Images upload to the approved R2 location.
- [ ] Media metadata records owner, content type, size, and creation time.
- [ ] Unsupported types are rejected.
- [ ] Oversized files are rejected with a helpful message.
- [ ] Filename is not trusted as the MIME type.
- [ ] Image orientation and color rendering are correct.
- [ ] Replacing media does not leave broken public references.
- [ ] Deleting in-use media is blocked or clearly warns about references.
- [ ] Orphan-media cleanup does not delete referenced assets.

---

## 13. Product catalog

### 13.1 Data model

- [ ] Category → product → variant relationships are correct.
- [ ] Product attributes, sizes, standards, brands/origins, and units map to the intended entities.
- [ ] Foreign keys and uniqueness constraints reject invalid records.
- [ ] Odoo identifiers and website identifiers cannot collide.
- [ ] A product may have multiple variants without duplicating product-level content.
- [ ] Disabled products and variants are excluded from public selection.
- [ ] Disabling a parent category has the specified effect on descendants.
- [ ] Free-text/custom RFQ items remain possible when the catalog has no match.

### 13.2 Catalog behavior

- [ ] Category lists contain only published, eligible products.
- [ ] Product filters return correct results.
- [ ] Filter reset restores the default result set.
- [ ] Empty results provide a recovery path.
- [ ] Sorting is deterministic.
- [ ] Search returns relevant products for approved Persian spelling variants.
- [ ] Variant selection updates size, unit, availability, and price context correctly.
- [ ] Direct links to variants restore the correct selection.
- [ ] Stale or deleted Odoo products do not produce broken website relations.
- [ ] Product commercial data and website SEO content remain clearly separated.
- [ ] Product sync does not overwrite website-owned SEO fields.
- [ ] Website edits cannot overwrite Odoo-owned commercial fields.

---

## 14. Pricing system

- [ ] Odoo is verified as the authoritative commercial price source.
- [ ] Public price sync writes to the website read model without requiring live Odoo reads from public pages.
- [ ] Price displays include product/variant, amount, currency, unit, status, and last-updated time.
- [ ] Decimal precision and rounding follow the approved business rule.
- [ ] Zero, negative, null, expired, and unavailable prices follow explicit display rules.
- [ ] A stale-price threshold is enforced and visibly handled.
- [ ] “Contact for price” is shown where required instead of misleading numeric data.
- [ ] Price history is append-only or otherwise auditable according to the data specification.
- [ ] Repeated delivery of the same price event does not create duplicate history entries.
- [ ] Out-of-order sync events cannot overwrite a newer price with an older price.
- [ ] Bulk price updates preserve per-record success/failure results.
- [ ] Partial bulk failures are recoverable and clearly reported.
- [ ] Price cache invalidation targets affected product/category/price pages.
- [ ] Unrelated cached pages are not unnecessarily purged.
- [ ] Price pages continue to render during Odoo downtime.
- [ ] Price charts, if present, use correct dates, values, units, and missing-data behavior.

---

## 15. RFQ builder

### 15.1 Contact and request fields

- [ ] Required contact fields match the approved specification.
- [ ] Individual/company selection behaves correctly, if present.
- [ ] Country code and phone number remain separate and correctly ordered in RTL/LTR contexts.
- [ ] Iranian and international phone formats follow the approved validation policy.
- [ ] Email validation accepts valid addresses and rejects clearly invalid addresses.
- [ ] Company, city, project, delivery destination, notes, and consent fields persist correctly.
- [ ] UTM source, medium, campaign, content, term, referrer, landing page, locale, and consent metadata are recorded where applicable.
- [ ] Hidden metadata cannot be used to inject arbitrary trusted values.
- [ ] Turnstile is verified server-side.
- [ ] A failed anti-bot challenge does not save a misleading completed RFQ.

### 15.2 Structured item rows

- [ ] Customer can add any reasonable number of item rows within defined limits.
- [ ] Customer can remove a row.
- [ ] Customer can duplicate a row if supported.
- [ ] Row order remains stable.
- [ ] Category selection limits product choices correctly.
- [ ] Product selection limits variant/size choices correctly.
- [ ] Unit choices are valid for the selected item.
- [ ] Quantity accepts the approved decimal precision.
- [ ] Zero, negative, malformed, and excessive quantities are rejected.
- [ ] Per-row description is preserved.
- [ ] Changing a category clears incompatible product and variant values.
- [ ] Validation identifies the exact invalid row and field.
- [ ] Keyboard navigation across rows is logical.
- [ ] Adding/removing rows works on mobile without losing other values.
- [ ] At least one item or one valid attachment is required according to the approved policy.

### 15.3 Custom/free item

- [ ] “Product not found” flow is available.
- [ ] Custom item accepts title, size/variant, unit, quantity, and description.
- [ ] Required fields are enforced.
- [ ] Custom item is visibly distinct in admin and Odoo.
- [ ] Custom text is sanitized and cannot inject markup or formulas.
- [ ] Custom item does not automatically create an approved catalog product.

### 15.4 Attachments

- [ ] Approved Excel, PDF, and image types upload successfully.
- [ ] File-count and per-file/total-size limits are enforced.
- [ ] MIME type, extension, and file signature are validated.
- [ ] Executable, script, archive, polyglot, and unsupported files are rejected.
- [ ] Macro-enabled Office documents follow the explicit security policy.
- [ ] Uploaded files receive non-guessable object keys.
- [ ] Original filename is stored as metadata, not used as the object key.
- [ ] Upload failure can be retried without duplicating successful files.
- [ ] Removing a file before submit removes or expires the temporary object.
- [ ] Abandoned temporary uploads are cleaned up according to retention policy.
- [ ] Attachments are private by default and are not indexed.
- [ ] Download access requires authorization or a short-lived approved URL.
- [ ] Response headers prevent unsafe inline execution.
- [ ] Malware scanning/quarantine behavior matches the security specification.
- [ ] Attachment reference remains valid after successful Odoo synchronization.

### 15.5 Submission and confirmation

- [ ] Submit button prevents accidental duplicate clicks.
- [ ] Server validates every client-supplied field again.
- [ ] RFQ header, all valid items, attachment references, attribution, and consent are saved atomically or with a documented recovery design.
- [ ] Customer receives success only after durable website-side persistence.
- [ ] A unique human-readable RFQ number is generated.
- [ ] A globally unique idempotency key is generated.
- [ ] Confirmation shows the correct reference number and next step.
- [ ] Refreshing the success page does not resubmit the RFQ.
- [ ] Browser back/forward behavior does not create a duplicate RFQ.
- [ ] Network timeout after server success can be safely retried.
- [ ] Validation failure preserves entered data where safe.
- [ ] Sensitive personal data is not exposed in the confirmation URL.
- [ ] Submission creates an audit event and an observable request trace.

---

## 16. Odoo integration

### 16.1 Adapter and authentication

- [ ] Website code calls Odoo only through the defined adapter layer.
- [ ] Odoo API version/protocol matches the deployed Odoo version.
- [ ] Dedicated integration user exists.
- [ ] Integration user follows least privilege.
- [ ] API credential exists only as a server-side secret.
- [ ] Credential rotation is tested or documented.
- [ ] Requests use HTTPS and validate the target host.
- [ ] Timeouts are explicit.
- [ ] Retryable and non-retryable failures are classified correctly.
- [ ] Odoo error bodies and credentials are not returned to the browser.

### 16.2 Website → Odoo

- [ ] Customer/contact maps to the correct Odoo model and fields.
- [ ] Existing contact matching uses approved keys and does not merge unrelated people.
- [ ] RFQ maps to the intended CRM lead/opportunity or custom RFQ model.
- [ ] RFQ items map without losing category, product, variant, size, unit, quantity, or description.
- [ ] Custom items are represented correctly.
- [ ] Website source, locale, landing page, and UTM data arrive in Odoo.
- [ ] Attachment references or uploaded attachments are accessible to authorized Odoo users.
- [ ] Website RFQ number and idempotency key are stored in Odoo.
- [ ] Replaying the same event returns or updates the same Odoo record.
- [ ] Partial creation is compensated or recoverable.
- [ ] Sync result stores Odoo record ID, status, and last-synced timestamp.

### 16.3 Odoo → website

- [ ] Product, variant, unit, price, availability, and update-time mappings are verified.
- [ ] Incremental sync includes all records changed after the cursor/watermark.
- [ ] Full reconciliation detects missed or divergent records.
- [ ] Deleted/archived Odoo records follow defined website behavior.
- [ ] Conflict resolution respects field ownership defined in `SYSTEM_OF_RECORD.md`.
- [ ] External IDs remain stable across syncs.
- [ ] Sync version prevents old events overwriting new data.
- [ ] Successful sync triggers only the required cache invalidation.
- [ ] Public data is sanitized before storage/display.
- [ ] RFQ status returned to customers, if supported, never exposes internal notes.

---

## 17. Queues, retries, and failure recovery

- [ ] RFQ is committed to D1 before a queue message is considered ready.
- [ ] Queue payload contains a versioned event schema.
- [ ] Queue payload contains event ID, entity ID, attempt context, and timestamp.
- [ ] Payload contains only the personal data required by the consumer.
- [ ] Consumer validates payload schema.
- [ ] Consumer is idempotent.
- [ ] Duplicate delivery does not create duplicate Odoo records.
- [ ] Retry policy uses bounded attempts and appropriate backoff.
- [ ] Authentication, validation, and permanent business-rule failures are not retried forever.
- [ ] Temporary Odoo timeout/`5xx` failures are retried.
- [ ] Poison messages move to the dead-letter queue after the configured threshold.
- [ ] Dead-letter messages include enough context for safe diagnosis.
- [ ] Dead-letter queue produces an actionable alert.
- [ ] Authorized operator can replay a failed event safely.
- [ ] Replay preserves the original idempotency identity.
- [ ] Queue backlog and oldest-message age are monitored.
- [ ] Odoo outage does not block public page rendering.
- [ ] Odoo outage does not block durable RFQ acceptance.
- [ ] Recovery after Odoo outage drains the backlog without duplication.
- [ ] Failure after Odoo creation but before website acknowledgement is safely reconciled.
- [ ] Reconciliation job detects website RFQs missing Odoo records.
- [ ] Failure scenarios in `FAILURE_RECOVERY.md` have test evidence.

---

## 18. Administration panel

### 18.1 Authentication and sessions

- [ ] Unauthenticated users cannot access admin pages or APIs.
- [ ] Login error does not reveal whether an account exists.
- [ ] Rate limiting protects login and recovery endpoints.
- [ ] Session cookie uses `Secure`, `HttpOnly`, and appropriate `SameSite` settings.
- [ ] Session expires according to policy.
- [ ] Logout invalidates the session.
- [ ] Password reset token is single-use, short-lived, and not logged.
- [ ] MFA behavior is tested if required.
- [ ] Deactivated users lose access promptly.
- [ ] Changing sensitive credentials invalidates prior sessions as specified.

### 18.2 Roles and permissions

- [ ] Each defined role has an explicit permission matrix.
- [ ] Authorization is enforced server-side, not only by hidden UI.
- [ ] Article operator cannot change prices unless permitted.
- [ ] Price operator cannot administer users unless permitted.
- [ ] RFQ operator sees only approved personal and commercial data.
- [ ] Admin-only actions reject lower-privilege API calls.
- [ ] Privilege escalation through modified IDs or request bodies is blocked.
- [ ] Bulk actions enforce permission on every affected record.
- [ ] Audit-log access follows the approved role policy.

### 18.3 Operational workflows

- [ ] Dashboard totals match underlying data.
- [ ] Article create/edit/publish workflow functions.
- [ ] Catalog data reflects the Odoo ownership model.
- [ ] Price views clearly identify synced versus stale/failed data.
- [ ] RFQ statuses support New, Viewed, In Progress, Quoted, Won, and Lost as approved.
- [ ] Status transitions are validated and audited.
- [ ] RFQ search and filtering return correct records.
- [ ] Operators can view all item rows and approved attachments.
- [ ] Failed sync and dead-letter state are visible to authorized operators.
- [ ] Retry/replay action is protected and idempotent.
- [ ] Pagination and export do not omit or duplicate records.
- [ ] Spreadsheet export prevents formula injection.
- [ ] Bulk operations require confirmation and show per-record outcome.
- [ ] Errors do not discard unsaved operator input without warning.

---

## 19. Database and data integrity

- [ ] D1 foreign-key enforcement is enabled where required.
- [ ] Required unique constraints exist for slugs, external IDs, idempotency keys, and other business keys.
- [ ] Indexes support frequent filters, joins, sync queries, and status dashboards.
- [ ] Index behavior is verified with production-like data volume.
- [ ] Migrations are ordered, repeatable where intended, and recorded.
- [ ] Migration failure leaves the database in a known recoverable state.
- [ ] Backward compatibility exists during rolling deployment where required.
- [ ] Nullability and default values match the schema specification.
- [ ] Monetary values do not use unsafe floating-point storage/logic.
- [ ] Quantities and units retain approved precision.
- [ ] Timestamps are stored consistently and displayed in the required locale/time zone.
- [ ] Soft-delete/archive behavior is consistent.
- [ ] Audit logs capture actor, action, entity, timestamp, and relevant before/after values.
- [ ] Sensitive values and secrets are excluded or redacted from audit logs.
- [ ] Personal-data retention and deletion workflows preserve required business/audit records.
- [ ] Backup/restore test proves data can be recovered.
- [ ] Restored database is reconciled with R2 objects, queues, and Odoo state.
- [ ] Read-replication/session behavior, if enabled, satisfies read-after-write requirements for critical flows.

---

## 20. Security checklist

- [ ] Threat model covers public pages, admin, APIs, D1, R2, Queues, and Odoo integration.
- [ ] All input is validated using allowlists and explicit schemas.
- [ ] Output encoding prevents stored and reflected XSS.
- [ ] SQL queries are parameterized.
- [ ] CSRF protection exists where cookie-authenticated mutations require it.
- [ ] CORS allows only intended origins, methods, and headers.
- [ ] Security headers match `SECURITY_GUIDELINES.md`.
- [ ] Content Security Policy is deployed and tested.
- [ ] Clickjacking protection is effective.
- [ ] MIME sniffing is disabled where appropriate.
- [ ] Open redirects are blocked.
- [ ] Path traversal and object-key manipulation are blocked.
- [ ] IDOR tests confirm users cannot access another record or attachment.
- [ ] Rate limits protect RFQ, search, login, upload, and sensitive APIs.
- [ ] Turnstile failure modes do not create an availability blocker without a documented fallback.
- [ ] Error responses do not expose stack traces, SQL, internal paths, Odoo internals, or secrets.
- [ ] Logs redact API keys, cookies, authorization headers, phone numbers, emails, and attachment URLs as specified.
- [ ] Secrets are stored in approved secret storage and absent from client bundles.
- [ ] Odoo integration user cannot access unnecessary applications or models.
- [ ] Dependency vulnerability review has no unaccepted critical/high finding.
- [ ] File upload security tests pass.
- [ ] Admin brute-force and session-management tests pass.
- [ ] Backup files and diagnostic endpoints are not public.
- [ ] `robots.txt` is not treated as an access-control mechanism.
- [ ] Security exceptions have owner, mitigation, and expiry date.

---

## 21. Accessibility

Target: WCAG 2.2 AA unless a stricter project requirement is approved.

- [ ] Every page has a unique, descriptive title.
- [ ] One logical primary heading exists per page.
- [ ] Heading order is meaningful.
- [ ] Landmarks and semantic elements are used correctly.
- [ ] Skip link is available and works.
- [ ] All interactive controls are keyboard accessible.
- [ ] Focus order follows visual/logical order.
- [ ] Focus indicator is clearly visible.
- [ ] Modals trap focus and restore it on close.
- [ ] Form controls have persistent programmatic labels.
- [ ] Required fields and errors are not communicated by color alone.
- [ ] Errors are summarized and associated with fields.
- [ ] Dynamic status messages use appropriate live regions.
- [ ] Images have meaningful alt text or are marked decorative.
- [ ] Icon-only buttons have accessible names.
- [ ] Text and non-text contrast meet the target.
- [ ] Content works at 200% zoom and with text spacing overrides.
- [ ] Reduced-motion preference is respected.
- [ ] Tables have correct headers and captions where needed.
- [ ] RFQ row controls expose row and field context to screen readers.
- [ ] Automated accessibility scan has no critical violations.
- [ ] Manual keyboard and screen-reader smoke tests pass on critical journeys.

---

## 22. Performance and Core Web Vitals

Internal release targets for representative public pages:

| Metric | Target |
|---|---:|
| LCP | `< 2.0 s` |
| INP | `< 150 ms` |
| CLS | `< 0.05` |
| TTFB | `< 500 ms` |
| Lighthouse Performance | `95+` |
| Lighthouse Accessibility | `95+` |
| Lighthouse Best Practices | `95+` |
| Lighthouse SEO | `100` |

These targets must be measured using the profiles, locations, throttling, sample count, and pass rules defined in `PERFORMANCE_BUDGET.md` and `TESTING_STRATEGY.md`.

- [ ] Home page meets the performance budget.
- [ ] Representative category page meets the budget.
- [ ] Representative product page meets the budget.
- [ ] Representative price page meets the budget.
- [ ] Representative article page meets the budget.
- [ ] RFQ page meets its route-specific budget.
- [ ] Public SEO pages render meaningful HTML without client hydration.
- [ ] Only interactive components ship client JavaScript.
- [ ] Route-level JavaScript remains under the approved budget.
- [ ] Third-party scripts remain under budget and load with the approved strategy.
- [ ] No render-blocking font or unnecessary stylesheet delays LCP.
- [ ] Critical image is prioritized correctly.
- [ ] Below-the-fold images are lazy-loaded.
- [ ] Responsive images do not download oversized assets.
- [ ] Image dimensions/aspect ratio prevent layout shift.
- [ ] AVIF/WebP fallback behavior is correct.
- [ ] Fonts are self-hosted as approved, use WOFF2, and load only required subsets/weights.
- [ ] Font fallback minimizes layout shift.
- [ ] Public response caching produces expected edge cache hits.
- [ ] Cached pages do not expose personalized/admin data.
- [ ] `stale-while-revalidate` behavior is verified where configured.
- [ ] Cold-cache and warm-cache behavior are both measured.
- [ ] D1 query counts and latency remain within route budget.
- [ ] No public route makes a synchronous request to Odoo.
- [ ] Real-user monitoring is ready to capture Core Web Vitals after launch.

---

## 23. Caching and invalidation

- [ ] Cache policy is defined per route and response type.
- [ ] Public content is cacheable only when safe.
- [ ] Admin, authenticated, and personalized responses are not publicly cached.
- [ ] Cookies and authorization headers do not accidentally fragment or poison public cache.
- [ ] Cache keys include only intentional dimensions.
- [ ] Query parameters that should not vary content do not create unbounded cache entries.
- [ ] Product update purges affected product and related category entries.
- [ ] Price update purges affected price/product entries.
- [ ] Article publish/update purges article and relevant listing entries.
- [ ] Unpublish/delete invalidates stale public copies.
- [ ] Cache-tag naming follows `CACHING_STRATEGY.md`.
- [ ] Purge failure is logged and recoverable.
- [ ] Stale data behavior during origin/service failure matches specification.
- [ ] Cache headers are verified at both browser and edge layers.
- [ ] Error responses are not cached longer than intended.
- [ ] Rollback does not leave incompatible cached HTML/assets.

---

## 24. Minimum SEO release checks

Run the full `SEO_QA_CHECKLIST.md` before launch. At minimum:

- [ ] Every indexable page returns meaningful server-rendered HTML.
- [ ] Title, meta description, canonical, robots directive, and H1 are correct.
- [ ] Canonical host and URL are consistent.
- [ ] Indexable pages are self-canonical unless another policy is documented.
- [ ] Draft, admin, API, search-result, and non-indexable filter pages are excluded appropriately.
- [ ] Crawlable links use real URLs.
- [ ] `robots.txt` is correct for the production environment.
- [ ] Preview/staging environments are blocked from indexing.
- [ ] Sitemap index and child sitemaps return `200` and valid XML.
- [ ] Sitemaps include only canonical, indexable, `200` URLs.
- [ ] `lastmod` reflects meaningful updates.
- [ ] Structured data matches visible content and passes validation.
- [ ] Breadcrumbs are visible and structurally correct.
- [ ] Product/price pages do not create uncontrolled thin or duplicate pages.
- [ ] Faceted/filter URL policy is enforced.
- [ ] Open Graph metadata and share image work.
- [ ] Internal links contain no broken destination in the release crawl.
- [ ] `404`, redirect, canonical, and status-code behavior passes crawler validation.

---

## 25. Analytics, consent, and attribution

- [ ] Analytics loads only according to the approved consent policy.
- [ ] Consent choice persists and can be changed.
- [ ] Rejected optional tracking remains disabled.
- [ ] Core business events have stable names and schemas.
- [ ] Page-view events are not duplicated by navigation/hydration.
- [ ] RFQ start, row add, upload, validation error, submit success, and submit failure events fire as specified.
- [ ] Events contain no unnecessary personal data.
- [ ] UTM and referrer attribution persist through the RFQ journey.
- [ ] Attribution maps correctly into website records and Odoo.
- [ ] Internal/admin traffic exclusion works as specified.
- [ ] Analytics failure does not block page rendering or RFQ submission.
- [ ] Consent/audit evidence satisfies the privacy specification.

---

## 26. Observability and alerting

- [ ] Each request has a trace/correlation identifier where required.
- [ ] RFQ logs can be correlated across Worker, D1, Queue, integration consumer, and Odoo without exposing sensitive data.
- [ ] Worker exceptions are captured.
- [ ] API latency and error rates are monitored.
- [ ] D1 latency/errors are monitored.
- [ ] R2 upload/download errors are monitored.
- [ ] Queue depth, retry count, failure rate, and oldest-message age are monitored.
- [ ] Dead-letter queue growth produces an alert.
- [ ] Odoo availability, latency, authentication failures, and schema/mapping failures are distinguishable.
- [ ] Cache hit ratio and purge failures are monitored.
- [ ] RFQ submission success/failure rate is monitored.
- [ ] Unexpected drop in RFQ volume has a detection method.
- [ ] `404` and `5xx` trends are monitored.
- [ ] Core Web Vitals field data is collected.
- [ ] Alerts have owner, severity, channel, and runbook.
- [ ] Test alert reaches the intended responder.
- [ ] Logs have defined retention and access control.
- [ ] Personal and commercial data is redacted according to policy.

---

## 27. Email and operational notifications

If notifications are in scope:

- [ ] Customer confirmation uses the correct RFQ number and approved content.
- [ ] Internal notification reaches the intended team only.
- [ ] Notification failure does not roll back a successfully saved RFQ.
- [ ] Failed notification is retried or surfaced operationally.
- [ ] Duplicate queue delivery does not send duplicate messages unnecessarily.
- [ ] Links use the canonical domain and valid HTTPS URLs.
- [ ] Persian/RTL content renders correctly in major email clients.
- [ ] Plain-text fallback is usable.
- [ ] Reply-to and sender identity are correct.
- [ ] No attachment or personal data is exposed to unintended recipients.

---

## 28. Resilience and recovery scenarios

Test each scenario and record evidence:

- [ ] Odoo unavailable before RFQ submission.
- [ ] Odoo becomes unavailable during queue consumption.
- [ ] Odoo creates a record but response times out.
- [ ] Queue delivers the same RFQ twice.
- [ ] Queue message is malformed.
- [ ] Dead-letter replay occurs after the underlying defect is fixed.
- [ ] D1 write fails.
- [ ] R2 upload succeeds but RFQ submission fails.
- [ ] RFQ saves but queue publish initially fails.
- [ ] Cache purge fails after price update.
- [ ] A stale price event arrives after a newer event.
- [ ] Deployment occurs while queue messages are in flight.
- [ ] Database migration and application versions briefly overlap.
- [ ] Cloudflare regional/transient error occurs.
- [ ] Third-party analytics or notification provider is unavailable.
- [ ] Backup is restored and reconciliation completes.
- [ ] Previous application version is redeployed through rollback.

For every scenario verify:

- no silent data loss;
- no duplicate business record;
- safe customer-facing message;
- actionable logs/alert;
- documented recovery action;
- eventual reconciliation.

---

## 29. Deployment and configuration

- [ ] Environment variables match `ENVIRONMENT_VARIABLES.md`.
- [ ] Required secrets exist in the target environment.
- [ ] No secret is configured as a public environment variable.
- [ ] D1, R2, Queue, dead-letter queue, and other bindings point to the intended resources.
- [ ] Production hostname and routes point to the intended Worker deployment.
- [ ] Database migrations run in the approved order.
- [ ] Deployment is compatible with currently queued event-schema versions.
- [ ] Static assets use immutable fingerprinted URLs where appropriate.
- [ ] Cache purge/invalidation accompanies incompatible content changes.
- [ ] Feature flags have owner, default, and rollback behavior.
- [ ] Health/readiness checks represent meaningful service status.
- [ ] Deployment logs and identifiers are retained.
- [ ] Rollback procedure is written and recently tested.
- [ ] Rollback includes application, schema compatibility, cache, and queue considerations.
- [ ] DNS and TLS changes have a recovery plan.

---

## 30. Production smoke test

Run immediately after production deployment.

- [ ] Canonical home page loads over HTTPS.
- [ ] Header, mobile navigation, footer, and primary CTA work.
- [ ] One category page loads.
- [ ] One product page loads with correct commercial and SEO data.
- [ ] One price page loads with correct unit and update time.
- [ ] One published article loads.
- [ ] Sitemap and `robots.txt` return expected responses.
- [ ] Admin login succeeds for an authorized test user.
- [ ] Unauthorized admin access is rejected.
- [ ] A controlled production RFQ is submitted.
- [ ] RFQ appears in D1 with all item rows.
- [ ] Attachment is stored and remains protected, if tested.
- [ ] Queue event is consumed.
- [ ] Exactly one corresponding Odoo record is created.
- [ ] Odoo record contains correct contact, items, attribution, and website reference.
- [ ] Test RFQ is clearly labeled and cleaned up according to policy.
- [ ] No new critical Worker, D1, R2, Queue, or Odoo error appears.
- [ ] Edge caching behaves as expected.
- [ ] Analytics and consent behavior are verified.
- [ ] Release dashboard remains healthy for the defined observation period.

---

## 31. Regression suite

The automated regression suite should include at least:

1. canonical host redirects;
2. public route status and HTML assertions;
3. authentication and role authorization matrix;
4. article draft/publish/unpublish lifecycle;
5. product/category/variant relationships;
6. price sync, staleness, history, and invalidation;
7. RFQ with one structured item;
8. RFQ with multiple structured items;
9. RFQ with a custom item;
10. RFQ with supported attachments;
11. invalid upload rejection;
12. validation and anti-bot rejection;
13. duplicate-submit/idempotency behavior;
14. Odoo-online integration path;
15. Odoo-offline queue/recovery path;
16. duplicate queue delivery;
17. dead-letter and replay path;
18. accessibility smoke checks;
19. SEO metadata/status/sitemap assertions;
20. performance-budget checks for representative routes.

---

## 32. Defect severity and release policy

| Severity | Definition | Release policy |
|---|---|---|
| S0 — Critical | Security breach, secret exposure, irreversible data loss, widespread outage | Immediate stop; release prohibited |
| S1 — High | Lost/duplicate RFQ, authorization bypass, unusable critical journey, incorrect commercial data | Release prohibited |
| S2 — Medium | Material defect with workaround; limited scope | Requires product and engineering decision |
| S3 — Low | Minor visual/content issue with negligible operational impact | May ship with owner and target date |

Every defect must include:

- clear title and severity;
- environment and build;
- reproducible steps;
- expected and actual behavior;
- evidence;
- affected users/data;
- regression risk;
- owner and target release.

Accepted exceptions must state:

- exact failed requirement;
- business justification;
- risk and mitigation;
- accountable approver;
- expiry date or planned fix release.

---

## 33. Release sign-off

### QA summary

| Result | Count |
|---|---:|
| Passed | |
| Failed | |
| Accepted exceptions | |
| Not applicable | |
| Not tested | |

### Open defects

| Defect ID | Severity | Area | Owner | Decision |
|---|---|---|---|---|
| | | | | |

### Approval

| Role | Name | Decision | Date | Notes |
|---|---|---|---|---|
| QA owner | | Go / No-Go | | |
| Engineering owner | | Go / No-Go | | |
| Product owner | | Go / No-Go | | |
| Business/operations owner | | Go / No-Go | | |

The release is approved only when the final decision is recorded, all mandatory gates are satisfied, and every exception is explicitly owned.

---

## 34. Related specifications

This checklist must be used with the current versions of:

- `PROJECT_BRIEF.md`
- `TECHNICAL_ARCHITECTURE.md`
- `STACK.md`
- `DATA_ARCHITECTURE.md`
- `DATABASE_SCHEMA.md`
- `CMS_ARCHITECTURE.md`
- `ADMIN_PANEL_SPEC.md`
- `PRODUCT_CATALOG_SPEC.md`
- `PRICING_SYSTEM.md`
- `RFQ_SYSTEM.md`
- `AUTHORIZATION_ROLES.md`
- `API_INTEGRATIONS.md`
- `ODOO_INTEGRATION.md`
- `SYSTEM_OF_RECORD.md`
- `SYNC_STRATEGY.md`
- `ERP_DATA_MAPPING.md`
- `FAILURE_RECOVERY.md`
- `SECURITY_GUIDELINES.md`
- `CACHING_STRATEGY.md`
- `PERFORMANCE_GUIDELINES.md`
- `PERFORMANCE_BUDGET.md`
- `IMAGE_OPTIMIZATION.md`
- `FONT_STRATEGY.md`
- `SEO_STRATEGY.md`
- `SEO_QA_CHECKLIST.md`
- `STRUCTURED_DATA.md`
- `METADATA_SPEC.md`
- `INTERNAL_LINKING.md`
- `SITEMAP_ROBOTS_SPEC.md`
- `DEPLOYMENT_ARCHITECTURE.md`
- `ENVIRONMENT_VARIABLES.md`
- `TESTING_STRATEGY.md`

If any linked specification conflicts with this checklist, record the conflict in `DECISIONS.md` and resolve it before implementation or release.
