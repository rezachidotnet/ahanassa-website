# Ahan Asa Website — Redirect Map and URL Migration Policy

> **Brand:** Ahan Asa | آهن آسا  
> **Domain:** `ahanassa.com`  
> **Document:** `REDIRECTS.md`  
> **Status:** Draft v1.0 — implementation contract with open decisions  
> **Last updated:** 2026-08-25  
> **Launch locale:** Persian (`fa`), fully RTL  
> **Preferred application architecture:** Next.js App Router, static-first where practical

---

## 1. Purpose

This document defines how Ahan Asa redirects, canonicalizes, retires, and migrates public URLs. It is the operational redirect register for developers, SEO owners, content editors, infrastructure owners, and Claude Code.

Its goals are to:

- keep one canonical URL for each public page;
- transfer users and search signals to the closest valid replacement when a URL changes;
- prevent duplicate Persian pages, redirect chains, loops, soft 404s, and accidental homepage redirects;
- preserve safe attribution data without preserving personal or confidential data;
- make every redirect explicit, reviewable, testable, and reversible through version control;
- distinguish approved redirects from proposals and unresolved route conflicts.

This file does not authorize new pages, aliases, locales, campaigns, or business claims. Page existence is governed by `SITEMAP.md`; route syntax and locale behavior are governed by `ROUTES.md`; redirects record the migration behavior between those states.

---

## 2. Source-of-Truth and Conflict Rules

Redirect decisions must follow this order:

1. explicit owner decisions recorded in `DECISIONS.md`;
2. `PROJECT_BRIEF.md`;
3. approved `SITEMAP.md`;
4. approved `INFORMATION_ARCHITECTURE.md`;
5. `ROUTES.md`;
6. `REDIRECTS.md`;
7. SEO, metadata, content, localization, analytics, and technical specifications;
8. implementation details.

When these sources disagree, Claude Code must not silently select one route and create a redirect. The conflict must be documented as `blocked`, resolved by the owner, and then updated across every affected specification before implementation.

### 2.1 Verified current facts

- The approved business domain is `ahanassa.com`.
- Persian is the only active Phase 1 locale.
- Persian canonical paths are unprefixed; `/fa` must not render duplicate Persian content.
- Future English and Arabic namespaces are reserved as `/en/...` and `/ar/...`; they must return a genuine `404` until each locale is approved and deployed.
- Public slugs use lowercase Latin ASCII and kebab-case.
- Canonical paths omit a trailing slash except for `/`.
- Only canonical, indexable, production URLs belong in the XML sitemap.
- No verified legacy domain or legacy URL inventory has yet been supplied.
- The canonical host variant—apex or `www`—is not yet approved.

### 2.2 Known route-contract conflicts

The current documents contain these unresolved differences:

| Page identity | `SITEMAP.md` | `ROUTES.md` | Redirect impact | Current state |
|---|---|---|---|---|
| Primary consultation/request page | `/request-consultation` | `/request` | One must become canonical; the other may redirect only after approval | `blocked` |
| Submission confirmation | `/request-consultation/thank-you` | `/request/confirmation` | Destination depends on the primary request-route decision | `blocked` |
| Terms of use | `/terms-of-use` | `/terms` | One must become canonical; the other may redirect only after approval | `blocked` |
| Request-page indexation | Index | `noindex, follow` | Not a redirect, but must be resolved with the canonical route decision | `blocked` |

Until resolved, none of the conflicting pairs above is an approved redirect. Production code must not implement both as indexable pages.

---

## 3. Redirect Status Vocabulary

Every redirect record must use one status:

| Status | Meaning | Implementation rule |
|---|---|---|
| `approved` | Destination and status code are owner-approved | May be implemented and tested |
| `conditional` | Rule is valid only when a stated condition becomes true | Do not activate before the condition is verified |
| `proposed` | Candidate awaiting SEO, content, or owner review | Do not implement |
| `blocked` | A source-of-truth conflict or missing decision prevents implementation | Resolve dependency first |
| `retired` | Redirect is intentionally removed after review | Preserve history in this file |
| `rejected` | Alias or migration was considered and explicitly declined | Do not implement |

