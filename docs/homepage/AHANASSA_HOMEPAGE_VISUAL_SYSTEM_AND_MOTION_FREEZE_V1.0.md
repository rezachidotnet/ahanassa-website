# AHANASSA Homepage Visual System & Motion Freeze V1.0

**Status:** FROZEN  
**Decision class:** Homepage-wide visual and motion governance  
**Applies to:** Ahan Asa public Homepage — FA / EN / AR  
**Primary direction:** FA / RTL  
**Brand basis:** Ahan Asa Brand Guidelines, UX/UI Design Guidelines, Motion Guidelines  
**Freeze date:** 2026-09-08  

---

## 1. Purpose

This document freezes the shared visual language, surface hierarchy, color discipline, spacing rhythm, responsive behavior, and motion policy for the Ahan Asa Homepage.

Its purpose is to ensure that Homepage components feel like one coherent B2B steel-procurement experience without repeating the same card treatment for every section.

The central visual decision is:

> **The Hero is the Homepage flagship surface. It establishes the visual identity of the page, but it is not a reusable visual template for every later component.**

Later sections MUST continue the same brand system through color, typography, geometry, spacing, and restrained motion while using surface patterns appropriate to their own job in the customer journey.

---

## 2. Scope

This freeze governs:

- Homepage color usage and relative visual weight;
- surface and section archetypes;
- Hero visual role;
- card, border, radius, and shadow hierarchy;
- typography behavior at the system level;
- responsive layout principles;
- section spacing and visual rhythm;
- entrance, scroll, hover, focus, and reduced-motion behavior;
- progressive-enhancement requirements;
- visual acceptance criteria for future Homepage components.

## 3. Explicitly outside this freeze

This document does **not** freeze:

- final Homepage component order;
- Customer Journey composition;
- component inclusion or removal decisions;
- the detailed content or layout of Buyer Value / Service Promise;
- Product Showcase data eligibility or Odoo synchronization;
- Price Strip data-provider rules;
- the final design of a dedicated `/process` page;
- changes to the already approved Header or Hero content architecture.

Those decisions belong to their dedicated architecture, component, data, or implementation documents.

---

## 4. Brand character to be expressed

The Homepage MUST communicate:

- professional control rather than retail excitement;
- clarity rather than visual density;
- human accountability rather than anonymous automation;
- industrial competence without becoming cold or mechanical;
- calm confidence rather than exaggerated urgency;
- procurement partnership rather than marketplace spectacle.

The design SHOULD feel engineered, deliberate, spacious, and trustworthy.

---

## 5. Canonical color system

| Token | Canonical value | Primary purpose |
|---|---:|---|
| Steel Navy | `#0B2545` | Trust, authority, primary headings, primary CTA, high-emphasis surfaces |
| Forge Copper | `#B04A2F` | Controlled emphasis, labels, numbers, rules, small interaction accents |
| Warm Cream | `#FBF5EB` | Warm editorial surfaces, flagship Hero card, selected narrative sections |
| White | `#FFFFFF` | Clarity, product/data surfaces, breathing space |

### 5.1 Page-level color balance

The target visual balance across the Homepage is:

- **60–75%** White and Warm Cream;
- **20–35%** Steel Navy;
- **5–10%** Forge Copper.

These percentages are compositional guidance, not pixel-count release gates. Their purpose is to prevent both excessive darkness and excessive accent color.

### 5.2 Copper discipline

Forge Copper MUST remain scarce and intentional.

It MAY be used for:

- eyebrow labels;
- small step or item numbers;
- short decorative rules;
- selected icon details;
- restrained hover or active-state accents;
- verified proof emphasis where contrast is sufficient.

It MUST NOT be used as:

- the dominant Homepage background;
- the default background for all buttons;
- the color of every heading;
- the only indicator of state;
- small body text on Steel Navy without verified contrast;
- a decorative accent repeated on every visible element.

### 5.3 Neutral and muted colors

