# Ahan Asa Website — Image Optimization Standards

> **Brand:** Ahan Asa | آهن آسا  
> **Domain:** `https://www.ahanassa.com`  
> **Document:** `IMAGE_OPTIMIZATION.md`  
> **Status:** Draft v1.0 — Implementation and release contract  
> **Last updated:** 2026-08-25  
> **Primary experience:** Persian (Farsi), fully RTL  
> **Accessibility target:** WCAG 2.2 Level AA  
> **Implementation context:** Next.js App Router, static/server-rendered public pages, responsive delivery  
> **Optimization thesis:** **Deliver the smallest truthful image that remains visually credible at its actual rendered size.**

---

## 1. Purpose

This document defines the mandatory standards for preparing, exporting, storing, delivering, rendering, caching, testing, and maintaining images on the Ahan Asa website.

It is an implementation contract for Claude Code, frontend developers, designers, photographers, editors, content managers, SEO specialists, and QA reviewers. Its goals are to ensure that every image:

- supports Ahan Asa's position as a premium B2B steel procurement management partner;
- remains truthful and does not fabricate operational evidence;
- loads efficiently on real mobile and desktop connections;
- does not cause layout shift;
- is delivered at an appropriate resolution and format;
- remains accessible, indexable where appropriate, and compatible with Persian RTL;
- is stored, named, versioned, and governed predictably;
- can be replaced or localized without rewriting page components.

This document governs still images, logos, raster illustrations, diagrams, screenshots, document previews, poster frames, favicons, and social-sharing images. Video encoding is governed by `MEDIA_GUIDELINES.md`.

The words **MUST**, **MUST NOT**, **SHOULD**, **SHOULD NOT**, and **MAY** indicate requirement strength.

---

## 2. Source Hierarchy and Conflict Rules

Image decisions must follow this hierarchy unless `CLAUDE.md` defines a stricter order:

1. Approved owner decisions recorded in `DECISIONS.md`
2. `PROJECT_BRIEF.md`
3. `BRAND_GUIDELINES.md`
4. `DESIGN_DIRECTION.md`
5. `DESIGN_SYSTEM.md`
6. `MEDIA_GUIDELINES.md`
7. `ACCESSIBILITY.md`
8. `PERFORMANCE_GUIDELINES.md`
9. This `IMAGE_OPTIMIZATION.md`
10. Page-specific specifications and implementation tasks

This document specializes image optimization. It MUST NOT redefine:

- logo geometry or brand colors;
- media truth, rights, consent, or approval status;
- page hierarchy or routes;
- Core Web Vitals targets set by `PERFORMANCE_GUIDELINES.md`;
- content claims or project evidence.

If two approved documents conflict, Claude Code MUST stop, describe the conflict, and record the approved resolution in `DECISIONS.md`. It MUST NOT silently choose the easier implementation.

Unknown production facts, asset identities, domains, focal points, licenses, or performance exceptions must be marked `TBD`; they must not be guessed.

---

## 3. Brand and Truth Context

Ahan Asa is a premium steel procurement manager whose approved promise is:

> **ما مراقب سرمایه شما هستیم.**  
> **We protect your capital.**

Optimization must preserve the credibility of real steel, documentation, inspection, comparison, logistics, delivery, and accountable professionals. Compression, cropping, retouching, or AI enhancement MUST NOT:

- alter material grade, finish, dimensions, markings, quantity, condition, or origin;
- remove or add inventory, damage, equipment, people, PPE, documents, or labels;
- imply ownership of a factory, warehouse, fleet, inventory, or project;
- convert stock or conceptual imagery into apparent Ahan Asa evidence;
- hide a relevant defect or change the commercial meaning of an image;
- damage the legibility of verified marks or technical details that the page discusses.

When a lower file size conflicts with evidentiary clarity, the image must be redesigned, cropped differently, moved below the fold, or granted a documented exception. It must not be compressed until its evidence becomes unreliable.

---

## 4. Non-Negotiable Outcomes

Every production image MUST satisfy all applicable outcomes:

1. **Truth:** source, rights, truth class, and approval are known.
2. **Purpose:** the image explains, proves, contextualizes, humanizes, navigates, or reinforces the brand.
3. **Correct dimensions:** intrinsic width and height or a stable aspect-ratio container are present before load.
4. **Responsive delivery:** the browser can select an appropriately sized resource.
5. **Efficient format:** format and compression match the image type.
6. **Correct priority:** only the actual likely LCP image receives elevated loading priority.
7. **Accessible meaning:** alt text, caption, and text equivalent match the image's role.
8. **Stable layout:** loading, success, and failure states do not create material layout shift.
9. **Safe metadata:** public derivatives contain no unnecessary EXIF, GPS, private thumbnails, or editing history.
10. **Measured release:** representative mobile and desktop routes pass the budgets in this document.

Images that fail any mandatory requirement are not production-ready.

---

## 5. Image Lifecycle

Use this lifecycle for every production image:

```text
receive source
  → verify provenance and rights
  → assign truth class and purpose
  → preserve master
  → select crop and focal point
  → create derivatives
  → strip unsafe metadata
  → compress and visually inspect
  → register dimensions and content metadata
  → implement responsive delivery
  → test performance, accessibility, RTL, and failure state
  → approve and publish
  → monitor and review
```

Required separation:

- `assets-source/` contains masters and MUST NOT be publicly served.
- `public/media/` contains only approved public derivatives when static public delivery is used.
- `content/media/` contains structured asset metadata or registry records.
- User-uploaded invoices, material lists, and commercial documents MUST NOT enter the public media pipeline.

Do not generate a web derivative from another compressed derivative. Always return to the best approved master.

---

## 6. Image Role Classification

Each placement must declare one role because role determines size, loading, crop, alt behavior, and QA.

