# Ahan Asa — Crawler Policy Registry

**Status:** Active — **MAINTAINABLE OPERATIONAL REGISTRY**, not frozen architecture.
**Governing frozen authority:** `docs/discoverability/AHANASSA_AI_SEARCH_GEO_DISCOVERABILITY_ARCHITECTURE_GATE_V1.1.md` §3–§14, §48, §50.
**Created:** 2026-09-08 (GEO-G0 foundation gate).
**LAST REVIEW DATE:** 2026-09-08
**NEXT ROUTINE REVIEW:** quarterly

---

## 1. What this document is, and is not

V1.1 §12 separates two things deliberately:

```text
Frozen policy
+
versioned crawler registry
=
durable governance
```

The **policy** (the purpose classes in §3, the no-UA-only-trust rule in §8, the
search-vs-training separation in §6) is frozen and lives in the V1.1 architecture
document. **This file is the living vendor-token inventory.** Per V1.1 §12:

> A vendor bot-token rename does not require a full architecture-version bump when
> the policy class remains unchanged.
>
> Material policy changes still require a new architecture version.

Editing a row here to record a re-verified fact, a renamed token, or a newly
observed agent is normal maintenance. Changing what class a bot belongs to, or
granting/withdrawing a training permission, is a **material policy change** and
requires owner approval plus (where it changes architecture) a new spec version.

This registry is **documentation only**. Nothing in it is currently enforced:
`app/robots.ts` emits a wildcard-only policy, and no Cloudflare WAF crawler rule
exists in this repository. See §5.

---

## 2. Purpose classes (frozen — V1.1 §3)

```text
A. Search / discovery crawlers
B. User-directed retrieval agents
C. Training / model-improvement controls
D. Unknown / unverified / abusive automation
```

Frozen consequence (V1.1 §6):

```text
Search visibility decision
≠
training/model-use decision
```

A row's `purpose_class` is what determines which policy question applies to it.
Never answer a class-C question by reusing a class-A answer.

---

## 3. Registry

Column meanings:

- **allow_public** — may this agent fetch pages Ahan Asa intends to be publicly
  discoverable? (a class-A/B question)
- **training_policy** — may content this agent collects be used for model
  training / model improvement? (a class-C question, always answered separately)
- **official_reference** — the vendor's own current documentation. The imported
  V1.1/V1.0 specs name the documentation *families* they were checked against
  (V1.1 §54) but record **no URLs**. No URL is invented here; the operator
  records the real one at the next review.
- **robots_behavior** — what the vendor documents about its own robots.txt
  compliance.
- **identity_verification** — the mechanism (IP range / reverse DNS / platform
  verified-bot signal) that would prove the claimed identity, per V1.1 §8.
- **waf_status** — current Cloudflare/WAF treatment in this project.
- **implementation_status** — what `app/robots.ts` and infrastructure actually do
  today, as audited 2026-09-08.

### 3.1 Class A — Search / discovery crawlers

V1.1 §4.1 states one Default Public-Page Direction for every row in this class,
quoted verbatim: **"Allow intended public indexable pages."** That is the frozen
default direction and is recorded as such below — it is not an owner decision
still outstanding.

| provider | agent_token | purpose_class | allow_public | training_policy | official_reference | last_verified | robots_behavior | identity_verification | waf_status | implementation_status | notes |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Google | `Googlebot` | A — search/discovery | Allow intended public indexable pages (V1.1 §4.1) | Governed separately via `Google-Extended` — see §3.3 | NOT RECORDED IN IMPORTED SPECS — record at next review (V1.1 §54 names Google Search Central / Google Crawling Infrastructure) | 2026-09-08 (spec-derived only) | NOT RECORDED IN IMPORTED SPECS — verify at next review | None implemented | No rule | Not implemented — wildcard-only robots.txt | V1.0 §6 and V1.1 §50 both require public search pages allowed |
| Microsoft | `Bingbot` | A — search/discovery | Allow intended public indexable pages (V1.1 §4.1) | OWNER DECISION REQUIRED — no Microsoft training-control token recorded in V1.1/V1.0 | NOT RECORDED IN IMPORTED SPECS — record at next review (V1.1 §54 names Microsoft Bing/Copilot documentation) | 2026-09-08 (spec-derived only) | NOT RECORDED IN IMPORTED SPECS — verify at next review | None implemented | No rule | Not implemented — wildcard-only robots.txt | V1.1 §46: Bingbot backs the Bing index that Microsoft Copilot web search may use; intended public pages must not accidentally block it |
| OpenAI | `OAI-SearchBot` | A — search/discovery | Allow intended public indexable pages (V1.1 §4.1; V1.0 §4/§5.1) | Explicitly NOT implied — V1.0 §5.2 frozen rule: allowing `OAI-SearchBot` does not imply approval for `GPTBot` | NOT RECORDED IN IMPORTED SPECS — record at next review | 2026-09-08 (spec-derived only) | NOT RECORDED IN IMPORTED SPECS — verify at next review | None implemented | No rule | Not implemented — wildcard-only robots.txt | ChatGPT Search discovery |
| Anthropic | `Claude-SearchBot` | A — search/discovery | Allow intended public indexable pages (V1.1 §4.1) | Governed separately via `ClaudeBot` — see §3.3 | NOT RECORDED IN IMPORTED SPECS — record at next review (V1.1 §54 names Anthropic crawler documentation) | 2026-09-08 (spec-derived only) | NOT RECORDED IN IMPORTED SPECS — verify at next review | None implemented | No rule | Not implemented — wildcard-only robots.txt | V1.1 §11: a single blanket Claude rule is insufficient — three distinct Anthropic roles exist |
| Perplexity | `PerplexityBot` | A — search/discovery | Allow intended public indexable pages (V1.1 §4.1) | OWNER DECISION REQUIRED — no Perplexity training-control token recorded in V1.1/V1.0 | NOT RECORDED IN IMPORTED SPECS — record at next review (V1.1 §54 names Perplexity crawler documentation) | 2026-09-08 (spec-derived only) | Follows robots.txt — V1.1 §10 quotes current Perplexity documentation: `PerplexityBot → follows robots.txt` | None implemented | No rule | Not implemented — wildcard-only robots.txt | V1.1 §51 explicitly rejects the outdated claim that `PerplexityBot` ignores robots.txt — do not reintroduce it |
| Apple | `Applebot` | A — search/discovery | Allow intended public discovery pages (V1.1 §4.1, §50) | Governed separately via `Applebot-Extended` — see §3.3 | NOT RECORDED IN IMPORTED SPECS — record at next review (V1.1 §54 names Apple Applebot documentation) | 2026-09-08 (spec-derived only) | NOT RECORDED IN IMPORTED SPECS — verify at next review | None implemented | No rule | Not implemented — wildcard-only robots.txt | |

