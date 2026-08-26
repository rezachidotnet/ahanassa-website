# Ahan Asa Website — UI/UX Design Direction

> **Brand:** Ahan Asa | آهن آسا  
> **Domain:** `ahanassa.com`  
> **Document:** `DESIGN_DIRECTION.md`  
> **Status:** Draft v1.0 — Design direction for approval  
> **Last updated:** 2026-08-25  
> **Primary experience:** Persian-first, fully RTL  
> **Core idea:** **Calm control for high-value steel procurement**

---

## 1. Purpose of This Document

This document defines the intended visual and experiential direction of the Ahan Asa website. It translates the approved business positioning and brand character into practical UI/UX guidance for designers, developers, content teams, and Claude Code.

It answers:

- What should the website feel like?
- What should a visitor understand in the first few seconds?
- How should the brand's promise of protecting the client's capital become visible in the interface?
- How should information, proof, navigation, forms, imagery, and motion work together?
- What design directions are explicitly out of scope?

This document defines creative intent and experience rules. Exact tokens, font sizes, spacing values, breakpoints, component variants, and code-level specifications belong in `DESIGN_SYSTEM.md`, `TYPOGRAPHY_SYSTEM.md`, `RESPONSIVE_RULES.md`, and `UI_COMPONENTS.md`.

### 1.1 Source hierarchy

Design decisions must follow this order:

1. `PROJECT_BRIEF.md` — business, audience, scope, and product truth
2. `BRAND_GUIDELINES.md` — approved brand identity and asset rules
3. `DESIGN_DIRECTION.md` — visual and experiential direction
4. `DESIGN_SYSTEM.md` — tokens and repeatable UI rules
5. Page and component specifications — implementation detail

If a later document conflicts with an approved brand or business decision, stop and resolve the conflict before implementation.

---

## 2. The Design Thesis

### 2.1 One-sentence direction

**Ahan Asa should feel like a composed procurement office that brings order, clarity, and protection to a complicated steel purchase—not like a steel bazaar, price board, warehouse catalog, or consumer e-commerce store.**

### 2.2 Experience metaphor

The digital experience should resemble an **executive procurement desk**:

- The client's request is received clearly.
- Complexity is handled behind the scenes.
- Decisions are explained in plain language.
- The next step is always visible.
- Evidence replaces exaggerated promises.
- The interface remains calm even when the underlying market is complex.

### 2.3 Core experiential promise

The user should feel:

> “I can send my invoice or material list, understand what happens next, and trust that this process will be handled responsibly.”

This is the UI/UX expression of the approved brand promise:

> **ما مراقب سرمایه شما هستیم.**

---

## 3. Desired User Perception

Within the first screen and first navigation interaction, the website should communicate:

1. Ahan Asa manages steel purchasing; it is not merely another seller.
2. The user can begin with an existing invoice or material list.
3. The company understands both commercial and technical procurement risk.
4. The process is structured, accountable, and understandable.
5. The visual quality reflects the seriousness of a high-value B2B decision.

### 3.1 Desired emotional sequence

The experience should move the visitor through this sequence:

**Uncertainty → Recognition → Clarity → Trust → Confident action**

### 3.2 Desired brand attributes

- Precise
- Protective
- Trustworthy
- Calm
- Commercially intelligent
- Technically aware
- Modern
- Premium but practical
- Human without becoming casual

### 3.3 Perceptions to avoid

- Cheap or discount-led
- Aggressive sales-oriented
- Traditional iron shop
- Commodity trading terminal
- Large impersonal marketplace
- Overly technical engineering software
- Luxury without operational substance
- Startup-style novelty without trust

---

## 4. Non-Negotiable Experience Principles

### 4.1 Protection must be expressed through clarity

“Protecting capital” must not be presented only as a slogan. It should be visible through:

- Clear scope and responsibilities
- Transparent process stages
- Explicit next steps
- Honest limitations
- Legible comparisons
- Evidence and documentation
- Clear form expectations
- No hidden or misleading interactions

### 4.2 Complexity stays behind the interface

The customer should not be forced to navigate a large catalog, understand supplier terminology, or make unnecessary decisions before contacting Ahan Asa.

The interface should progressively reveal detail only when it helps the next decision.

### 4.3 Industrial intelligence without industrial clutter