The redirect register must never treat `proposed`, `blocked`, or `rejected` rows as executable configuration.

---

## 4. Redirect Record Schema

Each redirect must contain:

| Field | Requirement |
|---|---|
| `id` | Stable identifier such as `R-HOST-001` or `R-SLUG-004` |
| `source` | Exact source URL, host pattern, or tightly scoped path pattern |
| `destination` | One canonical destination; never a chain target |
| `code` | `308`, `301`, `307`, or `302` |
| `status` | One value from Section 3 |
| `scope` | Host, locale, static route, or named dynamic route family |
| `reason` | Migration or normalization reason |
| `query_policy` | Preserve, whitelist, discard, or custom rule |
| `activation_condition` | What must be verified before deployment |
| `approved_by` | Named accountable owner; `TBD` until approved |
| `approved_on` | ISO date; `TBD` until approved |
| `review_on` | Review date for temporary or campaign redirects |
| `evidence` | Source document, external-link list, analytics, or migration inventory |

Do not use a broad wildcard when the intended sources can be listed precisely.

---

## 5. HTTP Status-Code Policy

| Code | Use | Ahan Asa rule |
|---:|---|---|
| `308` | Permanent redirect with method and body preservation | Preferred for protocol, host, locale-prefix, and normalized-path redirects |
| `301` | Permanent redirect traditionally used for migrated `GET`/`HEAD` content | Acceptable for verified legacy content migrations when infrastructure support or SEO tooling favors it |
| `307` | Temporary redirect with method and body preservation | Use only for a genuinely temporary destination |
| `302` | Temporary redirect traditionally used for `GET`/`HEAD` behavior | Use only for temporary campaigns or controlled experiments |

Rules:

- Permanent migrations must not use temporary redirects merely to postpone a decision.
- Temporary redirects require an owner and review or expiry date.
- Redirects must not convert a form submission method unexpectedly.
- Public form and API clients should submit directly to canonical endpoints; redirects are not an API-versioning strategy.

---

## 6. Canonical URL Contract

The canonical public URL has this form:

```text
https://<approved-canonical-host>/<normalized-path>
```

Where:

- the scheme is `https`;
- the host is exactly one approved variant of `ahanassa.com`;
- the Phase 1 Persian path has no locale prefix;
- the path is lowercase Latin ASCII in kebab-case;
- the path has no trailing slash, except `/`;
- the URL contains no tracking parameters in its canonical tag;
- the URL contains no fragment in server-side redirect logic.

The canonical origin must be read from one validated environment or deployment configuration value such as:

```text
NEXT_PUBLIC_SITE_URL=https://<approved-canonical-host>
```

Metadata, XML sitemap, robots directives, Open Graph, structured data, internal links, email links, and redirect destinations must all use the same origin.

---

## 7. Mandatory Normalization Rules

### 7.1 Protocol and host

At launch, all public HTTP and non-canonical-host requests must resolve directly to the equivalent HTTPS canonical-host URL.

| ID | Source | Destination | Code | Status | Query policy | Activation condition |
|---|---|---|---:|---|---|---|
| `R-HOST-001` | `http://ahanassa.com/:path*` | `https://<canonical-host>/:path*` | `308` | `blocked` | Section 10 whitelist | Canonical host decision recorded |
| `R-HOST-002` | `http://www.ahanassa.com/:path*` | `https://<canonical-host>/:path*` | `308` | `blocked` | Section 10 whitelist | Canonical host decision recorded |
| `R-HOST-003` | `https://<non-canonical-host>/:path*` | `https://<canonical-host>/:path*` | `308` | `blocked` | Section 10 whitelist | Canonical host decision recorded |

These rules must collapse protocol and host normalization into one hop. Replace the placeholders only after the owner chooses either:

- `https://ahanassa.com`, or
- `https://www.ahanassa.com`.

