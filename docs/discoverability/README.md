# `docs/discoverability/` — AI Search / GEO / Discoverability governance

Index only. Each document below owns its own subject; this file describes what
lives where and never restates their content.

Established 2026-09-08 by the GEO-G0 foundation gate. This directory is the
canonical home for search, AI-search, crawler, and discoverability governance in
this repository. It did not exist before that date.

---

## FROZEN AUTHORITIES

| Document | Owns |
|---|---|
| [`AHANASSA_AI_SEARCH_GEO_DISCOVERABILITY_ARCHITECTURE_GATE_V1.1.md`](./AHANASSA_AI_SEARCH_GEO_DISCOVERABILITY_ARCHITECTURE_GATE_V1.1.md) | The frozen V1.1 hardening addendum: crawler governance model and purpose classes, no-UA-only-trust, robots-vs-WAF separation, numeric CWV gates, faceted-navigation crawl control, image discoverability, E-E-A-T / Who-How-Why, agent-facing content safety, registry review cadence, mobile-first parity, acceptance matrix. Imported byte-for-byte; do not edit. |

V1.1 **extends** V1.0 rather than replacing it (V1.1 §1: "The existing V1.0
principles remain authoritative unless explicitly refined here"). V1.0 was read in
full as source material during GEO-G0 but, per that task's explicit scope, was not
separately versioned into this repository — it exists only as a Downloads-folder
source document. Where this directory cites a V1.0 section, the citation is to
that external source.

---

## MAINTAINABLE REGISTRIES

| Document | Owns |
|---|---|
| [`CRAWLER_POLICY_REGISTRY.md`](./CRAWLER_POLICY_REGISTRY.md) | The living per-vendor crawler token inventory — provider, token, purpose class, public-access direction, training policy, robots behavior, identity verification, WAF status, implementation status, verification dates. Updated on the quarterly/event-driven cadence V1.1 §13 defines. Policy classes are frozen upstream; only the inventory is maintainable here. |

---

## POLICY DOCUMENTS

| Document | Owns |
|---|---|
| [`FACETED_NAVIGATION_URL_POLICY.md`](./FACETED_NAVIGATION_URL_POLICY.md) | Crawl / canonical / index / internal-link policy for catalog filter, sort, view, and tracking URL states, and the approval bar a facet must clear to become a real indexable landing page. Authored because V1.1 §19 explicitly delegates it. |
| [`AGENT_FACING_CONTENT_SECURITY_POLICY.md`](./AGENT_FACING_CONTENT_SECURITY_POLICY.md) | The prohibition on hidden agent instructions, machine-only content layers, and cloaking; the boundary between legitimate accessibility markup and agent manipulation; untrusted/third-party content handling; a pre-publication review checklist. |

### Concerns deliberately **not** duplicated here

These V1.1 subjects are already owned by existing repository authorities. No
parallel document was created for them, to avoid a duplicate authority tree.

| Concern | Existing owner |
|---|---|
| Core Web Vitals thresholds, p75 basis, mobile/desktop separation, lab-vs-field authority, regression policy | `01-sources/PERFORMANCE_GUIDELINES.md` §3, §56, §58 — already numerically identical to V1.1 §15–§17 |
| Image alt-text decisions, decorative `alt=""`, no keyword stuffing, remote-image/hotlinking constraints, dimensions and responsive derivatives, image-sitemap conditionality | `01-sources/IMAGE_OPTIMIZATION.md` §19.2, §23.1 and `01-sources/MEDIA_GUIDELINES.md` §13, read together with V1.1 §24–§28 |
| Authorship / reviewer governance, claim classes and evidence states, AI-assisted content responsibility, prohibition on fabricated operational content | `01-sources/CONTENT_STRATEGY.md` §14.2, §15, §16, §19.1, §21, read together with V1.1 §29–§33 |
| Mobile / desktop primary-content, metadata, and structured-data parity | `01-sources/SEO_STRATEGY.md` §13, read together with V1.1 §39–§43 |
| Sitemap, robots, canonical, hreflang specification | `01-sources/SITEMAP_ROBOTS_SPEC.md`, `01-sources/HREFLANG_CANONICAL.md`, `01-sources/METADATA_SPEC.md` |
| Catalog route, slug, filter implementation and sitemap boundary | `docs/CATALOG_PUBLIC_ROUTES.md` |

---

## PRE-STAGING ARTIFACTS

None yet. The pre-staging work items identified by the GEO-G0 audit are listed in
the audit report's `# PRE-STAGING ITEMS` section; the artifacts themselves
(production robots policy, crawler smoke test, WAF verified-bot design, metadata
and structured-data regression tests, lab CWV baseline) are later, separately
approved tasks. Do not create placeholder files for them.

---

## PRODUCTION OPERATIONS

None yet. Production observability — crawler-access logging, Search Console and
Bing Webmaster Tools, field CWV p75, AI/search referral reporting — requires real
production evidence and is out of scope for a documentation phase. Tracked in the
audit report's `# PRODUCTION / POST-LAUNCH ITEMS` section.

---

## AUDIT RECORDS

| Document | Owns |
|---|---|
| [`AI_SEARCH_GEO_G0_FOUNDATION_AUDIT_REPORT.md`](./AI_SEARCH_GEO_G0_FOUNDATION_AUDIT_REPORT.md) | The GEO-G0 read-only site-wide audit against V1.1: current implementation map, compliance matrix, owner decisions required, phasing, and the runtime-change decision. Point-in-time record — not a living policy. |
