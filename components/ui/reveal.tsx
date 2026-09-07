"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Plays a soft one-time entrance animation as content scrolls into view —
 * strictly as progressive enhancement.
 *
 * PROGRESSIVE-ENHANCEMENT CONTRACT (the P0-1 fix,
 * docs/product-showcase/AHANASSA_PRODUCT_SHOWCASE_FINAL_FROZEN_V2.0.md §64.11
 * / §77 / §82: "Do NOT use a baseline state in which cards are permanently
 * `opacity: 0` until JavaScript executes. JavaScript failure must never hide
 * Product Families."):
 *
 *   THERE IS NO HIDDEN STATE, AT ANY POINT, IN ANY PHASE.
 *
 * The element is fully visible from the server-rendered HTML onward. The
 * entrance effect is a `forwards`-fill CSS animation attached only by
 * `data-reveal="revealed"`, which animates FROM transparent TO the element's
 * normal appearance. Because the hidden appearance exists only inside
 * keyframes, every failure mode degrades to "visible":
 *
 *   - JS never runs / bundle 404 / hydration crash  -> no attribute, visible
 *   - IntersectionObserver unsupported or throttled  -> no attribute, visible
 *   - Animations disabled, frozen, or unsupported    -> no fill applies, visible
 *   - prefers-reduced-motion                         -> animation cancelled, visible
 *
 * This replaced an earlier attempt that hid the element up-front and relied
 * on a later callback to un-hide it. Verified live that that approach can
 * strand content: in a background/hidden tab the observer is throttled AND
 * css transitions stop advancing, leaving cards painted at opacity 0. A
 * design where "the enhancement failed" and "the content is gone" are the
 * same state is not acceptable for this section, so the hidden state was
 * removed rather than patched with failsafes.
 *
 * An element already on screen when this mounts is never animated at all —
 * animating it would mean flashing visible content to transparent first, and
 * §64.1 requires cards to be immediately available. Only content still below
 * the fold animates, and the observer is deliberately triggered slightly
 * BEFORE the element scrolls in so the stagger runs while it is still
 * off-screen and the user only ever sees the finished result.
 *
 * Motion budget: HOMEPAGE_SPEC.md §23.4 — animate grouped items, not every
 * label independently; applied per-group, not per-word. The per-card stagger
 * (§64.4) is scheduled in JS rather than as an `animation-delay`, because a
 * delayed animation with a `forwards` fill would leave the card visible and
 * then blink it to transparent when the delay elapsed.
 */
type RevealPhase = "static" | "revealed";

export function Reveal({
  children,
  delay = 0,
  className,
  as: Tag = "div",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  as?: "div" | "li" | "section" | "article";
}) {
  const ref = useRef<HTMLElement>(null);
  // "static" is the SSR baseline: no attribute is emitted, so no rule can
  // restyle the element. It is also the permanent state for anything already
  // on screen, and the safe resting state if enhancement never happens.
  const [phase, setPhase] = useState<RevealPhase>("static");

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") return;

    const rect = el.getBoundingClientRect();
    const alreadyInView = rect.top < window.innerHeight && rect.bottom > 0;
    // Already on screen — leave it exactly as rendered. Never animate it.
    if (alreadyInView) return;

    let staggerTimer: ReturnType<typeof setTimeout> | undefined;

    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        staggerTimer = setTimeout(() => setPhase("revealed"), delay);
      },
      // Positive bottom margin: fire just before the element scrolls in, so
      // the staggered animation is already underway by the time it is seen.
      { threshold: 0, rootMargin: "0px 0px 12% 0px" },
    );

    io.observe(el);
    return () => {
      clearTimeout(staggerTimer);
      io.disconnect();
    };
  }, [delay]);

  return (
    <Tag ref={ref as React.Ref<never>} data-reveal={phase === "static" ? undefined : phase} className={cn("reveal", className)}>
      {children}
    </Tag>
  );
}
