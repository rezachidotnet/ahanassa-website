// W9.7 (owner, 2026-10-09) — price-source names must never be in this PUBLIC repository or its build output.
//
//   node v11-source-names.mjs scan-tree --app <git checkout>
//     Scans every tracked text file of the checkout for the names in the private list at
//     $AHANASSA_PRICE_SOURCE_NAMES_FILE (one name per line; `#` comments; the CI secret AHANASSA_PRICE_SOURCE_NAMES
//     written to a temp file outside the checkout). Exit 1 on any finding, 0 clean, 0 with a warning when no list is
//     configured (the scan did not run — it never passes silently), 2 when it could not run.
//
// Never prints a name: a finding is reported as the file and the name's line number in the private list; a file
// whose PATH contains a name is reported as "<path redacted>". Same matching as lib/static/source-name-scan.ts (the
// artifact gate): case-insensitive, also with spaces, `.`, `-` and `_` removed, the first host label included.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

export const SOURCE_NAMES_ENV = "AHANASSA_PRICE_SOURCE_NAMES_FILE";

export function loadNames(env = process.env) {
  const file = env[SOURCE_NAMES_ENV];
  if (!file) return null;
  try {
    const names = readFileSync(file, "utf8")
      .split(/\r?\n/)
      .map((l) => l.replace(/#.*/, "").trim())
      .filter((l) => l.length >= 3);
    return names.length ? names : null;
  } catch {
    return null;
  }
}

const squash = (s) => s.toLowerCase().replace(/[\s.\-_]+/g, "");

export function nameVariants(name) {
  const lower = name.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, "");
  const label = lower.split(".")[0];
  return [...new Set([lower, label, squash(lower), squash(label)].filter((v) => v.length >= 4))];
}

/** Pure: [{ file, index }] — index is the 1-based line of the name in the private list. Paths are redacted when they hold a name. */
export function scanFiles(files, names) {
  const variants = names.map((n, i) => ({ index: i + 1, spellings: nameVariants(n) }));
  const hit = (s) => {
    const lower = s.toLowerCase();
    const squashed = squash(s);
    return variants.filter((v) => v.spellings.some((sp) => lower.includes(sp) || squashed.includes(squash(sp)))).map((v) => v.index);
  };
  const findings = [];
  for (const { path: p, content } of files) {
    const inPath = hit(p);
    const shown = inPath.length ? "<path redacted: it contains a listed name>" : p;
    for (const index of new Set([...inPath, ...hit(content)])) findings.push({ file: shown, index });
  }
  return findings;
}

export function trackedTextFiles(app) {
  const list = execFileSync("git", ["ls-files", "-z"], { cwd: app, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }).split("\0").filter(Boolean);
  const files = [];
  for (const p of list) {
    let buf;
    try {
      buf = readFileSync(path.join(app, p));
    } catch {
      continue; // a submodule or a deleted-but-staged path
    }
    if (buf.includes(0)) continue; // binary
    files.push({ path: p, content: buf.toString("utf8") });
  }
  return files;
}

function arg(argv, name) {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : undefined;
}

async function main(argv) {
  if (argv[0] !== "scan-tree") throw new Error(`unknown mode ${JSON.stringify(argv[0])} (scan-tree)`);
  const names = loadNames();
  if (!names) {
    console.log(`::warning title=price-source name scan not run::no private name list (${SOURCE_NAMES_ENV} unset or empty; repository secret AHANASSA_PRICE_SOURCE_NAMES)`);
    return 0;
  }
  const files = trackedTextFiles(arg(argv, "app") ?? ".");
  const findings = scanFiles(files, names);
  for (const f of findings) console.log(`::error title=price-source name in a tracked file::${f.file} (name #${f.index} of the private list)`);
  console.log(`price-source name scan: ${files.length} tracked text files, ${names.length} names, ${findings.length} finding(s)`);
  return findings.length ? 1 : 0;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main(process.argv.slice(2)).then(
    (c) => process.exit(c),
    (err) => {
      console.error(`v11-source-names could not run: ${err instanceof Error ? err.message : String(err)}`);
      process.exit(2);
    },
  );
}
