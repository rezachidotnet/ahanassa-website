# Ahan Asa Website QA Checklist

**Document:** `QA_CHECKLIST.md`  
**Project:** Ahan Asa (`آهن آسا`)  
**Owner:** QA / Product / Engineering  
**Applies to:** Preview, staging, and production releases  
**Status:** Living document  
**Last updated:** 2026-08-25

---

## 1. Purpose

This document defines the minimum quality checks required before any Ahan Asa website release is approved. It covers functional behavior, Persian RTL presentation, content accuracy, forms and uploads, accessibility, performance, SEO, analytics, security, integrations, and deployment verification.

Passing this checklist means the tested build satisfies the documented acceptance criteria. It does not replace automated tests, security review, or production monitoring.

---

## 2. Sources of Truth

Validate the build against the latest approved versions of:

- `PROJECT_BRIEF.md`
- `BRAND_GUIDELINES.md`
- `DESIGN_SYSTEM.md`
- `SITEMAP.md`
- `ROUTES.md`
- `PAGE_SPECIFICATIONS.md`
- `CONTENT_STRATEGY.md`
- `FORM_ARCHITECTURE.md`
- `API_INTEGRATIONS.md`
- `METADATA_SPEC.md`
- `LOCALIZATION.md`
- `ACCESSIBILITY.md`
- `PERFORMANCE_GUIDELINES.md`
- `ANALYTICS_TRACKING.md`
- `SECURITY_GUIDELINES.md`
- `TESTING_STRATEGY.md`

If two documents disagree, QA must not guess. Record the conflict and block release until the Product Owner approves one source of truth. In particular, confirm the final route names and primary conversion route before testing navigation, canonicals, analytics, or redirects.

---

## 3. QA Status and Severity

Use one status for every executed check:

| Status | Meaning |
| --- | --- |
| `PASS` | Meets the acceptance criterion with evidence |
| `FAIL` | Does not meet the acceptance criterion |
| `BLOCKED` | Cannot be tested because a dependency is unavailable |
| `N/A` | Not applicable; a reason is mandatory |
| `NOT RUN` | Not tested yet |

Defect severity:

| Severity | Definition | Release effect |
| --- | --- | --- |
| `S0 — Critical` | Security/privacy incident, data loss, compromised production, or destructive behavior | Immediate release stop |
| `S1 — Blocker` | Primary journey unavailable, form data lost, upload broken, major route unavailable, or site unusable for a key audience | Release blocked |
| `S2 — Major` | Material functional, accessibility, SEO, responsive, or content defect with no acceptable workaround | Release normally blocked |
| `S3 — Minor` | Localized issue with a safe workaround and limited user impact | May release only with written acceptance |
| `S4 — Cosmetic` | Visual polish issue that does not impair comprehension or use | Can enter backlog |

---

## 4. Mandatory Release Gates

A release is approved only when all conditions below are true:

- [ ] No open `S0` or `S1` defect.
- [ ] No open `S2` defect unless the Product Owner, Engineering Lead, and QA Owner explicitly accept the risk.
- [ ] The primary request/upload journey passes end to end.
- [ ] Submitted inquiries reach the approved monitored Procurement Intake destination exactly once.
- [ ] The interface never displays a fake submission, quote, tracking, inventory, or delivery confirmation.
- [ ] No sensitive or personal data appears in URLs, analytics, client logs, or public error messages.
- [ ] All public pages have correct Persian direction, content, navigation, metadata, canonical, and indexation behavior.
- [ ] Keyboard operation and critical screen-reader flows pass.
- [ ] No horizontal page overflow at 320 CSS px.
- [ ] Critical performance and layout-stability targets in `PERFORMANCE_GUIDELINES.md` pass.
- [ ] Production configuration contains no test credentials, staging URLs, placeholder records, or debug mode.
- [ ] Rollback procedure is documented and executable.
- [ ] Required evidence and sign-offs are attached to the release record.

---

## 5. Test Record

Complete this section for every candidate release.

