# AHAN ASA — AI SEARCH / GEO / DISCOVERABILITY ARCHITECTURE GATE
## V1.1 HARDENING ADDENDUM

**Project:** Ahan Asa / آهن آسا  
**Scope:** Website-wide Search, AI Search, GEO/AEO discoverability, crawler governance, catalog crawl control, page experience, image discoverability, content trust, agent-facing security  
**Status:** FROZEN ADDENDUM  
**Version:** 1.1  
**Date:** 2026-09-08  
**Extends:** `AHANASSA_AI_SEARCH_GEO_DISCOVERABILITY_ARCHITECTURE_GATE_V1.0.md`

---

# 1. Purpose

Version 1.1 hardens the existing V1.0 architecture without reopening previously frozen Homepage component specifications.

This addendum introduces explicit gates for:

1. crawler governance registry;
2. measurable Core Web Vitals;
3. faceted-navigation crawl control;
4. image discoverability;
5. E-E-A-T / Who-How-Why content governance;
6. agent-facing prompt-injection safety;
7. scheduled and event-driven crawler-policy review;
8. mobile-first content parity.

The existing V1.0 principles remain authoritative unless explicitly refined here.

---

# 2. Frozen Principle

```text
Search / AI discoverability
must improve
without creating:

- duplicate truth;
- duplicate pages;
- crawler chaos;
- unsafe hidden instructions;
- fake authority;
- mobile content loss;
- index bloat;
- performance regression.
```

---

# 3. Crawler Governance Model

Crawler governance must classify bots by **purpose**, not merely by vendor.

Frozen conceptual classes:

```text
A. Search / discovery crawlers
B. User-directed retrieval agents
C. Training / model-improvement controls
D. Unknown / unverified / abusive automation
```

Different classes may receive different policies.

---

# 4. Core Verified Crawler Registry — 2026 Baseline

## 4.1 Search / Discovery

| Token / Agent | Provider | Purpose | Default Public-Page Direction |
|---|---|---|---|
| `Googlebot` | Google | Search crawl/index | Allow intended public indexable pages |
| `Bingbot` | Microsoft | Bing crawl/index | Allow intended public indexable pages |
| `OAI-SearchBot` | OpenAI | ChatGPT Search discovery | Allow intended public indexable pages |
| `Claude-SearchBot` | Anthropic | Claude search relevance/indexing | Allow intended public indexable pages |
| `PerplexityBot` | Perplexity | Perplexity search/indexing | Allow intended public indexable pages |
| `Applebot` | Apple | Apple search/discovery | Allow intended public indexable pages |

This table is not assumed to remain complete forever.

---

# 5. User-Directed Retrieval Agents

Some agents fetch content in response to a user request rather than operating purely as conventional search crawlers.

Current examples include:

| Token / Agent | Provider | Current Role | Policy Direction |
|---|---|---|---|
| `Claude-User` | Anthropic | User-directed retrieval | Allow public pages if retrieval is desired |
| `Perplexity-User` | Perplexity | User-request retrieval | Govern separately from index crawler policy |

Frozen rule:

> **User-directed fetchers are not automatically equivalent to search crawlers or training crawlers.**

Their behavior and documented control mechanisms must be reviewed independently.

---

# 6. Training / Model-Use Controls

Training/model-use policies are governed independently from normal search indexing.

Current examples:

| Token / Product Control | Provider | Current Documented Role | Governance |
|---|---|---|---|
| `GPTBot` | OpenAI | Training-related crawler policy | Separate explicit allow/block decision |
| `ClaudeBot` | Anthropic | Potential model-training content collection | Separate explicit allow/block decision |
| `Google-Extended` | Google | Controls use of Google-crawled content for future Gemini training and certain grounding use | Separate explicit policy |
| `Applebot-Extended` | Apple | Controls use of Applebot-crawled content for Apple foundation-model training | Separate explicit policy |

Important:

- `Google-Extended` is a robots product token, not a separate HTTP crawler user-agent.
- blocking `Google-Extended` does not remove the site from Google Search;
- `Applebot-Extended` controls downstream use policy and does not itself crawl pages.

Frozen rule:

```text
Search visibility decision
≠
training/model-use decision
```

---

# 7. Additional / Emerging Crawlers

Additional crawler identities may include:

- Common Crawl / `CCBot`;
- Meta crawler families;
- ByteDance crawler families;
- future AI search agents;
- future browser agents;
- new model-specific crawlers.

V1.1 does NOT freeze behavioral assumptions for these without current vendor documentation.

They belong in the maintained crawler registry and are classified after verification.

---

# 8. No User-Agent-Only Trust

HTTP User-Agent strings are not sufficient proof of crawler identity.

Where a provider publishes verifiable bot IP/range or reverse-DNS mechanisms, infrastructure should use those mechanisms where operationally practical.

Frozen WAF principle:

```text
claimed crawler identity
+
provider-supported verification
+
intended policy
=
allow/block decision
```

Not:

```text
User-Agent says "Googlebot"
→ automatically trusted
```

---

# 9. robots.txt vs WAF Enforcement

`robots.txt` is crawler policy, not a security boundary.

Cloudflare/WAF remains responsible for:

- abusive automation;
- spoofed crawler identities;
- rate abuse;
- scraping that does not follow voluntary crawler rules;
- challenge/deny policy;
- private-resource protection.

Do not rely on `robots.txt` to protect sensitive data.

---

# 10. Perplexity Current Policy Clarification

The project must not freeze outdated claims that `PerplexityBot` currently ignores robots.txt.

Perplexity’s current 2026 documentation states:

```text
PerplexityBot
→ follows robots.txt
```

Historical user-directed URL behavior should not be treated as the current crawler rule.

`Perplexity-User` remains separately governed as a user-directed retrieval mechanism.

---

# 11. Anthropic Current Bot Separation

Anthropic currently documents three separate bot roles:

```text
ClaudeBot
→ model-development / training-related collection

Claude-SearchBot
→ search indexing / relevance

Claude-User
→ user-directed retrieval
```

A single blanket Claude rule is therefore insufficient for deliberate governance.

---

# 12. Crawler Registry Ownership

The crawler matrix is a **living operational registry** governed under a frozen policy.

The policy is frozen. The vendor-token inventory is maintainable.

Conceptually:

```text
Frozen policy
+
versioned crawler registry
=
durable governance
```

A vendor bot-token rename does not require a full architecture-version bump when the policy class remains unchanged.

Material policy changes still require a new architecture version.

---

# 13. Crawler Review Cadence

Crawler policy must be reviewed:

```text
at least quarterly
```

and additionally when:

- a major provider publishes a crawler change;
- a new major AI/search platform becomes relevant;
- Cloudflare bot traffic reveals new significant agents;
- search/referral analytics show a meaningful new source;
- security incidents expose crawler-policy gaps.

No unsupported claim such as “new crawlers appear every 2–4 months” is required.

---

# 14. Crawler Change Log

Maintain a lightweight versioned registry containing:

- provider;
- token/user agent;
- role;
- official documentation source;
- last verification date;
- robots behavior;
- verification mechanism;
- Ahan Asa policy;
- implementation status.

Example fields:

```text
provider
agent_token
purpose_class
allow_public
allow_training
verified_source
verified_at
waf_rule_status
notes
```

---

# 15. Core Web Vitals — Numeric Release Gate

The qualitative “healthy CWV” requirement in V1.0 is upgraded to measurable thresholds.

Good field-performance thresholds:

```text
LCP <= 2.5 seconds
INP <= 200 milliseconds
CLS <= 0.1
```

Measurement basis:

```text
75th percentile (p75)
```

Evaluate mobile and desktop separately.

---

# 16. CWV Field vs Lab Governance

## 16.1 Production authority

Where sufficient real-user data exists:

```text
field data
→ authoritative
```

## 16.2 Pre-launch / low-traffic phase

Where sufficient field data does not yet exist:

```text
lab testing
→ release proxy
```

Lab results do not become a permanent substitute for field performance.

---

# 17. CWV Regression Gate

A deployment that materially regresses LCP, INP, or CLS must be investigated before release or accepted explicitly as a documented tradeoff.

SEO/GEO enhancements may not silently worsen page experience.

Examples of prohibited causes:

- heavy client-side schema libraries;
- giant analytics bundles;
- unnecessary AI-search widgets;
- image-loading regressions;
- hydration-heavy decorative interactions.

---

# 18. Faceted Navigation — Product Catalog Gate

The Ahan Asa product architecture is expected to support technical dimensions such as:

- family;
- grade;
- standard;
- size;
- diameter;
- thickness;
- section dimensions;
- other catalog attributes.

These filters can create extremely large URL spaces.

Frozen rule:

> **A filter state is NOT an indexable SEO landing page by default.**

---

# 19. Faceted URL Default Policy

Default filter/sort states must not automatically generate new indexable identities.

Example:

```text
/products/rebar?grade=AJ400&size=16
```

must not become an indexable landing page merely because a user can select those filters.

The catalog team must define:

- crawl policy;
- canonical policy;
- index policy;
- internal-link policy;

for faceted states.

---

# 20. Indexable Facet Landing Pages

A faceted/attribute combination becomes a deliberate indexable landing page only if it has:

1. meaningful search/buyer intent;
2. stable canonical URL;
3. unique useful visible content;
4. durable commercial/catalog relevance;
5. intentional internal links;
6. sitemap eligibility;
7. no dependency on ephemeral filter state.

Conceptually:

```text
approved landing page
≠
raw filter URL
```

---

# 21. Canonical Strategy for Facets

Canonical is not a universal substitute for controlling crawl explosion.

Architecture must decide, per filter class:

- whether URL exists;
- whether it is crawlable;
- whether it is indexable;
- what canonical it uses;
- whether bots should discover links to it.

Do not generate millions of crawlable filter URLs and rely solely on canonical tags to clean them up later.

---

# 22. Sort / View / Tracking Parameters

Parameters that alter only:

- sort order;
- view mode;
- UI presentation;
- analytics/tracking;

must not create new canonical content identities.

Examples:

```text
?sort=price
?view=grid
?utm_source=...
```

These remain subordinate to the canonical content URL.

---

# 23. Product Projection and Facets

Indexable catalog logic must remain downstream from the Public Product Projection.

Do not create an SEO-only product taxonomy that diverges from Odoo/public commercial truth.

Frozen model:

```text
Odoo Product Master
↓
Public Product Projection
↓
Catalog / approved landing-page policy
↓
Indexable URLs
```

---

# 24. Image Discoverability Gate

Image discoverability is part of search architecture, especially for product/category content.

The project does NOT require blanket `ImageObject` schema for every image.

Preferred baseline:

```text
meaningful visible image
+
crawlable stable URL
+
correct HTML image markup
+
useful alt text
+
relevant surrounding text
+
responsive derivatives
+
optional image sitemap where beneficial
```

---

# 25. Product Image Rules

Meaningful product images should:

- use stable public/CDN URLs;
- not hotlink live Odoo;
- use standard crawlable `<img>` / `<picture>` patterns;
- have descriptive alt text when the image conveys product meaning;
- have explicit dimensions/aspect ratio;
- load responsively;
- remain contextually close to the represented product/family.

This aligns with the frozen Product Showcase image-ingestion architecture.

---

# 26. Decorative Image Rules

Decorative/redundant images must not receive keyword-stuffed alt text merely for SEO/GEO.

Example:

```html
alt=""
```

remains correct for decorative Hero imagery when the image adds no additional user-facing information.

Accessibility remains authoritative.

---

# 27. Image Sitemap

