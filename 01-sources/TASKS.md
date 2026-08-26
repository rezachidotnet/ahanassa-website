# Ahan Asa Website — Tasks, Backlog, and Delivery Plan

> This document is the operational source of truth for planning and delivering the Ahan Asa website. Claude Code must read this file together with `CLAUDE.md`, `DO_NOT_CHANGE.md`, and the relevant specification files before starting implementation.

## 1. Document Control

| Field | Value |
|---|---|
| Project | Ahan Asa Website |
| Brand | Ahan Asa / آهن آسا |
| Domain | `ahanassa.com` |
| Document owner | Project Owner |
| Delivery owner | Technical Lead |
| Status | Active |
| Last updated | 2026-08-25 |
| Primary stack | Next.js App Router, TypeScript, static-first delivery |
| Hosting | Vercel behind Cloudflare |

## 2. How to Use This File

1. Work from the highest-priority unblocked task in the current phase.
2. Never start a task until its dependencies and referenced specifications are available.
3. Change a task to `[~]` before implementation and to `[x]` only after all acceptance criteria pass.
4. Add newly discovered work to the backlog; do not silently expand the current task.
5. Record material architecture or design decisions in `DECISIONS.md`.
6. Record user-visible changes in `CHANGELOG.md`.
7. Stop and request clarification for any item marked `TBD` that materially affects implementation.
8. Do not edit protected areas listed in `DO_NOT_CHANGE.md`.

### Status Legend

| Marker | Meaning |
|---|---|
| `[ ]` | Not started |
| `[~]` | In progress |
| `[x]` | Completed and verified |
| `[!]` | Blocked |
| `[-]` | Cancelled or intentionally excluded |

### Priority Legend

| Priority | Meaning |
|---|---|
| `P0` | Release blocker or critical risk |
| `P1` | Required for the first production release |
| `P2` | Important improvement after the core release |
| `P3` | Optional enhancement or future experiment |

### Task Format

```md
- [ ] TASK-ID — Task title `[Priority]`
  - Depends on: TASK-ID or None
  - References: relevant specification files
  - Acceptance: objective completion criteria
```

## 3. Project Goals

- Present Ahan Asa as a premium, trustworthy steel procurement manager.
- Communicate the brand promise: «ما مراقب سرمایه شما هستیم.»
- Explain the procurement process, risk controls, and buyer value clearly.
- Generate qualified inquiries through focused contact and RFQ journeys.
- Deliver a fast, accessible, secure, search-ready, and maintainable website.
- Establish a reusable technical foundation for future content and language expansion.

## 4. Release Scope

### Release 1 — Minimum Viable Production Website

- Brand-aligned responsive interface.
- Core public pages defined in the approved sitemap.
- Persian-first content and correct RTL behavior.
- Contact and RFQ conversion paths.
- Essential metadata, structured data, sitemap, and robots rules.
- Analytics and consent behavior.
- Production deployment on `ahanassa.com`.
- Accessibility, performance, security, responsive, and SEO QA.

### Deferred Until Approved

- Additional locales or markets.
- Customer account or authentication.
- Live pricing, inventory, or e-commerce.
- CMS integration.
- CRM/ERP automation beyond the approved lead workflow.
- Advanced calculators, quotation engines, or procurement dashboards.

## 5. Delivery Gates

| Gate | Required outcome |
|---|---|
| G0 — Discovery approved | Scope, audience, goals, constraints, and success metrics are confirmed |
| G1 — Architecture approved | Sitemap, routes, content model, stack, and integrations are confirmed |
| G2 — Design approved | Design direction, tokens, components, and key page designs are approved |
| G3 — Build complete | All P0/P1 implementation tasks pass local checks |
| G4 — Release candidate approved | Content, QA, SEO, analytics, security, and performance checks pass |
| G5 — Production verified | Domain, redirects, forms, analytics, indexing controls, and monitoring work live |

---

## 6. Phase 0 — Project Setup and Governance

