> ## ⚠ STATUS NOTICE — SUPERSEDED FOR HOMEPAGE
>
> **Status as of 2026-09-08: `SUPERSEDED FOR HOMEPAGE — replaced by Buyer Value / Service Promise V1.0`.**
>
> This component no longer renders on the Homepage. It was removed from
> `app/[locale]/page.tsx` by the Homepage HP-R1 reconciliation and replaced in
> that slot by `components/home/buyer-value.tsx`.
>
> Authority for this change:
> - `docs/homepage/AHANASSA_HOMEPAGE_COMPOSITION_AND_CUSTOMER_JOURNEY_FREEZE_V1.0.md` §8, §16.5, §19.5
> - `docs/buyer-value/AHANASSA_BUYER_VALUE_SERVICE_PROMISE_COMPONENT_FREEZE_V1.0.md` §21
>
> **Nothing below has been deleted or edited.** The body of this document is
> retained in full as decision history, exactly as frozen on 2026-09-07, per
> Composition Freeze §8: "Historical specifications and files SHOULD NOT be
> deleted solely because they are no longer active."
>
> Also retained and untouched, and asserted to still exist by
> `lib/content/evaluation-assurance-frozen-spec-invariants.test.ts`:
> - `components/home/evaluation-assurance.tsx`
> - `lib/content/evaluation-assurance.ts`
> - the `evaluationAssurance` field of `lib/content/homepage.ts`
>
> Scope of the supersession: **Homepage placement only.** Every content,
> semantic, accessibility and claim-safety rule below remains a valid record of
> the approved V2.1 decision. This document is simply no longer authoritative
> for what the Homepage renders.
>
> Implementation record: `docs/homepage/HOMEPAGE_HP_R1_RECONCILIATION_IMPLEMENTATION_REPORT.md`.
> Register: `docs/homepage/HOMEPAGE_SUPERSESSION_REGISTER.md`.

---

# AHAN ASA HOMEPAGE — EVALUATION / ASSURANCE
## FINAL FROZEN V2.1

**Project:** Ahan Asa / آهن آسا  
**Component:** Homepage — Evaluation / Assurance  
**Status:** FINAL FROZEN / IMPLEMENTATION BASELINE  
**Version:** 2.1  
**Date:** 2026-09-07  
**Supersedes:** `AHANASSA_EVALUATION_ASSURANCE_FINAL_FROZEN_V2.0.md`

---

# 1. Purpose

This document freezes the final product, content, UX, visual, accessibility, localization, performance, and governance decisions for the Homepage Evaluation / Assurance component.

The component exists to answer one customer question only:

> **پیش از ارائه پیشنهاد، چه چیزهایی بررسی می‌شود؟**

Its role is:

```text
Decision Assurance
+
Risk / Uncertainty Reduction
+
Buyer Enablement
```

It is **not** a generic company-capabilities section and it is **not** a chronological process section.

---

# 2. Position in the Homepage Decision Journey

Current intended Homepage sequence around this component:

```text
Hero
↓
Price Strip — conditional on valid real data
↓
Product Showcase
↓
Evaluation / Assurance
↓
Purchase Process
↓
Later conditional evidence / industries sections
↓
Final CTA
```

The component follows Product Showcase and precedes Purchase Process.

Frozen separation of responsibilities:

| Component | Primary customer question |
|---|---|
| Hero | Who is Ahan Asa, what value does it provide, and what should I do next? |
| Product Showcase | What product families can I explore/source? |
| Evaluation / Assurance | What is checked before a proposal is presented? |
| Purchase Process | What happens after I send a request? |
| Final CTA | Am I ready to start / contact Ahan Asa? |

A future implementation FAILS if these responsibilities collapse back into repetitive “what we do” messaging.

---

# 3. 2026 Product Rationale — Internal, Not Public Copy

The section is retained because modern B2B buyers increasingly perform research and evaluation digitally and independently, while still needing contextual decision support and validation at higher-risk points.

For Ahan Asa, that means the Homepage should not merely say:

```text
We manage procurement.
```

It should reveal enough of the evaluation mechanism for the buyer to understand what is checked before a proposal is presented.