Muted text, borders, and grid lines MUST be derived from the approved neutral or Steel Navy family. Arbitrary cool greys that visually disconnect from the brand SHOULD NOT be introduced.

Color MUST NOT be the only means of communicating state, priority, selection, error, or success.

---

## 6. Surface hierarchy

The Homepage uses three canonical surface archetypes.

### 6.1 Flagship Surface

**Primary use:** Hero; Final CTA may use a simplified variation.

Characteristics:

- strong brand field, normally Steel Navy;
- one clear dominant inner surface;
- generous spacing;
- high visual hierarchy;
- largest permitted radius;
- limited use across the page.

The complete Hero treatment — Navy field, engineering grid, large Cream card, image, and large-radius geometry — MUST NOT be repeated for ordinary Homepage sections.

### 6.2 Content Section

**Primary use:** Product Showcase, Buyer Value / Service Promise, Industries / Use Cases.

Characteristics:

- White or Warm Cream background;
- content aligned directly to the shared page container;
- clear H2 and supporting copy;
- cards used only when items are independently actionable, selectable, or semantically distinct;
- flat grouped layouts preferred for related promises or explanations.

### 6.3 Evidence / Data Band

**Primary use:** Price Strip, Verified Evidence, operational proof.

Characteristics:

- compact vertical footprint;
- strong information hierarchy;
- subtle borders and small-to-medium radius;
- minimal or no decorative imagery;
- no promotional motion;
- source, timestamp, status, and qualification visible when required by the component’s data contract.

---

## 7. Anti-pattern: Card Soup

The Homepage MUST NOT become a sequence of visually identical rounded cards.

Specifically prohibited:

- placing every section inside a large floating card;
- placing multiple layers of cards inside cards without functional need;
- giving informational promises the same treatment as clickable product cards;
- reusing Hero-scale radius and padding for normal content;
- using shadows as the primary means of separating every block;
- repeating numbered four-card layouts merely because four content items exist.

Different customer-journey jobs MUST be visually distinguishable through surface type, density, grouping, and hierarchy.

---

## 8. Hero visual role

The current Hero direction is approved as the Homepage visual anchor:

- full-width Steel Navy field;
- static, low-contrast engineering grid;
- large Warm Cream flagship card;
- natural industrial steel photography;
- Steel Navy headline and primary copy;
- restrained Forge Copper eyebrow and micro-emphasis;
- primary filled CTA and equal-height secondary outline CTA.

### 8.1 Hero-specific controls

- The engineering grid MUST remain static and decorative.
- The grid MUST be `aria-hidden` or implemented as a non-semantic background.
- Hero outer radius SHOULD be approximately `24–28px` on desktop, `20px` on tablet, and `16px` on mobile.
- Hero image radius SHOULD be `14–16px` on desktop and scale down with the surface.
- Hero SHOULD rely on contrast and spacing rather than a strong shadow.
- The H1 MUST use responsive sizing and MUST NOT overflow or dominate smaller desktop widths.
- The Persian canonical spelling is `تأمین فولاد پروژه‌ها`.
- The line `ما مراقب سرمایه شما هستیم.` MUST be spatially associated with the supporting value/CTA area and MUST NOT appear visually orphaned at the bottom of the card.
- Desktop image and copy MUST remain visually balanced; neither side may appear as a secondary afterthought.

### 8.2 Mobile content order

Unless a later validated mobile test establishes a better outcome, the preferred semantic and visual order is:

1. eyebrow;
2. H1;
3. supporting statement;
4. short purchase path;
5. primary and secondary CTA;
6. supporting reassurance;
7. image.

The primary CTA MUST remain discoverable without requiring the user to scroll past a large image.

---

## 9. Component-level visual direction