- [ ] GOV-001 — Confirm project brief and measurable outcomes `[P0]`
  - Depends on: None
  - References: `PROJECT_BRIEF.md`
  - Acceptance: target users, business goals, release scope, exclusions, and KPIs are approved.

- [ ] GOV-002 — Confirm brand source of truth `[P0]`
  - Depends on: GOV-001
  - References: `BRAND_GUIDELINES.md`, `COLOR_SYSTEM.md`, `TYPOGRAPHY_SYSTEM.md`
  - Acceptance: approved logo assets, Steel Navy `#0B2545`, Forge Copper `#B04A2F`, white, typography, and usage rules are documented.

- [ ] GOV-003 — Finalize Claude Code operating rules `[P0]`
  - Depends on: GOV-001
  - References: `CLAUDE.md`, `DEVELOPMENT_RULES.md`, `CODING_STANDARDS.md`, `DO_NOT_CHANGE.md`
  - Acceptance: permitted changes, protected areas, validation commands, and completion reporting rules are explicit.

- [ ] GOV-004 — Establish decision and change logs `[P1]`
  - Depends on: GOV-003
  - References: `DECISIONS.md`, `CHANGELOG.md`
  - Acceptance: both files contain templates, ownership, and update rules.

- [ ] GOV-005 — Define repository and branch workflow `[P0]`
  - Depends on: GOV-003
  - Acceptance: default branch, feature branch naming, commit conventions, review requirements, and release tagging are documented.

### Phase 0 Exit Criteria

- [ ] G0 approved by the Project Owner.
- [ ] No unresolved P0 governance blocker remains.

## 7. Phase 1 — Discovery, Content, and Information Architecture

- [ ] IA-001 — Validate primary audience segments and buying journeys `[P0]`
  - Depends on: GOV-001
  - References: `PROJECT_BRIEF.md`, `CONTENT_STRATEGY.md`
  - Acceptance: audiences, pain points, objections, trust signals, and desired actions are mapped.

- [ ] IA-002 — Approve sitemap and navigation hierarchy `[P0]`
  - Depends on: IA-001
  - References: `SITEMAP.md`, `INFORMATION_ARCHITECTURE.md`
  - Acceptance: every Release 1 page has an owner, purpose, audience, and primary CTA.

- [ ] IA-003 — Approve route and URL rules `[P0]`
  - Depends on: IA-002
  - References: `ROUTES.md`, `REDIRECTS.md`
  - Acceptance: canonical route, slugs, trailing-slash policy, case policy, and future locale behavior are defined.

- [ ] IA-004 — Complete page specifications `[P0]`
  - Depends on: IA-002
  - References: `PAGE_SPECIFICATIONS.md`, `HOMEPAGE_SPEC.md`, `HEADER_NAVIGATION_SPEC.md`, `FOOTER_SPEC.md`
  - Acceptance: each page defines sections, content requirements, components, CTA, metadata, states, and acceptance criteria.

- [ ] IA-005 — Finalize content model and content inventory `[P1]`
  - Depends on: IA-002
  - References: `CONTENT_MODEL.md`, `CONTENT_STRATEGY.md`
  - Acceptance: required copy, images, documents, project data, legal text, and ownership are tracked.

- [ ] IA-006 — Approve brand voice and conversion copy rules `[P1]`
  - Depends on: IA-001
  - References: `COPY_GUIDELINES.md`, `CTA_STRATEGY.md`
  - Acceptance: tone, terminology, claims, CTA hierarchy, error messages, and prohibited language are documented.

- [ ] IA-007 — Resolve language scope `[P0]`
  - Depends on: IA-002
  - References: `LOCALIZATION.md`, `LOCALE_CONTENT_STRUCTURE.md`, `HREFLANG_CANONICAL.md`
  - Acceptance: Release 1 locales, default locale, RTL/LTR behavior, URL prefixing, fallback policy, canonical rules, and translation ownership are approved.

- [ ] IA-008 — Audit and prepare media assets `[P1]`
  - Depends on: GOV-002, IA-004
  - References: `MEDIA_GUIDELINES.md`, `IMAGE_OPTIMIZATION.md`
  - Acceptance: every required asset has a source, usage right, dimensions, alt-text intent, and optimized output requirement.

