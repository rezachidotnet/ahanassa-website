/**
 * Safe JSON-LD serialization. Escapes characters that could break out of the
 * <script type="application/ld+json"> context or corrupt the payload:
 * "<" (closing-tag injection) and the U+2028/U+2029 line separators (invalid
 * in some JSON parsers, exploitable in others). Security-relevant — do not
 * replace with a plain JSON.stringify() call.
 *
 * Uses String.fromCharCode for the two separators rather than \u escapes in
 * source, to avoid any ambiguity between an escape sequence and the literal
 * character it represents.
 */
const LINE_SEPARATOR = String.fromCharCode(8232); // U+2028
const PARAGRAPH_SEPARATOR = String.fromCharCode(8233); // U+2029

export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data)
    .split("<")
    .join("\\u003c")
    .split(LINE_SEPARATOR)
    .join("\\u2028")
    .split(PARAGRAPH_SEPARATOR)
    .join("\\u2029");
}