Image sitemap support may be introduced where it materially improves discovery of important crawlable product/editorial images.

It is not a blanket launch requirement for every asset.

If CDN-hosted images are included, ownership/monitoring should be configured appropriately in search tooling where supported.

---

# 28. Image Filename / Context

Descriptive filenames are useful where practical, but must not become a fragile localization or asset-governance burden.

Higher-priority signals remain:

- alt text;
- surrounding content;
- correct product mapping;
- crawlability;
- image quality;
- stable URLs.

No keyword stuffing.

---

# 29. E-E-A-T Governance

Ahan Asa adopts E-E-A-T as a **content-quality/trust evaluation framework**, not as a single ranking factor.

Frozen interpretation:

```text
Experience
Expertise
Authoritativeness
Trust
```

Trust is the primary governance concern.

---

# 30. Who / How / Why Framework

For substantive informational content, review:

## Who
Who created or reviewed the content?

## How
How was the information produced, sourced, checked, measured, or calculated?

## Why
Was the content created primarily to help a buyer/user rather than manipulate rankings?

---

# 31. Authorship Policy

Accurate bylines/reviewer identity should be used where readers reasonably expect expertise.

Examples where authorship/review may be valuable:

- technical buying guides;
- steel standards explanations;
- weight/calculation articles;
- processing-method comparisons;
- market analysis;
- project/case-study content.

Not every Homepage component needs an author byline.

Do not add fake “expert author” identities for SEO.

---

# 32. Reviewer / Expertise Evidence

Where a page makes technical or commercial educational claims, the site may expose:

- author role;
- reviewer role;
- relevant professional background;
- source/provenance references;
- methodology notes;

when real and helpful.

Do not expose unnecessary personal information.

---

# 33. AI-Assisted Content Transparency

If AI assists drafting or production:

- factual responsibility remains with Ahan Asa;
- technical claims must be checked;
- authorship must not falsely attribute machine-written material to a person who did not review it;
- content must still satisfy Who/How/Why.

AI use is not itself a quality signal or disqualifier.

---

# 34. Agent-Facing Content Security Gate

Public pages can be consumed not only by humans and search crawlers, but also by AI agents capable of reading and acting on web content.

Prompt injection is a real agent-security risk.

Ahan Asa must not intentionally publish content designed to manipulate third-party agents beyond normal user-visible meaning.

---

# 35. Hidden Agent Instructions — Forbidden

Not approved:

- hidden “ignore previous instructions” text;
- invisible instructions for ChatGPT/Claude/Copilot;
- machine-only prompts;
- CSS-hidden agent directives;
- malicious instructions embedded in metadata;
- content designed to trigger unrelated actions by agents.

This is distinct from normal SEO text.

---

# 36. Third-Party / User-Generated Content

Any future publicly rendered:

- reviews;
- comments;
- uploaded text;
- supplier descriptions;
- imported external content;
- rich HTML;

must be treated as untrusted input.

Controls may include:

- sanitization;
- allowlisted markup;
- output escaping;
- moderation;
- removal of active/invisible markup;
- validation of external links/embeds.

---

# 37. Agent Security Scope Boundary

Ahan Asa cannot guarantee the security of external AI agents.

Its responsibility is to avoid becoming an intentional or preventable source of malicious instructions and to sanitize untrusted content it publishes.

Prompt-injection defense for Ahan Asa’s **own future agents** belongs to a separate application/security architecture.

---

# 38. External Embeds

Third-party embeds must be reviewed for:

- hidden content;
- script behavior;
- privacy;
- unexpected redirects;
- accessibility;
- performance;
- agent-facing manipulation risks.

Do not embed arbitrary supplier HTML into public pages.

---

# 39. Mobile-First Indexing Gate

Google indexes/ranks using mobile content.

Therefore the primary informational content of mobile and desktop versions must remain equivalent.

Frozen rule:

```text
same meaning
+
same primary content
+
same important structured data
+
same important images
```

