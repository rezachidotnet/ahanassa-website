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

export interface SourceNameFinding {
  file: string;
  name: string;
}

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

export function scanSourceNames(files: ReadonlyArray<{ path: string; content: string }>, names: readonly string[]): SourceNameFinding[] {
  const findings: SourceNameFinding[] = [];
  const variants = names.map((n) => ({ name: n, spellings: nameVariants(n) }));
  for (const { path, content } of files) {
    const lower = content.toLowerCase();
    const squashed = squash(content);
    for (const v of variants) {
      if (v.spellings.some((s) => lower.includes(s) || squashed.includes(squash(s)))) findings.push({ file: path, name: v.name });
    }
  }
  return findings;
}