The website may use steel, documentation, logistics, and technical imagery, but it must not rely on visual clichés such as dark metallic textures, sparks, flames, excessive black backgrounds, or heavy mechanical decoration.

### 4.4 Premium means restrained, not decorative

Premium quality should come from typography, composition, whitespace, photography, interaction quality, and precise implementation—not from gold effects, glossy surfaces, large gradients, or excessive animation.

### 4.5 Proof before claims

Real process evidence, redacted documents, verified procurement cases, supplier evaluation logic, and clear methodology should carry more visual weight than unsupported adjectives.

### 4.6 Persian must feel native

The website must be designed from the beginning for Persian reading behavior and RTL interaction. It must never feel like an English layout mirrored at the final stage.

### 4.7 Every page should support a decision

Each page must help the visitor do at least one of the following:

- Understand the service
- Evaluate trust
- Clarify fit
- Learn the process
- Prepare the required information
- Submit an invoice, material list, or inquiry

---

## 5. Visual Territory

### 5.1 Approved territory

**Premium industrial advisory**

This territory combines:

- Editorial clarity
- Procurement discipline
- Industrial credibility
- Financial responsibility
- Quiet confidence
- Human guidance

### 5.2 Visual keywords

- Structured
- Spacious
- Composed
- Geometric
- Editorial
- Document-driven
- Responsible
- Tactile but clean
- Strong but not heavy

### 5.3 Productive tension

The identity should balance the following pairs:

| Industrial strength | Human reassurance |
| --- | --- |
| Precision | Simplicity |
| Authority | Approachability |
| Premium quality | Practical action |
| Technical awareness | Plain-language guidance |
| Strong geometry | Generous whitespace |

Neither side should dominate completely.

---

## 6. Color Direction

### 6.1 Approved brand colors

- **Steel Navy:** `#0B2545`
- **Forge Copper:** `#B04A2F`
- **White:** `#FFFFFF`

### 6.2 Role of Steel Navy

Steel Navy is the primary expression of trust, control, seriousness, and technical authority. Use it for:

- Primary typography
- Key navigation states
- High-confidence sections
- Primary controls where appropriate
- Important diagrams and structural lines
- Dark editorial bands used sparingly

The site should not become a continuous dark-navy interface. Large dark sections must be balanced with bright, breathable surfaces.

### 6.3 Role of Forge Copper

Forge Copper is an accent, not a dominant background color. It should communicate human attention, decision points, protection, and action.

Preferred uses:

- Small emphasis marks
- Active states
- Selected data points
- Key icons or line details
- Limited CTA emphasis
- Editorial annotations

Avoid large copper panels, copper-on-copper combinations, or using the accent on every interactive element.

### 6.4 Role of white and neutrals

White is the primary spatial field and should create clarity and calm. Any additional neutral grays, warm whites, borders, semantic colors, or derived tints must be defined centrally in `COLOR_SYSTEM.md`; they must not be invented independently inside components.

### 6.5 Color behavior

- Brand colors must retain accessible contrast.
- Color must never be the only indicator of status or selection.
- Success, warning, error, and information colors must remain semantically distinct from Forge Copper.
- Gradients are not part of the default visual language. Any exceptional use requires explicit approval.

---

## 7. Typography Direction

### 7.1 Persian typography character

Persian typography should feel:

- Modern
- Geometric
- Corporate
- Highly legible
- Confident without appearing loud
- Compatible with the approved Persian logotype direction

**Estedad** is the primary visual reference and preferred candidate, subject to final licensing, performance, and technical approval. If another family is selected, it must preserve the same modern, balanced, and non-calligraphic character.

### 7.2 Hierarchy

- Headlines should be editorial and decisive, with controlled line length.
- Body text should be comfortable for technical and commercial explanations.
- Labels, metadata, and process states should be concise and visually disciplined.
- Large type is encouraged only where it strengthens meaning; it must not create inefficient mobile layouts.
- Excessive bold text weakens hierarchy and should be avoided.

### 7.3 Persian text quality

- Use correct Persian punctuation and نیم‌فاصله.
- Prevent isolated short words at line endings when practical.
- Avoid narrow text columns that produce fragmented Persian rhythm.
- Use Persian or Latin numerals according to the approved content rule, not component-by-component preference.
- Phone numbers, URLs, file names, product codes, dimensions, and technical values require explicit mixed-direction handling.