| Role | Typical placement | Default behavior |
|---|---|---|
| `lcp-hero` | Primary hero visual in the first viewport | Early discovery, high priority when confirmed, never lazy |
| `hero-support` | Secondary first-viewport evidence | Normal/eager only when truly visible; no automatic high priority |
| `editorial` | Process, service, article, or evidence section | Responsive; lazy when below the fold |
| `card` | Archive, service, case, or resource card | Shared fixed ratio; lazy unless initially visible and necessary |
| `thumbnail` | Compact list, avatar, or preview | Small responsive source; lazy by default |
| `document-preview` | Invoice, list, drawing, certificate, or PDF preview | Accessible adjacent explanation; never the sole document access method |
| `diagram` | Process, responsibility, comparison, or technical explanation | SVG when appropriate; text/data equivalent for complex meaning |
| `logo` | Header, footer, favicon, social identity | Approved master variant only; never processed like photography |
| `poster` | Video poster | Load before deferred video; role budget applies |
| `social` | Open Graph or campaign share image | Fixed platform canvas; not loaded into page UI unless needed |
| `decorative` | Nonessential texture or visual accent | Empty alt; defer or remove when costly |

The same binary MAY have multiple placement records if its crop, alt text, caption, or loading role changes by context.

---

## 7. Approved Aspect Ratios and Source Dimensions

Use a limited ratio system. Arbitrary ratios require a page-specific reason.

| Use | Preferred ratio | Recommended approved master | Typical rendered range |
|---|---:|---:|---:|
| Homepage editorial hero | `3:2` or `16:10` | At least `2400 × 1600` | `320–1440px` wide |
| Inner-page hero / wide evidence | `16:9` | At least `2400 × 1350` | `320–1280px` wide |
| Editorial / process image | `4:3` | At least `2000 × 1500` | `280–800px` wide |
| Card / archive image | `3:2` | At least `1600 × 1067` | `240–560px` wide |
| Professional portrait | `4:5` | At least `1600 × 2000` | `240–640px` wide |
| Avatar / compact mark | `1:1` | At least 2× largest rendered size | `32–160px` wide |
| Document preview | `4:3` or source-page ratio | At least `1600px` wide | `280–800px` wide |
| Open Graph image | `1200:630` | Exactly `1200 × 630` | Platform-controlled |

Rules:

- Preserve one uncropped master.
- Do not upscale a low-resolution source to satisfy the table.
- Master size is not permission to deliver that size to every viewport.
- The delivered candidate should normally be close to rendered CSS width × effective device pixel ratio, capped by a useful maximum.
- Do not produce 3× or 4× variants automatically when the visible benefit is negligible.
- Record a focal point for crop-sensitive images.
- Use a separate mobile composition when one crop cannot protect the real subject across breakpoints.
- Essential evidence, faces, marks, documents, or safety context must not sit in unsafe crop zones.

---

## 8. Format Selection

### 8.1 Format matrix

| Asset type | Preferred format | Allowed fallback / exception |
|---|---|---|
| Photography | AVIF through the image pipeline | WebP or optimized JPEG when compatibility or visual quality requires it |
| Logo master | Sanitized SVG | PNG only for a destination that cannot use SVG |
| UI icon | Optimized inline SVG or curated SVG component | Raster icons are prohibited for normal UI |
| Flat illustration / diagram | SVG | AVIF/WebP/PNG when genuinely raster or excessively complex as vector |
| Transparent raster | AVIF or WebP with alpha | PNG when exact compatibility or lossless edges require it |
| Screenshot | WebP by default | PNG when lossless UI/text detail is required |
| Document preview | WebP/AVIF | PNG for linework or tiny text after visual comparison |
| Video poster | AVIF/WebP | Optimized JPEG when needed |
| Animated image | MP4/WebM video | Animated GIF is prohibited except an approved tiny compatibility asset |
| Favicon | SVG plus required PNG/ICO fallbacks | Follow browser/platform requirements |
| Open Graph | JPEG, PNG, or supported static format | Prefer predictable social-platform compatibility over marginal byte savings |

### 8.2 Selection rules

- Use AVIF for photographic assets when the production pipeline, browser support, cache behavior, and encoding latency have been verified.
- Preserve WebP or JPEG fallback behavior through the framework or CDN pipeline.
- Do not convert vector logos or icons into AVIF/WebP for ordinary website use.
- Use PNG only when transparency, sharp UI detail, or lossless output produces a measurable visual benefit.
- Never publish BMP, TIFF, PSD, RAW, HEIC, or camera-original formats.
- Do not embed large base64 images in HTML, CSS, JSON, or JavaScript.
- Avoid inline SVG for large illustrations when it substantially increases HTML size; serve a sanitized external SVG where semantics and styling allow it.

---

## 9. Transfer-Size Budgets

Budgets apply to the actual resource selected for the user's viewport, not merely to a master file or largest generated variant.

| Role | Target transfer size | Maximum without documented exception |
|---|---:|---:|
| LCP hero image | `≤ 200 KB` | `300 KB` |
| Large editorial/evidence image | `≤ 140 KB` | `220 KB` |
| Card image | `≤ 80 KB` | `120 KB` |
| Thumbnail/avatar | `≤ 40 KB` | `70 KB` |
| Poster image | `≤ 140 KB` | `220 KB` |
| Optimized UI SVG | `≤ 8 KB` typical | `20 KB` |
| Logo lockup SVG | As small as safely possible | `40 KB` |
| Open Graph image | `≤ 250 KB` target | `400 KB` |

### 9.1 Initial image payload budget

For a representative mobile cold load:

- the initial viewport SHOULD request no more than `350 KB` of image bytes before meaningful interaction;
- the initial page load SHOULD request no more than `500 KB` of image bytes before the user approaches below-the-fold media;
- a route MUST NOT preload an image that is not rendered in the initial viewport;
- hidden carousel slides, alternate themes, hover images, and desktop-only images MUST NOT compete with the LCP image.

These page-level numbers are guardrails. `PERFORMANCE_GUIDELINES.md` remains authoritative if it defines stricter route budgets.

### 9.2 Exceptions

A budget exception requires all of the following:

1. clear user or evidentiary value;
2. before/after measurements on representative mobile and desktop conditions;
3. confirmation that a better crop, format, dimensions, or quality setting cannot solve the problem;
4. approval recorded in `DECISIONS.md`;
5. a reduced mobile asset or fallback where practical;
6. an owner and review date.

Visual preference alone is not sufficient justification.

---

## 10. Core Web Vitals Contract

Images must support these field targets at the 75th percentile:

| Metric | Good target | Image-related responsibility |
|---|---:|---|
| Largest Contentful Paint (LCP) | `≤ 2.5 s` | Discover and fetch the correct hero candidate early; minimize bytes and render delay |
| Cumulative Layout Shift (CLS) | `≤ 0.1` | Reserve dimensions; stabilize responsive wrappers, placeholders, captions, and failure states |
| Interaction to Next Paint (INP) | `≤ 200 ms` | Avoid expensive client image galleries, synchronous processing, and decode-driven UI work |

The project MUST use field data when sufficient traffic exists. Lab tools support diagnosis but do not replace real-user measurement.

Image optimization is not complete merely because a file is compressed. LCP can still fail when:

- the resource is discovered late;
- the image is inserted only after client JavaScript runs;
- a CSS background hides the URL from early discovery;
- the wrong candidate is selected due to missing or inaccurate `sizes`;
- many high-priority resources compete for bandwidth;
- the element remains hidden behind animation or client hydration;
- the server or CDN responds slowly;
- render-blocking CSS or long main-thread tasks delay paint.

---

## 11. LCP Image Rules

### 11.1 Identification

For every page template, identify the expected LCP element during implementation and verify it in a performance trace. Do not assume that every hero image is the LCP; sometimes the heading or another visible block is larger.

### 11.2 Mandatory behavior

The confirmed likely LCP image MUST:

- be present in the initial server-rendered HTML;
- use semantic image markup when it conveys content;
- not use lazy loading;
- have an explicit high-priority or framework preload strategy supported by the installed Next.js version;
- have accurate `srcset`/generated candidates and `sizes`;
- be served from the same origin or an approved optimized origin where practical;
- fit within the LCP size budget;
- render without waiting for a reveal animation, carousel initialization, or client-only component;
- have stable dimensions before download;
- use the final intended crop at each supported viewport.

### 11.3 Priority limits

- A normal route MUST have no more than one high-priority image.
- A second elevated image requires measured evidence and a recorded reason.
- Do not apply priority permanently in the global media registry because the same asset may be LCP on one route and below the fold on another.
- Do not preload both mobile and desktop art-directed sources unless the browser can select without downloading both and the implementation has been verified.
- Do not preload Open Graph images, hidden images, or video posters that are not visible at load.

### 11.4 Hero fallback

If the approved hero image is missing, production should use a text-first hero with an approved stable surface. It MUST NOT deploy a generic warehouse image as false evidence.

---

## 12. Loading Policy

| Situation | Loading policy | Priority policy |
|---|---|---|
| Confirmed likely LCP image | Eager / framework preload as appropriate | High |
| Other immediately visible essential image | Browser/framework default or eager only if measured | Auto |
| Below-the-fold image | Lazy | Auto/low |
| Hidden tab/accordion content | Lazy and load near/after intent | Low |
| Carousel slide after first | Lazy; must not preload | Low |
| Video poster in initial viewport | Image rules based on visible role | Only high if it is actually LCP |
| Click-to-play media below fold | Poster lazy; video `preload="none"` | Low |
| Decorative image | Prefer omission; otherwise lazy | Low |

Native or framework-managed lazy loading is preferred. A custom Intersection Observer loader requires a documented reason and must preserve no-JavaScript content access where relevant.

Do not lazy-load an image likely to become LCP. Do not mark every above-the-fold image as high priority.

---

## 13. Responsive Image Selection

### 13.1 Required principle

The browser must know the image's approximate rendered width before choosing a source candidate. Therefore, `sizes` is mandatory for responsive images that use `fill` or whose CSS width changes by breakpoint.

### 13.2 `sizes` rules

- Write `sizes` from actual layout behavior, not from a generic copied string.
- Evaluate media conditions from narrowest to widest.
- Use a final fixed or viewport-relative value that reflects the largest layout.
- Account for page gutters and maximum container width.
- Update `sizes` when grid columns or container widths change.
- Verify the chosen candidate in browser DevTools at each QA viewport.
- Missing `sizes` on a `fill` image is a release defect.

Examples:

```tsx
// Full-bleed mobile, capped editorial width on larger screens.
sizes="(max-width: 767px) 100vw, (max-width: 1279px) calc(100vw - 64px), 1200px"

// One column on mobile, two columns on tablet, three columns on desktop.
sizes="(max-width: 767px) calc(100vw - 32px), (max-width: 1023px) calc(50vw - 32px), 384px"

// Text-and-image split layout.
sizes="(max-width: 767px) calc(100vw - 32px), (max-width: 1279px) 46vw, 560px"
```

These are reference patterns, not universal values. Claude Code MUST inspect the implemented container and gap tokens.

### 13.3 Candidate width policy

The configured device and image sizes should cover actual layout widths without creating an excessive derivative matrix. Start with the framework defaults and change them only after auditing real component widths.

Do not add arbitrary widths for every design comp. Consolidate nearby rendered widths when quality remains acceptable.

---

## 14. Intrinsic Dimensions and Layout Stability

Every raster image must use one of these patterns:

1. static import with known intrinsic dimensions;
2. explicit `width` and `height` matching the source ratio;
3. `fill` inside a positioned wrapper with a declared, stable `aspect-ratio` or fixed dimensions.

Required rules:

- Never rely on downloaded image dimensions to establish layout.
- Width and height attributes define aspect ratio; CSS may scale the image responsively.
- Caption and credit areas must reserve predictable space or flow below the image without overlay shift.
- Skeletons and placeholders must match the final frame dimensions.
- Error fallbacks must preserve the same frame.
- A modal or lightbox must reserve dimensions before the full-resolution image arrives.
- Do not animate width, height, or aspect ratio during initial rendering.
- Responsive art direction must keep each selected source compatible with the declared container ratio.

Reference wrapper:

```tsx
<figure className={styles.figure}>
  <div className={styles.frame}>
    <Image
      src={media.src}
      alt={media.alt}
      fill
      sizes={media.sizes}
      className={styles.image}
    />
  </div>
  {media.caption ? <figcaption>{media.caption}</figcaption> : null}
</figure>
```

```css
.frame {
  position: relative;
  aspect-ratio: 3 / 2;
  overflow: hidden;
  background: var(--aa-color-bg-muted);
  border-radius: var(--aa-radius-lg);
}

.image {
  object-fit: cover;
}
```

