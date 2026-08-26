# Changelog

All notable changes to the Ahan Asa website are documented in this file.

This project follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html) where practical.

## Instructions for Claude Code

Claude Code must update this file whenever it makes a user-visible, architectural, security-related, SEO-related, or operationally significant change.

### Required workflow

1. Read this file before starting implementation.
2. Add completed changes under `Unreleased` in the appropriate category.
3. Describe the result, not the implementation process.
4. Use one concise bullet for each independently meaningful change.
5. Include affected routes, components, integrations, or documents when useful.
6. Do not record planned, attempted, reverted-before-commit, or unverified work.
7. Before a release, move applicable `Unreleased` entries into a dated version section.
8. Never silently rewrite or delete an entry from a published version.

### Change categories

- `Added` — New pages, features, components, integrations, or documentation.
- `Changed` — Material changes to existing behavior, design, content, or architecture.
- `Deprecated` — Features that remain available but are scheduled for removal.
- `Removed` — Deleted pages, features, dependencies, or integrations.
- `Fixed` — Bug fixes, compatibility corrections, and content or metadata corrections.
- `Security` — Vulnerability fixes, access-control changes, hardening, and dependency security updates.

### Writing rules

- Start each entry with a past-tense action verb such as `Added`, `Updated`, `Fixed`, `Removed`, or `Secured`.
- Write for project owners and developers; avoid vague phrases such as “minor changes” or “various fixes.”
- Do not include secrets, credentials, tokens, private customer data, or sensitive infrastructure details.
- Do not use commit hashes as the only explanation; add an issue, pull request, or commit reference only as supporting context.
- Combine repetitive low-level edits into one meaningful product-level entry.
- Mark breaking changes clearly with `**BREAKING:**` and include the required migration action.
- Keep the newest version first.
- Use ISO dates in `YYYY-MM-DD` format.

## Versioning policy

Use versions in the form `MAJOR.MINOR.PATCH`:

- `MAJOR` — Incompatible changes requiring migration or coordinated rollout.
- `MINOR` — Backward-compatible features, pages, or significant improvements.
- `PATCH` — Backward-compatible fixes, content corrections, and small refinements.

Documentation-only milestones may remain under `Unreleased` until they are included in a website release.

## [Unreleased]

### Added

- Added the project changelog and its maintenance rules for Claude Code.

### Changed

### Deprecated

### Removed

### Fixed

### Security

<!--
Add new entries above this comment. Remove empty categories when publishing a release.

Example:

## [1.2.0] - 2026-09-15

### Added

- Added a multilingual RFQ form to `/rfq` with file-upload support.

### Changed

- Updated the homepage procurement process to clarify engineering review and supplier verification.

### Fixed

- Fixed Persian canonical URLs so the default locale remains unprefixed.

### Security

- Secured public form submissions with server-side validation and rate limiting.
-->

## Release checklist

Before creating a release:

- Confirm every entry describes completed and verified work.
- Remove empty categories from the release section.
- Select the correct semantic version.
- Add the release date in ISO format.
- Update comparison links at the bottom of this file if the repository URL is available.
- Confirm breaking changes include migration instructions.
- Leave an empty `Unreleased` section ready for the next development cycle.

## Release template

```markdown
## [X.Y.Z] - YYYY-MM-DD

### Added

- Added ...

### Changed

- Updated ...

### Deprecated

- Deprecated ...

### Removed

- Removed ...

### Fixed

- Fixed ...

### Security

- Secured ...
```

<!-- Add version comparison links here after the canonical repository URL is confirmed. -->
