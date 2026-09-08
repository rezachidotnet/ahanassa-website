# AHAN ASA HOMEPAGE — PURCHASE PROCESS
## FINAL FROZEN V2.0

**Project:** Ahan Asa / آهن آسا  
**Component:** Homepage — Purchase Process  
**Status:** FINAL FROZEN / IMPLEMENTATION BASELINE  
**Version:** 2.0  
**Date:** 2026-09-07

---

# 1. Purpose

The Purchase Process component exists to answer one customer question:

> **از ارسال درخواست تا خرید چه اتفاقی می‌افتد؟**

Its role is:

```text
Journey Clarity
+
Expectation Setting
+
Uncertainty Reduction
```

This component describes the customer-facing operational path after a request is submitted.

It is not:

- a complete procurement SOP;
- a supplier-selection methodology;
- a repeat of the Evaluation / Assurance criteria;
- an RFQ form;
- an Odoo workflow diagram.

---

# 2. Relationship to the B2B Buyer Journey

The wider B2B buying journey may be nonlinear.

Customers may:

- research;
- compare;
- revisit requirements;
- consult colleagues;
- seek human validation;
- return to earlier decisions.

The Homepage Process component does not attempt to model that nonlinear buyer psychology.

Instead, it explains Ahan Asa's own customer-facing service flow after a request enters the procurement/request workflow.

Frozen distinction:

```text
Buyer Journey
≠
Ahan Asa Operational Process
```

---

# 3. Position in Homepage

Intended sequence:

```text
Product Showcase
↓
Evaluation / Assurance
↓
Purchase Process
↓
Later conditional sections
↓
Final CTA
```

Evaluation / Assurance answers:

> **چه چیزهایی بررسی می‌شود؟**

Purchase Process answers:

> **چه اتفاقی می‌افتد و به چه ترتیب؟**

These responsibilities must remain separate.

---

# 4. Frozen Heading Direction

Preferred Persian H2:

**از ارسال درخواست تا خرید چه اتفاقی می‌افتد؟**

This title is direct, customer-centered, and action-oriented.

Do not replace it with generic headings such as:

- روند خرید
- مراحل همکاری
- فرآیند ما
- نحوه کار ما
- مسیر تأمین

without a new approved content decision.

---

# 5. Supporting Copy

No separate supporting paragraph is used by default.

Reason:

The H2 already frames the customer question clearly, and the four steps answer it immediately.

Adding generic copy such as:

> «درخواست شما در چند گام روشن پیش می‌رود.»

does not add enough new information to justify extra visual/cognitive weight.

Frozen rule:

```text
H2
↓
4-step process
```

Not:

```text
H2
↓
generic explanatory paragraph
↓
4-step process
```

---

# 6. Exactly Four Homepage Steps

The Homepage uses exactly four customer-facing steps:

1. **ارسال درخواست**
2. **بررسی درخواست**
3. **دریافت پیشنهاد**
4. **تأیید و پیگیری سفارش**

These are a simplified public representation of the customer-facing flow.

They are not intended to expose every internal procurement, sourcing, approval, accounting, logistics, or Odoo state.

---

# 7. Step 01 — ارسال درخواست

## 7.1 Customer question

> How do I start?

## 7.2 Preferred public copy

**لیست خرید یا مشخصات نیاز خود را ارسال می‌کنید.**

## 7.3 Governance

The Homepage copy must only name input formats that are actually available at launch.

Do not claim support for:

- photo OCR;
- voice input;
- drawing interpretation;
- Excel/PDF extraction;

until those capabilities are actually public and validated.

The request-entry architecture may expand later without changing the conceptual role of this step.

---

# 8. Step 02 — بررسی درخواست

## 8.1 Customer question

> What happens to my request after I send it?

## 8.2 Preferred public copy

**درخواست بررسی می‌شود و اگر اطلاعاتی برای تکمیل آن لازم باشد، با شما هماهنگ می‌کنیم.**

## 8.3 Boundary with Evaluation / Assurance

This step must NOT repeat:

- grade;
- standard;
- technical documentation;
- sourcing feasibility;
- price basis;
- payment terms;
- Incoterm;
- delivery criteria.

