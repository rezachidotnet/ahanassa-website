# AHANASSA Industries / Use Cases Component Freeze V1.0

**Status:** FROZEN — design and content specification; implementation not verified.
**Date:** 2026-09-08
**Locales:** FA / EN / AR

## 1. Authority and purpose

This component conforms to:
- AHANASSA_HOMEPAGE_COMPOSITION_AND_CUSTOMER_JOURNEY_FREEZE_V1.0.md
- AHANASSA_HOMEPAGE_VISUAL_SYSTEM_AND_MOTION_FREEZE_V1.0.md

It helps buyers recognize their field of purchasing. Buyer Value retains ownership of service promises; Products retains product discovery. This component is not a customer portfolio, certification display or purchase process.

## 2. Position and exact order

After Verified Evidence when eligible, otherwise after Buyer Value; before Final CTA.

The frozen item order is:
1. Construction projects — پروژه‌های ساختمانی
2. Petrochemical, oil and gas — پتروشیمی، نفت و گاز
3. Manufacturing and fabrication — تولید و ساخت

This replaces the preliminary suggestion of a multi-item/phased-purchase third item. It does not remove support for those purchasing patterns elsewhere.

Keep DOM order 1–2–3 in all locales. Desktop FA/AR reads right to left; EN reads left to right. Mobile reads top to bottom. Do not reverse the data array and also apply RTL.

## 3. Canonical Persian content

H2: تأمین آهن و فولاد برای حوزه کاری شما

### 1. پروژه‌های ساختمانی
آهن‌آلات موردنیاز پروژه را با مشخصات، مقدار و برنامه تحویل اعلام کنید تا گزینه‌های تأمین متناسب بررسی شوند.

### 2. پتروشیمی، نفت و گاز
فهرست اقلام را همراه با گرید، استاندارد و الزامات فنی و مدارک موردنیاز ارسال کنید تا امکان تأمین مطابق درخواست بررسی شود.

### 3. تولید و ساخت
نیاز کارگاه یا خط تولید را با ابعاد، جنس و الزامات ساخت مطرح کنید تا بررسی تأمین بر اساس نیاز مصرف شما انجام شود.

No extra eyebrow or introductory paragraph is required. No unsupported project counts, brands, customer logos or superiority claims may be added.

## 4. Canonical English content

H2: Iron and steel sourcing for your sector

### 1. Construction projects
Share your project’s steel requirements, including specifications, quantities and delivery schedule, so suitable sourcing options can be reviewed.

### 2. Petrochemical, oil and gas
Send your item list with the required grades, standards, technical requirements and documentation so sourcing feasibility can be assessed against your request.

### 3. Manufacturing and fabrication
Describe your workshop or production line requirements, including dimensions, material and fabrication requirements, so sourcing can be reviewed for your intended use.

## 5. Canonical Arabic content

H2: تأمين الحديد والصلب لقطاع عملك

### 1. مشاريع البناء
أرسل احتياجات المشروع من الحديد والصلب مع المواصفات والكميات وجدول التسليم، لتُدرس خيارات التوريد المناسبة.

### 2. البتروكيماويات والنفط والغاز
أرسل قائمة الأصناف مع درجات المواد والمعايير والمتطلبات الفنية والمستندات المطلوبة، لتُدرس إمكانية التوريد وفقاً لطلبك.

### 3. التصنيع والإنتاج
حدّد احتياجات الورشة أو خط الإنتاج، بما في ذلك الأبعاد ونوع المادة ومتطلبات التصنيع، لتُدرس خيارات التوريد وفقاً للاستخدام المقصود.

## 6. Visual design

Use the Content Section archetype on White #FFFFFF, within the shared Homepage container. No outer floating card, individual filled card surfaces, strong shadows or Hero grid.

Desktop: three equal columns, each with one image above its H3 and short paragraph. Use a shared 24–32px column gap and consistent alignment. Keep text below imagery, never overlaid. Section H2 is Navy #0B2545 and follows the shared responsive hierarchy; H3 is Navy and body text a contrast-checked Navy-derived color. Copper #B04A2F is optional and restrained, not a background.

Use Estedad Variable in all locales. No artificial tracking for FA/AR. Text aligns to locale reading direction, without truncation or forced fixed heights.

Images: common 4:3 aspect ratio, object-fit cover with individually verified focal points, modest 12px radius. Media geometry is reserved before loading. Below-fold images lazy-load according to existing project conventions; reuse the established image component and asset pipeline.

Section vertical rhythm follows the visual freeze: desktop 96–120px, tablet 72–88px, mobile 56–72px. Account for adjacent section spacing once, rather than doubling margins and padding. H2 to item group: 32–48px. Image to H3: 16–20px; H3 to body: 10–14px, using the shared scale.

