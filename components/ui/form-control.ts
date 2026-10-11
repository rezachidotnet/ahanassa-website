/**
 * Shared form-control styles (W10.2; W10.0 report §5.2) for every input,
 * select and textarea — the RFQ form's customer fields and its item rows use
 * the same classes, so a control looks the same wherever it appears.
 *
 * - Single-line controls (input, select) are exactly 48px tall (`h-12`, also
 *   the touch minimum); 8px control radius and a 1px border on every control.
 *   A fixed height, not `min-h-12`: a flex or grid parent can stretch a
 *   control that only has a minimum, which made the RFQ phone input 56.5px
 *   next to 48.5px fields on desktop (W10.3, 2026-10-09). The textarea is the
 *   one multi-line control: same border and radius, `min-h-28`.
 * - Border `border-control` (#868fa0, 3.26:1 on white — WCAG 1.4.11); the
 *   old `border-border` hairline was 1.18:1. Hover darkens to n-600.
 * - Focus: copper border plus a 3px copper ring. `outline-hidden` (not
 *   `outline-none`) keeps a transparent outline that forced-colors mode
 *   paints, because box-shadow rings disappear there.
 * - Placeholder n-500 (4.97:1). `aria-invalid` turns the border danger red.
 * - Disabled is a muted fill, never opacity.
 * - Text uses the compact UI size (15px/1.5), not body copy's 16/1.8.
 *
 * No `next/*`/React import, so it stays unit-testable under `node --test`.
 */
const controlBase = [
  "block w-full rounded-[var(--aa-radius-control)] border border-border-control bg-background px-3.5 text-ui text-navy",
  "transition-[border-color,box-shadow] duration-[160ms] placeholder:text-tertiary hover:border-border-control-hover",
  "focus-visible:border-copper focus-visible:shadow-[var(--aa-shadow-focus-control)] focus-visible:outline-hidden",
  "aria-invalid:border-danger disabled:cursor-not-allowed disabled:border-[var(--aa-color-neutral-300)] disabled:bg-muted disabled:text-tertiary",
].join(" ");

// Plain concatenation, no tailwind-merge: the parts never conflict, and the
// default merge config would drop the custom `text-ui` size next to `text-navy`.
export const controlClass = `${controlBase} h-12 py-2.5`;

/**
 * `<select>`: the native arrow is removed (`appearance-none`) and the caller
 * renders a chevron at the logical end (`end-3.5`); `pe-10` keeps long
 * selected text from running under it in RTL and LTR alike.
 */
export const selectClass = `${controlClass} appearance-none truncate pe-10`;

export const textareaClass = `${controlBase} min-h-28 resize-y py-3`;

/** Label above the control: 14px / 600, n-700. Required = `*` (aria-hidden) + real `required`; optional = an "(optional)" suffix. */
export const labelClass = "block text-sm font-semibold text-neutral-700";
