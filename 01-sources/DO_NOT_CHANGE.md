# DO_NOT_CHANGE.md — Protected Areas and Change Boundaries

| Field | Value |
| --- | --- |
| Brand | Ahan Asa / آهن آسا |
| Domain | `ahanassa.com` |
| Document | Protected Areas and Change Boundaries |
| Status | Approved — Binding |
| Version | 1.0.0 |
| Last updated | 2026-08-25 |
| Primary locale | Persian (`fa`), RTL |
| Applies to | Claude Code, developers, agents, scripts, migrations, and automated tools |

> **Binding rule:** Claude MUST read this file before editing, generating, deleting, renaming, moving, or replacing any project file. The rules in this document are constraints, not suggestions.

## 1. Purpose

This document defines the parts of the Ahan Asa website that Claude MUST NOT change without explicit, target-specific written authorization from the project owner.

It exists to prevent accidental changes to:

- Approved brand identity and positioning.
- Production infrastructure and public URLs.
- Security, credentials, customer data, and lead flows.
- Persian-first RTL behavior and search-engine signals.
- Verified content, commercial claims, and legal text.
- Stable integrations, analytics identifiers, and data contracts.
- Approved architecture, dependencies, and public interfaces.

This file does not replace `CLAUDE.md`, `DEVELOPMENT_RULES.md`, `CODING_STANDARDS.md`, or the project specifications. It establishes the highest project-level protection boundary for implementation work.

## 2. Meaning of “Explicit Authorization”

A protected item may be changed only when the project owner’s current instruction clearly identifies:

1. The exact protected target.
2. The intended change.
3. The permitted scope.

The following broad instructions are **not** authorization to modify protected areas:

- “Improve the website.”
- “Modernize the design.”
- “Clean up the code.”
- “Refactor this page.”
- “Fix all issues.”
- “Optimize performance or SEO.”
- “Make it more professional.”
- “Update dependencies.”
- “Use your best judgment.”

Permission for one protected item MUST NOT be interpreted as permission for related items. Authorization expires when the named task is complete.

## 3. Authority and Conflict Resolution

For protected-area decisions, use this order of authority:

1. A direct, explicit instruction from the project owner in the current task.
2. This `DO_NOT_CHANGE.md` document.
3. Approved records in `DECISIONS.md`.
4. `CLAUDE.md` and `DEVELOPMENT_RULES.md`.
5. Approved brand, design, content, SEO, technical, and QA specifications.
6. Existing implementation patterns.
7. Claude’s assumptions or preferences.

If two authoritative documents conflict, Claude MUST:

1. Stop work on the conflicting area.
2. Preserve the current implementation.
3. Identify the exact conflict and affected files.
4. Ask the project owner for a decision.
5. Record the approved resolution in `DECISIONS.md` before implementation.

Claude MUST NOT silently choose one interpretation.

## 4. Protection Levels

| Level | Meaning | Required action |
| --- | --- | --- |
| **P0 — Immutable** | Must never be changed by Claude unless the owner explicitly names the exact change. | Stop and request authorization. |
| **P1 — Approval required** | May be changed only through a scoped task with impact review and verification. | Explain impact, obtain authorization, then change. |
| **P2 — Preserve behavior** | Internal implementation may change, but public behavior and contracts must remain identical. | Test before and after. |

When a target fits more than one level, the strictest level applies.

## 5. P0 — Brand Identity

Claude MUST NOT change, redraw, reinterpret, approximate, or regenerate the following:

### 5.1 Brand names

- Persian name: **آهن آسا**
- English name: **Ahan Asa**
- Domain identity: **`ahanassa.com`**
- Approved slogan: **ما مراقب سرمایه شما هستیم.**

Claude MUST NOT:

- Alter spelling, spacing, capitalization, or transliteration.
- Translate or rewrite the slogan as a replacement for the approved Persian wording.
- Create an alternate product, service, or sub-brand name without authorization.
- Insert “AhanAsa,” “AhanAsa.com,” “Ahan Asa Steel,” or another variation as the official name.

### 5.2 Master logo

The approved logo is a geometric A-frame with a centered rhombus. Master logo assets and approved lockups are P0.

Claude MUST NOT:

- Redraw, trace, recreate, simplify, or “improve” the logo.
- Change its geometry, proportions, spacing, alignment, or centered rhombus.
- Stretch, compress, crop, rotate, skew, distort, or mirror it.
- Add gradients, shadows, glows, outlines, textures, patterns, 3D effects, borders, or extra text.
- Change the approved colors inside a master logo asset.
- Generate a substitute logo with AI or code.
- Export over a master source file.
- Use an unapproved lockup or place the slogan inside the logo.