### 7.4 Latin typography

Latin text is secondary on the Persian site. It should support technical data and the English brand name without competing with Persian content. The final Persian/Latin pairing belongs in `TYPOGRAPHY_SYSTEM.md`.

---

## 8. Layout and Composition

### 8.1 Overall composition

The site should use a precise responsive grid, strong alignment, generous whitespace, and a limited number of high-value modules per viewport.

Preferred characteristics:

- Clear editorial bands rather than endless identical cards
- Alternation between narrative, evidence, and action
- Strong section openings
- Controlled asymmetry on large screens
- Simple, linear reading order on mobile
- Deliberate empty space around important decisions

### 8.2 Density

Content density should be **moderate and intentional**:

- More spacious than a marketplace
- More informative than a luxury campaign site
- Less dense than an ERP dashboard
- More structured than a generic corporate brochure

### 8.3 Containers and alignment

- Use consistent content boundaries across pages.
- Allow selected media or color fields to extend beyond the text grid only when they support hierarchy.
- Align headings, body copy, proof, and CTAs to a visible system.
- Avoid decorative misalignment that weakens precision.
- Avoid horizontal scrolling except for intentionally designed data tables with a clear mobile treatment.

### 8.4 Shape language

The approved logo is geometric and architectural. UI geometry should echo its precision without copying the symbol into every element.

- Corners may be subtly softened, not excessively rounded.
- Cards must not look like playful app tiles.
- Lines, dividers, frames, and document-like panels are preferred to ornamental containers.
- Pills should be reserved for true tags, filters, or statuses—not used as the default shape for all buttons and labels.

---

## 9. Surface, Depth, and Materiality

### 9.1 Surface direction

The primary surface language is flat, clean, and architectural. Depth should come from layering, spacing, borders, and subtle shadows rather than glossy effects.

### 9.2 Shadows

Use shadows only to explain elevation or focus:

- Header separation during scroll
- Active upload area
- Dialogs and overlays
- Floating mobile actions when required

Avoid dramatic card shadows, glow, inner bevels, or fake metallic depth.

### 9.3 Texture

Subtle real-world texture may appear inside approved photography. Do not apply steel grain, brushed metal, noise, carbon fiber, rust, sparks, or ornamental texture as generic UI backgrounds.

### 9.4 Glassmorphism

Glassmorphism is not part of the default system. If used at all, it must be limited to a specific media-overlay context, remain readable, and have a robust fallback.

---

## 10. Global Navigation and Website Shell

### 10.1 Header

The header should feel quiet, stable, and easy to scan.

It should prioritize:

- Clear brand identification
- A short, task-oriented navigation
- One primary conversion action
- Correct RTL order and predictable keyboard behavior

The primary action should center on sending an invoice/material list or starting a procurement inquiry. It must remain visible without turning the header into a promotional banner.

### 10.2 Navigation behavior

- Use plain-language labels.
- Avoid deep mega-menus in Phase 1 unless the approved sitemap genuinely requires them.
- Show clear current-page state.
- On mobile, use a fast, accessible navigation pattern with no hidden critical path.
- Do not force users to select a product category before they understand the service.

### 10.3 Footer

The footer should provide reassurance and orientation, not a dense keyword dump. It should contain:

- Essential navigation
- Contact channels
- Legal and privacy links
- Approved company identity
- A restrained final CTA
- Optional concise explanation of Ahan Asa's role

---

## 11. Homepage Experience Direction

The homepage should tell one coherent story. It must not behave like a list of disconnected promotional modules.

### 11.1 Recommended narrative order

#### 1. Hero — role, value, and first action

The first screen should answer:

- What does Ahan Asa do?
- Who is it for?
- What should I do next?

Working message direction, pending `COPY_GUIDELINES.md` approval:

> **خرید آهن را به یک تصمیم مطمئن تبدیل کنید.**  
> فاکتور یا لیست خریدتان را بفرستید؛ آهن آسا فرآیند بررسی، انتخاب و تأمین را برای شما مدیریت می‌کند.

Working CTA direction:

- Primary: **ارسال فاکتور یا لیست خرید**
- Secondary: **آشنایی با فرآیند خرید**

The hero should not open with daily prices, a product grid, generic claims, or an image of anonymous warehouse inventory.

#### 2. Problem recognition

