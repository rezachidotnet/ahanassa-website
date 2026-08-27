# Pre-Deploy Checklist

> Production release gate for the Ahan Asa website.

## 1. Document Control

| Field | Value |
| --- | --- |
| Project | Ahan Asa (`ahanassa.com`) |
| Application | Public marketing and lead-generation website |
| Default locale | Persian (`fa`), right-to-left; launch locales include `en` LTR and `ar` RTL |
| Framework | Next.js App Router |
| Hosting/runtime | Cloudflare Workers + Static Assets via vinext |
| Document owner | Engineering Lead |
| Approvers | Product/Business Owner, Engineering Lead, QA/SEO Owner |
| Version | 1.0 |
| Last reviewed | YYYY-MM-DD |

## 2. Purpose

Use this checklist before every production deployment. Its goals are to:

- prevent broken releases, data loss, SEO damage, tracking gaps, and security regressions;
- confirm that the release matches approved design, content, and business requirements;
- create a traceable release decision with evidence and named owners;
- ensure that rollback and post-deploy verification are ready before production changes begin.

This document complements, rather than replaces, automated tests, code review, the main QA checklist, and the post-deploy checklist.

## 3. How to Use This Checklist

1. Create a release record and complete the release information below.
2. Mark each applicable item as `PASS`, `FAIL`, `N/A`, or `BLOCKED`.
3. Add an evidence link or short evidence note for every critical item.
4. Any `FAIL` or `BLOCKED` critical item stops the deployment.
5. Mark an item `N/A` only with a written reason and owner approval.
6. Obtain all required approvals before starting the production deployment.

### Status Legend

| Status | Meaning |
| --- | --- |
| `PASS` | Requirement verified with acceptable evidence |
| `FAIL` | Requirement is not met; deployment is blocked |
| `BLOCKED` | Verification cannot be completed; deployment is blocked |
| `N/A` | Not applicable to this release; reason is documented |

### Severity Legend

| Severity | Rule |
| --- | --- |
| `P0 — Blocker` | Must pass before deployment |
| `P1 — Required` | Must pass unless a named approver accepts a documented exception |
| `P2 — Recommended` | May be deferred with a follow-up task, owner, and due date |

## 4. Release Information

| Field | Entry |
| --- | --- |
| Release name/version | |
| Release date and time | |
| Release owner | |
| Git branch | |
| Commit SHA | |
| Pull request | |
| Staging URL | |
| Production URL | |
| Change summary | |
| Database/CMS changes | None / Details |
| Environment-variable changes | None / Details |
| DNS/CDN changes | None / Details |
| Known risks | |
| Rollback target | |
| Incident channel/contact | |

## 5. Global Release Gate

- [ ] `P0` The exact release scope, commit SHA, and production target are recorded.
- [ ] `P0` All required CI checks pass on the exact commit being deployed.
- [ ] `P0` No unresolved P0 or P1 defect affects the release scope.
- [ ] `P0` Production secrets and environment variables are configured and verified without exposing their values.
- [ ] `P0` Critical user journeys pass on staging using production-like configuration.
- [ ] `P0` Forms and lead delivery work end to end.
- [ ] `P0` Canonical URL, indexing rules, sitemap, and robots rules are correct for production.
- [ ] `P0` A tested rollback method and a known-good rollback target are ready.
- [ ] `P0` A release owner and post-deploy verifier are available during the release window.
- [ ] `P1` Product/Business, Engineering, and QA/SEO approvals are recorded.

---

## 6. Release Scope and Change Control

- [ ] `P0` The release contains only approved changes.
- [ ] `P0` The deployment branch is up to date with the approved base branch.
- [ ] `P0` The deployed commit matches the reviewed and tested commit.
- [ ] `P0` No uncommitted, generated, debug, or local-only files are included accidentally.
- [ ] `P1` Every change has a clear business or technical purpose.
- [ ] `P1` High-risk changes are identified: authentication, forms, redirects, DNS, caching, dependencies, API contracts, data models, and migrations.
- [ ] `P1` Feature flags have documented production values and owners.
- [ ] `P1` Temporary workarounds and accepted defects are documented.
- [ ] `P1` Removed or renamed routes have an approved redirect or intentional status response.
- [ ] `P2` Changelog and release notes are updated.

