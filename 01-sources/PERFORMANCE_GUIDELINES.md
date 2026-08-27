# PERFORMANCE_GUIDELINES.md

> Performance, Core Web Vitals, loading strategy, runtime efficiency, and performance acceptance criteria for the Ahan Asa website.

---

## 1. Purpose

This document defines the mandatory performance standards for the Ahan Asa website.

Performance is a core product requirement and must be treated as part of:

- UX
- SEO
- conversion optimization
- accessibility
- engineering quality
- perceived brand quality

The website must feel:

- immediate
- lightweight
- responsive
- stable
- smooth
- premium

Visual sophistication must never be achieved by sacrificing loading performance or interaction responsiveness.

---

## 2. Performance Principle

The default engineering principle is:

> Deliver the minimum amount of code, media, data, and JavaScript required for the current viewport and current user interaction.

Claude Code MUST prefer:

1. Server Components over Client Components
2. static generation over runtime rendering when possible
3. HTML/CSS over JavaScript-driven UI
4. native browser capabilities over large dependencies
5. optimized images over original assets
6. lazy loading over eager loading
7. progressive enhancement over JavaScript dependency
8. route-level loading over global loading
9. reusable lightweight components over oversized abstractions
10. measurable performance over visually unnecessary effects

---

## 3. Core Web Vitals

The production website MUST pass all Core Web Vitals.

Official minimum thresholds:

| Metric | Good | Internal Target |
|---|---:|---:|
| LCP | ≤ 2.5 s | ≤ 2.0 s |
| INP | ≤ 200 ms | ≤ 150 ms |
| CLS | ≤ 0.10 | ≤ 0.05 |

Measurements MUST be evaluated at the **75th percentile** separately for mobile and desktop traffic.

Internal targets are intentionally stricter than Google's passing thresholds.

---

## 4. Additional Performance Targets

The following targets should be used during development and QA.

| Metric | Target |
|---|---:|
| TTFB | ≤ 800 ms |
| FCP | ≤ 1.8 s |
| Speed Index | ≤ 3.0 s |
| Total Blocking Time | ≤ 150 ms |
| CLS | ≤ 0.05 preferred |
| Initial JS | As low as reasonably possible |
| Main-thread long tasks | Minimized |
| Hero media | Prioritized only when actually above fold |

Performance must be evaluated primarily on mobile.

Desktop scores must not be used to hide poor mobile performance.

---

## 5. Lighthouse Targets

For key production pages:

### Mobile

Target:

- Performance: ≥ 90
- Accessibility: ≥ 95
- Best Practices: ≥ 95
- SEO: ≥ 95

Preferred:

- Performance: 95+

### Desktop

Target:

- Performance: ≥ 95
- Accessibility: ≥ 95
- Best Practices: ≥ 95
- SEO: ≥ 95

A Lighthouse score alone is NOT sufficient for performance acceptance.

Field Core Web Vitals take priority when sufficient real-user data exists.

---

## 6. Priority Pages

Performance validation MUST include at minimum:

- Homepage
- major category pages
- product/service pages
- project pages
- about page
- contact page
- RFQ / inquiry page
- high-traffic SEO landing pages
- pages containing galleries
- pages containing video
- pages containing large hero sections

Do not optimize only the homepage.

---

## 7. Next.js Rendering Strategy

The website uses Next.js App Router.

Claude Code MUST select the least expensive rendering strategy appropriate for each route.

Preferred order:

1. Static Generation
2. Incremental static regeneration where necessary
3. Server Components
4. Dynamic server rendering only when required
5. Client-side rendering only for genuinely interactive elements

Do NOT make an entire page a Client Component simply because one section requires interaction.

Client boundaries must remain as small as possible.

---

## 8. React Server Components

React Server Components are the default.

Use `"use client"` only when the component requires:

- event listeners
- client state
- browser APIs
- interactive animation
- client-specific hooks
- real-time interaction

Do NOT add `"use client"` to:

- page layouts
- static text sections
- SEO content
- cards without interaction
- headings
- static galleries
- navigation structure that can work server-side
- footer
- standard content blocks