Show that the risk is larger than unit price: specification, supplier, availability, timing, documentation, payment terms, logistics, and delivery.

The user should feel understood, not frightened.

#### 3. Ahan Asa's role

Explain the difference between a conventional seller and a procurement manager. A concise comparison or two-column explanation may be used if it remains respectful and evidence-based.

#### 4. How the process works

Present a short, understandable sequence:

1. Send invoice or list
2. Review requirements
3. Evaluate sourcing options
4. Present a clear proposal
5. Confirm purchase
6. Coordinate supply and delivery within the agreed scope

The interface may summarize stages, but must not imply automated capabilities that do not yet exist.

#### 5. Protection pillars

Communicate the four value pillars:

- Requirement clarity
- Sourcing control
- Commercial protection
- Delivery coordination

Do not turn these into four generic equal cards by default. Use a more editorial composition when possible.

#### 6. Evidence and trust

Use verified evidence such as real process samples, approved cases, redacted documents, credentials, or transparent methodology. If evidence is limited, show the process honestly instead of fabricating statistics.

#### 7. Relevant capabilities or material categories

Provide orientation without turning the homepage into a catalog. Categories should help a user identify fit and continue to the right page.

#### 8. Guidance and resources

Feature useful content that helps visitors make safer procurement decisions.

#### 9. FAQ and objection handling

Answer practical questions about scope, required information, response process, pricing validity, delivery, documentation, and what Ahan Asa does not do.

#### 10. Final action

End with a clear, low-friction invitation to send the existing invoice or material list, along with a concise explanation of what happens after submission.

---

## 12. Page Archetypes

### 12.1 Capability or service page

Recommended structure:

1. User situation
2. Scope of service
3. Risks or decisions managed
4. Ahan Asa approach
5. Required client input
6. Process and deliverables
7. Evidence
8. FAQ
9. Relevant inquiry CTA

### 12.2 Material category page

Material pages should support procurement intent without becoming unverified live catalogs.

Recommended structure:

1. Category overview
2. Common purchase contexts
3. Key specification and documentation considerations
4. Procurement risks
5. What information the client should send
6. Ahan Asa's role
7. Related resources
8. Inquiry CTA

### 12.3 Process page

The process page should turn operational complexity into an understandable, accountable sequence. Use stages, responsibilities, inputs, outputs, and decision gates. Avoid a decorative timeline that lacks real information.

### 12.4 Evidence or case-study page

Recommended structure:

1. Client situation
2. Purchasing requirement
3. Risk or constraint
4. Procurement response
5. Coordination and documentation
6. Verified outcome
7. Lessons or relevant method
8. CTA for a similar requirement

### 12.5 Resource or article page

Prioritize reading comfort, clear hierarchy, useful diagrams, related content, and a contextual CTA. Do not interrupt educational content with repeated aggressive conversion blocks.

### 12.6 Contact and RFQ pages

These pages should reduce anxiety and clarify:

- What the user should send
- Accepted information and file types
- What will happen next
- Expected communication channel
- Privacy and handling of documents
- Alternative contact path if upload fails

---

## 13. Primary Conversion Experience

### 13.1 Conversion concept

The primary conversion is not “Buy now.” It is:

**Send an existing invoice or material list and begin a managed procurement conversation.**

### 13.2 Form philosophy

- Ask only for information needed for a useful first response.
- Use progressive disclosure for optional project detail.
- Allow the user to submit a request even if some commercial details are unknown.
- Explain why sensitive project documents are requested.
- Preserve entered data when recoverable validation errors occur.
- Use direct, specific validation messages.
- Provide a clear fallback contact method.
- Do not imply that document analysis is automated if it is manually reviewed in V1.

### 13.3 Upload experience

The upload interface should:

- Make file selection obvious on desktop and mobile
- Show accepted formats and size limits before selection
- Display file name, state, and removal control
- Support keyboard interaction
- Distinguish upload progress, validation, success, and failure
- Confirm successful receipt without promising a quote or delivery time prematurely

### 13.4 Post-submission state

The confirmation should state:

- The request was received
- What the team will review
- What the next contact step is
- How the user can add missing information
- A reference number, only if the system actually generates one

Avoid generic “Thank you” screens with no operational guidance.

---

## 14. Component-Level Direction

### 14.1 Buttons