Only approved logo files from the designated brand-assets directory may be used. If an asset is missing, Claude MUST report the missing asset instead of recreating it.

### 5.3 Core brand colors

The following primary brand colors are P0 tokens:

| Token | Approved value | Meaning |
| --- | --- | --- |
| Steel Navy | `#0B2545` | Primary brand color |
| Forge Copper | `#B04A2F` | Accent brand color |
| White | `#FFFFFF` | Primary light surface |

Claude MUST NOT replace, retune, approximate, or globally remap these values. New supporting tokens may be proposed only when they do not redefine these core colors and are approved through `DECISIONS.md`.

## 6. P0 — Brand Positioning and Commercial Model

Ahan Asa is a **premium B2B steel procurement management brand**. It protects the client’s capital through controlled sourcing, commercial diligence, technical coordination, and accountable procurement.

Claude MUST NOT reposition Ahan Asa as:

- A retail steel shop.
- A commodity marketplace.
- A public price board.
- An e-commerce store.
- A steel manufacturer, mill, warehouse, or stockholder unless verified and approved evidence is supplied.
- A discount, lowest-price, or mass-market brand.
- A generic directory of suppliers.

The primary conversion model is a professional procurement inquiry based on a customer’s invoice, bill of materials, purchase list, or project requirement.

Claude MUST NOT add or imply:

- Shopping cart or checkout flows.
- Instant purchasing.
- Live prices or automatic quotations.
- Public inventory quantities.
- “Buy now” behavior.
- Unverified delivery guarantees.
- Unsupported nationwide or international coverage claims.

Any change to the commercial model, lead qualification model, or value proposition is P0.

## 7. P0 — Truth, Evidence, and Business Claims

Claude MUST NOT invent, infer, embellish, or publish any factual business claim without an approved source.

Protected factual categories include:

- Prices, discounts, margins, or savings percentages.
- Purchase volumes, tonnage, order counts, or transaction totals.
- Customer names, logos, testimonials, or case studies.
- Supplier names, partnerships, exclusivity, or authorization status.
- Certifications, licenses, memberships, awards, or guarantees.
- Warehouses, factories, offices, fleet, personnel, or geographic coverage.
- Years of experience, market rank, response times, or delivery times.
- Product availability, stock, dimensions, grades, standards, or origin.
- Performance metrics and comparative claims.

Placeholders MUST remain visibly marked as placeholders and MUST NOT be converted into plausible production content.

When approved evidence is absent, Claude MUST use neutral wording or flag the content as pending. It MUST NOT “complete” missing facts for design realism.

## 8. P0 — Production Identity and Routing

The approved production origin is:

`https://www.ahanassa.com`

Claude MUST NOT change:

- The primary domain or canonical production origin.
- The `www` host policy.
- Canonical URL generation.
- Production base URLs in metadata, sitemap, structured data, or Open Graph output.
- Domain redirects, DNS assumptions, Cloudflare rules, or deployment domain settings.
- Existing public route slugs or locale strategy.

These changes require an explicit migration task, redirect map, SEO impact review, rollback plan, and post-deployment verification.

Claude MUST NOT introduce a second production origin, hard-code preview URLs, or allow preview/development domains to appear in canonical tags, sitemaps, structured data, emails, or public content.

## 9. P0 — Localization and Direction

The launch experience is Persian-first:

- Primary locale: `fa`
- Primary direction: `rtl`
- Persian content is the authoritative launch content.

Claude MUST NOT:

- Change the primary locale.
- Convert the Persian interface to LTR.
- remove or bypass locale-aware formatting.
- Replace approved Persian copy with machine-translated or English placeholder copy.
- Change locale routing, `lang`, `dir`, canonical, or hreflang behavior without authorization.
- Use left/right-dependent layout logic where logical CSS properties are required.
- Introduce mixed-direction UI defects in phone numbers, prices, units, codes, or file names.

Adding a locale is an architecture, content, SEO, and QA change; it is not a simple translation task.

## 10. P0 — Secrets, Credentials, and Confidential Data

Claude MUST NOT:

- Read, print, expose, copy, summarize, or commit real secret values.
- Move secrets into client-side variables, public bundles, static JSON, source maps, logs, or analytics.
- Create secret fallbacks in source code.
- Commit `.env*` files containing real values.
- Rename, delete, rotate, or reuse production credentials.
- Use production credentials in local or preview environments.
- Send preview or test leads to production CRM, email, storage, analytics, or notification destinations.
- Log RFQ contents, uploaded documents, contact data, tokens, headers, or full request bodies.
- Place customer documents in publicly addressable storage.
- weaken authentication, authorization, rate limiting, validation, upload controls, or abuse protection.

Only variable names and safe examples may appear in `.env.example`. All secret-dependent code must fail safely when required configuration is missing.

## 11. P0 — Customer Data and Lead Integrity

Customer and procurement data is confidential. This includes contact information, invoices, bills of materials, purchase lists, uploaded files, commercial terms, and project details.

Claude MUST NOT:

- Delete, overwrite, duplicate, migrate, export, or backfill production customer data.
- Alter lead destinations or recipient lists.
- Change consent language, retention behavior, or privacy handling.
- Make uploads public or guessable.
- Store confidential form payloads in browser storage.
- Send personally identifiable information to analytics platforms.
- Use real customer data as fixtures, screenshots, demos, or test content.
- perform a production form submission as part of automated testing.

Form field names, validation rules, API payloads, CRM mappings, notification destinations, storage keys, and webhook contracts are P1. Their observable behavior must be preserved unless the task explicitly changes the contract.

## 12. P1 — Legal, Privacy, and Consent Content

Claude MUST NOT rewrite, shorten, translate, or remove approved:

- Privacy notices.
- Terms and conditions.
- Consent text.
- Data-retention statements.
- Copyright and ownership notices.
- Regulatory or compliance statements.
- Disclaimers and warranty limitations.

Fixing a typo in legal text still requires explicit authorization. Claude may identify an issue but MUST preserve the published wording until approval is given.

## 13. P1 — SEO-Critical Assets

Claude MUST NOT change SEO-critical behavior as a side effect of visual work, refactoring, dependency updates, or performance optimization.

Protected assets include:

- Public route slugs.
- Canonical URLs.
- Hreflang and `x-default` relationships.
- `robots.txt` directives.
- XML sitemap inclusion and exclusion rules.
- Redirect status codes and destinations.
- Index/noindex decisions.
- Page titles and meta descriptions that are mapped to approved keywords.
- Open Graph URLs and social preview assets.
- Structured-data entity identity and factual values.
- Internal-link targets and breadcrumb hierarchy.

Claude MUST NOT delete an indexed route or change a slug without an approved redirect. It MUST NOT add structured data for content that is not visible and true on the page.

## 14. P1 — Information Architecture and Primary Journeys

Claude MUST NOT add, remove, rename, reorder, merge, or split approved top-level navigation items, pages, or conversion journeys without authorization.

Protected journeys include:

- Understanding the procurement-management value proposition.
- Reviewing services and process.
- Establishing trust through evidence.
- Submitting an invoice, BOM, purchase list, or procurement requirement.
- Contacting Ahan Asa through approved channels.

A visual redesign may not hide, replace, or materially delay the primary inquiry action.

## 15. P1 — Design Direction and Design Tokens

The approved experience is premium, calm, restrained, trustworthy, protective, and evidence-led.

Claude MUST NOT:

- Turn the site into a generic marketplace or industrial template.
- Introduce excessive gradients, glow, glassmorphism, animation, parallax, or decorative effects.
- Use loud promotional patterns, countdowns, fake scarcity, or manipulative urgency.
- Add motion that interferes with reading, RTL navigation, form completion, or reduced-motion preferences.
- Replace approved typefaces, spacing scales, breakpoints, container widths, radii, shadows, or component tokens globally.
- Create one-off visual tokens when an approved semantic token exists.
- modify design-system primitives solely to fix one page.

Global token or primitive changes are P1 because they can affect the entire website. Page-level styling may change only within approved tokens and specifications.

## 16. P1 — Technical Architecture

The approved baseline is:

- Next.js with App Router.
- TypeScript.
- Static-first delivery.
- Server rendering by default.
- Progressive enhancement for interaction.
- Cloudflare Workers + Static Assets deployment via vinext.
- Secure server-side processing for inquiries and uploads.

Claude MUST NOT, without explicit architecture approval:

- Replace the framework, router, language, hosting platform, or CDN/proxy layer.
- Convert the application into a client-rendered SPA.
- Add a CMS, database, state-management framework, authentication provider, or backend service.
- Change rendering strategy globally.
- Move confidential processing to the browser.
- Enable dynamic rendering across the site to solve a local issue.
- Change package manager, build commands, deployment commands, or runtime version.
- introduce a new external dependency when the platform or existing code already provides the required capability.
- Replace stable components with generated equivalents across the project.

Architecture changes require an approved decision record in `DECISIONS.md`.

## 17. P1 — Dependencies and Lockfiles

Claude MUST NOT:

- Run broad or unscoped dependency upgrades.
- Change major versions without a dedicated migration task.
- Replace or delete the lockfile.
- Switch package managers.
- Add packages for trivial utilities.
- Disable security checks to make a build pass.
- apply automated vulnerability fixes that introduce major-version changes without review.

An approved dependency change must include the reason, alternatives considered, bundle/runtime impact, license check, security review, build verification, and rollback path.

## 18. P1 — Analytics and External Integrations

Claude MUST NOT change or fabricate:

- Analytics property IDs, tag-manager container IDs, or measurement IDs.
- Consent defaults or firing conditions.
- Event names, parameters, or conversion definitions.
- CRM endpoints and field mappings.
- Email sender, recipient, or reply-to configuration.
- Webhook URLs or verification secrets.
- File-storage buckets, paths, access policies, or retention settings.
- Third-party service endpoints.

Claude MUST NOT send duplicate page views or conversion events, and MUST NOT attach confidential form data to analytics events.

Integration changes require a contract review and environment-specific test plan. Local, Preview, and Production must remain isolated.

## 19. P1 — Accessibility and Semantic Contracts

Claude MUST NOT remove or degrade:

- Semantic heading hierarchy.
- Keyboard access and visible focus.
- Form labels, instructions, errors, and status announcements.
- Alternative text or accessible names.
- Landmark structure.
- Color contrast.
- Reduced-motion support.
- Touch-target usability.
- Screen-reader relationships.

Visual similarity is not permission to replace semantic HTML with non-semantic elements. Accessibility fixes may improve a protected component, but its public behavior and visual role must remain intact unless broader change is authorized.

## 20. P2 — Public Contracts and Stable Behavior

Claude may refactor internal implementation only if all public behavior remains stable.

Protected contracts include:

- Exported component props and types.
- Route parameters and query parameters.
- Form field names and validation behavior.
- API request and response schemas.
- Environment-variable names.
- Analytics event schemas.
- CSS hooks used by tests or integrations.
- File and asset URLs referenced externally.
- Error codes and user-facing submission states.

Before changing a contract, Claude MUST search for every consumer. If external consumers cannot be verified, the contract must be treated as P1.

## 21. Protected Files and Directories

The exact repository paths may evolve, but the following categories are protected regardless of location:

| Target | Level | Rule |
| --- | --- | --- |
| `DO_NOT_CHANGE.md` | P0 | Claude may not edit this file unless the owner explicitly requests an edit to this file. |
| Master logo and approved brand assets | P0 | Use only; never regenerate or overwrite. |
| Real environment files and secrets | P0 | Never expose, edit, or commit. |
| Production deployment and domain configuration | P0 | No change without a dedicated infrastructure task. |
| Customer uploads and production data | P0 | Never inspect, mutate, export, or use as test data. |
| Legal and privacy copy | P1 | No content change without approval. |
| Redirect, canonical, sitemap, and robots configuration | P1 | Require SEO impact review. |
| Analytics and integration configuration | P1 | Preserve IDs, destinations, and contracts. |
| Lockfile and runtime configuration | P1 | Change only in a dependency or runtime task. |
| Generated migration history | P1 | Never rewrite applied history. |
| Snapshots and golden visual references | P1 | Update only after intentional UI approval. |

If the repository later adds a path-specific protected registry, it extends this table; it does not weaken it.

## 22. Prohibited Destructive and Bulk Actions

Claude MUST NOT:

- Delete or replace an entire directory to solve a local problem.
- Rewrite the whole application when a scoped patch is sufficient.
- Run mass search-and-replace across protected names, URLs, routes, tokens, or copy.
- Remove files because they appear unused without verifying build-time, runtime, route, test, and external references.
- Regenerate configuration files with defaults.
- Overwrite user changes or unrelated work.
- Rewrite Git history, force-push, discard changes, or reset the repository destructively.
- Delete migrations, backups, uploaded content, or production records.
- Disable tests, lint rules, type checks, security controls, or monitoring to obtain a passing result.
- hide errors with broad exception handling, `any`, suppression comments, or silent fallbacks.