### Phase 1 Exit Criteria

- [ ] Sitemap, routes, page specifications, content model, and locale scope are approved.
- [ ] All Release 1 content gaps have an owner and due status.

## 8. Phase 2 — Technical and SEO Architecture

- [ ] ARC-001 — Confirm technical architecture `[P0]`
  - Depends on: IA-002, IA-007
  - References: `TECHNICAL_ARCHITECTURE.md`, `STACK.md`
  - Acceptance: rendering strategy, server/client boundaries, data sources, caching, deployment, and failure behavior are defined.

- [ ] ARC-002 — Define project folder structure `[P0]`
  - Depends on: ARC-001
  - References: `FOLDER_STRUCTURE.md`
  - Acceptance: routes, components, content, utilities, styles, tests, public assets, and configuration have explicit locations.

- [ ] ARC-003 — Define component architecture `[P0]`
  - Depends on: ARC-001, DES-003
  - References: `COMPONENT_ARCHITECTURE.md`, `UI_COMPONENTS.md`
  - Acceptance: component boundaries, variants, composition rules, server/client use, and reuse criteria are defined.

- [ ] ARC-004 — Define data and content architecture `[P1]`
  - Depends on: IA-005, ARC-001
  - References: `DATA_ARCHITECTURE.md`, `CONTENT_MODEL.md`, `CMS_ARCHITECTURE.md`
  - Acceptance: data schemas, validation, source ownership, update flow, and CMS decision are documented.

- [ ] ARC-005 — Define form and integration architecture `[P0]`
  - Depends on: ARC-001
  - References: `FORM_ARCHITECTURE.md`, `API_INTEGRATIONS.md`, `SECURITY_GUIDELINES.md`
  - Acceptance: RFQ/contact fields, validation, submission destination, spam controls, consent, error handling, and fallback route are approved.

- [ ] ARC-006 — Define environment variables and secret ownership `[P0]`
  - Depends on: ARC-005
  - References: `ENVIRONMENT_VARIABLES.md`
  - Acceptance: variable names, environments, required/optional status, safe defaults, owners, and rotation expectations are documented without secret values.

- [ ] SEO-001 — Approve SEO strategy and keyword map `[P0]`
  - Depends on: IA-002
  - References: `SEO_STRATEGY.md`, `SEO_KEYWORD_MAP.md`, `SEO_PAGE_MAP.md`
  - Acceptance: one primary search intent per indexable page, supporting terms, cannibalization controls, and non-indexable routes are defined.

- [ ] SEO-002 — Define metadata and structured data `[P0]`
  - Depends on: SEO-001, IA-004
  - References: `METADATA_SPEC.md`, `STRUCTURED_DATA.md`
  - Acceptance: unique title/description templates, OG fields, Organization schema, Breadcrumb schema, and page-specific schema rules are valid.

- [ ] SEO-003 — Define technical indexing controls `[P0]`
  - Depends on: IA-003, IA-007, SEO-001
  - References: `SITEMAP_ROBOTS_SPEC.md`, `HREFLANG_CANONICAL.md`, `REDIRECTS.md`
  - Acceptance: sitemap inclusion, robots directives, canonical, hreflang, x-default, redirects, and error-page behavior are specified.

- [ ] SEO-004 — Approve internal-linking architecture `[P1]`
  - Depends on: IA-002, SEO-001
  - References: `INTERNAL_LINKING.md`
  - Acceptance: hub/detail relationships, breadcrumbs, contextual links, anchor rules, and orphan-page prevention are documented.

### Phase 2 Exit Criteria

- [ ] G1 approved by Product, Design, SEO, and Technical owners.
- [ ] No integration or locale behavior remains ambiguous for Release 1.

## 9. Phase 3 — UX/UI Design System

- [ ] DES-001 — Approve visual direction `[P0]`
  - Depends on: GOV-002, IA-001
  - References: `DESIGN_DIRECTION.md`
  - Acceptance: mood, composition, imagery, density, shape language, and anti-patterns are approved.