- Primary actions should be unmistakable but not oversized.
- Button labels should describe the result of the action.
- Use one dominant primary action per section.
- Secondary and text actions should remain visually distinct.
- Do not use copper for every button by default.

### 14.2 Cards

Cards should group meaningful, independent content. Avoid wrapping every paragraph, icon, metric, and link in a card.

Preferred alternatives include:

- Editorial lists
- Bordered rows
- Split layouts
- Document panels
- Comparison bands
- Anchored annotations

### 14.3 Process steps

Process UI should clarify sequence, current understanding, input, and outcome. Numbered stages and restrained connecting lines are preferred over playful illustrations.

### 14.4 Tables and comparisons

Tables should be used when exact comparison improves a purchasing decision. They require:

- Clear column meaning
- RTL-aware alignment
- Proper handling of numbers and technical units
- A usable mobile strategy
- No color-only interpretation

### 14.5 Accordions

Use accordions for secondary questions, not to hide essential service scope or critical conversion information.

### 14.6 Status and feedback

System feedback should be immediate, calm, specific, and accessible. Do not use alarming language for recoverable form errors.

---

## 15. Imagery and Art Direction

### 15.1 Image purpose

Every image should support one of these functions:

- Show real materials or purchasing context
- Explain a process
- Provide evidence
- Humanize professional service
- Clarify scale, documentation, logistics, or delivery

### 15.2 Preferred image families

- Real steel materials photographed with clean composition
- Procurement documents, lists, drawings, and controlled desk scenes
- Supplier or material inspection, when genuine and approved
- Loading, logistics, and delivery coordination
- Detail photography showing specification and traceability
- Professional human interaction in real work contexts
- Abstract architectural compositions derived from the approved brand geometry

### 15.3 Photographic style

- Natural or controlled neutral light
- Strong composition and negative space
- Accurate material color
- Documentary credibility
- Restrained grading
- Clear focal point
- No exaggerated HDR or cinematic orange-and-blue treatment

### 15.4 Prohibited imagery

- Images implying ownership of unverified factories, warehouses, fleets, or inventory
- Generic handshakes
- Anonymous stock-business teams posing at screens
- Sparks, molten metal, flames, or workers included only as industrial decoration
- AI-generated facilities or projects presented as real evidence
- Repeated warehouse panoramas with no informational purpose
- Decorative images that compete with the primary CTA

### 15.5 AI-generated imagery

AI-generated visuals may be used only as clearly non-evidentiary conceptual artwork. They must never represent a real client, project, facility, stock level, supplier, delivery, or operational capability.

---

## 16. Iconography, Diagrams, and Data

### 16.1 Icon style

- Simple geometric construction
- Consistent stroke and optical weight
- Legible at small sizes
- Functional rather than decorative
- Compatible with RTL direction where meaning is directional

Avoid mixing multiple icon families or using generic 3D industrial icons.

### 16.2 Diagrams

Use diagrams when they reduce cognitive load. Good candidates include:

- Procurement stages
- Responsibility boundaries
- Supplier evaluation factors
- Document flow
- Inquiry-to-delivery sequence

Diagrams must remain understandable without animation and should stack logically on mobile.

### 16.3 Metrics and data

- Display only verified metrics.
- Provide units, context, and source meaning.
- Do not use animated counters for decorative impact.
- Do not fabricate market feeds, price trends, partner counts, delivery rates, or project statistics.

---

## 17. Motion and Micro-Interaction

### 17.1 Motion character

Motion should feel:

- Controlled
- Precise
- Quiet
- Responsive
- Purposeful

### 17.2 Appropriate uses

- Subtle entrance of major editorial content
- Clear hover and focus feedback
- Upload and form state transitions
- Navigation state changes
- Process-step emphasis
- Lightweight visual explanation of sequence

### 17.3 Motion limits

- No motion may delay access to content or conversion.
- Avoid parallax-heavy sections, cursor effects, continuous loops, or decorative floating objects.
- Avoid loading screens unless technically necessary.
- Respect `prefers-reduced-motion`.
- Core meaning must remain available with motion disabled.

Exact duration, easing, distance, and stagger rules belong in `MOTION_GUIDELINES.md`.

---

## 18. Responsive and Mobile Direction

### 18.1 Mobile is a primary procurement entry point