| Field | Value |
| --- | --- |
| Release / version | `[fill]` |
| Commit SHA | `[fill]` |
| Environment URL | `[fill]` |
| Test date and time | `[fill]` |
| Tester | `[fill]` |
| Browser/device set | `[fill]` |
| API/integration environment | `[fill]` |
| Test data IDs | `[fill — never include secrets]` |
| Result | `PASS / FAIL / BLOCKED` |
| Known accepted issues | `[links]` |

---

## 6. Minimum Test Matrix

### 6.1 Viewports

- [ ] 320 × 568 — minimum supported mobile width.
- [ ] 360 × 800 — common compact Android.
- [ ] 390 × 844 — common modern mobile.
- [ ] 768 × 1024 — tablet portrait.
- [ ] 1024 × 768 — tablet landscape / compact desktop.
- [ ] 1280 × 800 — laptop.
- [ ] 1440 × 900 — desktop.
- [ ] 1920 × 1080 — large desktop sanity check.
- [ ] Portrait and landscape orientation are checked where relevant.
- [ ] Browser zoom at 200% is checked on critical pages.
- [ ] Text-only zoom does not hide, overlap, or truncate critical controls.

### 6.2 Browsers and Devices

- [ ] Latest stable Chrome on Windows or macOS.
- [ ] Latest stable Edge on Windows.
- [ ] Latest stable Firefox on Windows or macOS.
- [ ] Latest stable Safari on macOS.
- [ ] Safari on a supported iPhone.
- [ ] Chrome on a supported Android device.
- [ ] At least one real touch device is used for the primary journey.

Use the support policy in `TESTING_STRATEGY.md` when it defines a stricter matrix.

### 6.3 Network and Runtime Conditions

- [ ] Normal broadband.
- [ ] Throttled mobile network.
- [ ] High latency.
- [ ] Offline or interrupted connection during a request.
- [ ] JavaScript/API failure state.
- [ ] Slow upload.
- [ ] Browser back/forward navigation.
- [ ] Hard refresh on a nested route.

---

## 7. Build and Environment Integrity

- [ ] The tested commit matches the deployed commit.
- [ ] Clean install succeeds using the documented package manager and lockfile.
- [ ] Production build completes without errors.
- [ ] Linting passes.
- [ ] Type checking passes.
- [ ] Unit, integration, and end-to-end tests required by `TESTING_STRATEGY.md` pass.
- [ ] No unexpected warning, hydration error, uncaught exception, or failed critical request appears in the browser console.
- [ ] No missing required environment variable exists.
- [ ] Public environment variables contain no secret.
- [ ] Staging and production use separate credentials, endpoints, and data where required.
- [ ] Source maps, debug panels, and verbose logs follow the production policy.
- [ ] Dependency audit has no unaccepted critical or high-risk finding.
- [ ] Generated artifacts are reproducible from the documented build process.

---

## 8. Content, Claims, and Brand Accuracy

### 8.1 Brand

- [ ] Brand name is consistently written as `آهن آسا` in Persian and `Ahan Asa` where English is approved.
- [ ] Only approved master logo files and lockups are used.
- [ ] Logo proportions, clear space, minimum size, and contrast follow `BRAND_GUIDELINES.md`.
- [ ] Primary Steel Navy `#0B2545` and Forge Copper `#B04A2F` are used through approved design tokens.
- [ ] The slogan is exactly `ما مراقب سرمایه شما هستیم.` wherever used.
- [ ] Favicon and social-preview brand marks are correct.
- [ ] No outdated brand, temporary logo, or unapproved color remains.

### 8.2 Content Integrity

- [ ] Every visible statement is approved and factually supportable.
- [ ] No fabricated supplier, testimonial, customer, project, statistic, price, stock level, certificate, award, coverage area, delivery time, or guarantee appears.
- [ ] Development placeholders, lorem ipsum, test names, and dummy numbers are absent from production.
- [ ] Submission language does not imply that a quote, reservation, contract, stock allocation, or delivery promise already exists.
- [ ] Technical terminology is consistent across pages.
- [ ] Contact information and legal/company details match approved records.
- [ ] Dates, units, prices, and numbers use the approved formatting rules.
- [ ] Links to policies, terms, privacy information, and required disclosures are present and current.
- [ ] Spelling, Persian punctuation, half-spaces, and grammar have been reviewed by a Persian editor.

