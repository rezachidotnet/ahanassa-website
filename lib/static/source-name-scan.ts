import fs from "node:fs";

/**
 * W9.6 — price-source name leak scan. The website must never show WHERE a price was collected (owner rule;
 * the pricing API never serves a source). This repository is public, so it must not contain the source
 * names either: the list is read at run time from a private file OUTSIDE the repository, one name per line
 * (a site name, its host, or any spelling to refuse; `#` comments and blank lines ignored), whose path is
 * given in AHANASSA_PRICE_SOURCE_NAMES_FILE (CI: a secret file; locally: a file kept with the private
 * Odoo repository). Without it, the scan reports that it did not run — it never passes silently.
 *
 * Matching is case-insensitive over the whole file text (HTML, RSC payload, JSON), also with `.`/`-`
 * variants removed, so «example-market.test», «examplemarket» and «Example Market» are all caught for the
 * name «example-market». Pure apart from `loadSourceNames`.
 */
export const SOURCE_NAMES_ENV = "AHANASSA_PRICE_SOURCE_NAMES_FILE";

/**
 * A finding never carries a name: `index` is the 1-based line of the name in the private list, and `file`
 * is replaced by REDACTED_PATH when the path itself contains a listed name (W9.7 review: a printed path would
 * leak the name into public CI logs). Same output shape as main's .github/scripts/v11-source-names.mjs.
 */
export interface SourceNameFinding {
  file: string;
  index: number;
}

export const REDACTED_PATH = "<path redacted: it contains a listed name>";

/** Reads the private name list; `null` when the env var is unset or the file is unreadable/empty. */
export function loadSourceNames(env: Record<string, string | undefined> = process.env): string[] | null {
  const file = env[SOURCE_NAMES_ENV];
  if (!file) return null;
  try {
    const names = fs
      .readFileSync(file, "utf8")
      .split(/\r?\n/)
      .map((l) => l.replace(/#.*/, "").trim())
      .filter((l) => l.length >= 3);
    return names.length ? names : null;
  } catch {
    return null;
  }
}

const squash = (s: string) => s.toLowerCase().replace(/[\s.\-_]+/g, "");

/** Spellings of one name to look for: as written, its first host label, and with separators removed. */
export function nameVariants(name: string): string[] {
  const lower = name.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, "");
  const label = lower.split(".")[0];
  return [...new Set([lower, label, squash(lower), squash(label)].filter((v) => v.length >= 4))];
}

/** 1-based list indexes of the names found in `text` (any spelling). */
export function namesIn(text: string, names: readonly string[]): number[] {
  const lower = text.toLowerCase();
  const squashed = squash(text);
  const out: number[] = [];
  names.forEach((n, i) => {
    if (nameVariants(n).some((s) => lower.includes(s) || squashed.includes(squash(s)))) out.push(i + 1);
  });
  return out;
}

/** Pure: a name in a file's path or content is a finding; a path holding a name is never shown. */
export function scanSourceNames(files: ReadonlyArray<{ path: string; content: string }>, names: readonly string[]): SourceNameFinding[] {
  const findings: SourceNameFinding[] = [];
  for (const { path, content } of files) {
    const inPath = namesIn(path, names);
    const shown = inPath.length ? REDACTED_PATH : path;
    for (const index of new Set([...inPath, ...namesIn(content, names)])) findings.push({ file: shown, index });
  }
  return findings;
}

/**
 * Any other gate line (a leak, price or SEO failure names its file and match): if it holds a listed name — in a
 * path or in matched text — the whole line is replaced, keeping only the name indexes. Without a list, unchanged.
 */
export function redactSourceNames(line: string, names: readonly string[] | null | undefined): string {
  if (!names?.length) return line;
  const hits = namesIn(line, names);
  return hits.length ? `<gate finding redacted: it contains listed name(s) #${hits.join(", #")}>` : line;
}