Those details belong to Evaluation / Assurance.

Here, “بررسی درخواست” is a process state, not an evaluation checklist.

---

# 9. Step 03 — دریافت پیشنهاد

## 9.1 Customer question

> What do I receive before I decide?

## 9.2 Preferred public copy

**پیشنهاد و شرایط مرتبط برای بررسی و تصمیم‌گیری شما ارائه می‌شود.**

## 9.3 Governance

This step communicates a decision point.

It must not promise:

- multiple competing quotations every time;
- lowest price;
- guaranteed availability;
- guaranteed delivery;
- fixed response time unless an actual SLA exists.

The customer must remain free to review the proposal before commitment.

---

# 10. Step 04 — تأیید و پیگیری سفارش

## 10.1 Customer question

> What happens if I accept?

## 10.2 Preferred public copy

**پس از تأیید پیشنهاد، سفارش بر اساس شرایط توافق‌شده وارد مرحله اجرا و پیگیری می‌شود.**

## 10.3 Why “تأیید و پیگیری سفارش”

This wording is broader and safer than a narrow delivery-only or manufacturing-only label.

The request domain may support:

- material purchase;
- material + processing;
- processing-only;
- drawing-based fabricated requirements.

The phrase “پیگیری سفارش” remains customer-centered while avoiding a false implication that every order follows the same physical execution path.

The public copy must not imply a logistics/delivery obligation beyond the actual agreed commercial terms.

---

# 11. Customer Control Principle

The process must communicate that a customer decision occurs before execution.

Frozen principle:

```text
Request
↓
Review
↓
Proposal
↓
Customer approval
↓
Execution
```

Not:

```text
Request
↓
Automatic purchase/order commitment
```

This is consistent with the previously frozen rule that submitting a request does not by itself create a purchase commitment.

---

# 12. No Internal Procurement Theater

Do not expose internal steps merely to make the process look sophisticated.

Homepage does not need to show:

- supplier discovery;
- supplier RFQ;
- comparison matrix;
- manager approval;
- PO issuance;
- accounting workflow;
- warehouse receipt;
- invoice matching;
- Odoo state transitions.

Those may exist operationally.

They do not belong in the public Homepage Process unless they materially help the customer make a decision.

---

# 13. No Supplier / Middleman Emphasis

The Process component must not narrate the chain as:

```text
You send request
↓
We ask several sellers
↓
We buy from one seller
↓
We resell to you
```

That explanation centers intermediary mechanics rather than customer value.

Preferred positioning:

```text
one request
↓
controlled review
↓
clear proposal
↓
approved execution
```

The component must also not imply direct manufacturer ownership when it is not true.

Frozen positioning principle:

> **Show the controlled buying path, not the middleman chain.**

---

# 14. Visual Architecture

The Process component should be visually distinct from both:

- Product Showcase card grid;
- Evaluation / Assurance editorial list.

Preferred desktop direction:

```text
Horizontal 4-step timeline / connected sequence
```

Conceptually:

```text
01  ارسال درخواست
────
02  بررسی درخواست
────
03  دریافت پیشنهاد
────
04  تأیید و پیگیری سفارش
```

The connecting line communicates chronology.

Frozen responsive model:

```text
Horizontal 4-step timeline
↓ when content no longer fits comfortably
Vertical 4-step timeline
```

A 2×2 process layout is NOT approved.

Reason:

A 2×2 grid can introduce ambiguous reading direction and weaken the chronological model.

---

# 15. No Four-Card Grid

The four steps must not default to four independent floating cards.

Reason:

- chronology should be visually obvious;
- cards suggest independent options rather than sequence;
- Product Showcase already owns the card-grid visual language.

Preferred:

```text
Timeline
Stepper-like editorial sequence
Connected flow
```

Not:

```text
Four marketing cards
```

Default visual rule:

- no icons;
- no illustrative image;
- no card shadows;
- no decorative boxes.

The connector + typography + numbering are sufficient visual structure.

---

# 16. Step Numbers

The visible indexes:

```text
01
02
03
04
```

are semantically meaningful because the Process is sequential.

Unlike Evaluation / Assurance, these numbers represent real order.