---

## 9. Information Architecture, Routes, and Navigation

- [ ] Every approved route in `SITEMAP.md` and `ROUTES.md` resolves as intended.
- [ ] No undocumented public route is unintentionally exposed.
- [ ] Route names are consistent across navigation, breadcrumbs, sitemap, canonicals, structured data, analytics, and redirects.
- [ ] The canonical primary conversion route is confirmed and used consistently.
- [ ] Header navigation is complete, correctly ordered, and usable with keyboard and touch.
- [ ] Footer navigation is complete and matches the approved information architecture.
- [ ] The logo links to the homepage.
- [ ] Current-page state is visually and programmatically identifiable.
- [ ] Breadcrumbs reflect the actual hierarchy and never create false routes.
- [ ] Internal links point to the final production URL, not preview or staging.
- [ ] Browser back and forward actions preserve expected state.
- [ ] Direct loading and hard refresh work on all nested routes.
- [ ] Query parameters do not create broken or unintended indexable variants.
- [ ] External links are clearly identified when necessary and use safe behavior.
- [ ] Broken-link scan reports no unresolved internal links.
- [ ] Approved legacy URLs redirect to the correct destination without chains or loops.
- [ ] Unknown routes return the designed 404 page with a useful recovery path.
- [ ] Server failures use a safe, helpful error page and do not expose implementation details.

---

## 10. Persian, RTL, and Bidirectional Content

- [ ] The root document uses `lang="fa"` and `dir="rtl"` for the Persian launch.
- [ ] English and Arabic locales are not publicly exposed before explicit approval.
- [ ] Page flow, grids, navigation, icons, drawers, carousels, and directional controls follow RTL logic.
- [ ] Persian font loading follows `FONT_STRATEGY.md`; preferred and fallback fonts render acceptably.
- [ ] Font fallback does not cause unreadable text or material layout shift.
- [ ] Persian letters are connected correctly; no glyph corruption or missing characters appears.
- [ ] Half-space, punctuation, parentheses, quotation marks, and list markers display correctly.
- [ ] Phone numbers, email addresses, URLs, file names, model codes, dimensions, and mixed Latin/Persian text remain readable.
- [ ] Bidirectional isolation is applied where needed to technical strings.
- [ ] Numeric fields preserve the format required by the backend while presenting an understandable Persian UI.
- [ ] Icons with semantic direction are mirrored; universal/non-directional icons are not mirrored unnecessarily.
- [ ] Text truncation does not hide critical Persian words or values.
- [ ] Copy/paste from fields and content produces usable text order.
- [ ] Native validation messages do not conflict with the intended Persian experience.

---

## 11. Responsive Layout and Visual Quality

- [ ] No horizontal page scroll occurs at supported widths, including 320 CSS px.
- [ ] Content reflows without overlap, clipping, inaccessible controls, or hidden information.
- [ ] Touch targets meet the accessibility specification and have adequate spacing.
- [ ] Sticky header, bottom actions, dialogs, drawers, and cookie/privacy controls do not cover essential content.
- [ ] Safe-area insets are respected on notched mobile devices.
- [ ] Header, mega-menu, mobile menu, and footer work at all breakpoints.
- [ ] Tables, product specifications, steps, cards, and comparison content have a deliberate mobile treatment.
- [ ] Images preserve aspect ratio and do not pixelate at intended display sizes.
- [ ] Responsive image sizes are appropriate; mobile does not download unnecessarily large assets.
- [ ] Text does not overflow buttons, badges, cards, tabs, or inputs.
- [ ] Long Persian words, long filenames, and long validation messages wrap safely.
- [ ] Focus indicators and hover states remain visible against their backgrounds.
- [ ] Empty space, alignment, radius, shadows, and spacing match the design system.
- [ ] There is no unintended cumulative layout movement during load or interaction.
- [ ] Print behavior is reasonable for pages likely to be printed, if required.

---

## 12. Components and Interaction States

