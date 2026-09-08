import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

/**
 * P0-1 regression pins — Product Showcase V2.0 §64.11 / §77 / §82:
 *
 *   "Do NOT use a baseline state in which cards are permanently `opacity: 0`
 *    until JavaScript executes. JavaScript failure must never hide Product
 *    Families."
 *
 * The original defect: `.reveal` set `opacity: 0` unconditionally, cleared
 * only by a `data-visible="true"` attribute that only an IntersectionObserver
 * callback could set — so a failed/blocked/throttled JS bundle left the whole
 * Showcase blank.
 *
 * The fix removes the hidden resting state entirely rather than trying to
 * guarantee it always gets cleared. The transparent appearance now exists
 * only inside `@keyframes`, so "the enhancement did not complete" and "the
 * content is gone" can never be the same state. These tests pin that
 * property from several angles, because it is the one invariant a future
 * refactor is most likely to quietly undo.
 *
 * Source-text invariants rather than a DOM render, matching this repo's
 * established convention (homepage-projection-invariants.test.ts): the
 * Showcase's module graph reaches `cloudflare:workers`, which cannot be
 * resolved under plain `node --test`. Live no-JS behaviour was additionally
 * verified against the running dev server — see the P1 compliance report's
 * NO-JS VERIFICATION section.
 */

const REPO_ROOT = path.resolve(fileURLToPath(new URL(".", import.meta.url)), "../..");

function readSource(relativePath: string): string {
  return readFileSync(path.join(REPO_ROOT, relativePath), "utf8");
}

/** Source with comments stripped — these invariants are about real code, not prose. */
function readCode(relativePath: string): string {
  return readSource(relativePath)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .filter((line) => !/^\s*(\/\/|\*)/.test(line))
    .join("\n");
}

// ---------------------------------------------------------------------------
// No hidden resting state, anywhere
// ---------------------------------------------------------------------------

test("there is no persistent hidden state in the stylesheet at all", () => {
  const css = readSource("styles/theme-extensions.css");

  assert.ok(!/\.reveal\[data-reveal="armed"\]/.test(css), "the 'armed' pre-hidden state must not exist");
  assert.ok(!css.includes("data-visible"), "the original data-visible mechanism must be fully removed, not left alongside the new one");

  // A bare `.reveal { ... }` resting rule may exist, but must not hide.
  const bare = /\n\s*\.reveal\s*\{([^}]*)\}/.exec(css);
  if (bare) {
    assert.ok(!/opacity\s*:/.test(bare[1]), "`.reveal` must not declare a resting opacity — that is the P0-1 defect");
    assert.ok(!/transform\s*:/.test(bare[1]), "`.reveal` must not declare a resting transform");
  }
});

test("the transparent appearance lives only inside keyframes", () => {
  const css = readSource("styles/theme-extensions.css");

  const revealed = /\.reveal\[data-reveal="revealed"\]\s*\{([^}]*)\}/.exec(css);
  assert.ok(revealed, "the revealed rule must exist");
  assert.ok(/animation:\s*aa-reveal\s/.test(revealed![1]), "revealed must attach the entrance animation");
  assert.ok(!/opacity\s*:\s*0/.test(revealed![1]), "the revealed rule must never itself set opacity 0");

  const kf = /@keyframes\s+aa-reveal\s*\{([\s\S]*?)\n  \}/.exec(css);
  assert.ok(kf, "the aa-reveal keyframes must be defined");
  assert.ok(/to\s*\{[^}]*opacity:\s*1/.test(kf![1]), "the animation must end fully opaque");

  // The starting opacity must stay legible. A running-but-stalled animation
  // (verified live: background tabs freeze CSS animations) holds the `from`
  // frame indefinitely, so a near-zero start would strand content invisible.
  const fromOpacity = /from\s*\{[^}]*opacity:\s*([\d.]+)/.exec(kf![1]);
  assert.ok(fromOpacity, "the from-frame must declare an explicit opacity");
  assert.ok(Number(fromOpacity![1]) >= 0.9, `the entrance must start at >= 0.9 opacity (§64.3 says ~0.92), got ${fromOpacity![1]} — a lower value reintroduces the P0-1 failure`);
});