## 23. Allowed Work Without Additional Approval

Claude may perform the following only when they remain outside protected boundaries:

- Fix a localized implementation bug while preserving public contracts.
- Add tests that do not rewrite approved snapshots or production data.
- Improve internal type safety without changing behavior.
- Improve performance without altering SEO, rendering semantics, analytics, accessibility, or visual output.
- Refactor private implementation within one scoped component when all callers and tests remain valid.
- Correct formatting in non-protected code without changing content or behavior.
- Add documentation that accurately describes the existing approved system.

“Allowed” does not waive the requirements in `DEVELOPMENT_RULES.md`, `CODING_STANDARDS.md`, or the applicable QA documents.

## 24. Required Pre-Change Check

Before modifying any file, Claude MUST:

- [ ] Read `CLAUDE.md` and this file.
- [ ] Identify the exact requested outcome.
- [ ] List the files expected to change.
- [ ] Search those files for protected names, tokens, routes, contracts, integrations, and comments.
- [ ] Check relevant approved specifications and `DECISIONS.md`.
- [ ] Classify each affected area as P0, P1, P2, or unprotected.
- [ ] Confirm that the request explicitly authorizes any P0 or P1 change.
- [ ] Preserve unrelated user changes.
- [ ] Define verification and rollback before implementation.

If protection status is uncertain, treat the target as P1.

## 25. Required Change-Control Procedure

For an authorized protected change, Claude MUST:

1. State the protected target and why the change is required.
2. Describe affected pages, components, routes, data, SEO, analytics, and integrations.
3. Confirm the exact owner authorization.
4. Create or update the relevant entry in `DECISIONS.md`.
5. Make the smallest possible patch.
6. Avoid unrelated cleanup.
7. Run the relevant automated and manual checks.
8. Document the change in `CHANGELOG.md`.
9. Report residual risk and rollback instructions.

Authorization to edit implementation does not automatically authorize changes to this document.

## 26. Verification Requirements

After any authorized protected change, verify all applicable items:

- [ ] Brand names, logo, slogan, and colors remain correct.
- [ ] Persian layout remains RTL across required breakpoints.
- [ ] Public URLs, canonical tags, hreflang, sitemap, robots, and redirects are correct.
- [ ] No preview or local origin appears in production output.
- [ ] No secret or confidential data appears in source, logs, bundles, or analytics.
- [ ] Local, Preview, and Production destinations remain isolated.
- [ ] Forms validate, submit once, show correct states, and preserve payload contracts.
- [ ] Analytics fires only approved events and contains no PII.
- [ ] Keyboard, focus, labels, errors, contrast, and reduced motion remain accessible.
- [ ] Type check, lint, tests, and production build pass.
- [ ] Relevant pages receive responsive and visual QA.
- [ ] The implementation matches the approved decision and nothing more.

## 27. Required Behavior When Blocked

When a request would change a protected area without sufficient authorization, Claude MUST respond with:

1. The exact protected item.
2. Its protection level.
3. The rule that prevents the change.
4. The minimum clarification or authorization required.
5. A safe alternative that stays within the current scope, when one exists.

Claude MUST NOT proceed partially in a way that creates an inconsistent or broken state.

## 28. Emergency Fixes

An incident does not grant unlimited modification rights.

During an explicitly declared production incident, Claude may propose the smallest reversible containment patch, but MUST NOT deploy or apply a protected change unless the owner has authorized the incident action. The response must preserve evidence, avoid destructive cleanup, document the temporary deviation, define rollback, and require follow-up review.

Temporary fixes MUST NOT silently become permanent architecture.

## 29. Definition of Done

A task affecting protected areas is complete only when:

- The authorization was explicit and scoped.
- The patch is limited to the authorized target.
- Approved brand and commercial positioning remain intact.
- Security, privacy, data, and environment boundaries remain intact.
- Public routes, SEO signals, integrations, and contracts are verified.
- Required tests and QA checks pass.
- `DECISIONS.md` and `CHANGELOG.md` are updated where applicable.
- No unrelated protected item changed.
- Rollback instructions are available.

## 30. Final Instruction to Claude

When in doubt, preserve the current approved state.

Do not infer permission. Do not fabricate facts. Do not broaden scope. Do not trade brand integrity, customer confidentiality, accessibility, SEO, or production safety for speed.

If a requested improvement conflicts with this document, stop at the boundary and request a precise decision from the project owner.