## 7. Source Control and Code Quality

- [ ] `P0` Pull request review is complete and all blocking review comments are resolved.
- [ ] `P0` Merge conflicts are resolved and the final diff has been reviewed.
- [ ] `P0` Linting passes with no new ignored errors.
- [ ] `P0` Type checking passes.
- [ ] `P0` Unit and integration tests pass.
- [ ] `P0` Production build completes successfully from a clean install.
- [ ] `P0` No secrets, tokens, passwords, private keys, or sensitive customer data appear in code, Git history for this release, source maps, logs, or generated output.
- [ ] `P1` New code follows project architecture and coding standards.
- [ ] `P1` Deprecated APIs, framework warnings, and build warnings are reviewed.
- [ ] `P1` Debug logs, test banners, mock data, commented-out code, and development-only endpoints are removed.
- [ ] `P1` Error handling provides safe user messages and useful internal diagnostics.
- [ ] `P1` Dependencies are locked and the lockfile is committed.
- [ ] `P1` Newly added packages are necessary, maintained, license-compatible, and reviewed for known vulnerabilities.
- [ ] `P1` Client bundles do not include server-only modules or sensitive configuration.
- [ ] `P2` Dead code and unused assets introduced by this release are removed.

### Suggested Verification Commands

Use the package manager and scripts defined by the repository. The following is a reference sequence and must be adapted to the project:

```bash
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm build
```

Record the actual commands and results in the release evidence. Do not bypass a failed check with `--force`, disabled rules, or a changed threshold unless the exception is reviewed and documented.

## 8. Functional Verification

- [ ] `P0` The homepage loads without runtime or console errors.
- [ ] `P0` All critical navigation paths work from header, footer, in-page links, and mobile menu.
- [ ] `P0` Primary CTA buttons open the correct destination.
- [ ] `P0` Contact, RFQ, WhatsApp, telephone, and email actions use correct production details.
- [ ] `P0` Every form can be submitted successfully with valid data.
- [ ] `P0` Required fields, optional fields, validation, and error states behave correctly.
- [ ] `P0` Successful submissions reach the intended CRM, email inbox, webhook, or database exactly once.
- [ ] `P0` Failed submissions show a useful retry path and do not silently lose data.
- [ ] `P1` Duplicate submission protection works where needed.
- [ ] `P1` Loading, empty, success, error, and offline states are verified.
- [ ] `P1` Search, filters, sorting, pagination, downloads, and media controls work where present.
- [ ] `P1` Browser back/forward navigation and direct deep links work.
- [ ] `P1` Custom 404 and error pages work and provide a recovery path.
- [ ] `P1` File downloads use the correct file, filename, type, and access rules.
- [ ] `P1` External links are valid and use safe new-tab behavior when applicable.
- [ ] `P2` Non-critical enhancement flows are verified against their acceptance criteria.

## 9. Content and Brand Review

- [ ] `P0` Company name, logo, contact details, domain, legal name, and brand claims are correct.
- [ ] `P0` Prices, quantities, certifications, project facts, guarantees, and technical claims are approved and current.
- [ ] `P0` No placeholder, lorem ipsum, draft label, broken character, or test content remains.
- [ ] `P1` Page copy follows the approved brand voice and copy guidelines.
- [ ] `P1` Headings are clear, unique, and structurally ordered.
- [ ] `P1` Persian typography, punctuation, spacing, half-spaces, and number formatting are consistent.
- [ ] `P1` CTA labels clearly describe the next action.
- [ ] `P1` Image captions, alt text, credits, and copyright permissions are complete.
- [ ] `P1` Published documents and downloadable assets are the approved final versions.
- [ ] `P1` Dates and time-sensitive statements are accurate.
- [ ] `P1` Empty sections and unavailable services are hidden or intentionally explained.
- [ ] `P2` Content has been proofread by a person other than the primary author.

## 10. UI, Responsive, and Browser QA