| Component class | Frozen visual direction |
|---|---|
| Hero | Cream flagship card on a Navy engineering field |
| Price Strip | Compact White/Cream data band; no promotional ticker behavior |
| Product Showcase | Light section with independently actionable product cards and stable 4:3 imagery |
| Buyer Value / Service Promise | One coherent flat group with dividers; not four heavy floating cards |
| Verified Evidence | Restrained proof/data band; rendered only from eligible evidence |
| Industries / Use Cases | Light editorial/image section using real, relevant content |
| Final CTA | Simplified Navy high-emphasis surface; MUST NOT duplicate the complete Hero composition |

These directions define visual roles only. They do not decide whether conditional components are eligible to render.

---

## 10. Buyer Value visual constraint

The future Buyer Value / Service Promise component MUST be visually different from:

- the Hero’s four-step micro-journey;
- Product Showcase cards;
- the retired numbered process/evaluation treatments.

Preferred pattern:

- White or Warm Cream section;
- one H2 and one short supporting paragraph;
- four promises presented as a coherent flat grid;
- thin dividers instead of four elevated containers;
- small Copper number or marker;
- no generic stock icons such as handshake, truck, shield, or checkmark unless an icon system is later explicitly approved;
- desktop layout selected between four columns and a 2×2 grid based on final copy length;
- single-column mobile layout with clear dividers.

This constraint does not freeze the component’s final copy or detailed layout.

---

## 11. Geometry tokens

| Element | Target radius |
|---|---:|
| Hero flagship card | `24–28px` desktop; `20px` tablet; `16px` mobile |
| Hero image | `14–16px` |
| Standard product/action card | `12–16px` |
| Evidence/data surface | `8–12px` |
| Button | `6–8px` |

Radius MUST reflect hierarchy. A larger radius indicates a larger, more important surface; it is not a universal decoration.

### 11.1 Borders

- Standard cards SHOULD use a subtle brand-derived border in their resting state.
- Hover MAY increase border emphasis or introduce a restrained Copper accent.
- Border contrast MUST remain visible enough to define the component on White and Cream backgrounds.

### 11.2 Shadows

- Hero SHOULD NOT require a strong shadow.
- Standard cards MAY use one shared low-elevation shadow token.
- Large, diffuse retail-style shadows are prohibited.
- Multiple unrelated shadow styles are prohibited.
- Shadow MUST NOT be the sole boundary between a component and its background.

---

## 12. Typography system behavior

- Estedad Variable remains the approved typeface for FA/EN/AR unless a later typography decision explicitly supersedes it.
- Persian and Arabic MUST use genuine RTL layout.
- Artificial letter-spacing MUST NOT be applied to Persian or Arabic text.
- Headings SHOULD feel engineered, modern, spacious, and decisive.
- Body copy MUST prioritize reading comfort over visual compactness.
- Supporting text line length MUST be constrained; long Persian lines spanning the full content width are prohibited.
- H1 and H2 sizing MUST use responsive rules rather than fixed desktop-only values.
- Font weight alone MUST NOT carry the full hierarchy; spacing, size, and color must also contribute.

---

## 13. Section spacing and alignment

Target section spacing:

| Viewport class | Vertical space between major sections |
|---|---:|
| Desktop | `96–120px` |
| Tablet | `72–88px` |
| Mobile | `56–72px` |

Internal rhythm:

- heading to supporting copy: `12–16px`;
- supporting copy to primary content: `32–48px`;
- card/internal-item spacing: derived from the shared spacing scale, not arbitrary per component.

All major Homepage sections MUST align to one shared container and gutter system. Header, Hero, section headings, Product Showcase, and Final CTA MUST NOT appear to use unrelated horizontal grids.

---

## 14. Background rhythm

The Homepage MUST alternate emphasis and breathing space. It MUST NOT place multiple heavy Navy sections consecutively without a deliberate light transition.

Working rhythm to inform later composition:

```text
Hero                 Navy + Cream flagship surface
Data / Price         Compact light surface
Product discovery    White or Warm Cream
Buyer value          Contrasting light surface
Verified proof       Navy band only when evidence is eligible
Use cases            White / editorial
Final action         Navy high-emphasis surface
```

