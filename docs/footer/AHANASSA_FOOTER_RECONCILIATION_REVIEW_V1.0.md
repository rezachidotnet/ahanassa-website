# AHANASSA Footer — Reconciliation Review V1.0

Date: 2026-09-09
Status: SOURCE REVIEW COMPLETE; Footer final freeze remains pending verified configuration and implementation inventory.

## 1. Sources inspected

- FOOTER_SPEC.md, 2026-08-25, all 1342 lines. Header status: Draft v1.0 — Normative implementation contract. Library identity: libfile_7534cd1886d48191a27c4fe287c3be02.
- ahanassa-homepage-audit.md, 2026-09-03, all 234 lines. Historical audit; findings are not current runtime verification.
- Current conversation's approved Homepage Composition, Visual System and Final CTA freezes.

No repository, production site or deployed contact configuration was inspected in this review. Source presence does not establish that its implementation is complete.

## 2. Finding

Footer was designed previously. It should be reconciled, not rebuilt from an assumed absence of design. Its stored source is explicitly Draft, so it must not be reported as an already final frozen specification.

The baseline provides: Navy structural surface, official reversed logo, role statement, curated navigation, verified contact information, legal utility row, optional official social links, responsive rules, accessibility, no-JavaScript behavior and centralized data.

## 3. Decision mapping

| Topic | Existing source | Current resolution |
|---|---|---|
| Homepage closing CTA | FooterCTA inside the broader footer composition | Homepage Final CTA V1.0 owns the closing conversion section; render it once, before SiteFooter |
| CTA copy | Invoice/list heading, process secondary link | On Homepage use exact new Final CTA copy: ارسال لیست خرید / درخواست قیمت تلفنی |
| CTA color | Cream/White pre-footer band | New Homepage Final CTA is Navy, with Cream primary and outline secondary |
| Footer boundary | Light-to-Navy transition expected | Use one subtle divider and independent padding when Final CTA and Footer are both Navy |
| Other-page FooterCTA | Standard public-page CTA with exceptions | Retain existing behavior outside Homepage pending a separate cross-site CTA decision; do not globally remove the reusable component |
| Locale scope | FA first, EN/AR future | Current project scope is FA/EN/AR; inspect localized routes/content and complete Footer parity |
| FAQ link | May target Homepage anchor | Retired Homepage FAQ anchor must not remain; use a real published FAQ/process destination or omit |
| Process link | Required semantic destination | Link only if the actual localized /process route is published; preserved code/spec alone does not prove a route exists |
| RFQ navigation label | ارسال فاکتور یا لیست خرید | Align Homepage/global RFQ navigation wording with approved ارسال لیست خرید and actual supported flow |
| Product/price positioning | Earlier prohibition on marketplace/price-portal framing | Do not use this historical strategy text to remove current approved Products or conditional Price Strip |
| Contact and identity | Verified configuration required | Preserve requirement; do not invent values from examples or historical audit suggestions |

These are applications of newer approved decisions within Homepage scope. The original Footer source is not edited or globally superseded by this review.

## 4. Retain the existing Footer design

- Steel Navy full-width footer, no photographs, floating card, grid texture or large shadow.
- Official reversed logo and concise role statement.
- Three short navigation groups where eligible content exists; empty groups collapse.
- Verified phone/email/contact channels; phone and email LTR-isolated in FA/AR.
- Legal links and copyright visible on mobile.
- Single global footer landmark, real server-rendered links and no dependence on motion.
- No newsletter, embedded map/social feed, fake badges or second Homepage CTA band.

Baseline Persian role statement remains:
«مدیریت حرفه‌ای خرید و تأمین آهن برای پروژه‌ها و کسب‌وکارها.»

Baseline copyright remains:
«© {currentYear} آهن آسا. تمامی حقوق محفوظ است.»

This does not assert that Ahan Asa is the registered entity. Any relationship with a legal company must use verified wording.

## 5. Open configuration and verification items

The following must first be retrieved from the existing approved repository/configuration, not asked from the user again if already recorded there:

1. Official reversed logo asset for the three locales.
2. Current route registry and published pages in FA/EN/AR.
3. Verified business phone, email, public address, social/messenger URLs and business hours, where available.
4. Approved legal entity relationship wording and current privacy/terms pages.
5. Current SiteFooter/FooterCTA composition and any duplicate rendering.
6. Localized Footer copy and actual responsive output.

Unavailable optional data is omitted, without placeholder rows. Missing essential legal/routes/identity requirements must be reported as release gaps, not silently invented. Missing runtime checks remain NOT VERIFIED.

The historical audit reported missing contacts and unclear legal naming at its inspection date. This review does not claim those problems persist today.

## 6. Read-only repository handoff for Claude Code

In the existing Ahan Asa website repository, read AGENTS.md/CLAUDE.md and verify root, branch, full HEAD and working tree. Do not reset or overwrite existing work.

Read FOOTER_SPEC.md, this review and the latest Homepage Composition/Visual/Final CTA freezes. Inspect actual SiteFooter/FooterCTA components, locale dictionaries, route helpers, verified business configuration and logo assets. Map every reconciliation row above to exact source paths and current behavior.

Report which contact/legal values are already verified in approved public configuration. Do not open secret stores or expose personal/staff/private contact information. Do not infer official business values from placeholders.

Check whether Homepage will render the new Final CTA once or also the old FooterCTA. Inspect other page templates and identify the narrowest change that preserves their behavior. Check retired FAQ anchors and unreleased process routes. If an existing safe preview is available, inspect current Footer desktop/mobile in FA/EN/AR; otherwise state visual verification not run.

Deliver a FOOTER_CURRENT_STATE_AND_FREEZE_READINESS_REPORT in the repository's established docs location, including:
- source mapping and current spec status;
- current CTA ownership/duplication;
- published route and localization matrix;
- verified configuration availability, without secrets;
- missing decisions versus straightforward implementation fixes;
- proposed minimal changes and visual checks needed.

This is read-only regarding application code and remote systems; writing the report is permitted. No code edits, deployment, migration, Odoo upgrade, push or merge. Do not call this task Footer implementation or final freeze completion.

## 7. Next decision

Use the repository report to finalize a narrow Footer addendum with exact localized navigation and verified configuration bindings. The existing design need not be replaced. Evidence operational policy remains a separate open item and must not delay this read-only Footer reconciliation.