- [ ] `P0` No critical visual regression appears on the homepage or conversion pages.
- [ ] `P0` Primary CTAs and forms remain usable at all supported viewport widths.
- [ ] `P0` No horizontal page overflow occurs unintentionally.
- [ ] `P1` Layout is verified at representative widths: 320, 375, 390, 768, 1024, 1280, 1440, and 1920 pixels.
- [ ] `P1` Portrait and landscape mobile/tablet orientations are checked.
- [ ] `P1` Text zoom and browser zoom do not hide content or controls.
- [ ] `P1` Sticky headers, drawers, menus, dialogs, carousels, and accordions work with touch and pointer input.
- [ ] `P1` Focus, hover, active, disabled, loading, error, and success states are visually correct.
- [ ] `P1` Images and videos preserve the intended aspect ratio and do not cause layout shifts.
- [ ] `P1` Long titles, long words, large numbers, and validation messages do not break layouts.
- [ ] `P1` The release is checked in current supported versions of Chrome, Edge, Firefox, and Safari.
- [ ] `P1` At least one real iOS device and one real Android device, or approved equivalents, are tested for critical journeys.
- [ ] `P2` Motion and transitions remain smooth on a mid-range mobile device.

## 11. Localization and RTL

- [ ] `P0` The Persian root document uses `lang="fa"` and `dir="rtl"`.
- [ ] `P0` The default locale and locale-routing behavior match the approved URL strategy.
- [ ] `P0` No untranslated keys, fallback identifiers, mixed-language system text, or malformed encoding appears.
- [ ] `P1` RTL layout is semantic; direction is not simulated with fragile element-by-element overrides.
- [ ] `P1` Icons with directional meaning are mirrored where appropriate; brand marks and universal symbols are not mirrored.
- [ ] `P1` Mixed Persian/Latin text, phone numbers, email addresses, URLs, prices, and measurements render in the intended order.
- [ ] `P1` Form field direction is correct for each data type.
- [ ] `P1` Dates, calendars, digits, currency, units, and pluralization follow the approved locale rules.
- [ ] `P1` Locale switchers preserve the equivalent page when localized versions exist.
- [ ] `P1` Each enabled language has complete navigation, metadata, errors, forms, and legal text.
- [ ] `P1` `hreflang`, canonical tags, sitemap entries, and locale URLs agree with one another.
- [ ] `P1` The page remains usable when translated content is substantially longer or shorter.

## 12. Accessibility

- [ ] `P0` Every critical journey is operable with keyboard only.
- [ ] `P0` Keyboard focus is visible and is not trapped except intentionally inside a modal.
- [ ] `P0` Form inputs have programmatic labels; errors are associated with their fields and announced appropriately.
- [ ] `P0` Images that convey information have meaningful alt text; decorative images use empty alt text or an equivalent implementation.
- [ ] `P1` The page has one descriptive primary heading and a logical heading hierarchy.
- [ ] `P1` Landmarks and semantic elements correctly identify header, navigation, main content, and footer.
- [ ] `P1` Buttons perform actions and links navigate; interactive non-semantic elements are avoided.
- [ ] `P1` Text and essential UI contrast meet WCAG 2.2 AA targets.
- [ ] `P1` Touch targets are large enough and have adequate spacing.
- [ ] `P1` Dialogs and menus manage focus, names, roles, states, Escape behavior, and return focus correctly.
- [ ] `P1` Autoplay, flashing content, and motion that may cause discomfort are avoided; reduced-motion preferences are respected.
- [ ] `P1` Automated accessibility checks pass with no unresolved serious or critical issue.
- [ ] `P2` A screen-reader smoke test covers navigation, primary content, form submission, and validation.

## 13. SEO and Search Visibility

- [ ] `P0` The production site is indexable; staging, preview, and development environments remain non-indexable.
- [ ] `P0` `robots.txt` contains the approved production rules and references the correct sitemap URL.
- [ ] `P0` XML sitemap URLs use the final HTTPS production host, return `200`, and contain only canonical indexable pages.
- [ ] `P0` Every indexable page has a self-referencing canonical URL on the approved hostname.
- [ ] `P0` No production-wide `noindex`, `nofollow`, blocked resource, or staging canonical remains.
- [ ] `P0` Domain and protocol redirects converge to one approved canonical origin without loops or unnecessary chains.
- [ ] `P1` Every indexable page has a unique, localized title and meta description.
- [ ] `P1` Open Graph and social metadata use approved titles, descriptions, URLs, and accessible production images.
- [ ] `P1` Structured data matches visible content, uses production URLs, and passes validation.
- [ ] `P1` Redirects preserve path and query parameters where required.
- [ ] `P1` Removed content returns the intended `301`, `308`, `404`, or `410` response.
- [ ] `P1` Internal links point directly to canonical destinations rather than redirects.
- [ ] `P1` Pagination, filters, search results, and parameterized URLs follow the approved indexation policy.
- [ ] `P1` Images use descriptive filenames and alt text where relevant.
- [ ] `P1` Favicon, web manifest, organization identity, and site-name signals are correct.
- [ ] `P1` Representative pages have been checked with rendered HTML, not only client-side inspection.
- [ ] `P2` A crawl comparison shows no unexplained loss of indexable pages, metadata, headings, or internal links.

