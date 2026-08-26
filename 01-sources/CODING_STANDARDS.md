# Coding Standards

> Project: Ahan Asa Website  
> Status: Mandatory  
> Primary stack: Next.js App Router, React, TypeScript  
> Applies to: Human contributors, Claude Code, automation, and generated code

## 1. Purpose

This document defines the minimum coding standards for the Ahan Asa website. Its goals are to keep the codebase predictable, secure, accessible, performant, easy to review, and safe to extend.

These rules apply to all production code, tests, scripts, configuration, styles, content schemas, and API integrations.

## 2. Requirement Language

The keywords **MUST**, **MUST NOT**, **SHOULD**, **SHOULD NOT**, and **MAY** indicate the strength of a rule:

- **MUST / MUST NOT:** Mandatory. Exceptions require a documented decision.
- **SHOULD / SHOULD NOT:** Expected default. Deviations require a clear technical reason.
- **MAY:** Optional and context-dependent.

When project documents conflict, apply this priority order:

1. Security and legal requirements
2. `CLAUDE.md`
3. `DO_NOT_CHANGE.md`
4. Approved architecture and design decisions
5. This document
6. Framework defaults and personal preferences

## 3. Core Principles

All code MUST follow these principles:

1. **Clarity over cleverness:** Prefer obvious, maintainable code.
2. **Server-first:** Use Server Components and server-side data access by default.
3. **Type safety:** Avoid untyped data and unsafe assertions.
4. **Single responsibility:** Each module should have one clear purpose.
5. **Reuse with restraint:** Extract repeated behavior, not speculative abstractions.
6. **Progressive enhancement:** Core content and actions must remain usable without unnecessary client-side JavaScript.
7. **Accessibility by default:** Accessibility is part of implementation, not a later patch.
8. **Performance by design:** Prevent avoidable JavaScript, layout shift, and oversized assets.
9. **Secure by default:** Validate external data and minimize exposed information.
10. **Small, reviewable changes:** Do not combine unrelated refactors and features.

## 4. Source Language and User-Facing Content

- Code, identifiers, comments, commit messages, and technical documentation MUST be written in English.
- User-facing text MUST come from the approved locale/content source when localization is enabled.
- Persian, Arabic, or other localized strings MUST NOT be hard-coded inside shared UI components.
- Brand names, technical product names, and approved terminology MUST use the spelling defined in the content and brand guidelines.
- Comments MUST explain intent, constraints, or non-obvious decisions; they MUST NOT restate the code.

## 5. Project Structure

The repository MUST follow `FOLDER_STRUCTURE.md`. Until that document defines otherwise, use these responsibilities:

```text
app/                 Routes, layouts, metadata, route handlers
components/          Reusable UI and feature components
components/ui/       Low-level design-system primitives
lib/                 Domain logic, utilities, schemas, integrations
content/             Structured local content and translations
public/              Static public assets
styles/              Global styles, tokens, and shared style utilities
tests/               Test setup, fixtures, and cross-feature tests
types/               Shared public TypeScript types only
```

Rules:

- Route-specific code SHOULD remain near its route.
- Reusable feature code SHOULD be grouped by domain, not by technical file type.
- A module MUST NOT import from another module's private internals.
- Shared utilities MUST have a proven use in at least two places.
- Barrel files (`index.ts`) SHOULD be avoided when they hide dependency direction or increase bundle size.
- Circular dependencies are prohibited.

## 6. Naming Conventions

| Item | Convention | Example |
| --- | --- | --- |
| React component | PascalCase | `QuoteRequestForm` |
| Type / interface / enum | PascalCase | `QuoteRequestPayload` |
| Function / variable | camelCase | `calculateTotalWeight` |
| Constant | camelCase; UPPER_SNAKE_CASE only for true global constants | `defaultLocale`, `MAX_FILE_SIZE` |
| Boolean | `is`, `has`, `can`, `should`, or `was` prefix | `isSubmitting` |
| Event handler | `handle` prefix | `handleFormSubmit` |
| Component callback prop | `on` prefix | `onSubmit` |
| Hook | `use` prefix | `useReducedMotion` |
| Route folder | kebab-case | `request-for-quote` |
| Non-component file | kebab-case | `format-phone-number.ts` |
| Component file | kebab-case or project-approved convention, used consistently | `quote-request-form.tsx` |
| CSS custom property | kebab-case | `--color-steel-navy` |
| Test | Source filename plus test suffix | `quote-request-form.test.tsx` |

Additional rules:

- Names MUST describe business meaning rather than implementation detail.
- Avoid vague names such as `data`, `item`, `value`, `helper`, or `temp` when a precise name is possible.
- Avoid abbreviations unless they are standard in the domain, such as `URL`, `SEO`, `API`, or `RFQ`.
- Do not prefix interfaces with `I` or types with `T`.

## 7. TypeScript Standards

- TypeScript strict mode MUST remain enabled.
- Production code MUST NOT use `any`. Use `unknown`, then narrow it safely.
- Public functions, exported utilities, component props, and integration boundaries MUST have explicit types.
- Prefer inferred types for obvious local variables.
- Prefer `type` for unions, intersections, mapped types, and component props.
- Use `interface` only when declaration merging or a deliberately extensible object contract is required.
- Prefer discriminated unions over multiple related booleans.
- Prefer `readonly` for immutable inputs and configuration.
- Avoid TypeScript `enum`; prefer `as const` objects or literal unions.
- Non-null assertions (`!`) and type assertions (`as`) SHOULD be avoided.
- If an assertion is unavoidable, the invariant MUST be clear and locally justified.
- External input MUST be parsed and validated at runtime; static types alone are insufficient.
- Reusable domain types SHOULD be derived from schemas or source data where practical.

Example:

```ts
type RequestState =
  | { status: 'idle' }
  | { status: 'submitting' }
  | { status: 'success'; requestId: string }
  | { status: 'error'; message: string };
```

## 8. Functions and Control Flow

- Functions SHOULD do one thing and remain small enough to understand without excessive scrolling.
- Prefer early returns to deeply nested conditionals.
- A function with more than three positional parameters SHOULD use an options object.
- Side effects MUST be visible in the function name or isolated at an integration boundary.
- Pure functions SHOULD be used for formatting, transformation, and business rules.
- Do not mutate function arguments.
- Avoid hidden global state.
- Do not use nested ternaries.
- Complex conditions SHOULD be assigned to clearly named variables.
- Time, randomness, network access, and browser globals SHOULD be injectable or isolated for testability.

## 9. React Component Standards

- Use function components only.
- Components MUST have a focused responsibility.
- Prefer composition over large collections of conditional props.
- Props MUST be typed and SHOULD be `readonly`.
- Do not store derived values in state.
- Do not use effects for calculations that can happen during render.
- Effects MUST be reserved for synchronization with external systems.
- Hooks MUST follow React's Rules of Hooks.
- List keys MUST be stable identifiers; array indexes are prohibited when order can change.
- Event handlers SHOULD contain minimal UI orchestration and delegate domain logic to tested functions.
- Components SHOULD remain deterministic for the same props and state.
- Use semantic HTML before adding ARIA.
- Do not create wrapper components that add no meaningful behavior, semantics, or styling contract.

## 10. Next.js App Router Standards

- Server Components are the default.
- Add `'use client'` only at the smallest interactive boundary that needs browser APIs, state, effects, or event handlers.
- Client Components MUST NOT import server-only modules, secrets, database clients, or privileged integrations.
- Data fetching SHOULD happen on the server and as close as practical to the consuming route or component.
- Independent server requests SHOULD run concurrently.
- Request waterfalls MUST be avoided unless one request depends on another.
- Route segments MUST provide appropriate `loading`, `error`, and `not-found` behavior where relevant.
- Metadata MUST use the Next.js metadata API and follow `METADATA_SPEC.md`.
- Internal navigation MUST use the framework's link component.
- Images MUST use the approved image component and sizing strategy unless a documented exception applies.
- Route Handlers and Server Actions MUST validate input, enforce authorization where applicable, and return controlled errors.
- Server-only modules SHOULD use the framework's server-only guard.
- Dynamic rendering, caching, and revalidation MUST be chosen explicitly according to content freshness and `CACHING_STRATEGY.md`.
- Browser-only libraries SHOULD be dynamically imported when they are not required for initial rendering.

## 11. Imports and Module Boundaries

Imports SHOULD be ordered as follows, with one blank line between groups:

1. React and Next.js
2. External packages
3. Internal absolute imports
4. Relative imports
5. Type-only imports
6. Styles and assets

Rules:

- Use the project alias for cross-feature imports.
- Use relative imports only for nearby files within the same feature or route.
- Use `import type` for type-only dependencies.
- Do not import deep private paths from packages or other features.
- Unused imports and exports are prohibited.
- Default exports SHOULD be limited to framework-required files.
- Named exports are preferred for reusable modules because they improve refactoring and discovery.