## 7. Responsive behavior

Three columns at widths where all three approved translations remain comfortably readable; use 1024px as the initial implementation breakpoint and verify actual content fit.

Below that breakpoint, use one column with the same image → H3 → paragraph order. Do not create a two-column layout with an isolated third item, autoplay carousel or horizontal scrolling. Use standard page gutters and 32–40px between items; avoid narrow/tall text columns.

At 200% zoom, allow earlier single-column reflow. Do not hide any text or move the third item before the second to balance layout.

## 8. Image requirements

The three images represent purchasing sectors, not completed Ahan Asa projects:

1. Construction: a relevant building site or structural steel/reinforcement context.
2. Petrochemical/oil/gas: a relevant industrial facility and piping context.
3. Manufacturing/fabrication: a workshop, steel fabrication or production context.

Use a consistent photographic treatment: natural industrial photography, restrained saturation and comparable light/contrast; no collage, illustration icons or heavy color overlays. Do not repeat the Hero stockyard image or use product-packshot imagery in all three slots.

Actual assets are not delivered by this specification. Select legally usable images and retain source/license metadata internally. Avoid visible customer logos or captions implying an unverified commercial relationship. Generated imagery, if later explicitly selected, must not be described as a real Ahan Asa project or evidence of capability.

Because these images only illustrate the sectors already named in adjacent headings and add no unique information, use empty alt text. If a future image conveys meaningful additional information, supply accurate localized alt text. Never stuff keywords into alt attributes.

A failed image request must not suppress otherwise eligible text: retain stable media geometry with a quiet neutral fallback, no broken-image icon or customer-facing technical error. Do not ship the component with missing initial image assets; the fallback covers runtime failure.

## 9. Semantics, interaction and motion

Use one section with aria-labelledby pointing to its H2 and one unordered list of three items with H3 headings. No visible sequential numbers: these are sectors, not steps or a ranking.

Version 1.0 items are informational, without links, pointer cursor, hover lift, buttons or independent RFQ CTA. Navigation to detailed sector pages requires a later scoped update and verified localized routes. Do not invent routes or link all items to the same generic page.

Motion may be omitted. If the shared reveal is used, animate the group once, 350–450ms and no more than 12px vertical movement; no image zoom or sequential process effect. Content must be visible by default, without hydration or IntersectionObserver success. Reduced motion disables nonessential movement. No layout shift.

## 10. Content eligibility and operational meaning

The user selected these three sectors as the intended service scope. This is not proof of historical projects, vendor-list approval, technical certification, guaranteed material availability or guaranteed compliance with every submitted specification.

Preserve the qualified wording, especially the second sector's sourcing-feasibility review. No claim that all oil/gas grades or standards can be supplied.

Initial content can use the existing localized website content/configuration system. A new Odoo model, 100-record threshold or evidence pipeline is not required for this component. The Evidence threshold applies only to Evidence.

Publication requires the approved scope, complete accurate copy in the active locale, reviewed imagery and a server-side content enable state through existing conventions. Without eligible content omit the entire section cleanly. Do not display incomplete one-/two-item subsets in V1.0; keep the approved three-item composition. If one sector is withdrawn, disable the section until its composition is deliberately revised. Temporary image delivery failure follows section 8 rather than deleting the sector text.

## 11. Acceptance checklist

- [ ] Exact construction → petrochemical/oil/gas → manufacturing order in all locales.
- [ ] Correct H2 and all canonical localized titles and descriptions.
- [ ] White editorial section with three images; visually distinct from Buyer Value and Hero.
- [ ] Three desktop columns and one-column smaller layout; no carousel or clipping.
- [ ] Images correctly sourced, consistent, 4:3 and not presented as company case studies.
- [ ] No unsupported certifications, availability, customer relationships or volume claims.
- [ ] No item links or competing CTA in V1.0.
- [ ] Server-rendered content visible with JS disabled; reduced motion supported.
- [ ] FA/AR RTL and EN LTR, correct DOM reading order, 200% zoom and contrast checked.
- [ ] Desktop/mobile screenshots inspected in FA/EN/AR; tablet and image failure checked.
- [ ] Eligible section follows Evidence or Buyer Value and precedes Final CTA.
- [ ] Disabled section leaves no empty heading or unexplained whitespace.

## 12. Implementation boundary and next step

This freezes the component's design, content, order and behavior. It does not claim image selection, code implementation, runtime verification, deployment or migration have occurred.

Implement in the existing website architecture, preserving Header/Hero, Products, Price Strip and Buyer Value. Update documentation indexes to reference this freeze. No deployment, migration, Odoo upgrade or production-data change is authorized by this specification.

Next Homepage component for design completion: Final CTA.