Do not activate both as canonical.

### 7.2 Persian default-locale prefix

If `/fa` paths are reachable from legacy links, framework behavior, or earlier deployments, they must redirect to the unprefixed Persian equivalent.

| ID | Source | Destination | Code | Status | Query policy | Activation condition |
|---|---|---|---:|---|---|---|
| `R-LOCALE-001` | `/fa` | `/` | `308` | `conditional` | Whitelist | Confirm alias is reachable or externally linked |
| `R-LOCALE-002` | `/fa/` | `/` | `308` | `conditional` | Whitelist | Confirm alias is reachable or externally linked |
| `R-LOCALE-003` | `/fa/:path*` | `/:path*` | `308` | `conditional` | Whitelist | Destination exists and is canonical |

The wildcard rule must not turn an invalid `/fa/...` URL into a false `200`. After prefix removal, an unknown or unpublished destination must still return `404`.

### 7.3 Trailing slash

All non-root public pages use the no-trailing-slash form.

| ID | Source | Destination | Code | Status | Query policy | Activation condition |
|---|---|---|---:|---|---|---|
| `R-PATH-001` | `/:path+/` | `/:path+` | `308` | `approved` | Whitelist | Apply only to recognized public document routes |

The rule must not interfere with static assets, framework internals, API routes, webhook endpoints, signed upload URLs, or storage paths.

### 7.4 Path casing and malformed slugs

Canonical public paths are lowercase. However, do not deploy a global “lowercase everything” redirect that mutates case-sensitive assets, encoded values, secure tokens, or external integration paths.

- Known historical uppercase or mixed-case content URLs may receive explicit permanent redirects.
- Unknown uppercase paths should return `404` unless a verified equivalent exists.
- Invalid dynamic slugs must return `404`; they must not be guessed or normalized to another record.

### 7.5 Duplicate delimiters and encoded variants

Do not create blanket redirects for:

- repeated slashes;
- percent-encoded Persian paths;
- underscore-to-hyphen guesses;
- arbitrary `.html`, `.php`, or file-extension variants;
- misspellings.

Add only verified sources from crawl data, backlinks, analytics, Search Console, earlier deployments, or approved campaigns.

---

## 8. Locale Redirect Policy

### 8.1 Phase 1

- Persian is unprefixed and active.
- `/en`, `/ar`, and all descendants return a genuine `404` until each locale is fully approved and deployed.
- Do not redirect unavailable English or Arabic URLs to Persian.
- Do not automatically redirect users based only on IP address, browser language, or geography.
- Do not expose incomplete locales through sitemaps, hreflang, navigation, or language switchers.

### 8.2 After a future locale launches

Locale switching should resolve to the true translated counterpart by stable page identity. It must not be implemented as a generic path-string rewrite when localized slugs differ.

If a translated counterpart does not exist:

- omit its hreflang alternate;
- use the approved language-switch fallback defined in `LOCALIZATION.md`;
- do not redirect the missing localized path to unrelated content.

---

## 9. Current Redirect Register

### 9.1 Approved or conditionally valid normalization entries

| ID | Source | Destination | Code | Status | Reason | Evidence |
|---|---|---|---:|---|---|---|
| `R-PATH-001` | Non-root recognized route with `/` suffix | Same route without `/` | `308` | `approved` | Canonical path normalization | `ROUTES.md`, `SITEMAP.md` |
| `R-LOCALE-001` | `/fa` | `/` | `308` | `conditional` | Prevent duplicate default-locale homepage | `ROUTES.md` |
| `R-LOCALE-002` | `/fa/` | `/` | `308` | `conditional` | Combine prefix and slash normalization | `ROUTES.md` |
| `R-LOCALE-003` | `/fa/:path*` | Existing unprefixed equivalent | `308` | `conditional` | Prevent duplicate default-locale pages | `ROUTES.md` |

### 9.2 Host entries awaiting canonical-host approval