This is **buyer enablement**, not a supplier-marketing claim block.

---

# 4. Frozen Persian Heading

## 4.1 H2

**پیش از ارائه پیشنهاد، چه چیزهایی بررسی می‌شود؟**

This is the frozen Persian H2.

Do not replace it with generic headings such as:

- روش ارزیابی
- آنچه بررسی می‌کنیم
- چرا آهن آسا
- مزایای خرید از ما
- فرآیند کنترل
- خدمات ما

without a new approved content decision.

---

# 5. Frozen Persian Supporting Copy

**هر درخواست از نظر مشخصات فنی، امکان تأمین، شرایط تجاری و الزامات تحویل بررسی می‌شود تا مبنای پیشنهاد برای شما روشن باشد.**

Purpose of the supporting line:

- explain the four evaluation dimensions;
- clarify that the proposal has an explicit basis;
- avoid overclaiming certainty, guarantees, or supplier ownership.

---

# 6. Exactly Four Homepage Evaluation Axes

The Homepage uses exactly four top-level evaluation axes:

1. **انطباق فنی**
2. **امکان تأمین**
3. **شرایط تجاری**
4. **تحویل**

A fifth top-level axis must not be added merely to increase visual density.

Additional internal procurement checks may exist operationally without becoming Homepage pillars.

---

# 7. Axis 01 — انطباق فنی

## 7.1 Role

Answers:

> Is the requested/proposed steel requirement technically aligned with what the project actually needs?

## 7.2 Frozen public copy

**محصول، ابعاد، گرید، استاندارد و سایر مشخصات ضروری درخواست بررسی می‌شود. در صورت نیاز پروژه، الزامات مدارک فنی و کیفی نیز لحاظ می‌شود.**

## 7.3 In scope

Depending on the request, technical conformity may include:

- product / product family;
- geometry;
- dimensions;
- thickness / diameter / section dimensions where applicable;
- grade;
- standard;
- technical tolerance or specification where material;
- drawing/specification requirement;
- required quality / technical documentation.

## 7.4 Explicit correction from V1.0

`quantity` and commercial `unit` are removed from the default Technical Conformity public copy.

Reason:

They were duplicated under Commercial Conditions and blurred the responsibility boundary between axes.

A unit may still be technically relevant in exceptional domain-specific cases, but the Homepage copy does not duplicate it here.

---

# 8. Axis 02 — امکان تأمین

## 8.1 Role

Answers:

> Is this requirement realistically sourceable, and are there material constraints that affect whether it can be offered?

## 8.2 Frozen public copy

**امکان تهیه مورد درخواست و محدودیت‌های مؤثر بر آن بررسی می‌شود.**

## 8.3 In scope

Internally, this may involve factors such as:

- sourceability;
- commercially available product/specification;
- practical procurement constraints;
- supply-side constraints that affect feasibility or sourcing lead time.

Frozen distinction:

> **Timing under Sourcing Feasibility means a supply-side constraint or sourcing lead-time limitation. It is not the customer-requested delivery date.**

Customer-requested delivery timing belongs to Axis 04 — Delivery.

## 8.4 Positioning rule

The Homepage does **not** need to explain:

```text
Ahan Asa buys from Supplier A and resells to the customer.
```

It also must not falsely imply:

```text
Ahan Asa manufactures or owns all offered stock.
```

The customer-facing value is the controlled sourcing outcome, not the number of intermediaries.

Frozen positioning principle:

> **Show the control of the purchase, not the middleman chain.**

---

# 9. Axis 03 — شرایط تجاری

## 9.1 Role

Answers:

> On what commercial basis is the proposal being presented?

## 9.2 Frozen public copy

**مقدار و واحد، قیمت پیشنهادی، شرایط پرداخت و مدت اعتبار پیشنهاد به‌صورت روشن مشخص می‌شود.**

## 9.3 In scope

Where applicable:

- requested / offered quantity;
- commercial unit;
- proposed price;
- payment terms;
- quotation/proposal validity;
- other material commercial conditions actually shown to the buyer.

## 9.4 Governance

This section explains commercial clarity.