## 12. Styling Standards

- Styling MUST follow `DESIGN_SYSTEM.md`, `COLOR_SYSTEM.md`, and `TYPOGRAPHY_SYSTEM.md`.
- Use design tokens for color, spacing, typography, radius, shadow, and motion.
- Approved Ahan Asa brand values SHOULD be represented as semantic tokens, not scattered literals.
- Do not use arbitrary colors, spacing values, shadows, or font sizes when an approved token exists.
- Styles MUST be mobile-first.
- Prefer logical CSS properties such as `margin-inline`, `padding-inline`, and `inset-inline-start` for RTL/LTR compatibility.
- Avoid `!important`; any exception requires a comment explaining the constraint.
- Avoid styling by fragile DOM structure or generated class names.
- Component styles MUST not leak into unrelated components.
- Hover behavior MUST have an equivalent focus-visible state where relevant.
- Motion MUST respect `prefers-reduced-motion`.
- Do not animate layout-intensive properties when `transform` or `opacity` can achieve the result.

## 13. Localization, RTL, and LTR

- Locale handling MUST follow `LOCALIZATION.md` and `LOCALE_CONTENT_STRUCTURE.md`.
- The Persian default locale MUST use the approved unprefixed routing strategy if defined by `ROUTES.md`.
- Locale-specific routes MUST preserve canonical and hreflang rules.
- Direction MUST be set at the document or locale-layout level.
- Components MUST support both `rtl` and `ltr` without duplicated layout implementations.
- Use logical CSS properties and direction-aware icons.
- Text alignment SHOULD normally follow `start` and `end`, not `left` and `right`.
- Dates, numbers, currencies, units, and phone numbers MUST use locale-aware formatting.
- Translations MUST preserve variables, markup placeholders, and technical meaning.
- Missing translations MUST fail visibly during development rather than silently shipping the wrong locale.

## 14. Accessibility

- Target WCAG 2.2 Level AA.
- Every page MUST have a logical heading hierarchy and one clear primary heading.
- Interactive elements MUST be keyboard accessible.
- Visible focus indicators MUST NOT be removed.
- Buttons perform actions; links navigate.
- Inputs MUST have programmatically associated labels.
- Form errors MUST identify the affected field and explain how to correct it.
- Status messages SHOULD use appropriate live-region behavior without excessive announcements.
- Images MUST have meaningful alternative text or an empty `alt` when decorative.
- Color MUST NOT be the only way information is communicated.
- Text and interactive elements MUST meet approved contrast requirements.
- Dialogs, menus, accordions, and tabs MUST implement correct focus and keyboard behavior.
- ARIA MUST only supplement valid semantic HTML.
- Touch targets SHOULD be at least 44 by 44 CSS pixels.

## 15. Forms and Validation

- Forms MUST follow `FORM_ARCHITECTURE.md`.
- Validate on both client and server; server validation is authoritative.
- Use one shared schema when practical.
- Normalize inputs such as email addresses and phone numbers before persistence.
- Preserve user input after recoverable validation or network errors.
- Submission controls MUST prevent accidental duplicate submissions.
- Loading, success, validation-error, and system-error states MUST be explicit.
- Error messages MUST be helpful without exposing implementation details.
- Required fields MUST be communicated visually and programmatically.
- Lead capture MUST continue to respect the approved behavior if an external CRM is unavailable.
- Sensitive information MUST NOT be included in analytics events, URLs, or logs.

## 16. Data, APIs, and Integrations

- All external responses MUST be treated as untrusted.
- Validate request and response payloads at system boundaries.
- Integration logic MUST be isolated behind a typed adapter.
- Components MUST NOT call third-party services directly.
- Requests MUST define appropriate timeouts and controlled failure behavior.
- Retries MUST only be used for safe or idempotent operations unless protected by an idempotency mechanism.
- Expected integration failures MUST degrade gracefully and remain observable.
- API keys and secrets MUST remain server-side.
- Public configuration MUST be explicitly marked and reviewed before exposure.
- Changes to an external contract MUST update schemas, fixtures, tests, and `API_INTEGRATIONS.md`.

## 17. Error Handling and Logging

- Expected failures MUST be represented explicitly, not hidden by empty catch blocks.
- Catch errors only when the code can recover, add useful context, or convert them to a controlled boundary response.
- User-facing messages MUST be clear and non-technical.
- Logs MUST include enough context to diagnose an issue without containing secrets or personal data.
- Do not log access tokens, authorization headers, passwords, full form payloads, or unnecessary contact data.
- Production stack traces MUST NOT be exposed to users.
- Error boundaries MUST provide a useful recovery action when possible.
- Monitoring events SHOULD use stable identifiers and structured metadata.