---

## 15. Cropping and Art Direction

Cropping is an editorial decision, not only a CSS setting.

### 15.1 Focal-point rules

- Store focal points as normalized values, for example `{ x: 0.62, y: 0.38 }`.
- Review the crop at `320`, `375`, `768`, `1024`, `1280`, and `1536px` viewport widths where applicable.
- Keep faces, PPE, inspection marks, document details, material labels, and the action being described visible.
- Do not crop out context that changes the truth of an evidence image.
- Do not mirror real photographs to create RTL copy space.
- Do not use one `object-position` for all images.

### 15.2 Mobile art direction

Use a dedicated mobile source when:

- the desktop subject becomes too small;
- the meaningful action is lost in a narrow crop;
- necessary negative space changes sides;
- a portrait crop communicates the evidence more clearly;
- the mobile crop would otherwise remove safety or technical context.

Separate sources must represent the same approved reality and share the same truth and rights record.

### 15.3 Text overlays

- Essential text MUST remain live HTML.
- Text baked into photography is prohibited for primary meaning.
- When live text overlays an image, use a tested solid/gradient support layer without distorting the image.
- Verify contrast across every responsive crop and image variant.
- Prefer a separate text surface when reliable contrast cannot be guaranteed.

---

## 16. Compression and Visual Quality

### 16.1 Quality strategy

There is no universal quality number. Quality must be selected by asset role, format, dimensions, and subject detail.

Suggested starting ranges for evaluation:

| Asset | AVIF quality starting range | WebP quality starting range | JPEG quality starting range |
|---|---:|---:|---:|
| Hero / evidence photography | `50–65` | `68–80` | `72–82` |
| Editorial / card photography | `45–60` | `65–76` | `68–78` |
| Thumbnail | `40–55` | `60–72` | `65–75` |
| Screenshot with text | Test cautiously | `75–88` | Avoid unless visually acceptable |

These values are starting points, not release guarantees. The framework, encoder, and image content may interpret quality differently.

### 16.2 Visual inspection

Inspect at the actual rendered size and at 100% source view for:

- ringing around steel edges and text;
- banding in gradients, skies, painted surfaces, and shadows;
- blocked dark areas that hide material condition;
- color shifts in steel, coating, rust, PPE, brand Navy, or Copper;
- smeared markings, numbers, barcodes, or document lines;
- halos from sharpening;
- noise amplified by encoding;
- lost facial or safety detail;
- alpha-edge artifacts around logos and icons.

If evidence detail remains illegible at the normal rendered size, provide an approved zoom/detail view or adjacent text. Do not force an oversized image into the initial page load.

### 16.3 Double-compression prohibition

- Do not upload a previously compressed website derivative as a new master.
- Do not repeatedly save JPEG files.
- Do not let both an external CDN and the application pipeline apply uncontrolled destructive transformations.
- When two transformation layers exist, document which layer owns resizing, format negotiation, and quality.

---

## 17. Next.js Image Component Contract

### 17.1 Default implementation

Use `next/image` for approved content photography unless a documented constraint requires semantic `<picture>`/`<img>` markup or another implementation.

Claude Code MUST:

- inspect the installed Next.js version before selecting version-specific props;
- prefer static imports for repository-managed local images when practical;
- provide useful `alt` text or `alt=""` according to purpose;
- use explicit dimensions or `fill` within a stable wrapper;
- provide accurate `sizes` for responsive/fill images;
- keep image markup server-rendered;
- derive priority from page placement;
- restrict remote sources with precise allowlisting;
- use supported modern output formats;
- test the production build, not only development mode.

Current Next.js documentation uses `preload` for cases where the image is unambiguously the LCP element. Older pinned releases may use `priority`. The project MUST follow the installed version's supported API and record any compatibility decision; it MUST NOT combine redundant preload mechanisms without measurement.

### 17.2 Reference component

```tsx
import Image from "next/image";

type OptimizedImageProps = {
  src: string;
  alt: string;
  width: number;
  height: number;
  sizes: string;
  isLcp?: boolean;
  quality?: number;
};

export function OptimizedImage({
  src,
  alt,
  width,
  height,
  sizes,
  isLcp = false,
  quality,
}: OptimizedImageProps) {
  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      sizes={sizes}
      quality={quality}
      loading={isLcp ? "eager" : "lazy"}
      fetchPriority={isLcp ? "high" : "auto"}
    />
  );
}
```

The reference demonstrates intent only. If the installed framework's preload API is used, avoid adding unnecessary duplicate loading hints.

### 17.3 Fill pattern

```tsx
<div className={styles.mediaFrame}>
  <Image
    src={media.src}
    alt={media.alt}
    fill
    sizes="(max-width: 767px) calc(100vw - 32px), 560px"
    style={{
      objectFit: "cover",
      objectPosition: `${media.focalPoint.x * 100}% ${media.focalPoint.y * 100}%`,
    }}
  />
</div>
```

### 17.4 Prohibited implementation patterns

- `fill` without a dimensioned parent;
- missing or generic `sizes="100vw"` for a small card;
- `unoptimized` used to bypass configuration or quality problems;
- priority/preload on every hero-adjacent image;
- client-side image insertion for SEO-critical or LCP content;
- remote URLs assembled from untrusted user input;
- using query parameters as an uncontrolled remote image proxy;
- hard-coded intrinsic dimensions that do not match the source ratio;
- importing a large image library into a client bundle;
- relying on development-mode behavior as proof of production optimization.

---

## 18. Next.js Configuration Rules

The exact configuration must match the installed Next.js version and deployment architecture.

Reference direction:

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      // Add only approved exact protocols, hostnames, ports, and pathnames.
    ],
    // Add an explicit qualities allowlist when required/supported by
    // the installed Next.js release and the approved component API.
  },
};