Therefore:

- the ordered list (`<ol>`) is the semantic source of sequence;
- custom visible indexes are decorative;
- custom visible indexes are always `aria-hidden="true"`;
- assistive technology relies on the ordered-list semantics, not the decorative number glyphs.

Frozen semantic model:

```text
<ol> = sequence semantics
custom 01/02/03/04 = visual scanning only
```

---

# 17. Semantic HTML

Preferred structure:

```html
<section aria-labelledby="purchase-process-heading">
  <div>
    <h2 id="purchase-process-heading">...</h2>
    <p>...</p>
  </div>

  <ol>
    <li>
      <h3>ارسال درخواست</h3>
      <p>...</p>
    </li>
    ...
  </ol>
</section>
```

Frozen semantic decision:

**Use `<ol>` by default.**

Reason:

The sequence is meaningful.

This is intentionally different from Evaluation / Assurance, which uses `<ul>` because its axes are not chronological.

---

# 18. Mobile Layout

Desktop horizontal chronology becomes a vertical timeline when localized content no longer fits comfortably.

No intermediate 2×2 process layout is used.

Preferred mobile order:

```text
Heading
Supporting

01 — ارسال درخواست
|
02 — بررسی درخواست
|
03 — دریافت پیشنهاد
|
04 — تأیید و اجرا
```

No horizontal swipe.

No carousel.

No “tap to reveal next step.”

All four steps remain visible.

---

# 19. Responsive Behavior

Breakpoints follow actual content fit.

The horizontal timeline may collapse to vertical before a framework-default mobile breakpoint if localized content becomes cramped.

Must pass in:

```text
FA
AR
EN
RTL
LTR
```

without:

- clipped labels;
- compressed unreadable steps;
- overlapping connector lines;
- horizontal document overflow.

---

# 20. Visual Surface

Preferred direction:

- clean light/white surface;
- navy typography;
- restrained copper step markers / connector accents;
- generous whitespace;
- no heavy border boxes;
- no industrial stock imagery;
- no icons by default;
- no illustrative image.

This visual direction intentionally contrasts with the warm-neutral Evaluation / Assurance section immediately before it.

---

# 21. Motion

Motion is optional and must reinforce chronology without making the user wait.

Approved maximum direction:

- one soft section reveal for the section as a whole;
- no animation prerequisite for reading.

Frozen rule:

> **The process connector itself must not animate or progressively fill.**

Reason:

An animated connector can resemble a live order-status/progress tracker rather than an explanatory Homepage process.

Not approved:

- “step completion” animation;
- animated progress that suggests a live order;
- autoplay timeline;
- bouncing nodes;
- long stagger;
- scroll hijacking;
- pinned scrollytelling.

`prefers-reduced-motion` must be respected.

---

# 22. No Fake Live Progress

The Homepage Process is explanatory.

It must never visually resemble:

- a real customer order tracker;
- live fulfillment status;
- current RFQ status;
- completed/in-progress order states.

Do not use:

- green completed checkmarks;
- “current step” indicator;
- animated progress bar;
- pseudo-status states;

unless the component is later transformed into an authenticated real order-status feature.

---

# 23. CTA

Default decision:

**No dedicated CTA inside this component.**

Reason:

The component explains the journey.

The page already has:

- Header CTA;
- Hero CTA;
- Final CTA.

If a future `/process` page exists and contains meaningful additional content, a low-weight text link may be considered only in a later approved version.

For V2.0:

```text
CTA = none
```

Do not add a conversion button merely because the component ends with Step 04.

---

# 24. Trust / Reassurance

The component does not need to repeat the Hero sentence:

> ارسال لیست خرید برای شما تعهدی ایجاد نمی‌کند...

The customer-control principle is already embedded in Step 04:

> execution starts after proposal/terms approval.

Avoid repeated reassurance copy unless usability testing shows users still misunderstand commitment.

---

# 25. Human Interaction

The Process may communicate human contact where it adds clarity.

Step 02 already states that Ahan Asa may coordinate with the customer if information is incomplete.

This is sufficient for the Homepage.

Do not add:

- “dedicated account manager”;
- “expert assigned to every request”;
- “24/7 support”;

unless those services are operationally true.

---

# 26. Timing / SLA Claims

No exact response-time or delivery-time claim is included by default.

Do not publish:

- quote in X minutes;
- response within X hours;
- delivery in X days;

unless an actual measured and governed SLA exists.

A later SLA may be introduced as verified proof, not aspirational copy.

---

# 27. Architecture / Data Boundary

This is an editorial process-explanation component.

It does not need:

- Odoo API;
- Public Product Projection;
- Public Processing Projection;
- RFQ live state;
- client fetch;
- order data.

Conceptually:

```text
Localized website content
↓
SSR/static HTML
↓
Purchase Process
```

---

# 28. Performance

Target:

```text
0 dedicated interaction JS
```

Preferred:

- semantic HTML;
- CSS layout;
- shared motion primitive only if already available;
- no component-specific animation package;
- no network request.

The component must not materially contribute to LCP, CLS or INP regression.

---

# 29. Failure Behavior

Required:

```text
JavaScript unavailable
→ all steps remain visible

Odoo unavailable
→ no effect

RFQ API unavailable
→ explanatory Process still renders

Optional animation unavailable
→ no effect on comprehension
```

Raw translation keys, placeholders, or mixed-locale copy are release FAILS.

---

# 30. Accessibility

Required:

- semantic `<section>`;
- H2 section heading;
- H3 step headings;
- ordered list semantics;
- readable chronology without color alone;
- correct DOM reading order;
- visible text at zoom/text enlargement;
- no interaction required to access content;
- no horizontal scroll.

WCAG 2.2 AA remains the site baseline.

---

# 31. Contrast

Required normal-size text:

```text
>= 4.5:1
```

Meaningful connector/node graphics that are required to understand chronology should satisfy applicable non-text contrast requirements.

Chronology must remain understandable even if decorative connector colors are not perceived.

---

# 32. Locale / Digit Policy

Visible sequential indexes follow locale:

```text
FA → ۰۱ ۰۲ ۰۳ ۰۴
AR → ٠١ ٠٢ ٠٣ ٠٤
EN → 01 02 03 04
```

Frozen default:

```css
font-variant-numeric: tabular-nums;
```

Custom visible index numbers are always `aria-hidden="true"`.

The underlying semantic order remains the `<ol>` order, independent of visible digit shaping.

---

# 33. RTL / LTR

One shared component supports:

```text
FA → RTL
AR → RTL
EN → LTR
```

On desktop, sequence direction must follow the locale’s logical inline direction.

Do not create independent manually divergent process components per locale.

Connector logic must use direction-aware layout.

---

# 34. Content Governance

The four public steps describe the real external experience.

If actual operations later diverge materially, the content must be updated.

Do not add fictional sophistication.

Do not remove a meaningful customer decision or approval point merely to make the visual process appear shorter.

---

# 35. Relationship to Odoo Workflow

The public four-step Process is not a one-to-one mapping to Odoo workflow states.

Many internal states may exist between public steps.

Frozen rule:

```text
Public Process = customer-understandable abstraction

NOT

Public Process = exposed ERP state machine
```

Implementation must not couple Homepage labels to unstable internal technical state names.

---

# 36. Explicit Non-Goals

This component is not:

- live RFQ tracker;
- order tracker;
- supplier-comparison interface;
- technical-evaluation matrix;
- logistics dashboard;
- FAQ;
- testimonial section;
- trust-badge row;
- checkout;
- payment flow;
- complete procurement lifecycle diagram.

---

# 37. Initial Acceptance Matrix