Frozen cross-axis rule:

> **Incoterm / delivery term, when applicable, belongs to Axis 04 — Delivery.**

The commercial price may depend on the applicable delivery term, but the delivery term itself must not be duplicated as an independent concept under both Commercial Conditions and Delivery.

It does not promise:

- lowest market price;
- guaranteed savings;
- best price;
- guaranteed margin;
- permanent price validity.

---

# 10. Axis 04 — تحویل

## 10.1 Role

Answers:

> What delivery conditions materially affect the offer?

## 10.2 Frozen public copy

**مقصد، زمان موردنیاز، شرایط حمل و مبنای تحویل در صورت اثرگذاری بر پیشنهاد بررسی می‌شود.**

## 10.3 In scope

Where applicable:

- destination;
- requested delivery timing;
- transport/logistics condition;
- delivery basis;
- applicable Incoterm / delivery term;
- delivery constraints that materially affect the proposal.

Frozen ownership rule:

> **Axis 04 is the canonical owner of Incoterm / delivery-term meaning in this component.**

## 10.4 Boundary

This axis describes **delivery conditions**.

It must not become the chronological “delivery step” of the Purchase Process component.

---

# 11. Technical / Quality Documentation

MTC, CoC, certificates, test reports, drawings, datasheets, or other technical documentation do **not** become a fifth Homepage pillar.

They remain conditional under:

**انطباق فنی**

Frozen supporting direction:

> **در صورت نیاز پروژه، الزامات مدارک فنی و کیفی نیز لحاظ می‌شود.**

Do not imply that every order automatically includes every type of certificate.

---

# 12. Supplier Qualification Claims

Formal supplier qualification is a separate operational concept.

The Homepage must not claim a governed supplier-qualification program unless Ahan Asa actually operates a documented, auditable process that supports the claim.

Not approved without evidence:

- «فقط از بهترین تأمین‌کنندگان خرید می‌کنیم»
- «تمام تأمین‌کنندگان ما تأییدشده‌اند»
- «شبکه تأمین‌کنندگان تضمین‌شده»
- «تأمین‌کنندگان رتبه‌بندی‌شده و کنترل‌شده»
- «فقط فروشندگان معتبر»

Also avoid the softer but still potentially unsupported phrase:

- «گزینه‌های قابل‌اتکا»

unless “reliable / trusted” is backed by a real qualification definition.

Preferred neutral wording remains:

> **امکان تهیه و محدودیت‌های مؤثر بر قابلیت تأمین بررسی می‌شود.**

---

# 13. Ahan Asa Business-Model Positioning

The Homepage must neither:

1. overemphasize intermediary/reseller mechanics; nor
2. misrepresent Ahan Asa as the manufacturer/owner of capabilities it does not own.

Preferred positioning language across this section:

- مدیریت تأمین;
- بررسی امکان تأمین;
- بررسی شرایط تجاری;
- روشن‌کردن مبنای پیشنهاد;
- هماهنگی خرید where contextually true.

Avoid framing such as:

```text
We buy from someone else and sell to you.
```

because this explains the chain rather than the customer value.

Also avoid false direct-manufacturer claims such as:

- بدون واسطه;
- فروش مستقیم کارخانه;
- تولید مستقیم آهن آسا;
- موجودی انبار آهن آسا;

unless individually and verifiably true for the relevant offering.

---

# 14. Prohibited Generic Marketing Claims

This component must not use generic promotional claims such as:

- بهترین قیمت;
- ارزان‌ترین;
- خرید مطمئن;
- تضمین کیفیت;
- تأمین سریع;
- کاهش قطعی هزینه;
- بدون ریسک;
- بهترین تأمین‌کننده;
- 100% guarantee;
- قطعی / تضمینی, unless legally and operationally supportable.

Frozen principle:

```text
Mechanism > Marketing Claim
```

---

# 15. No “What We Do” Duplication

The former independent “آنچه ما انجام می‌دهیم” concept does not reappear inside this component.

Do not add rows such as:

- بررسی نیاز;
- مقایسه تأمین‌کنندگان;
- هماهنگی خرید;
- پیگیری سفارش;

