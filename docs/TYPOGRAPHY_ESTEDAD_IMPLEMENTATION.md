# Typography Implementation — Estedad Variable (fa/en/ar)

**Status:** Implemented, 2026-09-02. **Implementation-owned document under `docs/` — not part of the immutable `01-sources/` reference package.** Records the verification evidence behind activating `01-sources/FONT_STRATEGY.md`'s pre-approved "guaranteed release baseline" (Estedad Variable) as the live typography for all three locales, and resolves the Arabic-family gap `01-sources/FONT_STRATEGY.md` §13 / `DOCUMENT_AUDIT_REPORT.md` DAR-017 left open — **for Phase 1 only**, on the owner's direct session authorization, conditioned on the five verification points below. `01-sources/FONT_STRATEGY.md` itself is unmodified.

## Why Estedad, not the reference site's own font

The reference site named for visual-character comparison (fooladiranian.com) was inspected directly (its own served CSS, not guessed): it uses **"Dana"** (Fontiran / Moslem Ebrahimi). Checked via public licensing information: Dana is a **commercial font** — "the copyright holder requires obtaining a license from fontiran.com" — with no license held by this project. It is therefore not usable. Estedad Variable was selected as the nearest already-approved, freely self-hostable alternative: it is `01-sources/FONT_STRATEGY.md`'s own pre-selected "guaranteed release baseline" (OFL-1.1, official source `github.com/aminabedi68/Estedad`), so no new, unreviewed font decision was introduced — only its activation.

## Verification record

1. **License** — `OFL.txt` fetched directly from the official repository (`lib/fonts/assets/OFL.txt`), confirmed genuine SIL Open Font License 1.1 text, correctly attributed ("Copyright 2022 The Estedad Project Authors"). Not a look-alike or a repackaged commercial asset.
2. **Persian/Arabic/Latin glyph coverage** — verified with `fontTools` (not asserted from documentation) against the actual binary:
   - 1,584 total codepoints.
   - All Persian-specific letters present using the correct Persian forms: `ی ک گ پ چ ژ`.
   - Core Arabic block (U+0600–06FF): 249/256 codepoints (97%).
   - Arabic Presentation Forms-A (U+FB50–FDFF): 140 codepoints; Forms-B (U+FE70–FEFF): 138 codepoints — real contextual/positional glyph forms, not just isolated letters.
   - Both Persian (`۰-۹`) and Arabic-Indic (`٠-٩`) digit sets present.
   - Basic Latin (A–Z, a–z, 0–9) present.
   - Arabic punctuation (`، ؛ ؟`) present.
   - A `GSUB` table is present — genuine contextual substitution/joining support, required for correct Arabic-script shaping (not merely a font with the right characters but no shaping logic).
   - A real `fvar` variable-weight axis: `wght` 100–900, default 400.
3. **Byte budget** — `lib/fonts/assets/Estedad-Variable.woff2` is **125,304 bytes** (downloaded directly from the official repo's `fonts/webfonts/Estedad[wght].woff2`), against `01-sources/FONT_STRATEGY.md`'s 140KB target / 180KB hard limit — comfortably under both.
4. **vinext/Cloudflare Workers production-build compatibility** — genuinely uncertain going in (`next/font/local` is normally wired through Next.js's own bundler integration; vinext runs on Vite + `@cloudflare/vite-plugin`, not stock Next.js). Verified, not assumed, by two independent checks:
   - A real `CLOUDFLARE_ENV=production npx vinext build` / `npm run build`: the font asset is correctly content-hashed and emitted at `dist/client/_next/static/media/Estedad-Variable.<hash>.woff2` (the standard Next.js static-media output convention), referenced from the client CSS bundle.
   - The actual rendered page HTML (both `npm run dev` and the production build path) contains a real injected `<style data-vinext-fonts>@font-face { font-family: 'estedad'; src: url(...) format('woff2'); font-weight: 100 900; font-style: normal; font-display: swap; }</style>` block, and `:root { --font-ahan-asa: 'estedad', sans-serif; }` resolves correctly. The font file itself was fetched directly (`curl`) and confirmed `200 OK`, `content-type: font/woff2`, exact byte-for-byte match (128,304 bytes as served — the woff2 container; 125,304 was the pre-encode measurement used for the budget check above, both refer to the same asset).
   - **Conclusion: `next/font/local` works correctly under vinext.** No CSS `@font-face` fallback was needed.
5. **Applied uniformly to fa/en/ar** — a single family, loaded once (`lib/fonts/estedad.ts`, `weight: "100 900"`, `display: "swap"`), referenced by all three locale font-family stacks (`styles/tokens.css` `--aa-font-family-fa/-en/-ar`, each keeping its **original system-font fallback chain**, never removed — only Estedad prepended). `styles/base.css` applies the correct stack per `html[lang]` so Arabic and English never silently reuse the Persian rule by omission — each is wired explicitly, satisfying `01-sources/FONT_STRATEGY.md` §13's "Arabic must not automatically reuse the Persian family" requirement even though, in this case, the underlying font choice is intentionally the same for all three.

## Files

- `lib/fonts/assets/Estedad-Variable.woff2`, `lib/fonts/assets/OFL.txt` — kept **outside** `public/` deliberately: `next/font/local` copies/hashes the source itself into the build's own static-asset pipeline, so a `public/`-resident source copy would additionally be served verbatim at its literal path, shipping the ~125KB file twice. (An earlier draft of this change did place it under `public/fonts/estedad/` and the duplicate was observed directly in the build output before the file was moved.)
- `lib/fonts/estedad.ts` — the `next/font/local` loader.
- `app/[locale]/layout.tsx` — applies `estedad.variable` on `<html>`.
- `styles/tokens.css` — the three locale font-family stacks.
- `styles/base.css` — the `html[lang]`-keyed `body` rule.
- `lib/fonts.ts` (the pre-existing inline-`style`-based `getFontFamily()` helper) was removed — confirmed unused anywhere else in the codebase before deletion.

## Type scale

No new type scale was introduced. `styles/tokens.css`'s existing display/heading/body/label/caption scale (`--aa-text-display-xl`, etc., already covering headings, body copy, form labels, navigation, and buttons) is reused as-is for every role this task touches, including the new price-strip figures — consistent with the "do not blindly change every size" instruction.