- [ ] DES-002 — Implement design tokens `[P0]`
  - Depends on: DES-001
  - References: `DESIGN_SYSTEM.md`, `COLOR_SYSTEM.md`, `TYPOGRAPHY_SYSTEM.md`
  - Acceptance: color, type, spacing, radius, shadow, container, elevation, and motion tokens are defined without unexplained one-off values.

- [ ] DES-003 — Specify core UI components `[P0]`
  - Depends on: DES-002, IA-004
  - References: `UI_COMPONENTS.md`, `ACCESSIBILITY.md`
  - Acceptance: all component variants, states, interactions, responsive behavior, and accessibility requirements are documented.

- [ ] DES-004 — Specify responsive behavior `[P0]`
  - Depends on: DES-003
  - References: `RESPONSIVE_RULES.md`
  - Acceptance: content-driven breakpoints, reflow rules, touch targets, navigation changes, and media behavior are documented.

- [ ] DES-005 — Specify motion and interaction behavior `[P1]`
  - Depends on: DES-003
  - References: `MOTION_GUIDELINES.md`
  - Acceptance: durations, easing, triggers, reduced-motion fallbacks, and performance limits are documented.

- [ ] DES-006 — Review key page designs and content states `[P0]`
  - Depends on: DES-003, DES-004, IA-004
  - Acceptance: mobile and desktop designs cover normal, empty, loading, success, validation, error, and long-content states where applicable.

### Phase 3 Exit Criteria

- [ ] G2 approved by Project Owner.
- [ ] Components and key pages have sufficient detail for implementation without visual guessing.

## 10. Phase 4 — Foundation Implementation

- [ ] DEV-001 — Initialize repository and approved stack `[P0]`
  - Depends on: G1, G2
  - References: `STACK.md`, `FOLDER_STRUCTURE.md`, `CODING_STANDARDS.md`
  - Acceptance: app runs locally; TypeScript strict mode, linting, formatting, and approved package versions are configured.

- [ ] DEV-002 — Configure quality commands and CI checks `[P0]`
  - Depends on: DEV-001
  - References: `TESTING_STRATEGY.md`, `DEVELOPMENT_RULES.md`
  - Acceptance: install, lint, type-check, test, build, and formatting commands run consistently in local and CI environments.

- [ ] DEV-003 — Implement global tokens, fonts, and base styles `[P0]`
  - Depends on: DEV-001, DES-002
  - References: `DESIGN_SYSTEM.md`, `FONT_STRATEGY.md`
  - Acceptance: approved tokens and local/self-hosted font strategy are applied; no layout shift is introduced by font loading.

- [ ] DEV-004 — Implement root layout and direction handling `[P0]`
  - Depends on: DEV-003, IA-007
  - References: `LOCALIZATION.md`, `ACCESSIBILITY.md`
  - Acceptance: document language, direction, landmarks, skip link, viewport, and shared metadata behave correctly.

- [ ] DEV-005 — Implement header, navigation, and mobile menu `[P0]`
  - Depends on: DEV-004, DES-003
  - References: `HEADER_NAVIGATION_SPEC.md`, `RESPONSIVE_RULES.md`
  - Acceptance: keyboard operation, focus management, active state, mobile behavior, and escape/close behavior pass tests.

- [ ] DEV-006 — Implement footer `[P1]`
  - Depends on: DEV-004
  - References: `FOOTER_SPEC.md`
  - Acceptance: navigation, contact data, legal links, social links, and copyright rules match the approved content.

- [ ] DEV-007 — Implement reusable content and conversion components `[P0]`
  - Depends on: ARC-003, DEV-003
  - References: `UI_COMPONENTS.md`, `COMPONENT_ARCHITECTURE.md`
  - Acceptance: approved sections and controls are reusable, typed, accessible, responsive, and visually verified.