Client Components should preferably exist near the leaves of the component tree.

---

## 9. JavaScript Budget

JavaScript must be treated as an expensive resource.

Claude Code MUST:

- avoid unnecessary client-side JavaScript
- avoid large dependencies for trivial functionality
- dynamically import heavy interactive modules
- tree-shake dependencies where supported
- avoid importing entire libraries for one utility
- remove unused packages
- avoid duplicate dependencies
- avoid large polyfills when unnecessary
- avoid JavaScript for effects achievable using CSS

Every new dependency must have a clear functional justification.

---

## 10. Dependency Rules

Before adding a package, Claude Code MUST determine:

1. Can this be implemented with native browser APIs?
2. Can existing project dependencies handle it?
3. What is the bundle impact?
4. Does the package introduce client-side JavaScript?
5. Is it actively maintained?
6. Is tree-shaking supported?

Do NOT install large libraries for:

- simple sliders
- basic accordions
- simple modals
- minor date formatting
- basic animations
- class manipulation
- trivial utility functions

---

## 11. Dynamic Imports

Heavy client-side components should use dynamic imports when they are not required during initial rendering.

Candidates include:

- advanced maps
- complex charts
- large calculators
- video players
- rich text editors
- interactive visualizations
- heavy galleries
- non-critical widgets

Do not dynamically import critical above-the-fold content merely to improve synthetic scores.

UX remains the priority.

---

## 12. Image Performance

Images will likely represent one of the largest performance costs on the website.

Use `next/image` by default for raster content.

Claude Code MUST ensure:

- width and height are known
- aspect ratio is preserved
- responsive `sizes` values are provided
- unnecessary source dimensions are avoided
- offscreen images are lazy loaded
- only critical above-the-fold images receive loading priority
- images are not loaded merely because they exist in hidden responsive markup
- decorative images use appropriate accessibility treatment

Preferred formats:

1. AVIF where appropriate
2. WebP
3. optimized JPEG/PNG only when necessary
4. SVG for suitable vector assets

---

## 13. Hero Image Rules

Hero sections have significant influence on LCP.

Each hero must be reviewed as an LCP candidate.

For the primary hero image:

- request it early
- do not lazy-load it
- use appropriate fetch priority mechanisms
- provide correct responsive sizes
- avoid oversized source files
- avoid unnecessary JavaScript before rendering
- avoid CSS or animation that artificially delays visibility

The LCP element must never wait for a carousel library to initialize.

If the hero can be built effectively using text + CSS rather than a large background image, prefer the lighter solution.

---

## 14. Background Images

Avoid large CSS background images for important content.

Use `<Image>` when:

- the image conveys content
- the image is an LCP candidate
- responsive optimization is required
- loading priority needs explicit control

CSS backgrounds are acceptable primarily for decorative imagery.

Do not preload decorative backgrounds without clear evidence that it improves user experience.

---

## 15. Image Size Guidelines

Target approximate compressed file sizes:

| Image Type | Preferred Budget |
|---|---:|
| Small icon/asset | < 20 KB |
| Card thumbnail | < 80 KB |
| Standard content image | < 150 KB |
| Large visual | < 250 KB |
| Hero image | preferably < 300 KB |

These are guidelines, not reasons to visibly destroy image quality.

Actual size should reflect:

- dimensions
- viewport
- visual importance
- DPR
- content complexity

---

## 16. Responsive Images

Never deliver desktop-sized assets to small mobile screens unnecessarily.

Every responsive image implementation must consider:

- mobile width
- tablet width
- desktop width
- device pixel ratio
- actual rendered container width

Use accurate `sizes` declarations.

Do NOT use:

```tsx
sizes="100vw"
```

for images that occupy only a fraction of the viewport.

---

## 17. Video Performance

Video must never automatically become a performance bottleneck.

Rules:

- do not preload full video files unnecessarily
- use poster images
- defer non-critical video loading
- avoid autoplay with sound
- mobile users should not download large video assets unless needed
- background videos must have lightweight alternatives
- videos below the fold should initialize lazily

If autoplay background video is used:

- keep duration reasonable
- compress aggressively
- provide mobile fallback where needed
- avoid blocking LCP
- respect reduced-motion preferences

---

## 18. Font Performance

Fonts must be loaded using the Next.js font system where practical.

Prefer:

```tsx
next/font
```

over external render-blocking font stylesheets.

Claude Code MUST:

- self-host fonts where appropriate
- load only required weights
- load only required styles
- avoid duplicate font files
- avoid excessive typography variants
- use suitable fallback fonts
- minimize layout shift caused by font swapping

Do NOT load an entire variable font axis range unless the design uses it.

---

## 19. Persian Font Considerations

Persian fonts can be relatively large.

Therefore:

- subset fonts where technically practical
- avoid unused Latin/Arabic glyph sets when not needed
- avoid loading every available font weight
- use variable fonts only when their overall payload is justified
- monitor actual transferred font size

Typical initial requirement should preferably stay within:

- Regular
- Medium
- Bold

Additional weights require justification.

---

## 20. CSS Performance

CSS should remain simple and predictable.

Claude Code MUST:

- remove dead styles
- avoid duplicated CSS
- avoid excessively complex selectors
- avoid massive global stylesheets
- keep component styles scoped logically
- prevent duplicate utility output
- avoid layout-triggering animation properties

Prefer animation of:

- `transform`
- `opacity`

Avoid animation of:

- width
- height
- top
- left
- margin
- padding

where the same effect can be achieved using transforms.

---

## 21. Animation Performance

A premium interface may use motion, but motion must remain lightweight.

Animations must:

- maintain smooth frame rates
- not block user interaction
- not cause layout shift
- not delay meaningful content
- respect `prefers-reduced-motion`

Avoid expensive continuous:

- blur
- filter
- backdrop-filter
- large box-shadow animation
- large-area opacity layers
- scroll event handlers

Use CSS animations when sufficient.

Use JavaScript animation libraries only when justified.

---

## 22. Scroll Effects

Do not attach heavy logic directly to continuous scroll events.

Prefer:

- Intersection Observer
- CSS scroll-driven capabilities where safely supported
- passive event listeners when listeners are necessary

Avoid calculations that execute every frame unless strictly necessary.

---

## 23. Glassmorphism

Glass effects must be used carefully.

`backdrop-filter: blur()` can be expensive, particularly on mobile hardware.

Rules:

- use glass effects selectively
- avoid full-page backdrop blur
- avoid multiple stacked blurred layers
- reduce or disable expensive effects on low-capability/mobile layouts if necessary
- visually compare performance before and after implementation

Visual luxury must not depend on GPU-heavy effects.

---

## 24. Layout Stability

CLS must remain below 0.1 and preferably below 0.05.

Claude Code MUST reserve space for:

- images
- videos
- embeds
- banners
- forms
- dynamic messages
- asynchronously loaded components

Never insert unexpected content above existing visible content after load.

---

## 25. Image Dimensions and CLS

Every image must have either:

- intrinsic width/height
- fixed aspect ratio
- explicitly reserved layout space

Do not allow media dimensions to become known only after downloading.

---

## 26. Dynamic Content and CLS

For asynchronously loaded components:

- render skeletons with correct dimensions
- reserve expected space
- avoid large height differences between loading and loaded states

Skeletons themselves must not introduce excessive JavaScript.

---

## 27. Navigation Performance

Primary navigation must render immediately.

Do not make navigation depend on:

- client-side API requests
- hydration
- animation library initialization
- third-party scripts

Mega menus, if used, should not require heavy libraries.

---

## 28. Page Transitions

Page transitions must not delay navigation.

Navigation should feel immediate.

Do not create artificial loading screens for aesthetic reasons.

If transition animations are used:

- keep durations short
- do not block route changes
- do not wait for animation completion before navigation
- honor reduced-motion preferences

---

## 29. Third-Party Scripts

Third-party scripts are considered performance risks.

Examples:

- Google Tag Manager
- analytics
- CRM widgets
- chat widgets
- heatmaps
- tracking systems
- embedded social scripts

Every third-party script must have a documented reason.

Use appropriate Next.js script loading strategies.

Prefer:

- `afterInteractive`

or

- `lazyOnload`

for scripts that do not need to block initial rendering.

Never place unnecessary third-party scripts in the critical rendering path.

---

## 30. Google Tag Manager

GTM container quality must be monitored.

Claude Code cannot control all future tags, but the application must:

- load GTM according to the agreed analytics architecture
- avoid duplicate GTM installations
- avoid duplicate GA4 initialization
- avoid direct + GTM duplicate analytics
- avoid synchronous blocking analytics scripts

Marketing teams must not use GTM as an uncontrolled JavaScript package manager.

Unused tags should be removed.

---

## 31. Forms

Forms must remain lightweight.

Do not load:

- validation frameworks
- CAPTCHA systems
- CRM scripts

earlier than necessary unless business requirements justify it.

Preferred form behavior:

- server-side validation
- minimal client validation
- progressive enhancement
- clear loading states
- lightweight success/error feedback

---

## 32. CAPTCHA

If CAPTCHA becomes necessary:

- do not load it globally
- load it only where needed
- prefer lazy or interaction-triggered initialization
- measure its effect on INP and JS payload

Security requirements take precedence, but implementation should still minimize performance impact.

---

## 33. API Requests

Initial rendering should not depend on unnecessary browser-side API requests.

Prefer fetching on the server where appropriate.

Avoid request waterfalls such as:

```text
HTML
→ JS
→ component hydration
→ API request
→ second API request
→ render
```

Prefer parallel data fetching whenever dependencies allow.

---

## 34. Request Waterfalls

Claude Code MUST actively inspect for sequential fetch chains.

Independent requests should run concurrently.

Avoid patterns where one request is delayed solely because code structure accidentally made it sequential.

---

## 35. Data Payload

APIs must return only the data required by the current view.

Do not send large objects when the interface requires only:

- title
- slug
- image
- short description

Avoid transferring hidden or unused CMS fields to the browser.

---

## 36. Caching

Static content should be cached aggressively.

Cache strategy must differentiate between:

- immutable build assets
- optimized images
- static pages
- dynamic pages
- API responses
- user-specific responses

Hashed static assets should receive long-lived caching.

Do not apply aggressive caching blindly to personalized or frequently changing content.

---

## 37. CDN

Production delivery should take advantage of the existing CDN/edge architecture.

Static assets should be served from locations close to users where possible.

Avoid:

- unnecessary redirect chains
- origin round trips for cacheable content
- uncached static resources
- inconsistent cache headers

---

## 38. Redirect Performance

Redirect chains are prohibited.

Preferred:

```text
A → B
```

Avoid:

```text
A → B → C → D
```

Canonical hostname and protocol handling must resolve in the minimum number of redirects.

---

## 39. Resource Preloading

Preloading is not automatically an optimization.

Use preload only for resources that are:

- critical
- discovered too late by the browser
- confidently required for initial rendering

Potential candidates:

- LCP image
- critical font

Do NOT preload:

- below-fold images
- non-critical scripts
- speculative assets without evidence

Excessive preload can reduce performance.

---

## 40. Prefetching

Use route prefetching intelligently.

Do not aggressively download large amounts of content users are unlikely to visit.

Prefetching must not compete with critical resources.

---

## 41. Lazy Loading

Lazy-load:

- below-fold images
- galleries
- embedded maps
- videos
- heavy interactive components
- optional scripts
- below-fold animation systems

Do NOT lazy-load:

- main heading
- critical navigation
- above-fold SEO content
- LCP image
- primary CTA
- content immediately required by the user

---

## 42. Hydration

Hydration cost must be minimized.

Potential warning signs:

- large Client Component trees
- global providers wrapping the entire application
- unnecessary client context
- large JSON serialized to the client
- repeated client state
- client-side rendering of static content

Move logic to the server whenever possible.

---

## 43. Global Providers

Global providers must remain minimal.

Do not wrap the entire site in a provider simply because one feature on one page requires it.

Keep providers close to the functionality that needs them.

---

## 44. State Management

Do not introduce global state libraries unless project complexity genuinely requires them.

Prefer:

- Server Components
- URL state
- React state
- scoped context