| ID | Source | Destination | Code | Status | Blocker |
|---|---|---|---:|---|---|
| `R-HOST-001` | HTTP apex | Approved HTTPS canonical equivalent | `308` | `blocked` | Apex versus `www` decision |
| `R-HOST-002` | HTTP `www` | Approved HTTPS canonical equivalent | `308` | `blocked` | Apex versus `www` decision |
| `R-HOST-003` | HTTPS non-canonical host | Approved HTTPS canonical equivalent | `308` | `blocked` | Apex versus `www` decision |

### 9.3 Route conflicts awaiting owner decision

| ID | Candidate source | Candidate destination | Code after approval | Status | Required decision |
|---|---|---|---:|---|---|
| `R-CONFLICT-001` | `/request-consultation` or `/request` | The selected canonical request route | `308` | `blocked` | Select canonical route and indexation policy |
| `R-CONFLICT-002` | `/request-consultation/thank-you` or `/request/confirmation` | The selected noindex confirmation route | `308` | `blocked` | Align with canonical request flow |
| `R-CONFLICT-003` | `/terms-of-use` or `/terms` | The selected canonical legal route | `308` | `blocked` | Select canonical legal route |

Do not convert this table into runtime rules until the sources and destinations are explicit and approved.

### 9.4 Verified legacy redirects

No legacy domain, historical production path, prior slug, or external campaign alias has been verified for Ahan Asa at the time of this version.

This empty register is intentional. It must not be filled with speculative aliases.

---

## 10. Query-Parameter Policy

### 10.1 Allowed attribution parameters

The following may be preserved through a redirect when required for approved attribution:

```text
utm_source
utm_medium
utm_campaign
utm_content
utm_term
```

Rules:

- Preserve only allowlisted parameters.
- Exclude all tracking parameters from canonical tags.
- Do not generate internal links containing tracking parameters.
- Do not preserve duplicated, malformed, or unexpectedly large parameter values.
- Do not let query strings create additional indexable versions of a page.

### 10.2 Parameters that must not be propagated

Never preserve personal, confidential, authentication, upload, or internal workflow data, including:

- name, phone number, email address, or message body;
- document or file names;
- quotation values or material lists;
- session IDs, access tokens, secure request tokens, or signed-storage parameters;
- internal database IDs or debugging flags.

Unknown parameters should be discarded unless an approved integration explicitly requires them. Integration-specific exceptions must be documented as exact rules, not broad pass-through behavior.

### 10.3 Fragments

URL fragments such as `#faq` are not sent to the server and cannot be managed reliably by server-side redirect rules. When an old deep link with a fragment is externally important, verify client/browser behavior and document the expected final fragment separately.

---

## 11. Static Route Rename Policy

A published route may be renamed only when the user, SEO, legal, or architectural benefit outweighs migration risk.

Before approval:

1. identify the current canonical URL;
2. verify the new page is equivalent or the closest relevant replacement;
3. inventory internal links, backlinks, campaigns, structured data, canonicals, hreflang, analytics, and sitemap entries;
4. define one direct permanent redirect;
5. record the decision and approval date;
6. test the destination as a real canonical `200` page.

After deployment:

- update every internal reference to the destination;
- remove the source from XML sitemaps;
- keep the source out of canonical and hreflang output;
- monitor crawl errors, redirect hits, and indexation;
- do not reuse the retired source for unrelated content.

---

## 12. Dynamic Slug Migration Policy

This policy applies to approved records under:

```text
/steel-products/[category-slug]
/industries/[industry-slug]
/projects/[project-slug]
/insights/[article-slug]
/resources/[resource-slug]
```

Each slug change requires an explicit row in the dynamic redirect registry:

| ID | Content key | Locale | Old path | New path | Code | Status | Approved on |
|---|---|---|---|---|---:|---|---|
| — | — | — | — | — | — | No approved dynamic slug migrations | — |

Rules:

- Map by stable content identity, not by similar-looking slug text.
- Redirect to the exact successor page in one hop.
- Never reuse an old slug for unrelated content.
- Collapse a chain when a page is renamed more than once: every historical source must point directly to the latest canonical destination.
- Return `404` for unknown, draft, unpublished, or invalid records.
- Return `410` only when removal is intentional, permanent, and documented and no relevant replacement exists.

---

## 13. Consolidation, Removal, and Expiry

### 13.1 Equivalent or consolidated content

Use a permanent redirect only when the destination substantially satisfies the source intent.

Examples of valid relationships:

- old article slug → same article under its approved new slug;
- merged thin article → substantive canonical guide covering the same intent;
- retired category name → renamed equivalent category page.

### 13.2 No relevant replacement

Use:

- `404` for unknown URLs, unpublished content, invalid slugs, or content that never existed publicly;
- `410` for deliberately and permanently removed content when removal is documented and accelerated deindexing is useful.

Do not redirect removed pages to `/`, `/contact`, `/request`, a generic hub, or an unrelated popular page merely to avoid a `404`.

### 13.3 Campaign and temporary routes

Every temporary route must define:

- exact source and destination;
- `307` or `302` status;
- campaign owner;
- activation and expiry dates;
- query policy;
- post-campaign outcome: retire, convert to permanent, or return `404`/`410`.

There are no approved temporary campaign redirects in this version.

---

## 14. Prohibited Speculative Aliases

Do not create redirects for these paths unless evidence shows they were published, externally linked, or explicitly approved:

```text
/rfq
/quote
/upload-invoice
/services
/prices
/daily-prices
/live-prices
/shop
/cart
/checkout
/account
/supplier-portal
/marketplace
```

Also prohibited without evidence:

- Persian-script URL variants;
- city, supplier, grade, size, standard, or brand permutations;
- common misspellings generated automatically;
- route aliases created only because a navigation label changed;
- unavailable `/en/...` or `/ar/...` paths redirected to Persian;
- print, preview, filter, search, and pagination variants redirected as fake canonical pages.

Navigation labels may change without changing the URL.

---

## 15. Redirect Ordering and Chain Prevention

Runtime evaluation should produce the final destination in one response whenever infrastructure permits.

Recommended logical order:

1. reject or bypass non-public technical namespaces;
2. resolve an approved exact legacy or renamed path;
3. remove the default `/fa` prefix when applicable;
4. normalize the trailing slash;
5. normalize protocol and host to the final HTTPS canonical origin;
6. preserve only allowlisted query parameters.

This is a logical order, not permission to create multiple HTTP hops. The implementation should compute the final canonical target before responding.

Example target behavior after canonical-host approval:

```text
http://<non-canonical-host>/fa/about/?utm_source=linkedin
→ 308
https://<canonical-host>/about?utm_source=linkedin
```

Not acceptable:

```text
HTTP → HTTPS → canonical host → remove /fa → remove trailing slash
```

### 15.1 Loop safeguards

- A source must never equal its normalized destination.
- A destination must not redirect back to any earlier source.
- Wildcards must exclude framework, API, storage, preview, and static-asset namespaces.
- Every destination must resolve successfully before its redirect is activated.
- CI must fail when duplicate sources have different destinations.

---

## 16. Implementation Boundaries

### 16.1 Preferred ownership by layer

| Rule class | Preferred layer | Reason |
|---|---|---|
| HTTP and host normalization | Cloudflare/Vercel edge or a single deployment layer | Earliest response and one-hop canonicalization |
| Static legacy path map | Next.js redirect configuration or centralized edge map | Version-controlled and testable |
| Default-locale prefix | Locale middleware or centralized redirect layer | Consistent locale behavior |
| Dynamic slug history | Content redirect registry queried by stable content identity | Maintains editorial history |
| Temporary campaign route | Controlled deployment configuration with owner and expiry | Prevents forgotten redirects |

Choose one owner for each rule class. Do not duplicate the same redirect independently in Cloudflare, Vercel, Next.js middleware, and application components.

### 16.2 Next.js constraints