Layout may differ.

---

# 40. Mobile / Desktop Content Parity

Mobile must not silently omit:

- primary headings;
- product family names;
- substantive product/service information;
- Evaluation / Process content;
- important internal links;
- meaningful images;
- structured data required for the page;
- metadata relationships.

Responsive re-layout is allowed. Content loss is not.

---

# 41. Mobile Hidden Content

Accordion/tabs may be used where approved by component architecture, provided the content:

- exists in the DOM;
- remains accessible;
- is not loaded only after interaction;
- remains semantically equivalent to desktop.

Do not make mobile SEO content conditional on user tap merely to save initial payload.

---

# 42. Mobile Image Parity

Important mobile images should maintain:

- equivalent meaning;
- appropriate alt text;
- sufficiently high quality;
- crawlable URLs.

A different crop/derivative is allowed where it represents the same content and improves mobile usability.

---

# 43. Mobile Metadata / Structured Data

Mobile and desktop rendering must not diverge in:

- canonical;
- hreflang;
- primary structured data;
- page title;
- meta description;
- indexability directives;

for the same canonical page.

---

# 44. Search / Agent-Friendly HTML Without Agent-Only Content

Ahan Asa should remain easy for machine systems to understand through:

- semantic HTML;
- clear headings;
- explicit links;
- stable URLs;
- concise factual copy;
- structured data where appropriate.

It must not publish a second machine-only content layer.

Frozen rule:

```text
same public truth
→ humans
→ search engines
→ AI retrieval systems
```

---

# 45. Observability Addendum

Infrastructure monitoring should log/measure enough data to determine:

- crawler identity claim;
- status code;
- WAF action;
- rate-limit event;
- requested path;
- cache/origin behavior.

Where crawler identity verification is supported, verification outcome should also be observable.

---

# 46. Bing / Microsoft Discovery

Because Bingbot maintains the Bing search index and Microsoft Copilot web search may use Bing search services, intended public pages should not accidentally block Bingbot.

Bing Webmaster Tools may be added to the observability stack alongside Google Search Console.

IndexNow may be evaluated later if it materially improves timely discovery without unnecessary architecture complexity.

---

# 47. Noindex and Crawl Are Separate

Do not confuse:

```text
noindex
```

with:

```text
security
```

or:

```text
crawler blocking
```

Private data remains protected by authentication/authorization.

Search directives only govern search behavior.

---

# 48. Registry Review Checklist

Quarterly/event-driven review should ask:

1. Are current bot tokens still valid?
2. Has vendor purpose changed?
3. Has robots behavior changed?
4. Has provider added a new retrieval/search/training agent?
5. Are crawler IP verification mechanisms current?
6. Has Cloudflare changed bot classification?
7. Are legitimate bots receiving 403/429/challenges?
8. Are newly relevant sources driving qualified traffic?
9. Do training-policy decisions still match business policy?
10. Are registry docs dated and source-linked?

---

# 49. V1.1 Release Gate Additions

In addition to V1.0 release validation, PASS now also requires:

1. Core crawler registry documented and recently verified.
2. Search vs user-retrieval vs training/model-use roles separated.
3. No User-Agent-only trust for WAF allowlisting where verification is available.
4. CWV target policy documented:
   - LCP <= 2.5s
   - INP <= 200ms
   - CLS <= 0.1
   - p75
5. Faceted URL/index policy documented before exposing large catalog filter spaces.
6. Raw sort/filter parameters do not automatically become indexable landing pages.
7. Meaningful product imagery uses crawlable HTML image markup and appropriate alt text.
8. No blanket SEO alt text on decorative imagery.
9. Who/How/Why governance exists for substantive expert content.
10. No fake author/expert identities.
11. Public content contains no intentional hidden agent instructions.
12. UGC/external rich content is sanitized before public rendering.
13. Mobile and desktop primary content are equivalent.
14. Mobile metadata/structured-data relationships match desktop.
15. Crawler registry review date is current.