- [ ] DEV-008 — Configure image and media pipeline `[P1]`
  - Depends on: DEV-001, IA-008
  - References: `IMAGE_OPTIMIZATION.md`, `MEDIA_GUIDELINES.md`
  - Acceptance: responsive sizes, modern formats, dimensions, loading priority, quality, and alt-text behavior follow policy.

## 11. Phase 5 — Page and Feature Implementation

- [ ] PAGE-001 — Build homepage `[P0]`
  - Depends on: DEV-005, DEV-006, DEV-007
  - References: `HOMEPAGE_SPEC.md`, `PAGE_SPECIFICATIONS.md`
  - Acceptance: all approved sections, proof points, CTA hierarchy, metadata, and responsive states are implemented.

- [ ] PAGE-002 — Build service or procurement solution pages `[P0]`
  - Depends on: DEV-007, IA-004
  - Acceptance: each approved page communicates process, scope, benefits, controls, evidence, and the correct CTA.

- [ ] PAGE-003 — Build about and trust pages `[P1]`
  - Depends on: DEV-007, IA-004
  - Acceptance: company identity, positioning, operating model, and approved trust signals are accurate and traceable.

- [ ] PAGE-004 — Build contact page `[P0]`
  - Depends on: DEV-007, ARC-005
  - Acceptance: approved contact channels, form, validation, consent, response expectations, and fallback options work.

- [ ] PAGE-005 — Build RFQ journey `[P0]`
  - Depends on: ARC-005, DEV-007
  - Acceptance: required fields, optional fields, validation, file constraints if approved, submission, success, duplicate prevention, failure recovery, and analytics events work.

- [ ] PAGE-006 — Build legal and policy pages `[P0]`
  - Depends on: IA-004
  - Acceptance: approved privacy, terms, cookie, and form-consent text is published and linked from every required surface.

- [ ] PAGE-007 — Build not-found and error experiences `[P1]`
  - Depends on: DEV-004
  - Acceptance: 404 and error states are branded, accessible, helpful, and do not create indexable soft-404 pages.

- [ ] PAGE-008 — Implement locale variants if approved for Release 1 `[P1]`
  - Depends on: IA-007, PAGE-001 through PAGE-007
  - Acceptance: translations are human-approved; layout direction, localized metadata, canonical, and hreflang pass QA.

## 12. Phase 6 — SEO, Analytics, Performance, and Security

- [ ] SYS-001 — Implement metadata and social sharing `[P0]`
  - Depends on: PAGE-001 through PAGE-007, SEO-002
  - Acceptance: unique titles, descriptions, canonical URLs, OG/Twitter fields, and share images are correct on all indexable pages.

- [ ] SYS-002 — Implement structured data `[P0]`
  - Depends on: SYS-001
  - Acceptance: approved JSON-LD is valid, matches visible content, uses canonical URLs, and contains no unsupported claims.

- [ ] SYS-003 — Implement sitemap, robots, redirects, and status behavior `[P0]`
  - Depends on: SEO-003
  - Acceptance: only canonical indexable URLs appear in the sitemap; robots and redirect chains pass automated checks.

- [ ] SYS-004 — Implement internal linking and breadcrumbs `[P1]`
  - Depends on: PAGE-001 through PAGE-007, SEO-004
  - Acceptance: hierarchy is visible, anchors are descriptive, and no intended indexable page is orphaned.

- [ ] SYS-005 — Implement analytics and conversion tracking `[P0]`
  - Depends on: PAGE-001, PAGE-004, PAGE-005
  - References: `ANALYTICS_TRACKING.md`
  - Acceptance: page views, CTA clicks, contact actions, RFQ starts, validation failures, successful submissions, and approved campaign parameters are testable without duplicate firing.

- [ ] SYS-006 — Implement privacy and consent behavior `[P0]`
  - Depends on: SYS-005, PAGE-006
  - Acceptance: non-essential tracking respects the approved consent model and privacy copy.

- [ ] SYS-007 — Apply performance strategy `[P0]`
  - Depends on: DEV-008, all P0 pages
  - References: `PERFORMANCE_GUIDELINES.md`, `CACHING_STRATEGY.md`, `FONT_STRATEGY.md`
  - Acceptance: page budgets and Core Web Vitals targets pass on representative mobile and desktop routes.