export default nextConfig;
```

Rules:

- Prefer no remote hosts until one is operationally required.
- Use exact `remotePatterns`; broad wildcard host allowlists are prohibited.
- Query-string behavior must be constrained where the framework supports it.
- SVG delivery requires a separate security review; do not enable dangerous SVG behavior casually.
- Do not set a global loader or CDN solely for convenience.
- Custom loaders must preserve correct width transformation, format negotiation, cacheability, and URL safety.
- Configure candidate widths and qualities from measured component needs, not guesswork.
- Changes to image configuration require production-build regression testing.

---

## 19. Local, Remote, and CMS Images

### 19.1 Local repository images

- Use approved static assets only.
- Prefer static imports when they improve dimension inference and build-time safety.
- Public derivatives must use stable, descriptive, lowercase Latin filenames.
- Do not place confidential masters in the repository's public tree.

### 19.2 Remote images

Remote images are allowed only when:

- the host is approved and narrowly allowlisted;
- rights and provenance are recorded;
- URLs are stable and use HTTPS;
- width and height metadata are available before render;
- cache behavior and failure handling are known;
- hotlinking is contractually and technically permitted;
- the remote origin does not create a misleading privacy or tracking behavior.

Remote images SHOULD be ingested into the approved media pipeline when ownership and licensing permit. Essential evidence MUST NOT depend on an uncontrolled third-party URL.

### 19.3 CMS images

A CMS record must provide:

- stable asset ID;
- source URL or approved media reference;
- width and height;
- MIME type;
- focal point where needed;
- locale/context-specific alt text;
- optional caption;
- truth class;
- rights and approval status;
- modification/version identifier;
- expiry where applicable.

The frontend MUST reject or safely fall back from incomplete production records. It must not infer dimensions by downloading the image in the browser.

---

## 20. Caching and URL Versioning

### 20.1 Immutable derivatives

Generated or manually exported derivatives should use content-hashed URLs or a versioned asset identity. Immutable image bytes MUST NOT be overwritten at the same long-lived URL.

Where infrastructure supports it, immutable derivatives SHOULD use a long browser/CDN lifetime with `immutable`. Exact headers belong in `CACHING_STRATEGY.md` and deployment configuration.

### 20.2 Mutable content

When an asset must retain a semantic name, update its versioned path or query only through an approved cache-busting strategy. Do not depend on manual cache purges as the normal publishing workflow.

### 20.3 Optimizer cache

- Confirm cache keys vary correctly by source, width, quality, and negotiated format.
- Forward the `Accept` header correctly through proxies/CDNs when format negotiation depends on it.
- Do not allow a proxy to cache one negotiated format and serve it incorrectly to incompatible clients.
- Review cache hit rate and origin transformation load after launch.
- Prevent unbounded transformation variants caused by arbitrary user-controlled widths or qualities.

### 20.4 Replacement and removal

When removing or replacing a restricted, expired, or incorrect image:

- remove every route and metadata reference;
- update Open Graph and structured content references;
- invalidate or version affected derivatives where necessary;
- ensure old public URLs no longer expose restricted content when removal is legally required;
- record material changes in `CHANGELOG.md`.

---

## 21. Filename and Folder Standards

### 21.1 Filename pattern

Use:

```text
{subject}-{context?}-{locale?}-{role?}-{width?}.{ext}
```

Examples:

```text
steel-profile-marking-inspection-fa-hero-2400.avif
material-list-review-fa-editorial-1200.webp
loading-check-case-qazvin-card-800.avif
ahan-asa-logo-horizontal-primary.svg
procurement-process-fa-og-1200x630.jpg
```

Rules:

- lowercase Latin characters only;
- hyphens between words;
- no spaces, underscores, Persian characters, random IDs, or camera filenames;
- no vague suffixes such as `final`, `new`, `latest`, `copy`, or `v2-final`;
- include locale only when pixels contain locale-specific content;
- include width only for manually managed derivatives;
- never use the filename to assert an unverified client, project, location, grade, or result.

### 21.2 Repository organization

```text
assets-source/
  brand/
  photography/
  diagrams/
  screenshots/
  social/

public/
  media/
    brand/
      logos/
      favicons/
    images/
      home/
      process/
      services/
      cases/
      team/
      insights/
      shared/
    diagrams/
    posters/
    social/

content/
  media/
    media-registry.ts
```

If the repository already has an approved equivalent, map these roles into it. Do not create a second parallel asset architecture.

---

## 22. Media Registry Contract

Recommended type:

```ts
type ImageRole =
  | "lcp-hero"
  | "hero-support"
  | "editorial"
  | "card"
  | "thumbnail"
  | "document-preview"
  | "diagram"
  | "logo"
  | "poster"
  | "social"
  | "decorative";

type ImageTruthClass =
  | "verified-evidence"
  | "verified-context"
  | "licensed-stock"
  | "conceptual"
  | "restricted";