### 3.2 Class B — User-directed retrieval agents

V1.1 §5 frozen rule:

> **User-directed fetchers are not automatically equivalent to search crawlers or
> training crawlers.**

V1.1 gives these rows a *direction*, not a decision. `Claude-User`'s stated
direction is conditional ("**if** retrieval is desired") and `Perplexity-User`'s
is procedural ("govern separately"); neither resolves to an allow/block without
the owner stating whether user-directed retrieval of Ahan Asa pages is wanted.

| provider | agent_token | purpose_class | allow_public | training_policy | official_reference | last_verified | robots_behavior | identity_verification | waf_status | implementation_status | notes |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Anthropic | `Claude-User` | B — user-directed retrieval | OWNER DECISION REQUIRED — V1.1 §5 direction is "Allow public pages **if retrieval is desired**"; whether it is desired is not documented | Not applicable to this class — see `ClaudeBot` in §3.3 | NOT RECORDED IN IMPORTED SPECS — record at next review | 2026-09-08 (spec-derived only) | NOT RECORDED IN IMPORTED SPECS — verify at next review | None implemented | No rule | Not implemented — wildcard-only robots.txt | Fetches in response to a user request, not as an index crawler |
| Perplexity | `Perplexity-User` | B — user-directed retrieval | OWNER DECISION REQUIRED — V1.1 §5 direction is only "Govern separately from index crawler policy" | Not applicable to this class | NOT RECORDED IN IMPORTED SPECS — record at next review | 2026-09-08 (spec-derived only) | NOT RECORDED IN IMPORTED SPECS — verify at next review (V1.1 §10 separates this from `PerplexityBot`'s robots compliance) | None implemented | No rule | Not implemented — wildcard-only robots.txt | V1.1 §10: historical user-directed URL behavior must not be treated as the current crawler rule |

### 3.3 Class C — Training / model-use controls

V1.1 §6 and §50 require an explicit, separate business-policy decision for every
row in this class. None is documented anywhere in this repository or in the
imported specs. **No default is inferred here** — auto-allowing or auto-blocking
would be exactly the accidental wildcard inheritance V1.0 §5 forbids.

| provider | agent_token | purpose_class | allow_public | training_policy | official_reference | last_verified | robots_behavior | identity_verification | waf_status | implementation_status | notes |
|---|---|---|---|---|---|---|---|---|---|---|---|
| OpenAI | `GPTBot` | C — training / model-use | Not the applicable question for this class — see training_policy | **OWNER DECISION REQUIRED** | NOT RECORDED IN IMPORTED SPECS — record at next review | 2026-09-08 (spec-derived only) | NOT RECORDED IN IMPORTED SPECS — verify at next review | None implemented | No rule | Not implemented — currently inherits the wildcard `Allow: /`, which V1.0 §5 explicitly warns against inheriting accidentally | V1.0 §5.2 and §55 item 4 both require the GPTBot policy to be documented explicitly |
| Anthropic | `ClaudeBot` | C — training / model-use | Not the applicable question for this class | **OWNER DECISION REQUIRED** | NOT RECORDED IN IMPORTED SPECS — record at next review | 2026-09-08 (spec-derived only) | NOT RECORDED IN IMPORTED SPECS — verify at next review | None implemented | No rule | Not implemented — inherits wildcard | V1.1 §11: model-development / training-related collection; distinct from `Claude-SearchBot` and `Claude-User` |
| Google | `Google-Extended` | C — training / model-use control token | Not applicable — V1.1 §6: this is a robots product token, **not a separate HTTP crawler user-agent** | **OWNER DECISION REQUIRED** | NOT RECORDED IN IMPORTED SPECS — record at next review | 2026-09-08 (spec-derived only) | Robots product token (V1.1 §6) | Not applicable — does not crawl | No rule | Not implemented | V1.1 §6: blocking `Google-Extended` does **not** remove the site from Google Search. Controls use of Google-crawled content for future Gemini training and certain grounding use |
| Apple | `Applebot-Extended` | C — training / model-use control token | Not applicable — V1.1 §6: controls downstream use policy and does not itself crawl pages | **OWNER DECISION REQUIRED** | NOT RECORDED IN IMPORTED SPECS — record at next review | 2026-09-08 (spec-derived only) | Robots-declared use-policy control (V1.1 §6) | Not applicable — does not crawl | No rule | Not implemented | Controls use of Applebot-crawled content for Apple foundation-model training |
| Common Crawl | `CCBot` | C — training / model-use (pending verification) | **OWNER DECISION REQUIRED** | **OWNER DECISION REQUIRED** | NOT RECORDED IN IMPORTED SPECS — record at next review | 2026-09-08 (listed only, not characterized) | NOT RECORDED IN IMPORTED SPECS — verify at next review | None implemented | No rule | Not implemented — inherits wildcard | V1.1 §7 lists Common Crawl / `CCBot` among additional/emerging crawlers and explicitly **does not freeze behavioral assumptions** for it without current vendor documentation. Classify after verification, not before |

### 3.4 Class D — Unknown / unverified / abusive automation

No rows. This class is defined by V1.1 §3 and enforced by infrastructure
(V1.1 §9), not by a token list. Adding a named row here requires real observed
evidence — Cloudflare bot analytics or logs. Do not pre-populate it.

### 3.5 Deliberately not listed

V1.1 §7 also names Meta crawler families, ByteDance crawler families, future AI
search agents, future browser agents, and new model-specific crawlers as
*possible* future registry entries. **No row is created for any of them**, because
V1.1 §7 forbids freezing behavioral assumptions without current vendor
documentation and neither imported spec nor this repository provides a specific
token, role, or robots behavior for them. They enter this registry when a review
produces real evidence (see §4), never as speculative padding.

---

## 4. Review cadence and triggers

V1.1 §13 — crawler policy must be reviewed:

```text
at least quarterly
```

and additionally when any of the following occurs (quoted from V1.1 §13):

- a major provider publishes a crawler change;
- a new major AI/search platform becomes relevant;
- Cloudflare bot traffic reveals new significant agents;
- search/referral analytics show a meaningful new source;
- security incidents expose crawler-policy gaps.

V1.1 §13 also records that no unsupported claim such as "new crawlers appear
every 2–4 months" is required, and none is made here.

### 4.1 Review checklist (V1.1 §48)

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

Items 6–8 cannot be answered until crawler observability exists; record them as
unanswerable rather than as passing.

### 4.2 Ownership

This is a governance-ownership statement only. **No scheduled automation, cron
trigger, or external job was created for this review** — GEO-G0 is a
documentation phase. Whoever performs the review updates `LAST REVIEW DATE` at
the top of this file and the `last_verified` cell of every row they actually
re-verified. Never bulk-update `last_verified` for rows that were not checked.

---

## 5. Current enforcement reality (audited 2026-09-08)

Recorded here so no reader mistakes this registry for a deployed policy.

- **`app/robots.ts` is wildcard-only.** In production it emits a single
  `User-agent: *` group with `Allow: /`, `Disallow: /api/`, plus the sitemap
  reference. Outside production (`APP_ENV` not `production`) it emits
  `User-agent: * / Disallow: /` for everything.
- **No crawler-specific group exists for any token in this registry** — every
  class-A, class-B, and class-C agent currently inherits the wildcard.
- **No identity verification exists.** No reverse-DNS, IP-range, or platform
  verified-bot check is implemented anywhere in this repository.
- **No Cloudflare WAF crawler rule is declared in this repository.**
  `wrangler.jsonc` contains no bot, WAF, firewall, or managed-ruleset
  configuration; the only rate limiting is the RFQ-scoped `RFQ_RATE_LIMITER`
  binding.
- **`robots.txt` is not a security boundary** (V1.1 §9, §47; V1.0 §38).
  Private data protection is authentication/authorization and WAF, never a
  robots directive.

Changing any of the above is out of GEO-G0 scope and belongs to a later,
separately-approved phase.

---

## 6. Change log

| Date | Change | By |
|---|---|---|
| 2026-09-08 | Registry created at GEO-G0 from V1.1 §4–§7/§12–§14/§48. All rows spec-derived; no vendor URL invented; every unresolved business policy recorded as OWNER DECISION REQUIRED. No enforcement change. | GEO-G0 foundation gate |