- [ ] SYS-008 — Apply application security controls `[P0]`
  - Depends on: ARC-005, PAGE-005
  - References: `SECURITY_GUIDELINES.md`
  - Acceptance: input validation, rate limiting/spam controls, safe error handling, secure headers, dependency checks, secret handling, and third-party script review pass.

## 13. Phase 7 — Testing and Release Candidate

- [ ] QA-001 — Complete automated test suite `[P0]`
  - Depends on: G3 candidate
  - References: `TESTING_STRATEGY.md`
  - Acceptance: required unit, integration, end-to-end, and smoke tests pass in CI.

- [ ] QA-002 — Complete functional QA `[P0]`
  - Depends on: QA-001
  - References: `QA_CHECKLIST.md`
  - Acceptance: routes, links, forms, states, navigation, content, and error handling pass on the release candidate.

- [ ] QA-003 — Complete responsive and browser QA `[P0]`
  - Depends on: QA-002
  - References: `RESPONSIVE_QA.md`
  - Acceptance: approved browser/device matrix passes with no horizontal overflow, clipping, overlap, or unusable controls.

- [ ] QA-004 — Complete accessibility QA `[P0]`
  - Depends on: QA-002
  - References: `ACCESSIBILITY_QA.md`, `ACCESSIBILITY.md`
  - Acceptance: keyboard, focus, semantics, names, contrast, zoom, screen-reader smoke tests, motion preferences, and automated checks pass the stated conformance target.

- [ ] QA-005 — Complete SEO QA `[P0]`
  - Depends on: SYS-001 through SYS-004
  - References: `SEO_QA_CHECKLIST.md`
  - Acceptance: indexability, status codes, metadata, canonical, hreflang if applicable, structured data, internal links, sitemap, and robots pass.

- [ ] QA-006 — Complete performance QA `[P0]`
  - Depends on: SYS-007
  - Acceptance: representative pages meet documented mobile and desktop budgets with production-equivalent settings.

- [ ] QA-007 — Complete security and privacy review `[P0]`
  - Depends on: SYS-006, SYS-008
  - Acceptance: no exposed secrets, unsafe input path, unapproved tracker, sensitive log data, or unresolved critical/high dependency issue remains.

- [ ] QA-008 — Perform content and stakeholder sign-off `[P0]`
  - Depends on: QA-002 through QA-007
  - Acceptance: Project Owner approves copy, visuals, contact data, legal text, forms, and release candidate.

- [ ] QA-009 — Complete pre-deploy checklist `[P0]`
  - Depends on: QA-008
  - References: `PRE_DEPLOY_CHECKLIST.md`
  - Acceptance: every required item is checked, assigned, or explicitly waived by the Project Owner.

### Phase 7 Exit Criteria

- [ ] G3 and G4 approved.
- [ ] No open P0 or P1 defect remains unless documented and explicitly accepted.

## 14. Phase 8 — Deployment and Production Verification

- [ ] REL-001 — Configure production project and environment `[P0]`
  - Depends on: QA-009
  - References: `DEPLOYMENT_ARCHITECTURE.md`, `ENVIRONMENT_VARIABLES.md`
  - Acceptance: production variables, build settings, deployment protection, and rollback path are verified.

- [ ] REL-002 — Configure `ahanassa.com` on Cloudflare and Vercel `[P0]`
  - Depends on: REL-001
  - Acceptance: DNS, SSL, apex/www policy, proxy behavior, and canonical host work without redirect loops or unnecessary chains.

- [ ] REL-003 — Deploy the approved release candidate `[P0]`
  - Depends on: REL-002
  - Acceptance: deployed commit matches the approved release and production build completes successfully.

- [ ] REL-004 — Run production smoke tests `[P0]`
  - Depends on: REL-003
  - Acceptance: representative routes, navigation, assets, forms, analytics, consent, metadata, structured data, sitemap, robots, and status codes work on the live domain.