before adding large state-management dependencies.

---

## 45. DOM Size

Avoid excessive DOM depth and unnecessary wrapper elements.

Do not create complex nested markup solely for decorative effects.

Components should use semantic, economical HTML.

Repeated list pages should be monitored for extremely large DOM trees.

---

## 46. Mobile First Performance

Performance decisions must be validated on realistic mobile conditions.

Do not assume:

- high-end phone
- fast CPU
- Wi-Fi
- unlimited bandwidth

The website must remain usable on:

- mid-range Android devices
- slower mobile connections
- constrained CPU environments

---

## 47. Interaction Performance

INP optimization requires reducing main-thread blocking.

Claude Code MUST watch for:

- large synchronous loops
- expensive React re-renders
- oversized event handlers
- heavy DOM manipulation
- third-party script work
- unnecessary state updates
- large hydration tasks

User interaction feedback should appear immediately where possible.

---

## 48. Event Handlers

Event handlers must remain small.

For expensive operations:

- defer non-critical work
- split work when possible
- execute server-side when appropriate

Do not execute large calculations synchronously inside click handlers.

---

## 49. React Re-renders

Avoid unnecessary re-renders.

Do not use memoization blindly.

First fix:

- poor component boundaries
- unnecessary shared state
- unstable data flow
- large Client Components

Then use memoization where measurement shows actual benefit.

---

## 50. Performance and SEO

Performance optimization must never remove SEO-critical content.

Search-engine-relevant content should preferably exist in rendered HTML.

Do not move meaningful text behind client-side rendering simply to simplify implementation.

Critical SEO pages should remain indexable without relying on complex browser execution.

---

## 51. Performance and Accessibility

Do not sacrifice accessibility for performance.

Performance optimizations must preserve:

- semantic HTML
- keyboard navigation
- focus handling
- accessible labels
- correct heading hierarchy
- sufficient visual clarity

Native HTML often provides both better accessibility and better performance.

---

## 52. Performance and Design

When design and performance conflict, Claude Code should attempt in this order:

1. optimize implementation
2. optimize asset
3. simplify animation
4. simplify effect
5. provide responsive/mobile alternative
6. remove non-essential decorative element

Do not silently degrade important UX or branding without documenting the decision.

---

## 53. Bundle Monitoring

Production builds must be reviewed for unexpected bundle growth.

Investigate when:

- adding a seemingly small feature creates significant JS
- a route suddenly becomes client-rendered
- a new dependency appears in several bundles
- duplicate packages are included
- a server-only package leaks into client code

Bundle size regressions must not be accepted without justification.

---

## 54. Production Build Validation

Before approving a meaningful feature:

```bash
npm run build
```

must succeed.

Review build output for:

- route rendering mode
- static vs dynamic routes
- compilation warnings
- unusually large bundles
- unexpected client-side rendering
- errors

Production performance must not be inferred from development mode.

---

## 55. Performance Testing Tools

Use a combination of:

- Chrome DevTools
- Lighthouse
- PageSpeed Insights
- Chrome UX Report when data exists
- Google Search Console Core Web Vitals
- Cloudflare and framework performance tooling when available
- browser Performance panel
- Network panel
- bundle analysis tools when required

Do not rely on a single tool.

---

## 56. Lab vs Field Data

Understand the difference:

### Lab Data

Useful for:

- debugging
- regression detection
- reproducible tests

Examples:

- Lighthouse
- DevTools

### Field Data

Represents real visitors.

Examples:

- CrUX
- Search Console
- Real User Monitoring

When sufficient field data exists, field data is the primary indicator of real-world Core Web Vitals.

---

## 57. Performance Testing Conditions

Tests should include:

### Mobile

- mobile viewport
- CPU throttling where appropriate
- realistic network throttling
- cold-cache tests
- repeat-view tests

### Desktop

- standard desktop viewport
- cold-cache tests
- repeat-view tests

Run multiple tests before concluding that a change caused improvement or regression.

---

## 58. Performance Regression Policy

A feature is considered a performance regression if it materially worsens:

- LCP
- INP
- CLS
- JavaScript payload
- image payload
- main-thread work
- initial request count
- Lighthouse performance

without a justified business requirement.

Claude Code must investigate regressions before declaring the feature complete.

---

## 59. Performance Budget

Performance budget applies to every route.

General principles:

- initial JavaScript must remain minimal
- critical CSS must remain minimal
- media must be responsive
- third-party scripts must remain controlled
- fonts must remain controlled
- initial request count must remain reasonable

There is no permission to consume the entire available budget merely because synthetic scores still pass.

---

## 60. Homepage Budget

The homepage is a high-priority entry route.

Particular attention must be paid to:

- hero image/video
- header
- fonts
- animation system
- first viewport
- tracking scripts
- below-fold media
- project previews

Above-the-fold experience must not require the entire homepage application to hydrate.

---

## 61. Gallery Performance

Project galleries must:

- load thumbnails at appropriate dimensions
- lazy-load offscreen assets
- avoid downloading full-resolution images before user interaction
- dynamically load advanced lightbox functionality where appropriate
- preserve image dimensions
- avoid CLS

Opening one image must not preload an entire oversized gallery unless explicitly justified.

---

## 62. Modal Performance

Modal implementations should use lightweight patterns.

Do not ship a large UI framework only for dialogs.

Interactive modal code may be client-side, but static content outside the modal should remain server-rendered.

---

## 63. Icon Performance

Prefer:

1. lightweight SVG
2. optimized icon components
3. selective imports

Avoid:

- full icon packs
- icon fonts
- enormous SVG sprite bundles

Import only icons actually used.

---

## 64. SVG Performance

SVGs must be optimized.

Avoid:

- unnecessary metadata
- extremely complex paths
- embedded raster imagery
- excessive filters
- massive inline SVG markup

Simple brand graphics may remain inline when beneficial.

---

## 65. Analytics Performance

Analytics must not:

- block rendering
- delay LCP
- delay interaction
- cause large synchronous main-thread tasks
- duplicate events unnecessarily

Tracking quality and performance must be balanced.

---

## 66. Cookie and Consent UI

If consent management is required:

- reserve layout appropriately
- avoid blocking main content unnecessarily
- load optional tracking only according to consent requirements
- avoid massive consent management dependencies where alternatives exist

Legal compliance takes precedence.

---

## 67. Error Monitoring

Error monitoring libraries must be configured carefully.

If used:

- avoid excessive bundle overhead
- avoid recording unnecessary data
- load client monitoring appropriately
- configure sampling when relevant

Performance monitoring must not itself become a performance problem.

---

## 68. Development Rules for Claude Code

Whenever Claude Code creates or edits a feature, it MUST ask internally:

### Rendering

- Can this remain a Server Component?
- Can this route remain static?

### JavaScript

- Does this require client-side JavaScript?
- Can the client boundary be smaller?

### Assets

- Are images properly sized?
- Is the LCP asset prioritized?
- Are offscreen assets lazy-loaded?

### Layout

- Could this cause CLS?

### Interaction

- Could this block the main thread?

### Dependencies

- Does this require a new package?
- Is there a lighter implementation?

### Network

- Does this introduce a request waterfall?

### Third Parties

- Does anything new execute before it is necessary?

---

## 69. Forbidden Performance Anti-Patterns

Claude Code MUST NOT intentionally introduce:

- entire-page `"use client"` without necessity
- unoptimized large `<img>` assets
- layout-shifting media
- autoplay high-resolution video without strategy
- unnecessary preload tags
- render-blocking third-party scripts
- large libraries for trivial UI
- synchronous browser API work during initial rendering
- client-side fetching for static content without reason
- duplicate analytics
- redirect chains
- enormous global providers
- excessive animation libraries
- infinite animation of expensive CSS properties
- indiscriminate `priority` on images
- indiscriminate eager loading
- huge desktop assets on mobile
- artificial splash screens
- loading animations that delay usable content

---

## 70. Definition of Done — Component

A component is performance-ready when:

- [ ] Client-side JavaScript is necessary and minimized.
- [ ] No unnecessary dependency was introduced.
- [ ] Images are optimized.
- [ ] Media dimensions are reserved.
- [ ] No avoidable CLS exists.
- [ ] Interaction remains responsive.
- [ ] Mobile behavior is verified.
- [ ] Reduced-motion behavior is considered.
- [ ] No unnecessary network requests are introduced.

---

## 71. Definition of Done — Page

A page is performance-ready when:

- [ ] Rendering strategy is appropriate.
- [ ] Critical content appears without unnecessary client execution.
- [ ] LCP element is identified.
- [ ] LCP resource is optimized.
- [ ] Below-fold media is lazy-loaded.
- [ ] No significant layout shift occurs.
- [ ] Client bundle remains reasonable.
- [ ] Third-party scripts do not block critical rendering.
- [ ] Mobile Lighthouse Performance is ≥ 90.
- [ ] Desktop Lighthouse Performance is ≥ 95.
- [ ] Production build succeeds.
- [ ] No major performance regression is detected.

---

## 72. Definition of Done — Production

The website is considered performance-ready for production when:

- [ ] Representative pages have been tested.
- [ ] Mobile performance has been prioritized.
- [ ] LCP is ≤ 2.5 s.
- [ ] INP is ≤ 200 ms.
- [ ] CLS is ≤ 0.10.
- [ ] Internal targets have been pursued where reasonably achievable.
- [ ] No redirect chains exist.
- [ ] Major media assets are optimized.
- [ ] Fonts are optimized.
- [ ] Third-party scripts are controlled.
- [ ] Production build succeeds.
- [ ] Core navigation remains fast.
- [ ] Forms remain responsive.
- [ ] No known severe performance regression remains.

---

## 73. Preferred Internal Targets

Ahan Asa should aim beyond minimum compliance.

Preferred production targets:

```text
LCP       ≤ 2.0 s
INP       ≤ 150 ms
CLS       ≤ 0.05
Mobile    Lighthouse ≥ 90
Desktop   Lighthouse ≥ 95
```

These values are targets rather than absolute guarantees because real-world performance varies by:

- device
- network
- geography
- browser
- content
- third-party services

---

## 74. Optimization Priority Order

When performance issues are detected, prioritize:

### Priority 1 — Critical

- Core Web Vitals failure
- render-blocking resources
- severe LCP delay
- severe INP problems
- large CLS
- broken caching
- massive media payloads

### Priority 2 — High

- excessive JavaScript
- unnecessary Client Components
- third-party script cost
- request waterfalls
- excessive fonts
- poor image sizing

### Priority 3 — Medium

- below-fold optimization
- route-level bundle improvements
- animation optimization
- secondary media improvements

### Priority 4 — Low

Micro-optimizations that do not measurably improve user experience.

---

## 75. Performance Decision Rule

When choosing between two technically valid implementations, prefer the implementation that:

1. sends less JavaScript
2. requires fewer requests
3. renders meaningful HTML earlier
4. creates less main-thread work
5. minimizes layout shift
6. uses browser-native behavior
7. performs better on mobile
8. remains maintainable

---

## 76. Continuous Performance Requirement

Performance is not a one-time optimization phase.

Every:

- new page
- new feature
- new marketing integration
- new animation
- new tracking script
- new font
- new library
- new media asset

must preserve the performance standards defined in this document.

---

## 77. Claude Code Mandatory Instruction

Before implementing any performance-sensitive feature, Claude Code MUST review this file.

If a requested implementation conflicts with these guidelines:

1. preserve the required business functionality
2. choose the lowest-cost technical implementation
3. document meaningful performance tradeoffs
4. avoid silently introducing regressions

Performance problems must be solved at the architectural level before applying superficial optimization patches.

---

## 78. Final Principle

The website should not merely achieve a high Lighthouse score.

It should **feel fast to real users**.

The intended experience is:

```text
Fast first render
+ stable layout
+ immediate interaction
+ minimal JavaScript
+ optimized media
+ controlled animation
+ strong caching
+ measurable Core Web Vitals
= premium web experience
```

Performance is part of the Ahan Asa brand experience and must remain a first-class engineering constraint throughout the lifecycle of the website.