For every interactive component, verify all applicable states:

- [ ] Default.
- [ ] Hover.
- [ ] Focus-visible.
- [ ] Active/pressed.
- [ ] Selected/current.
- [ ] Disabled.
- [ ] Loading.
- [ ] Empty.
- [ ] Success.
- [ ] Warning.
- [ ] Error.
- [ ] Retry/recovery.

Additional checks:

- [ ] Buttons perform one clear action and cannot trigger accidental duplicate actions.
- [ ] Links navigate; buttons perform actions; semantics are not interchanged for styling.
- [ ] Modals and drawers trap focus appropriately, announce their names, and restore focus on close.
- [ ] Escape closes dismissible overlays.
- [ ] Tabs, accordions, menus, and disclosure controls follow expected keyboard patterns.
- [ ] Toasts and status messages are perceivable without relying only on color.
- [ ] Skeletons/spinners have accessible labels where needed and never run forever without recovery.
- [ ] Animation respects reduced-motion preferences.
- [ ] Hover-only information has an equivalent keyboard and touch path.

---

## 13. Primary Request and File-Upload Journey

The primary conversion is the submission of an invoice, bill of materials, purchase list, or consultation request. Test the exact flow defined in `FORM_ARCHITECTURE.md`.

### 13.1 Entry and Comprehension

- [ ] Every primary CTA leads to the approved request route.
- [ ] The page clearly explains what the user can submit and what happens next.
- [ ] Submission wording does not promise a price, availability, delivery date, or contract.
- [ ] Required and optional fields are clearly distinguished.
- [ ] Privacy/consent copy is visible at the correct point.

### 13.2 File Selection

- [ ] Accepted file types match the approved contract: PDF, JPG/JPEG, PNG, XLS, and XLSX.
- [ ] File picker `accept` rules and server validation are consistent.
- [ ] Valid files can be selected by browse and drag-and-drop where supported.
- [ ] Unsupported extensions are rejected with a clear Persian message.
- [ ] Spoofed MIME type or renamed executable content is rejected server-side.
- [ ] Zero-byte, corrupt, encrypted, and malformed files fail safely.
- [ ] Maximum file size and maximum file count are enforced client-side and server-side.
- [ ] Duplicate file behavior is intentional and explained.
- [ ] Long, Persian, Latin, mixed-direction, and special-character filenames display safely.
- [ ] Removing and replacing a selected file works.
- [ ] File metadata is not unintentionally exposed to other users.

### 13.3 Validation

- [ ] Empty submission is rejected.
- [ ] Required-field errors are specific, Persian, and associated with the correct field.
- [ ] Validation does not erase entered data or selected files unexpectedly.
- [ ] Phone, email, and other structured fields accept approved valid formats and reject invalid formats.
- [ ] Server validation repeats all security-critical client validation.
- [ ] The first invalid field receives or is linked to focus after submit.
- [ ] An accessible error summary is available when multiple errors occur.

### 13.4 Submission and Upload States

- [ ] Idle state is correct.
- [ ] Uploading/loading state is visible and announced.
- [ ] Submit is protected against double-click and repeated requests.
- [ ] Slow upload remains understandable and does not appear frozen.
- [ ] Progress is shown only when it represents real progress.
- [ ] Success appears only after the backend has durably accepted the inquiry.
- [ ] Failure state explains recovery without exposing technical details.
- [ ] Retry does not create duplicate inquiry records or duplicate files.
- [ ] Connection loss during upload is handled safely.
- [ ] Refresh, back navigation, and resubmission behavior are intentional.
- [ ] A safe reference ID is shown only if issued by the backend.
- [ ] Form data is cleared only after confirmed success or explicit user action.

### 13.5 Delivery and Data Integrity

- [ ] One valid submission creates exactly one inquiry in the monitored Procurement Intake queue.
- [ ] Submitted field values match the received values.
- [ ] All accepted files arrive intact and are associated with the correct inquiry.
- [ ] Timestamps, source, campaign attribution, and consent values are recorded as specified.
- [ ] Notification failure does not silently discard a successfully stored inquiry.
- [ ] Downstream failure is logged and recoverable by authorized staff.
- [ ] Test inquiry records are clearly marked and removed from operational workflows after testing.