## 14. Performance and Core Web Vitals

- [ ] `P0` No release change causes a known severe performance regression on a critical page.
- [ ] `P1` Representative mobile tests target Core Web Vitals of LCP ≤ 2.5 s, INP ≤ 200 ms, and CLS ≤ 0.1 at the 75th percentile.
- [ ] `P1` Initial JavaScript is minimized and non-essential client components are avoided.
- [ ] `P1` Server-rendered or statically generated output is used where appropriate.
- [ ] `P1` Above-the-fold media is prioritized intentionally; below-the-fold media is lazy-loaded.
- [ ] `P1` Image dimensions or aspect ratios are reserved to prevent layout shift.
- [ ] `P1` Responsive image sizes and modern formats are configured.
- [ ] `P1` Fonts use approved subsets, weights, formats, preload rules, and fallback metrics.
- [ ] `P1` Third-party scripts are necessary, approved, and loaded with a suitable strategy.
- [ ] `P1` Caching headers are correct for immutable assets, HTML, API responses, and downloadable files.
- [ ] `P1` Bundle analysis shows no unexplained large dependency or duplicate package.
- [ ] `P1` Compression is enabled for compressible responses.
- [ ] `P1` Critical pages have been measured on a production-like build, not only in development mode.
- [ ] `P2` Performance results and any accepted regression are attached to the release record.

## 15. Images, Video, and Fonts

- [ ] `P0` No media URL is broken or restricted in production.
- [ ] `P1` Images use the correct crop, focal point, resolution, format, quality, and color profile.
- [ ] `P1` Responsive sources do not download desktop-size images unnecessarily on mobile.
- [ ] `P1` Hero media does not delay the primary content without an approved reason.
- [ ] `P1` Videos have appropriate poster images, controls, preload settings, captions, and fallback behavior.
- [ ] `P1` Autoplay video is muted, inline, non-blocking, and disabled or simplified where appropriate.
- [ ] `P1` Font files load from approved origins and all required Persian glyphs are present.
- [ ] `P1` Font licensing allows web use.
- [ ] `P2` Unused media variants and font weights are excluded from production output.

## 16. Security and Privacy

- [ ] `P0` Secrets are stored only in the approved secret/environment system.
- [ ] `P0` Public environment variables contain no confidential values.
- [ ] `P0` All user-controlled input is validated server-side and safely encoded at output boundaries.
- [ ] `P0` Forms and APIs have appropriate spam, abuse, rate-limit, and payload-size controls.
- [ ] `P0` Authentication and authorization are enforced server-side for every protected resource, if applicable.
- [ ] `P0` Production cookies use appropriate `Secure`, `HttpOnly`, `SameSite`, domain, path, and lifetime settings.
- [ ] `P0` Sensitive data is not exposed in URLs, analytics events, logs, HTML, error messages, or client state.
- [ ] `P1` Security headers are reviewed: HSTS, CSP, frame restrictions, MIME sniffing protection, referrer policy, and permissions policy.
- [ ] `P1` CORS allows only required origins, methods, and headers.
- [ ] `P1` External links opened in a new tab use appropriate opener protection.
- [ ] `P1` Dependency and secret scans have no unresolved critical or high-severity finding affecting the release.
- [ ] `P1` Source-map publication follows the approved policy and does not reveal secrets or proprietary source unintentionally.
- [ ] `P1` File uploads, if any, enforce type, size, storage, access, and malware-handling rules.
- [ ] `P1` Privacy notices and consent controls match the actual data collection and third-party scripts.
- [ ] `P1` Personal data retention, deletion, and access rules are documented for lead forms.
- [ ] `P2` A security contact and incident escalation path are current.