This is a visual rhythm model, not the final frozen component order.

---

## 15. Motion principle

The canonical motion principle is:

> **Calm control, made visible.**

Motion MAY be used only to:

- orient;
- connect related content;
- confirm an action;
- preserve continuity;
- prioritize attention;
- prevent or explain an error.

Motion MUST NOT be added solely to make the Homepage feel “more dynamic.”

---

## 16. Motion tokens and behavior

### 16.1 Hero entrance

- Copy group: opacity transition plus vertical movement of no more than `12px`.
- Copy duration: approximately `400–500ms`.
- Image: restrained directional reveal or a scale change no greater than approximately `1.02 → 1`.
- Image duration: approximately `550–650ms`.
- Stagger between related elements: no more than `60–80ms`.
- The four Hero journey steps MUST NOT animate as a theatrical count-up sequence.

### 16.2 Scroll reveal

- Major reveal animation MAY run once when content enters the viewport.
- Vertical movement MUST NOT exceed `12–16px`.
- Duration SHOULD remain within `350–450ms`.
- Item stagger SHOULD NOT exceed `60ms`.
- Evidence and price data MAY render without entrance animation.
- A section MUST NOT repeatedly animate when the user scrolls up and down.

### 16.3 Hover and press behavior

- Button color/border transition: approximately `150–200ms`.
- CTA directional arrow movement: no more than `3px` in the appropriate locale direction.
- Actionable card lift: no more than `translateY(-2px)`.
- Image hover scale: maximum approximately `1.01–1.02`.
- Links SHOULD use a restrained color or underline transition.
- Hover effects MUST NOT be required to understand or access content.

### 16.4 Prohibited motion

The Homepage MUST NOT use:

- parallax;
- animated engineering grids;
- autoplay carousels;
- autoplay marquees or price tickers;
- decorative bouncing;
- spinning decorative icons;
- large card lifts;
- dramatic image zoom;
- animated counters without a functional evidence reason;
- simultaneous animation of many independent elements;
- motion that changes document layout after content becomes visible.

---

## 17. Progressive enhancement and failure safety

All meaningful content MUST be visible and usable without client-side motion.

Required behavior:

- server-rendered content is visible by default;
- animation enhances already available content;
- failure to load or execute JavaScript MUST NOT leave cards or sections at `opacity: 0`, translated off-screen, clipped, or inaccessible;
- motion code MUST NOT create layout shift;
- loading and error states MUST preserve the section’s allocated geometry when necessary;
- content eligibility and content visibility MUST remain independent from animation success.

This requirement is a release gate, not a recommendation.

---

## 18. Reduced motion and accessibility

- `prefers-reduced-motion: reduce` MUST disable all non-essential movement and staggering.
- Reduced-motion mode MUST preserve hierarchy and state without depending on motion.
- Keyboard focus MUST remain clearly visible on all interactive elements.
- Focus styling MUST meet contrast requirements and MUST NOT rely only on Copper if that fails contrast.
- Touch targets MUST meet the project’s mobile accessibility requirements.
- Text and UI controls MUST meet applicable WCAG contrast thresholds.
- Motion MUST NOT interfere with reading, screen magnification, keyboard navigation, or screen-reader order.
- Decorative grid, rules, and ornaments MUST remain non-semantic.

---

## 19. Performance constraints

- Prefer `transform` and `opacity` for motion.
- Avoid scroll-event animation loops when `IntersectionObserver` or CSS can provide the intended behavior.
- Do not animate layout properties that can cause reflow across large sections.
- Image animation MUST NOT delay image discoverability or Largest Contentful Paint.
- Hero content MUST NOT wait for a client-side animation library before becoming visible.
- Motion libraries MUST NOT be introduced when the same approved behavior can be implemented with small, maintainable CSS and minimal client logic.

