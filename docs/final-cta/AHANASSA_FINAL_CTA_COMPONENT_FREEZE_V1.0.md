# AHANASSA Final CTA Component Freeze V1.0

**Status:** FROZEN — content and design; code and runtime verification not performed.
**Date:** 2026-09-08
**Applies to:** Homepage FA / EN / AR

## 1. Authority, purpose and position

Conforms to:
- AHANASSA_HOMEPAGE_COMPOSITION_AND_CUSTOMER_JOURNEY_FREEZE_V1.0.md
- AHANASSA_HOMEPAGE_VISUAL_SYSTEM_AND_MOTION_FREEZE_V1.0.md
- Existing approved Header/Hero RFQ destinations and CTA geometry.

Final CTA is always present as the last Homepage content section, before the global Footer. It follows the last eligible section: Industries, otherwise Evidence, otherwise Buyer Value. Its availability does not depend on products, price data, evidence thresholds or industry content.

Its sole conversion goal is sending a purchase list / submitting an RFQ. Telephone contact is a secondary alternative toward the same purchasing goal. The section does not introduce checkout, a new form, instant quotation or a purchase commitment.

## 2. Canonical FA content

H2: لیست خرید آهن شما از همین‌جا شروع می‌شود

Supporting text: اقلام موردنیازتان را ارسال کنید تا کارشناس آهن آسا، مشخصات و شرایط درخواست شما را بررسی و پیگیری کند.

Primary CTA: ارسال لیست خرید
Secondary CTA: درخواست قیمت تلفنی
Reassurance: ارسال درخواست، تعهدی برای خرید ایجاد نمی‌کند.

## 3. Canonical EN content

H2: Start your steel purchase request here

Supporting text: Send the items you need so an Ahan Asa specialist can review the specifications and requirements and follow up on your request.

Primary CTA: Send your purchase list
Secondary CTA: Request pricing by phone
Reassurance: Submitting a request does not commit you to a purchase.

## 4. Canonical AR content

H2: ابدأ طلب شراء الحديد من هنا

Supporting text: أرسل الأصناف التي تحتاجها ليراجع خبير آهن آسا المواصفات ومتطلبات الشراء ويتابع طلبك.

Primary CTA: أرسل قائمة مشترياتك
Secondary CTA: استفسر عن الأسعار هاتفياً
Reassurance: إرسال الطلب لا يلزمك بالشراء.

## 5. Content boundaries

No eyebrow, process steps, product list, testimonials, counters, contact form, upload widget or additional paragraph in V1.0. The reassurance is visible normal text next to the action area, not a tooltip or legal footer footnote.

No claims of cheapest/best/fastest, guaranteed stock, guaranteed response time or automatic fulfillment. No claim that attaching photos, voice messages or spreadsheets is supported until the actual RFQ flow supports it. The button leads to the existing list-entry flow; it does not itself upload or send anything.

## 6. Visual treatment

Use a full-width Steel Navy #0B2545 section with the shared Homepage container. It is a simple emphasis surface, not another Hero composition.

No large Cream inset card, engineering grid, background photo, image panel, decorative SVG, hero-sized radius, heavy shadow or gradients. No generated artwork is needed.

Heading: Warm Cream #FBF5EB. Body and reassurance: White or a contrast-verified light brand token. Normal text contrast at least 4.5:1; large headings at least 3:1. Avoid arbitrary opacity that makes secondary text unreadable.

Desktop: two columns, approximately 60% copy / 40% action area, adjusted for translated content. Heading and supporting text at the reading-start side; action area at reading-end. FA/AR reads from right; EN from left.

Primary and secondary buttons can sit side by side when their full labels fit. Reassurance is directly below the pair and visually associated with both. Stack buttons when necessary; never truncate labels or force four-word English labels into a narrow width.

Mobile/tablet where two columns become crowded: one column in semantic order H2 → supporting paragraph → primary → secondary → reassurance. At mobile widths buttons fill the available content width and stack with a 12–16px gap.

Initial two-column breakpoint: 1024px, subject to actual FA/EN/AR content fit. Use shared gutters; no horizontal scrolling. Text must remain readable at 200% zoom and reflow without clipping.

## 7. Buttons and destinations

Primary button: Warm Cream filled with Navy text. Secondary: transparent Navy surface with a visible light outline and light text. This inversion maintains filled-primary/outline-secondary hierarchy on the dark section.

Both use the approved geometry: 48–52px target height, 6–8px radius, 24–32px horizontal padding, 15–16px text at weight 600, desktop minimum width around 180px. At text zoom allow height to grow instead of clipping.

Primary MUST use the same canonical locale-aware RFQ destination/helper as the approved Hero. Discover the actual destination in code; do not hard-code /request or /contact from memory and do not create a new route merely for Final CTA. Preserve existing query/context behavior only where it is part of the approved RFQ contract.

Secondary MUST reuse the verified telephone-pricing behavior of the Hero. If that is tel:, use the verified configured business number; if it is a callback/request flow, reuse that flow and its truthful label. Do not invent a number, callback modal or business hours. If no verified working telephone destination is available, omit only the secondary action and report the configuration gap; the primary and section stay present.