## 18. Security Standards

- Follow `SECURITY_GUIDELINES.md` for all security controls.
- Never commit secrets, credentials, private keys, production data, or local environment files.
- Environment variables MUST be documented in `ENVIRONMENT_VARIABLES.md` and represented with safe placeholders in `.env.example`.
- Validate and sanitize user-controlled input according to its destination.
- Avoid rendering unsanitized HTML. Any use of raw HTML rendering requires documented sanitization.
- Protect state-changing endpoints against unauthorized access, cross-site request forgery where relevant, replay, and abuse.
- Apply rate limiting or equivalent abuse protection to public forms and sensitive endpoints.
- File uploads MUST restrict size, type, count, and storage behavior.
- Dependencies MUST be maintained and reviewed for security advisories.
- Security headers MUST be configured centrally.
- Redirect destinations MUST be allowlisted or safely constructed.

## 19. Performance Standards

- Follow `PERFORMANCE_GUIDELINES.md`, `IMAGE_OPTIMIZATION.md`, and `FONT_STRATEGY.md`.
- Core Web Vitals budgets MUST be treated as release criteria.
- Ship the minimum client-side JavaScript required for the experience.
- Avoid large general-purpose libraries for small features.
- Lazy-load below-the-fold media and non-critical interactive features.
- Above-the-fold images MUST have stable dimensions and the correct priority behavior.
- Fonts MUST be self-hosted or loaded through the approved optimized mechanism, with controlled subsets and weights.
- Prevent cumulative layout shift by reserving space for media, embeds, banners, and dynamic content.
- Avoid unnecessary rerenders and repeated expensive calculations, but do not add memoization without evidence.
- Bundle-impacting changes SHOULD be measured before approval.
- Third-party scripts MUST have an owner, purpose, loading strategy, privacy review, and removal path.

## 20. SEO and Structured Content

- Each indexable page MUST have unique, locale-appropriate metadata.
- Canonical, hreflang, sitemap, robots, redirects, and structured data MUST follow their dedicated specifications.
- Only one canonical URL may represent a page in each locale.
- Structured data MUST match visible content and use valid, supported schemas.
- Links MUST use descriptive anchor text.
- Heading structure MUST reflect content hierarchy, not visual styling.
- Important content MUST be present in server-rendered HTML.
- New routes MUST be checked against the sitemap, internal linking, metadata, and redirect plans.

## 21. Testing Standards

- Follow `TESTING_STRATEGY.md` and the applicable QA checklists.
- Tests MUST focus on observable behavior, business rules, and critical regressions.
- Every bug fix SHOULD include a regression test when practical.
- Pure business logic MUST have unit tests.
- Components with meaningful interaction MUST have interaction tests.
- Critical user journeys, including RFQ submission and locale navigation, MUST have end-to-end coverage.
- Tests MUST be deterministic and independent.
- Do not use arbitrary sleeps in tests; wait for observable conditions.
- Mocks SHOULD be limited to external boundaries.
- Tests MUST NOT depend on production services or real customer data.
- Snapshots SHOULD be used sparingly and only when they provide meaningful review value.
- Accessibility checks SHOULD be included in component and end-to-end testing.

## 22. Code Quality and Formatting

- The repository's formatter and linter configurations are authoritative.
- Formatting MUST be automated; contributors MUST NOT introduce personal formatting variants.
- Lint, type checking, and tests MUST pass before a change is considered complete.
- Lint rules MUST NOT be disabled globally to solve a local problem.
- A local suppression requires the narrowest possible scope and a reason comment.
- Dead code, commented-out code, debug output, and abandoned feature flags MUST be removed.
- TODO comments MUST include an owner or issue reference and the reason the work is deferred.
- Generated files MUST be clearly identified and MUST NOT be manually edited.

Recommended baseline tools:

- TypeScript strict mode
- ESLint with Next.js, React, React Hooks, accessibility, and import rules
- Prettier or an equivalent single formatter
- Unit/component testing with the project-approved test runner
- End-to-end testing with Playwright or the project-approved equivalent

## 23. Dependency Management

- Add a dependency only when its value outweighs maintenance, security, performance, and bundle costs.
- Prefer platform and framework capabilities before adding a package.
- Dependencies MUST be actively maintained, appropriately licensed, and compatible with the stack.
- Exact dependency changes MUST be committed with the lockfile.
- Do not mix package managers.
- Major version upgrades MUST be isolated, tested, and documented.
- Remove unused dependencies promptly.
- Do not modify lockfiles manually.