type ImageAsset = {
  id: string;
  src: string;
  width: number;
  height: number;
  aspectRatio: `${number}:${number}`;
  mimeType: string;
  role: ImageRole;
  truthClass: ImageTruthClass;
  purpose:
    | "evidence"
    | "explanation"
    | "context"
    | "humanization"
    | "navigation"
    | "brand";
  altByLocale?: Partial<Record<"fa" | "en" | "ar", string>>;
  captionByLocale?: Partial<Record<"fa" | "en" | "ar", string>>;
  focalPoint?: { x: number; y: number };
  mobileSrc?: string;
  mobileWidth?: number;
  mobileHeight?: number;
  sourceOwner: string;
  rightsStatus: "owned" | "licensed" | "permission" | "restricted";
  approvalStatus: "draft" | "approved" | "rejected" | "expired";
  approvedBy?: string;
  approvedAt?: string;
  expiresAt?: string;
  version?: string;
  notes?: string;
};
```

Rules:

- `restricted`, `rejected`, and `expired` records MUST NOT resolve to public URLs.
- Width and height are mandatory for raster images.
- `alt` is contextual; page usage may override a generic description when meaning changes.
- Loading priority is placement-specific and SHOULD NOT be stored as an unconditional permanent asset property.
- Rights records may reference controlled internal systems but must not expose private documents publicly.
- The registry is the preferred source of repeated image metadata.

---

## 23. Accessibility

### 23.1 Alternative text decision table

| Image use | Required accessible treatment |
|---|---|
| Informative image | Concise, context-specific Persian `alt` text |
| Decorative image | `alt=""`; no redundant title or ARIA label |
| Linked image with adjacent identical title | Usually empty alt to avoid duplicate announcement |
| Image-only link | Alt/accessibility name describes destination or action |
| Complex diagram | Short alt plus adjacent detailed explanation or equivalent data |
| Logo linking home | Accessible name equivalent to `آهن آسا — صفحه اصلی` |
| Document preview | Alt identifies the preview; accessible document/link remains available |

### 23.2 Persian alt rules

- Describe the information contributed in this exact placement.
- Do not begin with redundant equivalents of “image of” or “photo of.”
- Do not keyword-stuff.
- Do not repeat the visible caption unless it is the only meaningful alternative.
- Mention a person, client, supplier, location, grade, quantity, date, or project only when verified and approved.
- Preserve the logical order of technical codes, dimensions, units, and mixed-direction values.
- Use nearby text for lengthy explanations.

Good:

```text
کنترل مشخصات حک‌شده روی پروفیل فولادی پیش از بارگیری
```

Prohibited:

```text
عکس آهن و کارخانه آهن آسا، خرید آهن با بهترین قیمت
```

### 23.3 Additional accessibility rules

- Essential text must not be embedded in an image.
- Image failure must not remove the page's primary meaning or action.
- Zoomed content at 200% and reflow at `320 CSS px` must remain usable.
- Charts and technical diagrams require an accessible data or text equivalent.
- Captions must be real text, not pixels.
- Do not use color alone to distinguish grades, statuses, or process stages.
- Background images that convey information require equivalent semantic content.

---

## 24. RTL and Bidirectional Safety

- Real photographs MUST NOT be mirrored to suit RTL layout.
- Logos, material marks, text, safety signs, vehicle orientation, documents, and human handedness must remain authentic.
- Use layout and mobile art direction—not image flipping—to create copy space.
- Persian captions and credits follow RTL reading order.
- Latin filenames, URLs, standards, grades, and dimensions should be isolated with direction-safe markup when displayed.
- Directional diagrams may have locale-specific versions when sequence meaning genuinely changes.
- Non-directional diagrams should use direction-neutral composition where practical.
- Text inside a locale-specific social image must be reviewed for Persian shaping, punctuation, numerals, and safe areas.

---

## 25. SVG, Icons, and Logos

### 25.1 SVG security and optimization

All SVG files MUST be trusted and sanitized. Remove:

- scripts and event handlers;
- external references;
- embedded unapproved raster images;
- editor metadata and comments;
- hidden layers and unused definitions;
- unnecessary precision, groups, and transforms;
- embedded fonts.

Preserve:

- `viewBox`;
- accessible naming behavior where the SVG is informative;
- approved geometry and brand colors;
- sufficient precision for correct rendering.

### 25.2 UI icons

- Use an approved curated subset, not a full icon package.
- Prefer `currentColor` for interface icons.
- Decorative icons must be hidden from assistive technology.
- Meaningful standalone icons require an accessible name.
- Directional arrows and chevrons may mirror in RTL; non-directional symbols must not.

### 25.3 Ahan Asa logo

- Use only approved master files and lockups from `BRAND_GUIDELINES.md`.
- Never trace, redraw, simplify, animate internally, recolor, distort, crop, or re-export the logo through a lossy image pipeline.
- Use SVG for normal website display.
- Use approved PNG/ICO fallbacks only where required.
- Do not use `next/image` transformations as a substitute for proper logo variants.
- Preserve minimum size and clear space.
- The final Persian wordmark/lockup remains `TBD` until formally approved; no temporary reconstruction may become production identity.

---

## 26. Screenshots and Document Previews

- Crop screenshots to the information being discussed.
- Redact confidential and personal information irreversibly before export.
- Inspect names, numbers, prices, quantities, signatures, phone numbers, email, bank data, addresses, QR codes, barcodes, browser tabs, notifications, reflections, and metadata.
- Use WebP when text remains crisp; use PNG when lossless detail is necessary.
- Do not scale a low-resolution screenshot above its native size.
- Do not use a screenshot instead of semantic HTML for tables, calculations, or instructions.
- A document preview must link to an accessible approved document or have an adjacent text equivalent.
- Preview images follow normal size, loading, alt, caption, truth, and rights rules.
- Original unredacted documents MUST NOT be stored in `public/`.

---

## 27. Open Graph and Social Images

### 27.1 Canvas

- Default Open Graph canvas: exactly `1200 × 630`.
- Keep essential subject matter and live-looking text inside a conservative central safe area.
- Use a dedicated social composition; do not assume the page hero crop will work.
- Keep text concise and large enough to survive thumbnail rendering.
- Use approved brand Navy `#0B2545`, Forge Copper `#B04A2F`, and White `#FFFFFF` according to the brand system.

### 27.2 Content rules

- The image must accurately represent the page.
- Do not show unverified inventory, factories, clients, projects, prices, certifications, or claims.
- Do not place technical detail so small that it becomes misleading or unreadable.
- A localized social image is required only when it contains text that changes by locale.
- Open Graph URLs must be absolute HTTPS URLs on the approved production domain or approved asset host.
- Social image generation must fail safely when required data or an approved asset is missing.

### 27.3 Performance boundary

Open Graph images affect crawler fetch and sharing quality but are not part of the normal page viewport payload unless displayed. Do not preload them in the page.

---

## 28. Placeholders and Progressive Rendering

- A placeholder must reserve the final geometry.
- Blur placeholders MAY be used for prominent photography when generated from the approved asset and kept very small.
- Large base64 placeholders that materially inflate server-rendered HTML are prohibited.
- Dominant-color placeholders must use a representative, non-misleading color.
- Skeleton shimmer is discouraged; use a quiet static surface unless motion adds clear value.
- Placeholders must disappear without a flash, jump, or long opacity transition.
- A placeholder MUST NOT be mistaken for evidence or remain visible as production content.
- In reduced-motion mode, avoid animated placeholder effects.

---

## 29. Failure and Missing-Asset Behavior

If an image fails:

- preserve the frame dimensions to prevent layout shift;
- keep headings, captions, claims, forms, and CTA available;
- show a neutral approved fallback only when it helps comprehension;
- do not expose raw URLs, stack traces, storage details, or private filenames;
- log the failure through the approved monitoring system without collecting unnecessary personal data;
- avoid endless retries;
- do not replace verified evidence with unrelated stock automatically.