as a second four-item list.

Those are process/capability statements and would recreate the duplication this redesign is intended to remove.

---

# 16. Visual Architecture

## 16.1 Desktop

Preferred overall composition:

```text
~40% Intro / Context
~60% Evaluation List
```

The layout should use logical CSS directions.

Conceptually:

```text
[ Intro / H2 / Supporting ]
[ Evaluation rows 01–04 ]
```

For FA/AR and EN, the visual relationship should adapt through the shared RTL/LTR layout system rather than separate manually divergent components.

---

# 17. Evaluation Row Structure

Each row contains:

```text
Visual index
Axis title
Short explanatory copy
```

Example:

```text
01
انطباق فنی
محصول، ابعاد، گرید...
```

Rows are separated primarily through spacing and restrained dividers.

They are not independent floating cards.

---

# 18. No Card Grid

A four-card grid is NOT approved.

Reason:

- Product Showcase immediately before this component is already card-based;
- repeating the same card grammar creates visual monotony;
- this section is intended to feel analytical/editorial rather than promotional.

Preferred visual language:

```text
Editorial
Structured
Measured
Technical
Calm
```

---

# 19. Background / Surface

Preferred direction:

```text
Warm neutral / restrained cream section surface
Navy text
Restrained copper indexing/accent
Subtle dividers
```

Do not use:

- dark dramatic industrial background;
- stock photography;
- large decorative steel imagery;
- gradients as the primary visual device;
- glassmorphism;
- floating translucent cards.

The section should read as an evaluation framework, not another marketing hero.

---

# 20. Index Numbers 01–04

The visible numbers:

```text
01
02
03
04
```

are visual scanning aids.

They do **not** imply chronological order.

Implementation direction:

- restrained copper or semantic accent token;
- smaller than the row heading;
- `font-variant-numeric: tabular-nums`;
- always `aria-hidden="true"`.

Reason:

The visible numbers are decorative scanning aids only. The semantic meaning is fully carried by the list structure, H3 axis title, and explanatory copy.

Do not style the numbers as prominent badges or step indicators.

## 20.1 Digit Script / Locale Policy

The visible decorative indexes are localized by locale:

```text
FA → ۰۱ ۰۲ ۰۳ ۰۴
AR → ٠١ ٠٢ ٠٣ ٠٤
EN → 01 02 03 04
```

Frozen rules:

- the visible digit script follows the active locale;
- numbering remains decorative and `aria-hidden="true"`;
- `font-variant-numeric: tabular-nums` is the default;
- digit localization must not change semantic list order;
- do not mix digit scripts within the same localized component.

---

# 21. Icons

Default decision:

**No icons.**

Do not add generic:

- gear;
- shield;
- truck;
- currency;
- check-circle;

merely to decorate the four rows.

Icons may be reconsidered only if they carry real information and materially improve comprehension.

---

# 22. Dividers

Subtle horizontal dividers are permitted between rows.

The final row does not require a bottom divider.

Dividers are decorative if spacing and heading structure already communicate the grouping.

Therefore they must not be the **only** means of distinguishing rows.

---

# 23. Interaction

The component is information-first and essentially non-interactive.

Not approved:

- accordion;
- carousel;
- tabs;
- tooltip-only content;
- hover-only content;
- modal;
- expand/collapse;
- horizontal swipe;
- sticky storytelling;
- pinned-scrolling sequence.

All core information is visible without interaction.

---

# 24. Hover

No hover behavior is required.

If the shared design system adds a subtle desktop hover affordance, it must remain purely decorative and must not:

- reveal hidden information;
- imply clickability;
- transform a row into a pseudo-card;
- create major movement.

Default implementation may simply have no hover state.

---

# 25. CTA

No dedicated CTA is included in this component.

Reason:

- Header already exposes the primary request action;
- Hero already exposes conversion;
- Product cards expose discovery navigation;
- Final CTA exists later;
- adding a button here would weaken the information-first role.

A future CTA requires a separate conversion rationale.

---

# 26. Motion

Motion is optional progressive enhancement.

Preferred maximum direction:

- one soft section/group reveal;
- very restrained row appearance;
- total visual delay kept minimal.