---

## 20. Responsive requirements

- Desktop composition MUST not simply shrink into mobile.
- Multi-column layouts MUST reflow based on content length and reading order.
- Primary CTAs MUST remain discoverable before non-essential large media on mobile.
- Horizontal scrolling is allowed only for a component whose interaction model explicitly requires it and provides visible affordance; it is not a general mobile layout solution.
- Native scrolling is preferred over JavaScript carousels.
- Mobile and desktop MUST retain equivalent primary content, headings, meaningful images, and actions.
- RTL/LTR directional motion, arrow direction, and content order MUST be locale-aware.

---

## 21. Visual quality gates

A Homepage implementation passes this freeze only when all of the following are true:

1. Hero is visually dominant but later sections do not duplicate its complete card composition.
2. White/Cream remain the majority of the page and Copper remains a limited accent.
3. Product cards are visually distinguishable from service promises and evidence items.
4. Buyer Value does not reproduce the retired numbered-card/process pattern.
5. At least two different section archetypes are visibly present after the Hero.
6. Consecutive dark sections are avoided unless an approved transition justifies them.
7. Radius, borders, and shadows follow the frozen hierarchy.
8. Persian typography is correctly shaped, RTL, and free of artificial tracking.
9. All meaningful content remains visible if JavaScript or animation fails.
10. Reduced-motion mode is complete and usable.
11. No prohibited motion pattern is present.
12. Desktop, tablet, and mobile screenshots show consistent container alignment and hierarchy.

---

## 22. Required visual verification

Before release, the Homepage MUST be inspected at minimum in:

- FA / RTL desktop;
- FA / RTL mobile;
- EN / LTR desktop;
- EN / LTR mobile;
- AR / RTL representative viewport;
- reduced-motion mode;
- JavaScript failure or motion-disabled mode;
- keyboard-only navigation.

Verification MUST include:

- no clipped H1 or CTA;
- no unintended horizontal overflow;
- no content stuck invisible;
- no excessive Copper repetition;
- no card-within-card visual clutter;
- stable image aspect ratios;
- visible focus indicators;
- correct directional arrows and transitions.

---

## 23. Governance and change control

This document is the authoritative Homepage-wide visual and motion baseline.

A later component specification:

- MAY select from the frozen surface archetypes;
- MAY define component-specific tokens within the frozen hierarchy;
- MUST NOT create a new dominant brand color, unrelated radius system, or motion language;
- MUST NOT weaken progressive-enhancement or accessibility gates;
- MUST explicitly record any justified exception.

Changes to the following require an explicit versioned supersession of this freeze:

- canonical brand colors;
- page-level surface hierarchy;
- Hero’s status as the unique flagship surface;
- prohibited-motion list;
- progressive-enhancement visibility gate;
- reduced-motion requirements.

---

## 24. Final frozen decisions

1. The current Hero card direction is retained as the Homepage visual anchor.
2. The complete Hero treatment is unique and is not reused for ordinary sections.
3. The Homepage uses Flagship, Content, and Evidence/Data surface archetypes.
4. Card Soup is prohibited.
5. Steel Navy, Forge Copper, Warm Cream, and White remain the canonical Homepage palette.
6. Copper remains a scarce emphasis color.
7. Radius and shadow values express hierarchy rather than decoration.
8. Motion remains restrained, purposeful, failure-safe, and locale-aware.
9. Autoplay, parallax, marquee/ticker motion, bounce, and decorative animation are prohibited.
10. Meaningful content is visible by default and cannot depend on successful JavaScript animation.
11. Reduced-motion support is mandatory.
12. Final component order remains open for the subsequent Homepage Composition & Customer Journey Freeze.

---

## 25. Next governed document

After approval of this freeze, the next document is:

> **AHANASSA Homepage Composition & Customer Journey Freeze**

That document will determine component inclusion, removal, conditional presence, and final order while conforming to this Visual System & Motion baseline.