Use semantic links for navigation/telephone URLs, or a real button only for an existing action that requires it. Keep navigation in the same tab unless the established destination requires otherwise. No nested interactive elements, disabled-looking fake links or entire-section click target.

Do not infer a sales conversion from a CTA click. If analytics already exists, use its approved non-PII event convention and distinguish primary vs phone click. Do not introduce a new analytics provider or send RFQ contents to analytics.

## 8. Typography and spacing

Estedad Variable across locales; true RTL for FA/AR, LTR for EN. No Persian/Arabic letter-spacing. H2 follows the shared heading scale and stays visually subordinate to Hero H1. Heading/supporting text have a constrained reading width, not full-viewport lines. No forced line breaks that only fit Persian.

Section vertical padding follows the global scale: desktop 96–120px, tablet 72–88px, mobile 56–72px. Heading to supporting text 12–16px. Copy-to-actions gap when stacked 24–32px. Reassurance gap 12–16px. Avoid adding both external spacing and equivalent section padding at the same boundary.

## 9. Adjacent sections and Footer boundary

Maintain the existing White/Cream breathing space before this Navy surface. Current Industries and Evidence designs are light; Buyer Value is Cream. Never insert an empty placeholder section to separate conditional sections.

Footer remains a separate semantic global element. If Footer is also Navy, visually distinguish the boundary with a restrained light divider and deliberate independent padding; no unrelated light content section is inserted into the frozen composition. Preserve Footer links, copy and ownership. This is a specific boundary treatment within the visual freeze's allowed deliberate transition, not authorization to redesign Footer.

## 10. Motion, accessibility and semantics

Use a section with aria-labelledby pointing to one H2. Do not add a second H1. DOM order follows the content/action order; CSS must not produce a conflicting screen-reader order.

No entrance animation is required. If the existing shared reveal is applied, it runs once, 350–450ms, maximum 12px displacement and never blocks visibility. All content and links must work without client-side motion or hydration. Reduced motion disables nonessential movement.

Hover/active color or border transitions: 150–200ms. No bounce, pulse, automatic attention loop or elevated card motion. Do not use Copper for small text if it fails contrast on Navy. Optional arrows must be decorative and locale-aware; no external icon dependency solely for this section.

Keyboard focus must remain visible against both light button and Navy background, using a contrast-checked offset outline. Touch targets follow approved geometry. Ensure focus is not clipped by overflow rules.

## 11. Failure behavior and eligibility

Final CTA has no data eligibility threshold or evidence feature flag. It must remain visible when Price, Products, Evidence or Industries fail or are omitted.

RFQ endpoint outage does not justify a fake success state. Preserve the existing destination's truthful error/retry behavior; this component itself submits no request. Missing phone configuration follows section 7. Missing primary route/configuration is a release defect that must be fixed or reported, not replaced with # or a fabricated route.

All locale copy is static approved content in the existing localization system. Do not depend on Odoo availability to obtain CTA text or route labels.

## 12. Acceptance checklist

- [ ] Last Homepage content section before Footer in every conditional-data state.
- [ ] Exact approved FA/EN/AR heading, supporting text, labels and reassurance.
- [ ] Filled primary / outlined secondary hierarchy on simple Navy surface.
- [ ] No Hero duplication, imagery, process steps or competing conversion goal.
- [ ] Primary matches the actual approved locale-aware RFQ route and resolves correctly.
- [ ] Telephone behavior and number/config are verified; absent config is reported, not invented.
- [ ] Clear boundary with a dark Footer, if applicable.
- [ ] Desktop/tablet/mobile content fit and buttons verified in FA/EN/AR.
- [ ] No clipping or horizontal overflow at 200% zoom.
- [ ] Contrast, keyboard focus, reading order, JS-disabled and reduced-motion checks pass.
- [ ] Conditional component failures do not suppress Final CTA.
- [ ] No unsupported response-time, stock, attachment or automatic-purchase claims.

## 13. Implementation handoff

Read this file and the existing Homepage visual/composition freezes. Inspect repository instructions, current branch/HEAD and existing work first. Reuse the current Final CTA component and shared route/button/localization helpers where practical; do not create a duplicate section.

Implement only the required copy, geometry, responsive behavior and Homepage placement. Preserve Header, Hero, RFQ, Products, Price, Buyer Value, Evidence and Industries behavior. Update documentation references to this freeze. Retain historical specifications and mark conflicting old Final CTA content superseded for Homepage rather than deleting history.

Verify actual before/after screenshots at FA/EN/AR desktop and mobile, plus tablet, keyboard, reduced motion and JS disabled. Run relevant existing checks; do not describe unrun checks as passing. Report exact changed paths, route verification, screenshot paths and unresolved configuration.

No deploy, migration, Odoo upgrade, remote push or merge is authorized by this document. Follow existing explicit session authorization for commits; otherwise leave changes locally reviewable.

## 14. Freeze summary

Final CTA content, appearance and behavior are frozen. Image assets are not required. Repository implementation and runtime validation remain separate work. Operational Evidence policy finalization and verification of Footer's existing specification remain separate outstanding items; this document does not close them.