Avoid theatrical stagger.

Not approved:

- animated check marks;
- bounce;
- overshoot;
- parallax;
- scroll hijacking;
- repeated entry animation;
- motion required to access/read the content.

If motion exists:

```text
prefers-reduced-motion
→ remove or substantially reduce it
```

All content must remain visible and readable if JavaScript or animation logic fails.

---

# 27. Mobile Layout

Mobile collapses to a direct vertical reading order:

```text
H2
Supporting copy

01 — انطباق فنی
Copy

02 — امکان تأمین
Copy

03 — شرایط تجاری
Copy

04 — تحویل
Copy
```

No:

- two-column compression;
- carousel;
- horizontal scroll;
- hidden accordion;
- sticky intro.

The section must remain comfortable at approximately:

```text
320
360
375
390
430
```

CSS px viewport widths.

---

# 28. Tablet / Intermediate Layout

Breakpoints must follow actual localized content fit.

Do not preserve the desktop 40/60 split if it causes:

- narrow text measure;
- orphan headings;
- excessive row height;
- overlap;
- awkward FA/AR/EN wrapping.

The layout may stack earlier than a framework-default breakpoint.

---

# 29. Semantic HTML

Preferred semantic structure:

```html
<section aria-labelledby="evaluation-heading">
  <div>
    <h2 id="evaluation-heading">...</h2>
    <p>...</p>
  </div>

  <ul>
    <li>
      <span aria-hidden="true">01</span>
      <h3>...</h3>
      <p>...</p>
    </li>
    ...
  </ul>
</section>
```

Frozen semantic decision:

**Use an unordered list (`<ul>`) rather than `<ol>` by default.**

Reason:

The four axes are categories/criteria, not chronological process steps.

Visual numbering remains presentation/scanning support only.

---

# 30. Heading Hierarchy

Expected Homepage structure:

```text
Hero → H1
Evaluation section → H2
Evaluation axis titles → H3
```

Do not use heading levels solely for styling.

Do not make the decorative numbers headings.

---

# 31. Accessibility

Required:

- semantic section and heading structure;
- meaningful text available directly in DOM;
- no information available only through color;
- no information hidden behind hover;
- correct reading order in RTL/LTR;
- text remains usable at browser zoom / text enlargement;
- no horizontal document scrolling due to the section.

WCAG 2.2 AA remains the site baseline.

---

# 32. Contrast

Required for user-facing normal-size text:

```text
>= 4.5:1
```

Large text may follow the applicable WCAG threshold.

There are no required interactive controls inside this component.

Decorative dividers and decorative `aria-hidden` index numbers must not be the sole carrier of meaning.

If a visual accent conveys essential state/information in a future revision, it must satisfy the applicable non-text contrast requirement.

---

# 33. Localization

Persian copy in this document is frozen.

English and Arabic must be professionally localized/transcreated rather than mechanically translated.

Localization must preserve:

- the four-axis meaning;
- cautious non-guarantee wording;
- Ahan Asa’s managed-procurement positioning;
- the separation between sourcing feasibility and supplier-qualification claims.

Do not allow translated copy to introduce stronger claims than Persian.

---

# 34. RTL / LTR

One shared component supports:

```text
FA → RTL
AR → RTL
EN → LTR
```

Use logical layout properties where practical.

Do not hardcode physical left/right assumptions that require separate locale implementations.

Visible 01–04 indexing should remain readable and stable across directions.

---

# 35. Content Length Governance

The component is not an SOP.

Homepage row copy should remain concise.

Each axis should normally fit:

- one short heading;
- approximately one concise sentence;
- no nested bullets in the normal Homepage presentation.

Detailed evaluation methodology belongs deeper in relevant content, RFQ, FAQ, or future process documentation.

---

# 36. Data / Architecture Boundary

This component is editorial and does not require a live commercial data dependency.

It must NOT require:

- live Odoo;
- Public Product Projection;
- Public Processing Projection;
- pricing API;
- client-side fetch.

Conceptually:

```text
Localized Website Content
↓
SSR / static render
↓
Evaluation component
```