---

## 14. Tracking / Request Status Experience

Apply this section only if a tracking feature is approved.

- [ ] Tracking never pretends to be live when no authoritative status source exists.
- [ ] Unknown, invalid, expired, and unauthorized references return indistinguishable safe errors where enumeration is a risk.
- [ ] A user can see only the minimum information authorized for that request.
- [ ] Status labels match actual backend states.
- [ ] Refresh and stale-data behavior are clear.
- [ ] No private attachment, internal note, supplier detail, or staff-only state is exposed.
- [ ] Rate limiting and abuse protection are verified.
- [ ] The feature is hidden or clearly described as unavailable when backend support is not production-ready.

---

## 15. Accessibility QA

Target the approved conformance level in `ACCESSIBILITY.md`; unresolved critical-path accessibility failures block release.

### 15.1 Keyboard

- [ ] Every interactive element is reachable and operable by keyboard.
- [ ] Focus order follows the visual and reading order in RTL.
- [ ] Focus is always visible.
- [ ] No keyboard trap exists.
- [ ] Skip link moves focus to main content.
- [ ] Menus, dialogs, tabs, accordions, uploads, and form errors have correct keyboard behavior.

### 15.2 Semantics and Screen Readers

- [ ] Page title and primary heading identify the page.
- [ ] Landmarks (`header`, `nav`, `main`, `footer`) are correct and not duplicated improperly.
- [ ] Heading hierarchy is logical and does not skip levels for visual styling.
- [ ] Controls have accessible names matching their visible purpose.
- [ ] Form labels, help, required state, errors, and status updates are programmatically associated.
- [ ] Decorative images/icons are hidden from assistive technology.
- [ ] Informative images have meaningful Persian alternatives.
- [ ] Dynamic upload and submission updates are announced appropriately.
- [ ] Screen-reader reading order is coherent in Persian and mixed-direction content.

### 15.3 Perception and Adaptation

- [ ] Text and non-text contrast meet the approved standard.
- [ ] Meaning is not conveyed by color, position, shape, or motion alone.
- [ ] Content remains usable at 200% browser zoom.
- [ ] Reflow works at 320 CSS px without two-dimensional scrolling except for genuinely two-dimensional content.
- [ ] Text spacing overrides do not break content or controls.
- [ ] Reduced-motion preference removes or reduces non-essential motion.
- [ ] Automated accessibility scan has no unreviewed serious/critical finding.
- [ ] Manual keyboard and screen-reader checks are recorded; automated scanning alone is not accepted.

---

## 16. Performance and Core Web Vitals

Measure representative pages on mobile and desktop using the budgets and thresholds in `PERFORMANCE_GUIDELINES.md`.

- [ ] Homepage meets the approved performance budget.
- [ ] Primary request page meets the approved performance budget.
- [ ] A representative product/material detail page meets the approved performance budget.
- [ ] A representative guide/content page meets the approved performance budget.
- [ ] Largest Contentful Paint is within the project target.
- [ ] Interaction to Next Paint is within the project target.
- [ ] Cumulative Layout Shift is within the project target.
- [ ] Initial HTML contains meaningful content without requiring a large client-side bundle.
- [ ] Client-side JavaScript is limited to necessary interactive boundaries.
- [ ] Images use correct dimensions, responsive sources, modern formats, and lazy loading where appropriate.
- [ ] The above-the-fold/LCP image is not incorrectly lazy-loaded.
- [ ] Fonts are subset, preloaded only when justified, and use an approved display strategy.
- [ ] Third-party scripts are justified, deferred, and failure-tolerant.
- [ ] No unused large asset, library, video, or source map is shipped publicly.
- [ ] Cache headers match `CACHING_STRATEGY.md`.
- [ ] Compression is enabled for eligible text assets.
- [ ] Repeated navigation benefits from caching without serving stale private data.
- [ ] Performance regression against the last approved release is within the allowed tolerance.