## 17. Environment Variables and Configuration

- [ ] `P0` Production, preview, and development environments are clearly separated.
- [ ] `P0` Every required production variable exists in the correct deployment scope.
- [ ] `P0` No production secret is copied into a public or preview-only variable.
- [ ] `P0` Environment-variable names match the application code exactly.
- [ ] `P0` URLs, API endpoints, sender identities, webhook destinations, and analytics identifiers use production values.
- [ ] `P0` Secret rotation or value changes have a coordinated activation plan.
- [ ] `P1` Required variables are validated at application startup or build time without logging their values.
- [ ] `P1` Optional variables have documented safe defaults.
- [ ] `P1` Obsolete variables are identified for safe removal after rollback risk has passed.
- [ ] `P1` Build-time versus runtime variable behavior is understood for the hosting platform.
- [ ] `P1` A sanitized variable inventory is attached to the release record.

## 18. Forms, CRM, Email, and Integrations

- [ ] `P0` Production integrations are used during an approved end-to-end test.
- [ ] `P0` Test submissions arrive in the correct destination with all mapped fields intact.
- [ ] `P0` Persian and Latin characters remain readable across submission, transport, storage, notification, and export.
- [ ] `P0` Country code, phone number, email, source page, locale, consent, and campaign fields map correctly where applicable.
- [ ] `P0` Integration credentials have the minimum required permissions and are not expired.
- [ ] `P0` Webhook authentication/signature validation and retry behavior are correct.
- [ ] `P1` Timeout, provider outage, invalid response, duplicate callback, and rate-limit scenarios fail safely.
- [ ] `P1` Confirmation messages do not promise successful delivery before the server confirms it.
- [ ] `P1` Transactional sender domain, SPF, DKIM, and DMARC configuration are ready if the site sends email.
- [ ] `P1` Notification recipients are approved production addresses.
- [ ] `P1` Test leads are clearly labeled and removed or retained according to policy.
- [ ] `P1` Integration logs support diagnosis without storing unnecessary personal or secret data.

## 19. Analytics, Tagging, and Marketing

- [ ] `P0` Production uses the approved GTM/GA4 or analytics container and property.
- [ ] `P0` Preview, staging, automated tests, and internal monitoring do not contaminate production reporting.
- [ ] `P0` Primary conversions fire once per successful action, not on button click alone unless explicitly designed that way.
- [ ] `P1` Page views work correctly with Next.js client-side navigation.
- [ ] `P1` Event names, parameters, and data types match the analytics specification.
- [ ] `P1` Required events include useful context such as page, CTA, form, locale, and lead source without personal data.
- [ ] `P1` UTM parameters and approved attribution data persist through the intended journey.
- [ ] `P1` Consent mode and script activation respect the approved privacy behavior.
- [ ] `P1` Debug/preview mode is disabled in production.
- [ ] `P1` Duplicate tags, duplicate page views, and duplicate conversions are absent.
- [ ] `P1` Ad pixels and remarketing tags load only when approved and permitted.
- [ ] `P2` A real-time analytics test and evidence screenshot are attached to the release record.

## 20. Data, CMS, and Migrations

Complete this section when the release changes persisted data, CMS schemas, or content models.

- [ ] `P0` Migration order, owner, expected duration, and rollback or forward-fix strategy are documented.
- [ ] `P0` A current backup or recovery point exists and restore access is verified.
- [ ] `P0` Migrations have been tested against production-like data.
- [ ] `P0` Destructive or irreversible changes have explicit approval.
- [ ] `P0` Old and new application versions remain compatible during the deployment window when zero-downtime deployment is required.
- [ ] `P1` Index creation, table locks, content rebuilds, and cache invalidation have acceptable impact.
- [ ] `P1` Content references, slugs, locale relationships, media links, and redirects remain valid.
- [ ] `P1` Seed scripts and administrative utilities cannot overwrite production content accidentally.
- [ ] `P1` Data validation or reconciliation queries are prepared for post-deploy verification.
- [ ] `P2` Retired fields and data are scheduled for cleanup only after rollback risk has passed.