The component may describe real operational policy, but it is not a live read-model widget.

---

# 37. Operational Truth Governance

Although the content is editorial, every public statement must remain consistent with the real operational process.

If Ahan Asa later changes:

- technical review policy;
- documentation handling;
- commercial proposal rules;
- delivery review;
- sourcing governance;

the copy must be re-audited.

Marketing must not add a criterion simply because it “sounds trustworthy” if operations do not actually perform it.

---

# 38. Performance

Target:

```text
0 dedicated interaction JS
```

Preferred:

- server-rendered/static HTML;
- CSS layout;
- shared design-system tokens;
- no component-specific animation library;
- no network request;
- no lazy-loaded business logic.

Optional shared reveal behavior must not become a hard dependency.

This component should not be a meaningful source of:

- LCP regression;
- CLS;
- INP regression;
- long main-thread work.

---

# 39. Layout Stability

Required:

- stable section dimensions from normal content flow;
- no media-dependent height;
- no asynchronous content insertion;
- no client fetch that pushes later content;
- no font/style behavior that creates avoidable disruptive reflow.

No image is required for this section.

---

# 40. Failure Behavior

Because the component is editorial:

```text
Odoo unavailable
→ no effect

Price service unavailable
→ no effect

JavaScript unavailable
→ content remains visible

Optional motion fails
→ content remains visible
```

Missing required locale content should be caught before release.

Raw translation keys, `undefined`, placeholder copy, or mixed-language accidental fallback are release FAILS.

---

# 41. Relationship to Purchase Process

This boundary is mandatory.

## Evaluation / Assurance

Answers:

> **What is checked?**

## Purchase Process

Answers:

> **What happens, and in what sequence?**

Therefore the next Purchase Process component must not repeat detailed lists of:

- grade;
- standard;
- price basis;
- payment terms;
- delivery basis.

It may use a step called “بررسی درخواست”, but detailed evaluation criteria remain owned by this component.

---

# 42. Relationship to About / Business Transparency

The Evaluation component does not need to explain the full legal/operating model of Ahan Asa.

Detailed transparency about:

- Ahan Asa’s role;
- suppliers/processors/logistics relationships;
- what Ahan Asa owns or does not own;
- verified company identity;

belongs primarily in About and other appropriate trust surfaces.

This section stays focused on proposal evaluation.

---

# 43. Explicit Non-Goals

This component is not:

- supplier directory;
- supplier-comparison table;
- product catalog;
- price board;
- quotation table;
- process timeline;
- trust-badge strip;
- testimonial section;
- case-study section;
- manufacturing-capability claim;
- “why choose us” card grid;
- generic company-values section.

---

# 44. QA Viewports / States

Validate at minimum:

```text
320
360
375
390
430
768
1024
1280
1440
```

for:

- FA;
- AR;
- EN;
- RTL/LTR;
- 200% browser zoom;
- high text enlargement where applicable;
- reduced motion;
- JavaScript disabled.

Key QA concerns:

- no heading orphaning that materially harms scanning;
- no text collision;
- no horizontal overflow;
- no overly narrow 40/60 desktop columns;
- no accidental process-step semantics;
- no fake clickable affordance.

---

# 45. Content Regression Tests

FAIL if any future revision:

1. reintroduces an independent “آنچه ما انجام می‌دهیم” list inside this component;
2. duplicates quantity/unit across Technical and Commercial without a specific reason;
3. claims formal supplier qualification without evidence;
4. claims factory-direct / no-middleman / owned stock without verified truth;
5. introduces “best price”, guaranteed quality, guaranteed speed, or risk-free language without evidence;
6. turns the four criteria into chronological steps;
7. hides core information behind interaction;
8. adds a CTA without approved rationale;
9. requires live Odoo/API data;
10. introduces raw hardcoded claims that contradict actual operations.

---

# 46. Visual Regression Tests

FAIL if implementation becomes:

- four floating marketing cards;
- four oversized icon tiles;
- another Product-Showcase-like grid;
- dark cinematic industrial banner;
- glassmorphism panel;
- carousel/slider;
- sticky scrollytelling;
- animated checklist sequence;
- visibly interactive rows that do not perform an action.