- [ ] REL-005 — Verify search platform setup `[P1]`
  - Depends on: REL-004
  - Acceptance: site ownership is verified, sitemap is submitted, and initial indexing inspection is recorded.

- [ ] REL-006 — Run post-deploy checklist `[P0]`
  - Depends on: REL-004
  - References: `POST_DEPLOY_CHECKLIST.md`
  - Acceptance: all critical live checks pass and any production defect has an owner and severity.

- [ ] REL-007 — Confirm rollback and incident contacts `[P0]`
  - Depends on: REL-003
  - Acceptance: last known good deployment, rollback procedure, escalation path, and responsible contacts are confirmed.

### Phase 8 Exit Criteria

- [ ] G5 approved.
- [ ] Production is stable and no critical defect remains.

## 15. Phase 9 — Post-Launch Optimization

- [ ] OPT-001 — Review first 72 hours of production health `[P1]`
  - Depends on: G5
  - Acceptance: availability, form delivery, analytics, errors, performance, and crawl behavior are reviewed.

- [ ] OPT-002 — Review first 30 days of acquisition and conversion data `[P2]`
  - Depends on: SYS-005
  - Acceptance: traffic quality, CTA engagement, RFQ funnel, top landing pages, and data gaps are summarized with recommended actions.

- [ ] OPT-003 — Validate indexing and organic search baseline `[P2]`
  - Depends on: REL-005
  - Acceptance: indexed pages, exclusions, crawl issues, queries, and page-level opportunities are recorded without premature ranking conclusions.

- [ ] OPT-004 — Prioritize optimization backlog `[P2]`
  - Depends on: OPT-001, OPT-002, OPT-003
  - Acceptance: improvements are ranked by evidence, business impact, confidence, effort, and risk.

- [ ] OPT-005 — Schedule dependency and security maintenance `[P1]`
  - Depends on: G5
  - Acceptance: update cadence, ownership, test requirements, and emergency patch procedure are established.

---

## 16. Active Sprint

> Keep only the tasks currently committed for execution in this section. Every item must also exist in the main backlog.

### Sprint Goal

`TBD — Define one measurable outcome.`

### Committed Tasks

- [ ] `TBD`

### Sprint Risks or Blockers

- None recorded.

## 17. Open Decisions

| ID | Decision needed | Owner | Due | Blocks |
|---|---|---|---|---|
| OD-001 | Confirm Release 1 sitemap and page count | Project Owner | TBD | IA-002 |
| OD-002 | Confirm Release 1 locale scope | Project Owner | TBD | IA-007 |
| OD-003 | Confirm RFQ submission destination and fallback | Project Owner / Technical Lead | TBD | ARC-005 |
| OD-004 | Confirm analytics platform, container IDs, and consent model | Project Owner | TBD | SYS-005, SYS-006 |
| OD-005 | Confirm CMS requirement for Release 1 | Project Owner / Technical Lead | TBD | ARC-004 |
| OD-006 | Confirm legal copy owner and approval process | Project Owner | TBD | PAGE-006 |

## 18. Risk Register

| ID | Risk | Probability | Impact | Mitigation | Owner |
|---|---|---:|---:|---|---|
| R-001 | Content or media arrives late | Medium | High | Track each asset with owner and due date; use approved placeholders only in non-production previews | Project Owner |
| R-002 | Scope expands during implementation | High | High | Add new requests to backlog and require release-impact approval | Project Owner |
| R-003 | RFQ integration is unavailable or unreliable | Medium | High | Implement monitored fallback and preserve user input where safe | Technical Lead |
| R-004 | RTL defects appear late | Medium | High | Test representative components in RTL from the foundation phase | Design / QA |
| R-005 | Heavy media harms mobile performance | Medium | High | Enforce media budgets, responsive sources, and loading rules before page integration | Technical Lead |
| R-006 | SEO rules conflict across documents | Low | High | Treat approved route, canonical, and locale specifications as release blockers | SEO / Technical Lead |
| R-007 | Unapproved third-party scripts affect privacy or speed | Medium | High | Require documented owner, purpose, consent behavior, and performance review | Project Owner / Technical Lead |