- Centralize route constants and redirect data.
- Prefer declarative permanent redirects for verified static mappings.
- Keep host and environment decisions outside component code.
- Do not call `redirect()` during render to repair duplicate content that should be normalized at the edge.
- Use `notFound()` for unavailable content records and locales.
- Ensure server components, route handlers, middleware, and `next.config.*` do not define competing rules.
- Do not expose placeholder redirects in production from `blocked` or `proposed` rows.

### 16.3 API, webhook, and upload exclusions

Public-page redirect patterns must exclude at minimum:

```text
/_next/
/api/
/robots.txt
/sitemap.xml
/favicon.ico
```

Also exclude any approved webhook, preview, health-check, file-upload, signed-download, or storage paths. Those endpoints require their own versioning and security policies.

---

## 17. Internal Reference Updates

A redirect is a migration safeguard, not an internal navigation strategy. When a redirect is approved, update:

- header, footer, breadcrumb, CTA, and body links;
- sitemap and robots-related outputs;
- canonical and hreflang mappings;
- Open Graph and social-share URLs;
- JSON-LD identifiers and URLs;
- forms, confirmation destinations, and email templates;
- analytics definitions and campaign templates;
- downloadable documents and QR codes when maintainable;
- external profiles and directory listings under Ahan Asa's control.

All new internal links must point directly to the canonical destination.

---

## 18. Testing Matrix

Every active redirect must be tested in production-like infrastructure and again after deployment.

### 18.1 Required assertions

| Test | Expected result |
|---|---|
| Canonical URL | `200` and no redirect |
| HTTP equivalent | One permanent redirect to final HTTPS canonical URL |
| Non-canonical host equivalent | One permanent redirect to final canonical host |
| `/fa` equivalent of an existing Persian route | One `308` to unprefixed destination when alias rule is active |
| `/fa` equivalent of a nonexistent route | Redirect may remove prefix, but final result must remain `404`; never fake `200` |
| Non-root trailing slash | One `308` to no-slash canonical form |
| Root `/` | Remains `/`; no self-redirect |
| Unsupported `/en/...` or `/ar/...` | Genuine `404` until locale launch |
| Unknown path | Genuine `404`; no homepage redirect |
| Removed path without replacement | Approved `404` or `410` |
| Safe UTM parameters | Preserved through redirect, excluded from canonical tag |
| Personal or token parameter | Not propagated |
| API/static asset path | Not captured by public-page wildcard |
| Redirected source | Excluded from XML sitemap and hreflang |
| Redirect destination | Canonical `200`, self-referencing canonical, internally linked |

### 18.2 Chain and loop checks

- maximum redirect hops from any registered source: `1` where infrastructure permits;
- absolute maximum before release failure: `1` for controlled Ahan Asa mappings;
- no repeated URL in a redirect trace;
- no mixed apex/`www` destinations;
- no HTTP destination;
- no destination with an unapproved locale or trailing slash;
- no two active rules with the same normalized source and different destinations.

### 18.3 Method checks

For `308` and `307` rules, verify that request method and body are preserved. Do not test sensitive production payloads; use safe test fixtures in an approved non-production environment.

---

## 19. Monitoring and Review

After launch or a material migration, review:

- redirect hit volume by source;
- `404` and `410` logs;
- Google Search Console indexing and crawl reports;
- sitemap-submitted versus indexed canonical URLs;
- external backlinks still using sources;
- redirect chains introduced by later changes;
- unexpected locale, uppercase, parameter, or trailing-slash variants;
- conversion attribution across redirected campaign URLs.

Suggested review windows are 24 hours, 7 days, 30 days, and 90 days after a major migration. Continue high-value permanent redirects while external links or search signals still use them. Do not remove redirects solely because a fixed time period has elapsed.

Analytics and logs must not capture sensitive query values or uploaded-document details.

---

## 20. Change Workflow

For every new redirect:

1. verify that the source existed, was linked, or is explicitly approved;
2. identify the closest equivalent canonical destination;
3. select permanent or temporary status based on real intent;
4. add a complete row to this document;
5. update `ROUTES.md`, `SITEMAP.md`, SEO maps, internal-link rules, metadata, and localization mappings as applicable;
6. record material decisions in `DECISIONS.md` and changes in `CHANGELOG.md`;
7. implement in exactly one owning layer;
8. run the full test matrix;
9. deploy and monitor;
10. record retirement only after evidence-based review.

Claude Code must not infer redirects from renamed headings, navigation labels, branch names, content titles, or unapproved mockups.

---

## 21. Open Decisions

| Decision | Current state | Required owner/document | Redirect impact |
|---|---|---|---|
| Canonical host: apex or `www` | `TBD` | Owner + deployment configuration | Blocks host rules and absolute destinations |
| Canonical request route | Conflict | Owner + `SITEMAP.md` + `ROUTES.md` | Blocks request aliases and form confirmation route |
| Request page indexation | Conflict | SEO owner + page-content owner | Affects sitemap and canonical policy |
| Canonical confirmation route | Conflict | Owner + form architecture | Blocks success-state redirect |
| Canonical terms route | Conflict | Owner + legal/content owner | Blocks legal-route alias |
| Verified legacy domains | None supplied | Owner + deployment/DNS inventory | Blocks domain migration map |
| Verified legacy paths and backlinks | None supplied | SEO owner + crawl/GSC/backlink inventory | Blocks content migration map |
| Future locale launch order | Not approved | `LOCALIZATION.md` | Locale redirects remain unavailable |
| Dynamic slug history storage | `TBD` | Technical/content architecture | Needed before first published slug change |
| `404` versus `410` approval owner | `TBD` | SEO owner | Needed for permanent removals |

These decisions must be resolved before the affected rules move to `approved`.

---

## 22. Launch Acceptance Checklist

- [ ] One HTTPS canonical host is approved and configured.
- [ ] HTTP and non-canonical hosts reach the final canonical URL in one redirect.
- [ ] Persian pages are unprefixed and no duplicate `/fa` pages render.
- [ ] Unsupported locale paths return genuine `404` responses.
- [ ] The request, confirmation, and terms route conflicts are resolved across all documents.
- [ ] Public paths use lowercase ASCII kebab-case and no trailing slash.
- [ ] Only verified aliases and legacy URLs are redirected.
- [ ] Redirect destinations are the closest relevant canonical pages.
- [ ] No redirect points indiscriminately to the homepage.
- [ ] No redirect chain, loop, self-redirect, or conflicting duplicate source exists.
- [ ] Query propagation uses an allowlist and excludes personal or confidential data.
- [ ] APIs, webhooks, uploads, framework assets, and static files are excluded from public-page wildcards.
- [ ] Redirected, parameterized, noindex, error, draft, and unavailable-locale URLs are absent from the XML sitemap.
- [ ] Internal links, canonicals, hreflang, Open Graph, and structured data point directly to final destinations.
- [ ] Unknown and unpublished dynamic slugs return `404`.
- [ ] Intentional permanent removals use approved `410` behavior only when appropriate.
- [ ] Production-like and post-deployment redirect tests pass.
- [ ] Monitoring owners and review dates are assigned for temporary or migration-specific rules.

---

## 23. Definition of Done

`REDIRECTS.md` becomes **Approved** when:

1. the canonical host is selected;
2. all route conflicts in Section 2.2 are resolved;
3. verified legacy domains and paths are either added or explicitly confirmed as nonexistent;
4. every executable row has an explicit source, final destination, status code, owner, approval date, and query policy;
5. the implementation owner for each redirect class is assigned;
6. `ROUTES.md`, `SITEMAP.md`, SEO maps, metadata, internal links, localization rules, and deployment configuration agree;
7. the launch acceptance checklist passes without redirect chains, loops, soft 404s, or duplicate canonical pages.

Until then, this document is a safe implementation contract: approved normalization behavior may proceed, but blocked or speculative mappings must not be deployed.