---

# 47. Final Acceptance Matrix

| Gate | Required Result |
|---|---|
| Customer question | “What is checked before a proposal?” |
| H2 | Frozen Persian heading |
| Supporting copy | Frozen Persian copy |
| Top-level axes | Exactly 4 |
| Axis 1 | Technical Conformity |
| Axis 2 | Sourcing Feasibility; supply-side timing only |
| Axis 3 | Commercial Conditions; proposed price, not delivery-term ownership |
| Axis 4 | Delivery; canonical owner of Incoterm / delivery term |
| Quantity/unit duplication | Removed from default Technical copy |
| Quality documents | Conditional under Technical |
| Supplier qualification claim | Forbidden without governed evidence |
| Middleman emphasis | Avoided |
| False manufacturer/direct claim | Forbidden |
| Generic guarantee claims | Forbidden |
| Card grid | Forbidden |
| Icons | None by default |
| Layout | Editorial split → stacked responsive |
| Index numbers | Visual only, non-sequential semantics, always `aria-hidden` |
| Digit policy | FA ۰۱–۰۴ / AR ٠١–٠٤ / EN 01–04; `tabular-nums` |
| Semantic list | `<ul>` |
| Heading hierarchy | H2 + H3 |
| CTA | None |
| Hidden content | None |
| Carousel/accordion | None |
| Live Odoo/API dependency | None |
| Dedicated JS | None required |
| Motion | Optional, restrained, reduced-motion safe |
| Mobile | Direct vertical list |
| RTL/LTR | Shared logical implementation |
| Normal text contrast | >= 4.5:1 |
| JS failure | Content remains visible |
| Odoo failure | No effect |
| Operational truth | Mandatory |
| Raw translation keys/placeholders | FAIL |

---

# 48. Evidence / Review Notes — Internal

The final structure is consistent with the following 2026 review principles:

- Procurement specifications should clearly define product/technical requirements so pricing, quality and fit can be evaluated consistently.
- Supplier selection/qualification is a distinct procurement discipline and should not be casually claimed as a public capability without real supporting process.
- B2B buyers increasingly prefer self-directed digital research but still need credible contextual guidance and validation at important decision points.
- Consistency of information across channels is increasingly important in B2B buying journeys.

These notes support the product rationale only.

They are not Homepage copy and must not be rendered publicly.

---

# 49. Version 2.1 Hardening Changes

Version 2.1 keeps the V2.0 product architecture intact and applies only the following specification hardening:

1. Removes overlap between commercial price wording and delivery-term / Incoterm ownership.
2. Makes Axis 04 — Delivery the canonical owner of Incoterm / delivery-term meaning.
3. Rewrites Axis 02 public copy for clearer Persian and less circular sourcing language.
4. Explicitly separates supply-side sourcing lead-time constraints from customer-requested delivery timing.
5. Makes decorative index numbers always `aria-hidden="true"`.
6. Freezes locale-specific digit scripts and `tabular-nums` for FA / AR / EN.

Explicitly NOT adopted in Version 2.1:

- hidden screen-reader prefixes for H3 axis titles;
- component-level Organization/Product JSON-LD;
- mandatory certificate/person/proof content inside this component.

Those remain outside this component's semantic responsibility.

---

# 50. Version Integrity

Authoritative identity:

**AHAN ASA HOMEPAGE — EVALUATION / ASSURANCE — FINAL FROZEN V2.1**

Filename, document heading and final status must remain aligned.

Future material changes require:

- a new version;
- explicit supersession notes;
- preserved architectural history.

Do not silently overwrite this baseline.

---

# 51. Final Status

**EVALUATION / ASSURANCE V2.1 = FINAL FROZEN / APPROVED FOR IMPLEMENTATION**

This component is now frozen for:

- product role;
- Persian copy;
- four-axis architecture;
- content boundaries;
- Ahan Asa positioning;
- visual direction;
- semantics;
- accessibility;
- localization behavior;
- performance;
- failure behavior;
- acceptance criteria.

The next recommended step is an independent implementation/spec audit before coding, followed by the separate Purchase Process component freeze.