| Gate | Required Result |
|---|---|
| Role | Journey clarity / uncertainty reduction |
| H2 | «از ارسال درخواست تا خرید چه اتفاقی می‌افتد؟» |
| Step count | Exactly 4 |
| Step 1 | ارسال درخواست |
| Step 2 | بررسی درخواست |
| Step 3 | دریافت پیشنهاد |
| Step 4 | تأیید و پیگیری سفارش |
| Evaluation criteria duplication | Forbidden |
| Internal procurement steps | Hidden unless customer-value relevant |
| Middleman chain emphasis | Forbidden |
| False manufacturer/direct claim | Forbidden |
| Customer approval before execution | Required |
| Layout desktop | Connected horizontal sequence |
| Layout mobile | Connected vertical sequence |
| Four-card grid | Forbidden |
| 2×2 layout | Forbidden |
| Semantic list | `<ol>` |
| Carousel | Forbidden |
| Accordion | Forbidden |
| Fake live progress | Forbidden |
| CTA | None |
| SLA claims | None without governed evidence |
| Odoo/API dependency | None |
| Dedicated JS | None required |
| Connector animation | Forbidden |
| Reduced motion | Required |
| RTL/LTR | Shared direction-aware implementation |
| Normal text contrast | >= 4.5:1 |
| JS failure | All content remains visible |
| Operational truth | Required |

---

# 38. Final Regression Gates

Implementation FAILS if it:

1. reintroduces detailed Evaluation criteria into the Process steps;
2. adds internal supplier/RFQ/PO/accounting states merely to make the process look sophisticated;
3. shows a 2×2 process grid;
4. uses a four-card marketing layout;
5. animates/fills the connector like a live progress tracker;
6. uses completed/current-step status styling for a generic Homepage explanation;
7. adds icons or illustrations merely for decoration;
8. adds a CTA without a new approved conversion decision;
9. implies that request submission itself creates a purchase commitment;
10. implies direct-manufacturer ownership or “no middleman” status without verified truth;
11. promises response/delivery timing without a governed SLA;
12. requires live Odoo/API/RFQ data;
13. hides steps behind interaction;
14. breaks logical order in FA/AR/EN;
15. exposes raw translation keys/placeholders.

---

# 39. Final Acceptance Matrix

| Gate | Required Result |
|---|---|
| Customer question | What happens after I submit a request? |
| H2 | «از ارسال درخواست تا خرید چه اتفاقی می‌افتد؟» |
| Supporting paragraph | None by default |
| Step count | Exactly 4 |
| Step 1 | ارسال درخواست |
| Step 2 | بررسی درخواست |
| Step 3 | دریافت پیشنهاد |
| Step 4 | تأیید و پیگیری سفارش |
| Customer approval before execution | Required |
| Evaluation criteria duplication | Forbidden |
| Internal procurement theater | Forbidden |
| Middleman chain emphasis | Forbidden |
| False manufacturer/direct claim | Forbidden |
| Desktop layout | Horizontal connected timeline |
| Intermediate 2×2 | Forbidden |
| Narrow/mobile layout | Vertical connected timeline |
| Four-card grid | Forbidden |
| Icons | None by default |
| Images | None |
| Semantic sequence | `<ol>` |
| Custom visible indexes | Localized + always `aria-hidden="true"` |
| Digit policy | FA ۰۱–۰۴ / AR ٠١–٠٤ / EN 01–04 |
| `tabular-nums` | Required default |
| Connector | Static |
| Animated progress | Forbidden |
| Carousel / Accordion | Forbidden |
| CTA | None |
| SLA claims | None without governed evidence |
| Odoo/API dependency | None |
| Dedicated JS | None required |
| Reduced motion | Required |
| RTL/LTR | Shared direction-aware implementation |
| Normal text contrast | >= 4.5:1 |
| JS failure | All content remains visible |
| Operational truth | Required |

---

# 40. Version Integrity

Authoritative identity:

**AHAN ASA HOMEPAGE — PURCHASE PROCESS — FINAL FROZEN V2.0**

Filename, document heading and final status must remain aligned.

Future material changes require:

- a new version;
- explicit supersession notes;
- preserved architectural history.

Do not silently overwrite this baseline.

---

# 41. Final Status

**PURCHASE PROCESS V2.0 = FINAL FROZEN / APPROVED FOR IMPLEMENTATION AUDIT**

This component is now frozen for:

- role;
- Persian H2;
- four-step customer-facing process;
- step copy;
- customer approval point;
- visual timeline direction;
- mobile behavior;
- semantic sequence;
- accessibility;
- localization;
- motion;
- performance;
- failure behavior;
- regression criteria.

The next recommended action is independent audit before implementation.
