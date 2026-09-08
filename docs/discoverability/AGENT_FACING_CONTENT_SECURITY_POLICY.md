# Ahan Asa — Agent-Facing Content Security Policy

**Status:** Active — **FROZEN POLICY** for public content directed at machine readers.
**Governing frozen authority:** `docs/discoverability/AHANASSA_AI_SEARCH_GEO_DISCOVERABILITY_ARCHITECTURE_GATE_V1.1.md` §34–§38, §44, §49 items 11–12, §50.
**Related existing authority:** `01-sources/SECURITY_GUIDELINES.md` §11.2 (rich content / Markdown / MDX / CMS sanitization) — that document owns input sanitization mechanics; this one owns the agent-facing content rule, which no existing repository document covered.
**Created:** 2026-09-08 (GEO-G0 foundation gate).

---

## 1. Frozen rule

V1.1 §44:

```text
same public truth
→ humans
→ search engines
→ AI retrieval systems
```

There is one public content layer. Ahan Asa must not publish a second,
machine-only content layer, and must not publish content designed to manipulate
third-party AI agents beyond normal user-visible meaning (V1.1 §34).

---

## 2. Forbidden — never publish

Enumerated from V1.1 §35, binding on every public surface (pages, components,
metadata, structured data, CMS/editorial content, image alt text, error states,
and any future UGC rendering path):

- hidden "ignore previous instructions" text;
- invisible instructions addressed to ChatGPT / Claude / Copilot or any other
  assistant;
- machine-only prompts;
- CSS-hidden agent directives;
- malicious instructions embedded in metadata;
- content designed to trigger unrelated actions by agents.

Also forbidden, from the wider architecture:

- keyword stuffing or hidden LLM-targeting text of any kind;
- white-on-white / zero-opacity / off-screen text serving no accessibility
  purpose;
- serving different factual content to bots than to users (cloaking);
- duplicate machine-targeted page variants for individual AI platforms;
- fake expert or reviewer identities used to manufacture authority
  (`01-sources/CONTENT_STRATEGY.md` §16 and V1.1 §31 both already prohibit this;
  restated here because a fabricated byline is also an agent-facing trust
  manipulation).

---

## 3. Explicitly permitted — do not flag these

This distinction matters, because an over-broad reading of §2 would damage
accessibility. The following are **legitimate and required**, not violations:

- `sr-only` / visually-hidden text that provides an accessible name, a live-region
  announcement, a skip link, or context a sighted user gets from layout alone.
  This project uses it correctly today (e.g. the catalog result-count
  `aria-live="polite"` announcement).
- `aria-hidden="true"` on decorative icons, rules, separators, and duplicated
  ornamental imagery, to prevent duplicate screen-reader announcement.
- `alt=""` on decorative or redundant images (V1.1 §26; `01-sources/MEDIA_GUIDELINES.md`
  §13.1).
- `hidden` on a collapsed accordion or disclosure panel whose content is already
  present in the server-rendered DOM.
- Server-rendered JSON-LD that describes content actually visible on the page.

The test is **intent and audience**: hidden text that helps a person using
assistive technology understand the visible page is correct. Hidden text that
addresses a machine, asserts facts the page does not show, or attempts to steer
an agent's behavior is forbidden.

---

## 4. Untrusted and third-party content

V1.1 §36 — any publicly rendered reviews, comments, uploaded text, supplier
descriptions, imported external content, or rich HTML must be treated as
**untrusted input**, because such content is a prompt-injection carrier as well as
an XSS carrier.

Controls, when such a surface is built:

- sanitization;
- allowlisted markup;
- output escaping;
- moderation;
- removal of active and invisible markup;
- validation of external links and embeds.

V1.1 §38 — third-party embeds must additionally be reviewed for hidden content,
script behavior, privacy, unexpected redirects, accessibility, performance, and
agent-facing manipulation risk. **Do not embed arbitrary supplier HTML into public
pages.**

**Current applicability: NOT CURRENTLY APPLICABLE.** As audited 2026-09-08 this
site renders no UGC, no comments, no reviews, no supplier-submitted rich HTML,
and no third-party embeds. The single `dangerouslySetInnerHTML` in the codebase
is `components/seo/JsonLd.tsx`, which serializes project-authored schema objects
through `lib/seo/json-ld.ts` with `<`, U+2028, and U+2029 escaped. That is a
correct, deliberate control, not a violation.

This section becomes live the moment any untrusted-content surface is proposed.
Building the sanitization runtime is out of GEO-G0 scope and is future security
work.

---

## 5. Scope boundary

V1.1 §37:

- Ahan Asa **cannot** guarantee the security of external AI agents.
- Its responsibility is (a) to avoid becoming an intentional or preventable
  source of malicious instructions, and (b) to sanitize untrusted content it
  publishes.
- Prompt-injection defense for Ahan Asa's **own** future agents is a separate
  application/security architecture and is not governed by this document.

V1.1 §51 rejects the claim that "prompt injection can be fully solved by website
markup." This policy makes no such claim.

---

## 6. Review checklist

Run before publishing any new public page, component, editorial content batch, or
metadata change. Derived from V1.1 §35/§44/§49; V1.1 §53 item 11 names this
artifact.

1. Does every hidden/`sr-only`/`aria-hidden`/zero-opacity element serve a real
   accessibility or presentational purpose, and address a person rather than a
   machine?
2. Does any text — visible or not — address an AI system, assistant, or agent
   directly?
3. Does any string attempt to override, redirect, or instruct a reader's system
   ("ignore previous instructions", role assignments, tool directives)?
4. Do `<meta>`, `alt`, `title`, `aria-label`, JSON-LD values, and data attributes
   contain only descriptive content — no directives?
5. Does the structured data assert anything the visible page does not state?
   (V1.0 §18: structured data describes truth already present; it must not create
   a second truth layer.)
6. Would a crawler, an AI retrieval system, and a human reader all receive the
   same factual claims from this page?
7. Is any author, reviewer, credential, or expertise claim on the page real and
   attributable to a person who actually reviewed it?
8. If the page renders any third-party or user-supplied content, is it sanitized,
   allowlisted, and free of active/invisible markup?

A "no" on 1, 4, 5, 6, 7, or 8 — or a "yes" on 2 or 3 — blocks publication.

---

## 7. Current audit result

**2026-09-08 — no violations found.** A repository-wide search of `app/`,
`components/`, `lib/`, `public/`, and `styles/` for agent-directed strings,
injection phrasing, assistant-targeted directives, machine-only content, and
hidden SEO/AI text returned zero results. Every `sr-only` / `aria-hidden` /
`alt=""` / `hidden` usage examined fell into the §3 permitted category.

This is a point-in-time finding about the audited tree, not a permanent
guarantee. Re-run §6 on every content change.