---

# 50. Acceptance Matrix

| Gate | Required Result |
|---|---|
| Core crawler taxonomy | Search / User Retrieval / Training / Unknown |
| Googlebot | Public search pages allowed |
| Bingbot | Public search pages allowed |
| OAI-SearchBot | Public ChatGPT-search pages allowed |
| Claude-SearchBot | Public search pages allowed |
| PerplexityBot | Public search pages allowed |
| Applebot | Public discovery pages allowed |
| GPTBot | Separate business-policy decision |
| ClaudeBot | Separate business-policy decision |
| Google-Extended | Separate model-use policy |
| Applebot-Extended | Separate model-use policy |
| User-agent-only WAF trust | Forbidden where verification is available |
| robots.txt as security boundary | Forbidden |
| Crawler review | Quarterly + event-driven |
| LCP | <= 2.5s p75 |
| INP | <= 200ms p75 |
| CLS | <= 0.1 p75 |
| Mobile/Desktop CWV | Evaluated separately |
| Raw faceted states indexable by default | No |
| Intentional facet landing pages | Explicit approval required |
| Product image crawlability | Required where meaningful |
| Blanket ImageObject requirement | No |
| Decorative image keyword alt | Forbidden |
| E-E-A-T | Content-quality framework, not single ranking factor |
| Who/How/Why | Required review for substantive content |
| Fake expert bylines | Forbidden |
| Hidden AI-agent instructions | Forbidden |
| Untrusted rich content sanitization | Required |
| Mobile primary-content parity | Required |
| Mobile/desktop metadata parity | Required |

---

# 51. Explicitly Rejected Interpretations

V1.1 does NOT adopt the following as architecture truths:

- “PerplexityBot currently ignores robots.txt.”
- “Every image needs ImageObject schema.”
- “E-E-A-T is a single Google ranking factor.”
- “Every page needs a named human author.”
- “Prompt injection can be fully solved by website markup.”
- “Every filter combination should become an SEO landing page.”
- “Passing Lighthouse alone proves production CWV.”
- “Allowing search crawlers implies allowing training crawlers.”

---

# 52. Relationship to Frozen Homepage Components

This addendum does not reopen:

- Header;
- Hero;
- Price Strip;
- Product Showcase;
- Evaluation / Assurance V2.1;
- Purchase Process V2.0.

Any visible content/layout/CTA change to those components still requires its own versioned approval.

---

# 53. Future Implementation Artifacts

Recommended future operational artifacts:

1. `CRAWLER_POLICY_REGISTRY.md`
2. production `robots.txt` policy
3. Cloudflare crawler/WAF smoke-test script
4. faceted-navigation URL policy
5. search metadata regression tests
6. structured-data tests
7. image-discovery checklist
8. CWV production dashboard
9. AI/search referral dashboard
10. content author/reviewer governance
11. prompt-injection content-security checklist

These are implementation/governance outputs derived from this architecture.

---

# 54. Reference Basis

V1.1 was checked against current official documentation including:

- Google Search Central / Google Crawling Infrastructure;
- web.dev Core Web Vitals;
- Anthropic crawler documentation;
- Perplexity crawler documentation;
- Apple Applebot documentation;
- Microsoft Bing/Copilot documentation;
- OpenAI prompt-injection safety documentation.

Vendor behavior remains subject to change and is therefore governed through the crawler-registry review policy.

---

# 55. Version Status

**AHAN ASA AI SEARCH / GEO / DISCOVERABILITY ARCHITECTURE GATE V1.1 — CRAWL, CATALOG, PERFORMANCE & AGENT-SECURITY HARDENING — FROZEN**

Version 1.1 extends V1.0 with:

- broader crawler governance;
- numeric performance gates;
- catalog crawl control;
- image discoverability;
- content trust governance;
- agent-facing content safety;
- registry maintenance;
- mobile-first parity.

No previously frozen Homepage component is silently modified by this addendum.