The mobile experience must not be a compressed desktop layout. It should prioritize:

- Immediate role clarity
- Easy contact and document submission
- Short, readable content blocks
- Large enough interactive targets
- Simple navigation
- Stable layout during media and font loading

### 18.2 Responsive behavior

- Editorial split layouts should become a clear single reading sequence.
- Evidence and context must remain adjacent after stacking.
- Process diagrams should reflow vertically.
- Tables require responsive transformation or controlled horizontal access.
- CTAs may become full-width where useful, but should not create permanent visual pressure.
- Sticky mobile actions may be used only when they do not cover content or compete with form completion.

### 18.3 Content priority

Responsive layouts must preserve information hierarchy, not only component order. The mobile user should encounter role, value, trust, and action in the correct sequence.

---

## 19. RTL and Bidirectional Content

### 19.1 RTL is structural

RTL must govern:

- Grid and content flow
- Navigation order
- Breadcrumbs
- Icon direction
- Form alignment
- Tables
- Process sequence
- Carousel controls, if any
- Back/forward meaning

### 19.2 Mixed-direction data

Use explicit direction handling for:

- Phone numbers
- Email addresses
- URLs
- File names
- Product codes
- Dimensions and units
- Dates when Latin formatted
- Currency and quantities

Do not depend on browser auto-detection for critical data.

### 19.3 Mirroring rule

Mirror directional controls and sequences when meaning requires it. Do not mirror logos, non-directional icons, product photographs, or symbols whose meaning would change.

---

## 20. Accessibility Direction

Accessibility is part of premium quality and release acceptance.

The design must support:

- WCAG-aligned color contrast
- Visible keyboard focus
- Logical focus order
- Semantic heading hierarchy
- Clear labels and instructions
- Error identification and recovery
- Sufficient touch targets
- Zoom and text resizing
- Reduced motion
- Screen-reader-friendly upload and form status
- Content comprehension in plain Persian

Do not remove focus outlines without providing a stronger accessible alternative. Placeholder text must not replace labels.

Exact standards and test procedures belong in `ACCESSIBILITY.md` and `ACCESSIBILITY_QA.md`.

---

## 21. Performance as a Design Constraint

The premium experience must feel fast and stable.

- The hero must not depend on a heavy autoplay video.
- Important content must not wait for decorative JavaScript.
- Images must have defined dimensions and responsive sources.
- Fonts must be loaded strategically to minimize layout shift.
- Animation libraries must be justified by real experience value.
- Above-the-fold media should be visually strong but byte-efficient.
- The primary conversion path must remain usable on slow or unstable mobile connections.

Performance requirements belong in `PERFORMANCE_GUIDELINES.md`; design review must reject concepts that cannot meet them reasonably.

---

## 22. Trust Design

Trust should be designed as a system, not a logo strip.

### 22.1 Preferred trust signals

- Clear explanation of Ahan Asa's role
- Named and understandable process
- Real team or accountable contact identity, when approved
- Redacted sample documentation
- Verified cases and outcomes
- Transparent quotation validity and scope language
- Clear privacy and document-handling explanation
- Real business and contact information
- Useful educational content
- Consistent response expectations

### 22.2 Trust signals to reject

- Unverified client logos
- Fake testimonials
- Generic awards
- Unsupported “best price” claims
- Invented years of experience
- Fabricated counters
- False scarcity
- Fake real-time purchase notifications
- Security badges without actual meaning

---

## 23. Content and Interface Relationship

The interface should make expert content easier to understand, not reduce everything to slogans.

### 23.1 Copy rhythm

Preferred section rhythm:

1. Clear decision-oriented heading
2. One concise explanatory statement
3. Evidence, process, or useful detail
4. One relevant next action

### 23.2 Language behavior

- Lead with the client's decision and risk.
- Explain specialist terms when they are necessary.
- Use calm, accountable language.
- Avoid fear-driven copy.
- Avoid generic self-praise.
- Avoid repeating the slogan in every section.

Final wording remains governed by `COPY_GUIDELINES.md`.

---

## 24. Explicit Do / Do Not Rules

### Do

- Create a Persian-native RTL experience.
- Use whitespace to communicate control.
- Make “send invoice or material list” the clearest entry path.
- Explain what happens after every important action.
- Use verified process and evidence.
- Use navy as the primary authority color and copper as a restrained accent.
- Design for non-expert understanding without reducing credibility for professional buyers.
- Make forms and file upload excellent on mobile.
- Use clear comparison, process, and responsibility models.
- Keep the experience fast, accessible, and calm.