## 21. Infrastructure, Domain, CDN, and Hosting

- [ ] `P0` The intended Cloudflare account, Worker, environment, production branch, and domain are confirmed.
- [ ] `P0` Cloudflare DNS records point to the approved hosting target.
- [ ] `P0` The Cloudflare proxy setting is intentional for every relevant record.
- [ ] `P0` TLS certificates are valid for the canonical host and all supported redirect hosts.
- [ ] `P0` HTTP redirects to HTTPS and alternate hostnames redirect to the approved canonical origin.
- [ ] `P0` Redirects have no loop, protocol downgrade, or avoidable multi-hop chain.
- [ ] `P0` Preview and staging deployments cannot be mistaken for production.
- [ ] `P1` Cloudflare cache, browser cache, and Next.js/vinext revalidation rules agree.
- [ ] `P1` Cache bypasses are defined for dynamic, personalized, administrative, and form/API responses.
- [ ] `P1` WAF, bot protection, rate limits, and firewall rules do not block legitimate users or required webhooks.
- [ ] `P1` IPv4/IPv6 behavior and apex/`www` behavior are verified.
- [ ] `P1` Scheduled functions, background jobs, queues, and cron tasks use production configuration and correct time zones.
- [ ] `P1` Hosting quotas, function limits, build limits, and third-party rate limits have adequate headroom.
- [ ] `P1` Ownership and renewal access for domain, DNS, hosting, and certificates are current.
- [ ] `P2` A maintenance page or communication plan exists for a release that may cause downtime.

## 22. Logging, Monitoring, and Alerts

- [ ] `P0` Runtime errors and failed form submissions can be detected after deployment.
- [ ] `P0` A responsible person will watch the release during the defined observation period.
- [ ] `P1` Client and server error monitoring point to the production environment and correct release version.
- [ ] `P1` Logs contain timestamps, request/correlation identifiers, and enough context for diagnosis.
- [ ] `P1` Logs redact secrets, tokens, and unnecessary personal data.
- [ ] `P1` Uptime checks cover the canonical homepage and at least one critical conversion path.
- [ ] `P1` Alerts have useful thresholds, destinations, and escalation owners.
- [ ] `P1` Form/API health, error rate, response time, and integration failures are observable.
- [ ] `P1` Release markers or deployment metadata are visible in monitoring tools.
- [ ] `P2` Baseline traffic, conversion, latency, and error metrics are captured before deployment for comparison.

## 23. Backup and Rollback Readiness

- [ ] `P0` The previous known-good deployment or commit SHA is recorded.
- [ ] `P0` The release owner can initiate rollback with current permissions.
- [ ] `P0` Rollback steps are written, tested, and expected to complete within the agreed recovery time.
- [ ] `P0` Configuration, environment, DNS, cache, migration, and integration changes are included in the rollback analysis.
- [ ] `P0` The team knows which changes cannot be rolled back safely.
- [ ] `P1` A forward-fix path exists when rollback would risk data incompatibility or loss.
- [ ] `P1` Backups are recent, encrypted where appropriate, and restorable by an authorized person.
- [ ] `P1` Cache purge and post-rollback verification steps are documented.
- [ ] `P1` Rollback decision authority and escalation contacts are named.
- [ ] `P1` Rollback triggers are explicit, such as a critical journey failure, material error-rate increase, lead loss, security issue, or SEO-wide regression.

## 24. Legal and Operational Readiness

- [ ] `P0` Required privacy, terms, cookie, and consent text is published and approved where applicable.
- [ ] `P0` Contact identity and legally required company information are correct.
- [ ] `P1` Copyright, trademark, image, font, video, testimonial, and project-publication permissions are confirmed.
- [ ] `P1` Claims about products, pricing, delivery, certification, and performance are supportable.
- [ ] `P1` Accessibility and privacy contact paths work.
- [ ] `P1` Customer-support or sales staff are informed of material workflow, pricing, content, or lead-routing changes.
- [ ] `P1` Internal documentation is updated for any operational change.
- [ ] `P2` Stakeholders know the release time, expected impact, observation window, and rollback owner.

## 25. Final Staging Smoke Test

Run this test on the exact production candidate after the final build and configuration changes.