Record both lab results and available field data. A single fast developer machine is not sufficient evidence.

---

## 17. SEO QA

- [ ] Every indexable page has one approved search intent and unique useful content.
- [ ] Each indexable page has a unique Persian title and meta description.
- [ ] Title and description accurately describe the visible page and contain no unsupported claims.
- [ ] Exactly one correct self-referencing canonical is present unless another canonical is intentionally documented.
- [ ] Canonicals use the final HTTPS production host and preferred URL format.
- [ ] `robots` directives match the intended indexation state.
- [ ] Staging, previews, internal search, success states, and private/status pages are non-indexable as specified.
- [ ] `robots.txt` is reachable and does not block required production assets or indexable pages.
- [ ] XML sitemap is reachable, valid, production-only, canonical-only, and contains no non-indexable URL.
- [ ] Sitemap URLs return the intended success status without redirects.
- [ ] Open Graph and other social metadata use the approved brand, locale, URL, title, description, and image.
- [ ] Structured data matches visible content and passes validation.
- [ ] Structured data contains no fabricated rating, price, stock, company fact, or unsupported claim.
- [ ] Heading structure supports the page intent without keyword stuffing.
- [ ] Images use meaningful file names and alt text where appropriate.
- [ ] Internal links use descriptive Persian anchor text and connect related content intentionally.
- [ ] Pagination/filter/query behavior does not create uncontrolled duplicate indexation.
- [ ] Redirects use the approved status code and have no loop or unnecessary chain.
- [ ] 404 and server-error pages return correct HTTP status codes.
- [ ] Future locale URLs, `hreflang`, and language switchers are not exposed before approval.

---

## 18. Analytics and Consent

- [ ] Analytics loads only in environments and consent states permitted by `ANALYTICS_TRACKING.md`.
- [ ] Page-view events fire once per real page view.
- [ ] CTA events use the approved names and parameters.
- [ ] Request-start, validation-error, upload-start, submission-success, and submission-failure events fire at the correct real state.
- [ ] Success events never fire on button click alone.
- [ ] Retry or back navigation does not create misleading duplicate conversions.
- [ ] Events contain no name, phone, email, message, file name, file content, full request ID, or other personal/sensitive data.
- [ ] URLs and referrers sent to analytics contain no personal or secret data.
- [ ] Campaign attribution works without overwriting valid source information unexpectedly.
- [ ] Internal/test traffic follows the approved exclusion policy.
- [ ] Analytics failure does not block navigation, submission, or upload.
- [ ] Consent withdrawal is respected.
- [ ] Debug/preview analytics modes are disabled in production.

---

## 19. Security and Privacy

- [ ] Production uses HTTPS and no active mixed content exists.
- [ ] HTTP requests redirect to the canonical HTTPS host as specified.
- [ ] Security headers match `SECURITY_GUIDELINES.md`.
- [ ] Forms and APIs enforce server-side validation, normalization, and size limits.
- [ ] Output encoding prevents stored and reflected script injection.
- [ ] Uploads are stored outside executable/public paths and served with safe headers.
- [ ] Uploaded content is checked according to the approved malware/content-safety process.
- [ ] Original filenames are not trusted as storage paths.
- [ ] Rate limiting and anti-abuse controls work without blocking reasonable legitimate use.
- [ ] Cross-site request protection matches the authentication/session architecture.
- [ ] CORS allows only documented origins, methods, and headers.
- [ ] Error responses expose no stack trace, SQL detail, token, internal host, filesystem path, or vendor secret.
- [ ] Secrets are server-only, rotated appropriately, and absent from source, build output, browser storage, and logs.
- [ ] Personal data is minimized and retained only according to the approved policy.
- [ ] Logs redact personal data and file content.
- [ ] Cache/CDN behavior never stores or shares private request data publicly.
- [ ] Authorization is checked server-side for every protected operation.
- [ ] Common input attacks and parameter tampering have been tested on critical endpoints.
- [ ] Dependency and platform security findings are reviewed before release.
- [ ] Privacy and consent language accurately reflects actual data processing.

---

## 20. APIs and Integrations