## 24. Git and Change Discipline

- Each commit SHOULD represent one coherent change.
- Commit messages MUST be written in English, in the imperative mood.
- Recommended format: `<type>(<scope>): <summary>`.
- Allowed common types include `feat`, `fix`, `refactor`, `test`, `docs`, `style`, `perf`, `build`, `ci`, and `chore`.
- Do not combine formatting of unrelated files with a functional change.
- Do not rewrite or delete user changes without explicit authorization.
- Large refactors MUST be separated from feature changes whenever practical.
- Breaking changes and migrations MUST be described in the pull request and changelog.
- Temporary commits MAY be used locally but SHOULD be cleaned before merge when the team workflow permits.

## 25. Pull Request and Review Requirements

Every change MUST be reviewable and include:

- A concise explanation of the problem and solution
- A list of affected routes or components
- Testing evidence
- Screenshots or recordings for meaningful visual changes
- Responsive and RTL/LTR verification when UI is affected
- Accessibility impact
- SEO impact when routes or content change
- Performance impact when bundles, images, fonts, or third-party scripts change
- Security and privacy impact for forms, integrations, authentication, or user data
- Any required documentation updates

Reviewers MUST check behavior, maintainability, accessibility, security, performance, and consistency with approved project documents—not only syntax.

## 26. Claude Code Operating Rules

Before editing code, Claude Code MUST:

1. Read `CLAUDE.md`, `DO_NOT_CHANGE.md`, and the documents relevant to the task.
2. Inspect the existing implementation and reuse established patterns.
3. Identify affected routes, components, tests, metadata, translations, and integrations.
4. Check the working tree and preserve unrelated user changes.
5. State assumptions when requirements are incomplete.

While editing, Claude Code MUST:

- Keep the change within the requested scope.
- Prefer the smallest complete solution.
- Avoid opportunistic refactors.
- Preserve public APIs unless a change is explicitly approved.
- Update all supported locales when shared user-facing content changes.
- Add or update tests with behavior changes.
- Never weaken types, validation, tests, lint rules, or security controls merely to make a check pass.
- Never replace functional production code with placeholders, mock data, or incomplete stubs.

Before declaring completion, Claude Code MUST:

1. Review the diff.
2. Run the relevant formatter, linter, type check, tests, and build.
3. Perform applicable responsive, accessibility, localization, SEO, and performance checks.
4. Confirm no secrets, debug statements, accidental assets, or unrelated changes were introduced.
5. Report what changed, what was verified, and any remaining risk or unverified item.

## 27. Definition of Done

A task is complete only when all applicable statements are true:

- The acceptance criteria are satisfied.
- The implementation follows project architecture and this standard.
- Types are safe and external data is validated.
- Loading, empty, success, and error states are handled.
- Mobile, tablet, and desktop layouts are verified.
- RTL and LTR behavior is verified for affected UI.
- Keyboard and screen-reader basics are verified.
- Metadata and structured content remain correct.
- Performance budgets are not knowingly exceeded.
- Tests are added or updated and all required checks pass.
- Documentation and changelog entries are updated when required.
- The final diff contains no unrelated changes.

## 28. Exceptions

An exception to a **MUST** rule requires a documented decision containing:

- The rule being bypassed
- The technical or business reason
- Alternatives considered
- Security, accessibility, performance, and maintenance impact
- Scope and expiration or review date
- Approver

Exceptions SHOULD be recorded in `DECISIONS.md`. Temporary exceptions MUST include a follow-up task.

## 29. Suggested Quality Commands

The exact scripts are defined by `package.json`. A standard project SHOULD expose commands equivalent to:

```bash
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run test:e2e
npm run build
```

Claude Code MUST inspect the repository and use the actual package manager and script names. It MUST NOT assume these commands exist.

## 30. Maintenance

- Review this document when the framework, architecture, supported locales, deployment model, or team workflow changes.
- Keep rules aligned with automated tooling.
- When a recurring review comment appears, encode it as a lint rule, test, template, or documented standard where practical.
- Changes to this document MUST be intentional, reviewed, and recorded in `CHANGELOG.md` or `DECISIONS.md` when they alter development policy.

---

**Enforcement principle:** If a rule can be reliably automated, enforce it through configuration or CI. Documentation defines the standard; automation prevents regression.