### Do not

- Build the homepage as a product marketplace.
- Lead with a steel price ticker or price-per-kilogram promise.
- Use the visual language of a traditional آهن‌فروشی.
- Cover every section with cards.
- Use heavy gradients, metallic textures, glow, bevel, or excessive glass effects.
- Use copper as the dominant page background.
- Use fake statistics, clients, facilities, inventory, or projects.
- Hide important scope inside accordions.
- Force the user to understand steel taxonomy before contacting Ahan Asa.
- Create long or animated flows that delay invoice submission.
- Alter the approved logo geometry.

---

## 25. Initial Prototype Priorities

Before designing every page, validate these five experience areas:

1. **Desktop homepage hero and first narrative sequence**
2. **Mobile homepage and navigation**
3. **Invoice/material-list submission flow**
4. **Process explanation module**
5. **Evidence/case-study presentation pattern**

Prototype testing should answer:

- Can a new visitor explain Ahan Asa's role after the first screen?
- Does the site feel like a procurement partner rather than a seller?
- Can the user find the invoice submission path immediately?
- Does the user understand what happens after submission?
- Does the interface feel trustworthy without relying on unsupported claims?
- Is the mobile flow comfortable for document upload and contact entry?

---

## 26. Acceptance Criteria for the Design Direction

A proposed design is aligned only if all of the following are true:

- The first screen communicates role, value, audience, and action.
- The visual system feels premium, industrial, calm, and credible.
- The experience is visibly different from a commodity marketplace.
- Persian typography and RTL composition feel native.
- The approved logo and colors are used correctly.
- Copper is restrained and purposeful.
- The homepage follows a coherent decision journey.
- The invoice/material-list path is prominent and low-friction.
- Process, scope, and next steps are understandable to a non-expert buyer.
- Professional buyers can still find sufficient technical and commercial substance.
- Trust is based on real information and evidence.
- Mobile, accessibility, and performance constraints are reflected in the design itself.
- No concept depends on fake prices, statistics, projects, facilities, or capabilities.

If a concept is visually attractive but fails these criteria, it is not approved.

---

## 27. Implementation Mandates for Claude Code

Claude Code must:

1. Read `PROJECT_BRIEF.md`, `BRAND_GUIDELINES.md`, this document, and the approved system specifications before creating production UI.
2. Treat Persian RTL behavior as a foundational layout requirement.
3. Preserve the approved master logo geometry and asset proportions.
4. Use centralized tokens and components; do not introduce ad hoc colors, spacing, radii, or shadows.
5. Maintain one clear primary action per major section.
6. Keep the invoice/material-list submission path functional and visible across responsive layouts.
7. Never fabricate content, claims, metrics, testimonials, prices, facilities, suppliers, or projects to complete a layout.
8. Use honest placeholders clearly marked for replacement when final assets are unavailable.
9. Implement accessible focus, forms, upload states, errors, and reduced-motion behavior from the start.
10. Protect performance by avoiding unnecessary client-side rendering and decorative dependencies.
11. Stop and report any conflict between this document and an approved higher-authority document.
12. Record material design deviations in `DECISIONS.md` before implementation.

---

## 28. Items Requiring Later Definition

The following are intentionally not finalized here:

- Final font family, weights, and loading method
- Exact type scale
- Exact spacing and grid tokens
- Exact corner radii and shadow tokens
- Full neutral and semantic color palette
- Final page inventory and routes
- Final Persian navigation labels
- Final CTA wording
- Final form fields and integrations
- Approved photography library
- Verified case studies, client marks, and metrics
- Exact motion values
- Accessibility conformance target and QA tooling
- Final breakpoints and responsive component rules

These decisions must be completed in their relevant documents and must remain consistent with this direction.

---

## 29. Final Direction Statement

The Ahan Asa website should transform a complicated industrial purchase into a clear, reassuring, and accountable digital journey.

It should look premium because it is disciplined. It should feel protective because it is transparent. It should feel intelligent because complexity has been organized—not displayed for effect.

The final experience must make the brand promise tangible:

> **ما مراقب سرمایه شما هستیم.**