## 19. Backlog Intake

Use this section for new work that has not yet been prioritized or assigned to a release.

| ID | Request | Source | Business value | Effort | Priority | Target release |
|---|---|---|---|---|---|---|
| BL-001 | TBD | TBD | TBD | TBD | TBD | TBD |

### Intake Rules

- Give every request a unique ID.
- State the user or business problem, not only the proposed solution.
- Record acceptance criteria before moving the item into an active sprint.
- Identify dependencies, privacy/security impact, SEO impact, and analytics needs.
- Split work that cannot be completed and verified within one delivery cycle.
- Do not treat verbal approval as implementation-ready when specifications remain ambiguous.

## 20. Bug Triage

| Severity | Definition | Target response |
|---|---|---|
| Critical | Site unavailable, security/privacy incident, data loss, or all lead submissions fail | Immediate investigation and release/rollback decision |
| High | Core journey broken, major accessibility barrier, severe SEO/indexing fault, or common-device failure | Fix before release; expedite after launch |
| Medium | Important defect with a reasonable workaround | Schedule in the nearest appropriate sprint |
| Low | Cosmetic or minor usability issue | Add to optimization backlog |

Every bug must include:

- Environment and affected URL.
- Browser/device where relevant.
- Exact reproduction steps.
- Expected and actual behavior.
- Screenshot, recording, console output, or request evidence where useful.
- Severity, owner, regression-test requirement, and related task ID.

## 21. Definition of Ready

A task is ready only when:

- Its purpose and business value are clear.
- Scope and exclusions are explicit.
- Dependencies are complete or scheduled.
- Required content, assets, and decisions are available.
- Relevant specification files are approved.
- Acceptance criteria are objective and testable.
- Security, privacy, accessibility, localization, SEO, analytics, and performance impacts are considered.

## 22. Definition of Done

A task is done only when:

- Implementation matches the approved specification.
- No protected file or area was changed without approval.
- Code is typed, readable, and follows project standards.
- Lint, type-check, relevant tests, and production build pass.
- Responsive, RTL/LTR, keyboard, focus, and reduced-motion behavior are verified where applicable.
- Loading, empty, validation, success, and error states are handled where applicable.
- Metadata, analytics, SEO, privacy, security, and performance impacts are validated.
- No secrets, debug output, dead code, temporary copy, or unapproved placeholder assets remain.
- Documentation, `CHANGELOG.md`, and `DECISIONS.md` are updated when required.
- The completion report lists files changed, checks run, results, known limitations, and follow-up work.

## 23. Claude Code Execution Protocol

Before starting any task, Claude Code must:

1. Read `CLAUDE.md` and `DO_NOT_CHANGE.md`.
2. Read the task's referenced specification files.
3. Inspect the current repository state and existing implementation.
4. Confirm the task is ready and not blocked by a `TBD` decision.
5. State the intended files and validation plan.

During implementation, Claude Code must:

1. Keep changes limited to the selected task.
2. Reuse approved tokens, utilities, components, and patterns.
3. Avoid adding packages unless the task requires them and the architecture permits them.
4. Preserve unrelated user changes and never perform destructive Git operations without explicit approval.
5. Add or update tests for changed behavior.
6. Add newly discovered work to the backlog instead of hiding it inside the current change.

After implementation, Claude Code must:

1. Run all task-relevant checks.
2. Review the diff for unintended changes.
3. Verify every acceptance criterion.
4. Update task status and supporting documentation.
5. Report changed files, commands run, results, risks, limitations, and recommended next task.

## 24. Release Approval Record

| Gate | Status | Approved by | Date | Notes |
|---|---|---|---|---|
| G0 — Discovery | Pending | — | — | — |
| G1 — Architecture | Pending | — | — | — |
| G2 — Design | Pending | — | — | — |
| G3 — Build complete | Pending | — | — | — |
| G4 — Release candidate | Pending | — | — | — |
| G5 — Production verified | Pending | — | — | — |