- [ ] `P0` Open the staging homepage in a private browser session.
- [ ] `P0` Confirm correct Persian content, `lang="fa"`, RTL direction, logo, navigation, and primary CTA.
- [ ] `P0` Navigate through every release-critical page using the UI and direct URLs.
- [ ] `P0` Submit each production-critical form with a clearly labeled test lead.
- [ ] `P0` Verify delivery in the final CRM/email/integration destination.
- [ ] `P0` Confirm success, failure, validation, and duplicate-submit behavior.
- [ ] `P0` Check browser console, network failures, server logs, and monitoring for unexpected errors.
- [ ] `P0` Inspect canonical, robots, metadata, and structured data on representative rendered pages.
- [ ] `P1` Verify mobile layout and keyboard navigation.
- [ ] `P1` Verify analytics page view and primary conversion events once.
- [ ] `P1` Test the custom 404 page and one known redirect.
- [ ] `P1` Confirm media, fonts, downloadable files, telephone, email, and WhatsApp links.

## 26. Deployment Plan Confirmation

- [ ] `P0` Deployment start time and expected duration are agreed.
- [ ] `P0` Release owner, technical deployer, verifier, and rollback authority are present or reachable.
- [ ] `P0` The exact deployment action and target are stated before execution.
- [ ] `P0` No unrelated DNS, infrastructure, migration, or content operation is scheduled concurrently without coordination.
- [ ] `P0` Required access to Git, Cloudflare, monitoring, integrations, and backups has been verified.
- [ ] `P1` Cache purge or revalidation steps are prepared but will be used only where needed.
- [ ] `P1` The post-deploy checklist is assigned and ready.
- [ ] `P1` Stakeholder communication templates are ready for success, delay, incident, or rollback.

## 27. Approval Record

| Role | Name | Decision | Date/time | Notes or exception reference |
| --- | --- | --- | --- | --- |
| Product/Business Owner | | Approve / Reject | | |
| Engineering Lead | | Approve / Reject | | |
| QA Owner | | Approve / Reject | | |
| SEO Owner | | Approve / Reject | | |
| Security/Privacy Owner, if required | | Approve / Reject / N/A | | |
| Release Owner | | Go / No-Go | | |

## 28. Exceptions and Deferred Items

Every exception must have a business reason, risk assessment, named approver, owner, and due date. P0 items cannot be waived.

| ID | Checklist item | Reason | Risk/impact | Mitigation | Owner | Due date | Approver |
| --- | --- | --- | --- | --- | --- | --- | --- |
| EX-001 | | | | | | | |

## 29. Evidence Register

| Evidence ID | Area | Result | Link, command output, screenshot, or note | Verified by | Date/time |
| --- | --- | --- | --- | --- | --- |
| EV-001 | CI/build | | | | |
| EV-002 | Functional/forms | | | | |
| EV-003 | Responsive/accessibility | | | | |
| EV-004 | SEO | | | | |
| EV-005 | Performance | | | | |
| EV-006 | Security/configuration | | | | |
| EV-007 | Analytics | | | | |
| EV-008 | Rollback | | | | |

## 30. Go/No-Go Rule

The release is approved for production only when all conditions below are true:

- all P0 items are `PASS`;
- all P1 items are `PASS` or have an approved, documented exception;
- no unresolved defect can cause security exposure, personal-data leakage, lead loss, site-wide outage, incorrect production configuration, or broad SEO deindexing;
- rollback is ready and the release owner accepts the residual risk;
- all required approvers record `Approve`, and the Release Owner records `Go`.

### Final Decision

| Field | Entry |
| --- | --- |
| Decision | `GO` / `NO-GO` |
| Decided by | |
| Decision time | |
| Approved commit SHA | |
| Approved deployment target | |
| Residual risk summary | |
| Post-deploy verifier | |
| Observation window | |

## 31. Mandatory Follow-Up

Immediately after production deployment, execute `POST_DEPLOY_CHECKLIST.md`. At minimum, verify:

- canonical production URL, HTTPS, redirects, and cache behavior;
- homepage and critical page availability;
- one real end-to-end lead submission;
- analytics page view and conversion events;
- robots, sitemap, canonical, metadata, and structured data;
- production error logs, monitoring, and performance signals;
- rollback readiness throughout the observation window.