test("entrance motion matches the frozen numbers in §64.3 / §64.4", () => {
  const css = readSource("styles/theme-extensions.css");

  const revealed = /\.reveal\[data-reveal="revealed"\]\s*\{([^}]*)\}/.exec(css);
  const duration = /animation:\s*aa-reveal\s+(\d+)ms/.exec(revealed![1]);
  assert.ok(duration, "the entrance duration must be explicit");
  const ms = Number(duration![1]);
  assert.ok(ms >= 180 && ms <= 220, `§64.3 specifies ~180–220ms, got ${ms}ms`);

  const kf = /@keyframes\s+aa-reveal\s*\{([\s\S]*?)\n  \}/.exec(css);
  const translate = /translateY\((\d+)px\)/.exec(kf![1]);
  assert.ok(translate, "the from-frame must declare a translateY offset");
  assert.ok(Number(translate![1]) <= 6, `§64.3 specifies ~4–6px, got ${translate![1]}px`);

  // Per-card stagger: ~30ms increments, keeping the visible set inside budget.
  const showcase = readCode("components/home/product-showcase.tsx");
  const stagger = /delay=\{i \* (\d+)\}/.exec(showcase);
  assert.ok(stagger, "the Showcase must stagger its cards");
  assert.ok(Number(stagger![1]) <= 30, `§64.4 suggests ~30ms per card, got ${stagger![1]}ms`);
});

test("the entrance animation uses a forwards fill — never backwards/both, which would strand content", () => {
  const css = readSource("styles/theme-extensions.css");
  const revealed = /\.reveal\[data-reveal="revealed"\]\s*\{([^}]*)\}/.exec(css);
  assert.ok(revealed, "the revealed rule must exist");

  const decl = revealed![1];
  assert.ok(/\bforwards\b/.test(decl), "must use a forwards fill so the finished state persists");
  // A backwards/both fill applies the transparent `from` state before the
  // animation starts — a hidden resting state by another name.
  assert.ok(!/\bbackwards\b/.test(decl), "must NOT use a backwards fill");
  assert.ok(!/\bboth\b/.test(decl), "must NOT use a both fill");
});

test("reduced motion cancels the animation and pins the element fully visible", () => {
  const css = readSource("styles/theme-extensions.css");
  const block = /@media \(prefers-reduced-motion: reduce\)\s*\{([\s\S]*?)\n  \}/.exec(css);
  assert.ok(block, "a prefers-reduced-motion block must exist for .reveal");

  assert.ok(/opacity:\s*1/.test(block![1]), "reduced motion must force full opacity");
  assert.ok(/animation:\s*none/.test(block![1]), "reduced motion must cancel the entrance animation (§64.10)");
  assert.ok(/transform:\s*none/.test(block![1]), "reduced motion must remove the offset transform");
});

// ---------------------------------------------------------------------------
// The component side
// ---------------------------------------------------------------------------

test("Reveal renders no attribute on the server, so SSR HTML carries no styling hook", () => {
  const source = readCode("components/ui/reveal.tsx");

  assert.ok(/data-reveal=\{phase === "static" \? undefined : phase\}/.test(source), "SSR must emit no data-reveal attribute whatsoever");
  assert.ok(/useState<RevealPhase>\("static"\)/.test(source), 'the initial (server) phase must be the visible "static" baseline');
  assert.ok(/type RevealPhase = "static" \| "revealed"/.test(source), "there must be exactly two phases — no intermediate hidden phase");
});

test("Reveal only ever moves content toward visible — it never sets a hiding phase", () => {
  const source = readCode("components/ui/reveal.tsx");
  const setCalls = [...source.matchAll(/setPhase\("(\w+)"\)/g)].map((m) => m[1]);

  assert.ok(setCalls.length > 0, "the component must transition phase at least once");
  for (const value of setCalls) {
    assert.equal(value, "revealed", `setPhase must only ever be called with "revealed", found "${value}"`);
  }
});

test("Reveal never animates content that is already on screen, and bails out without observer support", () => {
  const source = readCode("components/ui/reveal.tsx");

  assert.ok(/typeof IntersectionObserver === "undefined"/.test(source), "must bail out (leaving content visible) when IntersectionObserver is unavailable");
  assert.ok(/if \(alreadyInView\) return;/.test(source), "content already in view must never be animated — animating it would flash it to transparent first");
  assert.ok(/rootMargin: "0px 0px 12% 0px"/.test(source), "the observer should fire slightly before entry so the stagger runs off-screen");
});