- [ ] API routes follow the approved `/api/v1/...` contracts where applicable.
- [ ] Request and response schemas match `API_INTEGRATIONS.md`.
- [ ] Correct status codes are returned for success, validation errors, authorization failures, rate limits, and server errors.
- [ ] Timeout behavior is bounded and user-recoverable.
- [ ] Retries are safe and idempotent where duplicate records would be harmful.
- [ ] Integration authentication occurs only server-side.
- [ ] Failed downstream notifications do not masquerade as failed durable storage, or vice versa.
- [ ] Webhook authenticity and replay protection are verified where applicable.
- [ ] Duplicate or out-of-order events are handled safely.
- [ ] External-service downtime produces an honest fallback state.
- [ ] Health checks do not expose sensitive detail.
- [ ] Monitoring can distinguish validation failure, upload failure, storage failure, notification failure, and integration failure.

---

## 21. Error, Empty, and Edge Cases

- [ ] Empty collections have useful approved empty states.
- [ ] Missing images use the approved fallback without broken layout.
- [ ] Very short and very long content remain usable.
- [ ] Rapid repeated clicks/taps do not create duplicate actions.
- [ ] Opening the site in multiple tabs does not corrupt critical state.
- [ ] Session/storage denial or quota exhaustion fails safely.
- [ ] Expired state or token produces a clear recovery path.
- [ ] API timeout, rate limit, and server error have distinct helpful user states where appropriate.
- [ ] The application recovers after network reconnection when safe.
- [ ] User-entered content is preserved across recoverable errors where privacy permits.
- [ ] Error copy is Persian, calm, actionable, and free of implementation detail.
- [ ] Error logging includes a correlation mechanism without exposing personal data to the user.

---

## 22. Regression Checklist

Run after any shared-component, routing, design-token, localization, form, API, or deployment change.

- [ ] Homepage renders and primary CTA works.
- [ ] Header and mobile navigation work.
- [ ] Footer links work.
- [ ] Primary request page loads.
- [ ] Valid request with valid file succeeds end to end.
- [ ] Invalid file and invalid fields fail correctly.
- [ ] Duplicate submission protection works.
- [ ] Confirmation is based on real backend acceptance.
- [ ] Representative product/material and guide pages render.
- [ ] 404 and error recovery work.
- [ ] Persian RTL and mixed-direction fields remain correct.
- [ ] Keyboard navigation and focus remain correct.
- [ ] Canonical, robots, metadata, structured data, and sitemap remain correct.
- [ ] Analytics critical events remain accurate and free of personal data.
- [ ] No material performance or layout-stability regression is introduced.

---

## 23. Pre-Deployment QA

- [ ] All acceptance criteria for the release are traceable to tests.
- [ ] QA was run against a production-equivalent build, not only a development server.
- [ ] Database/storage migrations are reviewed, reversible where possible, and tested.
- [ ] Required domains, DNS, TLS, CDN, redirects, environment variables, and third-party settings are ready.
- [ ] Production form destination and monitoring ownership are confirmed.
- [ ] Backup/rollback procedure and decision owner are confirmed.
- [ ] Monitoring, alerting, and log access are ready for launch.
- [ ] Search indexing controls are intentionally set for launch.
- [ ] Cache invalidation strategy is prepared.
- [ ] Stakeholders have approved brand, content, legal/privacy, and primary journey.
- [ ] Release notes list changes, known issues, and rollback trigger.

---

## 24. Post-Deployment Smoke Test

Run immediately after production deployment.

- [ ] Canonical production URL loads over HTTPS.
- [ ] Apex/`www` and HTTP/HTTPS variants follow the documented redirect policy.
- [ ] Homepage, all primary navigation destinations, and request page return expected statuses.
- [ ] CSS, fonts, scripts, icons, and images load from production origins without blocked requests.
- [ ] One controlled production test inquiry succeeds and reaches the correct queue exactly once.
- [ ] The test file is intact and linked to the correct inquiry.
- [ ] Confirmation language remains accurate.
- [ ] Critical analytics events appear once with no personal data.
- [ ] Canonical, robots, sitemap, and structured data use the production host.
- [ ] CDN/cache returns the new release and does not expose stale private content.
- [ ] No new critical console, server, integration, or monitoring error appears.
- [ ] Performance smoke test shows no severe regression.
- [ ] Rollback remains available until the observation window closes.
- [ ] The production test inquiry is clearly marked and removed from operational handling.

