/**
 * W25: what scripts/static/overflow-check.ts evaluates in each page. The page
 * overflows when `document.documentElement.scrollWidth > clientWidth`; the
 * offenders are the OUTERMOST visible elements that stick out of the page box
 * on its scrollable side (the left in an RTL page, the right in an LTR one —
 * overflow on the other side is unreachable and adds no width).
 *
 * An element counts only when no box that actually clips it scrolls or clips
 * horizontally. Clipping follows the containing-block chain, not the DOM
 * parent: an absolutely positioned element (e.g. an `sr-only` span) inside an
 * `overflow-x-auto` strip escapes it unless the strip, or something between,
 * is positioned — the cause of the fa home/prices overflow (W25). Fixed
 * elements (off-canvas menus) are relative to the viewport and add no width.
 * An offender inside another offender is left out, so a wide table is
 * reported once, not cell by cell.
 */
export interface OverflowOffender {
  selector: string;
  left: number;
  right: number;
  width: number;
  text: string;
}

export interface OverflowScan {
  scrollWidth: number;
  clientWidth: number;
  offenders: OverflowOffender[];
}

function scanOverflow(): OverflowScan {
  const doc = document.documentElement;
  const vw = doc.clientWidth;
  const page = doc.getBoundingClientRect();
  const rtl = getComputedStyle(doc).direction === "rtl";
  const clipsX = (el: Element) => /^(auto|scroll|hidden|clip)$/.test(getComputedStyle(el).overflowX);
  const establishesAbsoluteBlock = (el: Element) => {
    const s = getComputedStyle(el);
    return s.position !== "static" || s.transform !== "none" || s.filter !== "none" || /paint|layout|strict|content/.test(s.contain);
  };
  /** True when a box on `el`'s containing-block chain clips it horizontally, or it is fixed. */
  const contained = (el: Element) => {
    for (let node: Element = el; ; ) {
      const position = getComputedStyle(node).position;
      if (position === "fixed") return true;
      let parent = node.parentElement;
      if (position === "absolute") while (parent && parent !== document.body && !establishesAbsoluteBlock(parent)) parent = parent.parentElement;
      if (!parent || parent === document.body || parent === doc) return false;
      if (clipsX(parent)) return true;
      node = parent;
    }
  };
  const outside = new Set<Element>();
  for (const el of Array.from(document.body.querySelectorAll("*"))) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0 || getComputedStyle(el).visibility === "hidden") continue;
    if (rtl ? r.left >= page.left - 0.5 : r.right <= page.left + vw + 0.5) continue;
    if (!contained(el)) outside.add(el);
  }
  const describe = (el: Element) => {
    const parts: string[] = [];
    for (let a: Element | null = el; a && a !== document.body && parts.length < 4; a = a.parentElement) {
      const cls = typeof a.className === "string" ? a.className.trim().split(/\s+/).slice(0, 3).join(".") : "";
      parts.unshift(`${a.tagName.toLowerCase()}${a.id ? `#${a.id}` : ""}${cls ? `.${cls}` : ""}`);
    }
    return parts.join(" > ");
  };
  const offenders = Array.from(outside)
    .filter((el) => !el.parentElement || !outside.has(el.parentElement))
    .slice(0, 12)
    .map((el) => {
      const r = el.getBoundingClientRect();
      return { selector: describe(el), left: Math.round(r.left - page.left), right: Math.round(r.right - page.left), width: Math.round(r.width), text: (el.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 60) };
    });
  return { scrollWidth: doc.scrollWidth, clientWidth: vw, offenders };
}

/** `Runtime.evaluate` source: the function above, called once in the page. */
export const OVERFLOW_SCAN_EXPRESSION = `(${scanOverflow.toString()})()`;