If a required image is missing before release:

1. keep the layout structurally complete;
2. use a clearly labeled development-only placeholder if needed;
3. record the missing asset in `TASKS.md`;
4. use a text-first production treatment when possible;
5. block publication when the image is required to support a claim.

---

## 30. Security, Privacy, and Rights

- Strip unnecessary EXIF, GPS, camera serial, embedded thumbnails, comments, and editing metadata from public raster derivatives.
- Do not assume metadata stripping alone removes visible sensitive information.
- Sanitize SVG files and reject active or externally referenced content.
- Validate remote URLs server-side against the approved host and path policy.
- Do not expose local filesystem paths or private storage URLs.
- Do not create a general-purpose unauthenticated image proxy.
- Apply width, quality, and source allowlists to prevent transformation abuse.
- Do not publish images from search engines, competitors, suppliers, clients, or social media without verified permission.
- License and consent expiry must trigger review or removal.
- User uploads are untrusted and must follow `FORM_ARCHITECTURE.md` and `SECURITY_GUIDELINES.md`; they must never become public website images automatically.

---

## 31. Build and Optimization Pipeline

### 31.1 Required pipeline capabilities

The approved pipeline should be able to:

- read real source dimensions;
- normalize orientation;
- convert to `sRGB`;
- create approved crops and responsive sizes;
- encode AVIF/WebP and necessary fallbacks;
- preserve transparency when required;
- strip unsafe metadata;
- optimize SVG safely;
- report output dimensions and byte size;
- detect files exceeding role budgets;
- reject unsupported formats and malformed images;
- generate or update registry metadata;
- avoid modifying master files.

### 31.2 Tooling rules

- Prefer the framework's production image optimizer for runtime variants unless build-time output is required by architecture.
- `sharp` MAY be used for controlled build-time or editorial derivatives.
- SVG optimization MAY use a pinned, reviewed configuration.
- Pin tool versions in the project's package manager.
- Do not introduce multiple overlapping image pipelines.
- Optimization scripts must be deterministic and safe to rerun.
- Generated output must not silently overwrite unrelated assets.

### 31.3 Suggested validation output

Each processed asset should report:

```text
asset id
source path
output path
format
width × height
byte size
role budget
pass/fail
metadata stripped
registry status
```

---

## 32. Automated Quality Gates

The project SHOULD implement CI checks for:

- raster files missing dimensions in the registry;
- image components missing `alt`;
- `fill` images missing `sizes`;
- unapproved remote hosts;
- oversized files in `public/media/`;
- camera-original or unsupported formats;
- spaces, underscores, Persian characters, or banned suffixes in public filenames;
- SVGs containing scripts or external references;
- restricted/expired assets referenced by public routes;
- multiple high-priority images on a route;
- production references to development placeholders;
- missing Open Graph dimensions;
- broken image URLs in the production build.

Automated checks do not replace manual crop, truth, accessibility, or visual-quality review.

---

## 33. Manual QA Matrix

Test representative routes with at least:

| Context | Viewport / condition | What to verify |
|---|---|---|
| Small mobile | `320px` width | Reflow, crop, candidate size, alt/caption order, no horizontal scroll |
| Standard mobile | `375–430px` width | LCP request, mobile art direction, image payload |
| Tablet | `768px` width | Grid transition, `sizes`, crop, no duplicate downloads |
| Desktop | `1280px` width | Max-width behavior, source selection, focal point |
| Large desktop | `1536px+` width | No unnecessary upscale or oversized resource |
| High DPR | 2× representative device | Sharpness without wasteful 3×/4× delivery |
| Slow network | Mobile throttling | LCP discovery, placeholder, content availability |
| Disabled JS | Where applicable | Server-rendered image/content and meaningful fallback |
| Reduced motion | OS/browser preference | No reveal delay or animated placeholder dependency |
| Failed request | Blocked/missing image | Stable frame and preserved meaning |

For each case inspect:

- selected resource URL, intrinsic size, and transfer bytes;
- computed rendered size;
- loading and fetch priority;
- request start relative to HTML and other critical resources;
- LCP element and subpart timing;
- CLS contributions;
- cache status and content type;
- alt, caption, and accessible name;
- visual fidelity of steel, documents, people, and brand assets.

---

## 34. Measurement and Monitoring

### 34.1 Before release

- Run a production build.
- Test representative templates, not only the homepage.
- Use a cold cache and a warm cache.
- Test at least one real mid-range mobile device or representative emulation.
- Compare lab findings with any available field data.
- Record the LCP element, selected image candidate, byte size, and request timing.
- Investigate image-specific CLS entries.

### 34.2 After release

Monitor:

- field LCP and CLS by route template and device type;
- image/CDN error rate;
- cache hit ratio;
- optimizer response latency;
- top image bytes by traffic;
- unexpectedly requested widths or qualities;
- 404s from replaced assets;
- mobile/desktop candidate mismatches;
- routes with more than one elevated-priority image.

When traffic is insufficient for page-level field data, use origin/template data plus controlled lab and real-device tests. Do not claim success solely from a single Lighthouse run.

---

## 35. Claude Code Execution Rules

Before creating or changing image behavior, Claude Code MUST:

1. Read `PROJECT_BRIEF.md`, `BRAND_GUIDELINES.md`, `DESIGN_DIRECTION.md`, `DESIGN_SYSTEM.md`, `MEDIA_GUIDELINES.md`, `PERFORMANCE_GUIDELINES.md`, and this document.
2. Inspect the installed Next.js version and existing `next.config` image settings.
3. Inspect current image components, asset folders, registry/content model, and deployment constraints.
4. Identify the likely LCP element for affected templates.
5. Reuse the approved image component and registry before creating a new abstraction.
6. Preserve Persian RTL and future LTR safety.
7. Preserve source truth, rights, crop intent, and brand identity.
8. Build and test affected representative routes.
9. Record unresolved assets or decisions in `TASKS.md` or `DECISIONS.md` as appropriate.

Claude Code MUST NOT:

- fabricate or download replacement evidence;
- optimize, redraw, or recolor the master logo as photography;
- mark all images as priority/preload;
- use `unoptimized` as a shortcut;
- add broad remote host wildcards;
- create a second image pipeline without approval;
- publish camera originals or unredacted sources;
- place essential images behind client-only rendering or reveal animation;
- add arbitrary image widths, qualities, or third-party services without measurement;
- make image components depend on RTL-specific duplicated markup;
- silently exceed a budget;
- change approved asset meaning through crop or compression.

---

## 36. Pull Request Evidence

Any pull request that materially changes image delivery should include:

- affected routes/templates;
- before/after screenshots at mobile and desktop widths;
- before/after selected image dimensions and transfer bytes;
- LCP/CLS impact or a statement explaining why they are unaffected;
- confirmation of `sizes`, intrinsic dimensions, and loading priority;
- confirmation that no new unapproved remote origin was added;
- confirmation of alt/caption behavior;
- confirmation that truth, rights, and approval status are unchanged;
- any approved budget exception and its `DECISIONS.md` reference.

---

## 37. Release Checklist

### 37.1 Source and truth

- [ ] Source master is preserved outside the public delivery tree.
- [ ] Truth class, purpose, owner, rights, and approval are recorded.
- [ ] Crop and compression preserve operational truth.
- [ ] No unverified factory, warehouse, inventory, client, supplier, project, or result is implied.
- [ ] Conceptual or stock imagery is not presented as Ahan Asa evidence.

### 37.2 Format and bytes

- [ ] Format matches the asset type.
- [ ] Actual selected viewport resource meets its role budget.
- [ ] No original camera or design-source file is shipped.
- [ ] Unsafe metadata is removed.
- [ ] Compression artifacts were reviewed at rendered size.
- [ ] Mobile does not receive an unnecessary desktop-sized asset.

### 37.3 Rendering

- [ ] Intrinsic dimensions or a stable aspect ratio are reserved.
- [ ] `sizes` matches the real layout.
- [ ] Responsive candidates are generated correctly.
- [ ] Crop and focal point pass mobile, tablet, and desktop review.
- [ ] Failure state preserves layout and meaning.
- [ ] No image is stretched, unintentionally mirrored, or upscaled.

### 37.4 LCP and loading

- [ ] Expected LCP element was measured.
- [ ] LCP image is present in initial HTML and is not lazy-loaded.
- [ ] Only the actual LCP image receives elevated priority.
- [ ] Hidden and below-the-fold images do not compete for initial bandwidth.
- [ ] LCP image fits the `≤ 200 KB` target or has an approved exception.
- [ ] No reveal animation delays the LCP element.

### 37.5 Accessibility and RTL

- [ ] Informative image has useful contextual Persian alt text.
- [ ] Decorative image has empty alt text.
- [ ] Complex diagram has an equivalent explanation/data source.
- [ ] Caption adds context and does not fabricate facts.
- [ ] Real imagery is not mirrored for RTL.
- [ ] Mixed-direction codes, dimensions, and filenames display correctly.
- [ ] Essential text remains live HTML.

### 37.6 Security and delivery

- [ ] SVG is trusted and sanitized.
- [ ] Remote host/path is narrowly allowlisted.
- [ ] No private storage URL or local path is exposed.
- [ ] Cache/version behavior is correct.
- [ ] Production content type is correct.
- [ ] Broken, expired, restricted, and development-placeholder assets are absent.

### 37.7 Social and SEO

- [ ] Open Graph image is exactly `1200 × 630` and page-relevant.
- [ ] Social crop and text safe area were reviewed.
- [ ] Absolute URL uses the approved HTTPS domain.
- [ ] Image sitemap or structured references, if implemented, use approved indexable assets only.
- [ ] Filenames are descriptive, stable, lowercase Latin, and hyphenated.

---

## 38. Definition of Done

An image implementation is complete only when:

1. the asset is truthful, rights-cleared, approved, and purpose-defined;
2. source and public derivative are separated;
3. format, crop, dimensions, and compression suit the actual placement;
4. the selected mobile and desktop resources meet role budgets;
5. responsive `sizes` and candidate selection were verified;
6. the likely LCP image is discovered early and no unnecessary image competes with it;
7. layout remains stable before, during, and after loading or failure;
8. alt text, caption, text equivalents, and RTL behavior pass review;
9. caching, URL versioning, remote-host security, and metadata stripping are correct;
10. production build and representative route tests pass;
11. any exception is approved, documented, owned, and scheduled for review.

---

## 39. Pending Decisions

The following remain `TBD` until explicitly approved:

- exact production Next.js version and image API compatibility policy;
- final device-width and image-width arrays after real component audit;
- final allowed quality values after visual and byte testing;
- approved image CDN or remote image origins, if any;
- final cache-control rules and Cloudflare/Vercel responsibility split;
- production media registry/CMS implementation;
- final master storage or DAM location;
- named asset approvers and exception approvers;
- final Persian wordmark and authoritative logo filenames;
- automated CI toolchain and performance-test thresholds beyond this contract;
- RUM implementation and dashboard ownership;
- image sitemap policy, if required by `SEO_STRATEGY.md`.

Claude Code must preserve flexibility until these decisions are recorded. Temporary configuration MUST NOT become an undocumented permanent standard.

---

## 40. Technical References

Implementation should be checked against the currently installed framework version and current primary documentation:

- [Next.js Image Component](https://nextjs.org/docs/app/api-reference/components/image)
- [Next.js image configuration](https://nextjs.org/docs/app/api-reference/config/next-config-js/images)
- [web.dev — Optimize Largest Contentful Paint](https://web.dev/articles/optimize-lcp)
- [web.dev — Optimize Cumulative Layout Shift](https://web.dev/articles/optimize-cls)
- [MDN — HTML image element](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/img)
- [WCAG 2.2 — Text alternatives](https://www.w3.org/WAI/WCAG22/Understanding/non-text-content.html)

External documentation informs implementation but does not override approved Ahan Asa brand, truth, accessibility, security, or architecture decisions.

---

## 41. Final Rule

For Ahan Asa, an optimized image is not simply a smaller file. It is a **truthful, appropriately sized, accessible, stable, and early-or-late-loaded asset according to its real role**.

When choosing between visual spectacle and credible performance, choose credible performance. When choosing between aggressive compression and reliable evidence, preserve the evidence and redesign the delivery.