---

## 25. Evidence Requirements

Every failed check must link to a defect. Every release-gate pass must include evidence appropriate to the risk.

Acceptable evidence includes:

- Screenshot or short screen recording with URL and viewport visible.
- Automated-test report tied to the commit SHA.
- Accessibility scan plus manual keyboard/screen-reader notes.
- Network trace or sanitized request/response sample.
- Performance report for the tested URL and device profile.
- Metadata, structured-data, sitemap, or header validation output.
- Sanitized downstream inquiry record proving end-to-end delivery.
- Browser/device matrix results.

Evidence must not contain secrets, personal data, production customer files, or unredacted internal identifiers.

---

## 26. Defect Report Template

```md
## [SEVERITY] Short defect title

- Release / commit:
- Environment:
- URL:
- Browser / device / viewport:
- Preconditions:
- Test data reference (sanitized):

### Steps to Reproduce

1.
2.
3.

### Expected Result


### Actual Result


### User / Business Impact


### Evidence


### Suspected Scope


### Regression?

Yes / No / Unknown
```

---

## 27. Release Sign-Off

| Role | Name | Decision | Date | Notes / accepted risk |
| --- | --- | --- | --- | --- |
| QA Owner | `[fill]` | `Approve / Reject` | `[fill]` | `[fill]` |
| Engineering Lead | `[fill]` | `Approve / Reject` | `[fill]` | `[fill]` |
| Product Owner | `[fill]` | `Approve / Reject` | `[fill]` | `[fill]` |
| Content/Brand Owner | `[fill]` | `Approve / Reject` | `[fill]` | `[fill]` |

**Final release decision:** `APPROVED / REJECTED / BLOCKED`  
**Approved commit SHA:** `[fill]`  
**Rollback owner:** `[fill]`  
**Observation window:** `[fill]`

---

## 28. Claude Code Execution Rules

When Claude Code uses this checklist:

1. Read all source-of-truth documents listed in Section 2 before starting QA.
2. Identify the deployed commit and environment before running tests.
3. Do not mark a check as passed without executing it or collecting reliable evidence.
4. Do not change application code while reporting an audit unless the task explicitly authorizes fixes.
5. Never weaken or remove a test to obtain a passing result.
6. Record `BLOCKED` when a required service or credential is unavailable; do not simulate success.
7. Use safe synthetic test data and clearly label all production smoke-test records.
8. Never expose secrets or personal data in reports, screenshots, logs, or test fixtures.
9. Report route/document conflicts instead of choosing silently.
10. Produce a final QA summary containing:
    - tested commit and environment;
    - passed, failed, blocked, and not-run counts;
    - defects grouped by severity;
    - release-gate result;
    - residual risks;
    - evidence links;
    - explicit release recommendation.

---

## 29. Final QA Summary Template

```md
# QA Summary — Ahan Asa

- Release / commit:
- Environment:
- Test window:
- QA owner:

## Results

| Result | Count |
| --- | ---: |
| PASS | 0 |
| FAIL | 0 |
| BLOCKED | 0 |
| N/A | 0 |
| NOT RUN | 0 |

## Defects

| ID | Severity | Area | Status | Release blocker |
| --- | --- | --- | --- | --- |

## Release Gates

- Primary request journey: PASS / FAIL / BLOCKED
- RTL and responsive: PASS / FAIL / BLOCKED
- Accessibility: PASS / FAIL / BLOCKED
- Performance: PASS / FAIL / BLOCKED
- SEO: PASS / FAIL / BLOCKED
- Security and privacy: PASS / FAIL / BLOCKED
- Production readiness: PASS / FAIL / BLOCKED

## Residual Risks

-

## Evidence

-

## Recommendation

APPROVE / REJECT / BLOCK
```