test("the per-card stagger is scheduled in JS, not as an animation-delay", () => {
  const source = readCode("components/ui/reveal.tsx");
  const css = readSource("styles/theme-extensions.css");

  assert.ok(/setTimeout\(\(\) => setPhase\("revealed"\), delay\)/.test(source), "the stagger must be a JS timer around the phase change");
  assert.ok(/clearTimeout\(staggerTimer\)/.test(source), "the stagger timer must be cleared on unmount");

  // An animation-delay combined with a forwards fill would leave the card
  // visible and then blink it to transparent when the delay elapsed.
  const revealed = /\.reveal\[data-reveal="revealed"\]\s*\{([^}]*)\}/.exec(css);
  assert.ok(!/animation-delay/.test(revealed![1]), "must not use animation-delay for the stagger");
  assert.ok(!readCode("components/ui/reveal.tsx").includes("transitionDelay"), "the old inline transitionDelay stagger must be gone");
});

test("no <noscript> duplicate of the Showcase markup was introduced as the fix", () => {
  // The invariant is satisfied by never hiding the single copy — duplicating
  // content into <noscript> would be the wrong solution and a maintenance trap.
  for (const file of ["components/ui/reveal.tsx", "components/home/product-showcase.tsx"]) {
    assert.ok(!/<noscript[\s>]/.test(readCode(file)), `${file} must not render a <noscript> duplicate`);
  }
});

// ---------------------------------------------------------------------------
// Shared-component blast radius
// ---------------------------------------------------------------------------

test("every Reveal consumer inherits the fix — none reimplements a hiding baseline of its own", () => {
  // Reveal is shared. These are its actual consumers, verified by grep.
  //
  // components/home/process.tsx was on this list until Purchase Process V2.0
  // was implemented; that spec's §28 targets "0 dedicated interaction JS", so
  // the component now renders with no Reveal at all and SSR, JS-off, and
  // reduced-motion are the same render. It is deliberately absent here rather
  // than re-added — see
  // lib/content/purchase-process-frozen-spec-invariants.test.ts, which asserts
  // it must NOT import Reveal.
  const consumers = [
    "components/home/product-showcase.tsx",
    "components/home/reach.tsx",
    "app/[locale]/services/page.tsx",
  ];

  for (const file of consumers) {
    const source = readCode(file);
    assert.ok(source.includes("<Reveal"), `${file} is expected to be a Reveal consumer`);

    // Every `opacity-0` must be a hover affordance that restores itself on
    // hover/focus — never a resting baseline waiting on JS. (The Showcase's
    // directional arrow is exactly such an affordance, and carries no
    // required information, per §64.7/§17.16.)
    for (const className of source.match(/className="[^"]*"/g) ?? []) {
      if (!/\bopacity-0\b/.test(className)) continue;
      assert.ok(/(group-hover|hover|focus):opacity-100/.test(className), `${file} has an opacity-0 that nothing restores: ${className}`);
    }
  }
});

test("Hero and Price Strip do not depend on Reveal, so the shared change cannot regress them", () => {
  // Recorded as an executable fact because the P0 audit claimed the opposite
  // (that Reveal wraps Hero/Price Strip content). It does not, and both are
  // frozen components. If either ever adopts Reveal, this test fails and the
  // regression surface must be re-reviewed deliberately.
  for (const file of ["components/home/hero.tsx", "components/home/price-strip.tsx"]) {
    const source = readSource(file);
    assert.ok(!source.includes("Reveal"), `${file} is frozen and must not take a dependency on Reveal without an explicit re-review`);
    assert.ok(!/\breveal\b/.test(source), `${file} must not use the reveal class directly`);
  }
});

test("the Showcase's product links and titles are plain SSR markup with no client-side fetch (§79/§82)", () => {
  const source = readCode("components/home/product-showcase.tsx");

  assert.ok(!source.includes('"use client"'), "the Showcase must remain a server component");
  assert.ok(!/useEffect|useState|fetch\(|useSWR|useQuery/.test(source), "the Showcase must not fetch or hold client state");
  assert.ok(source.includes("<Link"), "cards must be real anchors present in the initial HTML");
});
