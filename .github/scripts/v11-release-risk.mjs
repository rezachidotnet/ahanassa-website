// RELEASE_POLICY.md §20.1 (owner decision W9.7, 2026-10-09) — risk class of a v11 code release.
//
//   node v11-release-risk.mjs classify --app <checkout with full history> --base <live code sha> --candidate <sha>
//
// LOW only when EVERY changed path (both sides of a rename/copy) is on the explicit allowlist below:
// CSS, raster images/icons under public/, and the copy/message modules. Anything else — pricing, RFQ, Workers,
// workflows, D1, configuration, the content pipeline, docs, tests outside lib/content, an unknown git status —
// is HIGH. No base (the live code could not be resolved) is HIGH too. There is no MEDIUM and no AMBIGUOUS:
// the default is the most restrictive class.
//
// Lives on `main` with the workflow, like v11-stable-release.mjs: the application branch is the candidate, so
// it may not carry the code that classifies it.
import { execFileSync } from "node:child_process";
import { appendFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

/** The ledger file. A diff that changes nothing else is `ledger_only` (no code change to release). */
export const LEDGER_PATH = "docs/release/PRODUCTION_DEPLOYMENT_MANIFEST.md";

/**
 * The LOW allowlist (owner, 2026-10-09: "only styles/CSS, images/icons, copy/message files"). Explicit on purpose:
 * a new copy module is HIGH until it is added here (a HIGH change to this file). SVG is NOT an image here: it can
 * carry script. lib/content/contact-channels.ts (company phone numbers, read by the artifact gate), whatsapp.ts
 * (link builder), catalog-sample.ts and locale-digits.ts (logic) are not copy files and stay HIGH.
 */
export const LOW_RULES = [
  { id: "css", test: (p) => /\.css$/i.test(p) },
  { id: "image", test: (p) => /^public\/.+\.(png|jpe?g|webp|avif|gif|ico)$/i.test(p) },
  {
    id: "copy",
    test: (p) =>
      [
        "lib/content/homepage.ts",
        "lib/content/nav.ts",
        "lib/content/pages.ts",
        "lib/content/buyer-value.ts",
        "lib/content/evaluation-assurance.ts",
        "lib/content/industries.ts",
        "lib/content/purchase-process.ts",
        "lib/weight-calculator/copy.ts",
      ].includes(p),
  },
  // The frozen-spec tests that pin that copy change with it; tests never ship.
  { id: "copy-test", test: (p) => /^lib\/content\/[\w-]+\.test\.ts$/.test(p) },
];

export function lowRule(path) {
  return LOW_RULES.find((r) => r.test(path))?.id ?? null;
}

/** `git diff --name-status -z -M -C` output -> [{ status, paths }] (rename/copy: [source, destination]). */
export function parseNameStatus(raw) {
  const parts = raw.split("\0");
  if (parts.at(-1) === "") parts.pop();
  const changes = [];
  for (let i = 0; i < parts.length; ) {
    const status = parts[i++];
    const two = /^[RC]/.test(status);
    const paths = two ? [parts[i++], parts[i++]] : [parts[i++]];
    if (paths.some((p) => p === undefined)) throw new Error("truncated git diff --name-status output");
    changes.push({ status, paths });
  }
  return changes;
}

/** Pure: the class of a change set. */
export function classifyChanges(changes) {
  const files = [];
  const high = [];
  for (const c of changes) {
    const known = /^(A|M|D|T|R\d{0,3}|C\d{0,3})$/.test(c.status);
    for (const p of c.paths) {
      const rule = known ? lowRule(p) : null;
      files.push({ status: c.status, path: p, rule: rule ?? "HIGH" });
      if (!rule) high.push(known ? p : `${p} (git status ${c.status})`);
    }
  }
  const ledgerOnly = files.length > 0 && files.every((f) => f.path === LEDGER_PATH);
  // NONE = no file differs (not a code release); anything off the allowlist = HIGH.
  const risk = !files.length ? "NONE" : high.length ? "HIGH" : "LOW";
  return { risk, ledger_only: ledgerOnly, high, files };
}

const FULL_SHA = /^[0-9a-f]{40}$/;

/** git diff base..candidate in a checkout; base null/invalid -> HIGH with the reason. */
export function classifyRelease(app, base, candidate) {
  if (!FULL_SHA.test(candidate ?? "")) throw new Error(`candidate ${JSON.stringify(candidate)} is not a full commit SHA`);
  if (!base || !FULL_SHA.test(base)) {
    return { risk: "HIGH", base: base || null, candidate, ledger_only: false, reason: "the live code could not be resolved: no base to diff against (HIGH)", high: [], files: [] };
  }
  if (base === candidate) return { risk: "NONE", base, candidate, ledger_only: false, reason: "candidate is the live code: not a code release", high: [], files: [] };
  const raw = execFileSync("git", ["diff", "--name-status", "-z", "-M", "-C", base, candidate], {
    cwd: app,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  const r = classifyChanges(parseNameStatus(raw));
  const reason =
    r.risk === "LOW"
      ? `all ${r.files.length} changed path(s) are on the LOW allowlist (css, image, copy)`
      : r.risk === "NONE"
        ? "no file differs from the live code"
        : `${r.high.length} path(s) outside the LOW allowlist: ${r.high.slice(0, 8).join(", ")}${r.high.length > 8 ? ", …" : ""}`;
  return { ...r, base, candidate, reason };
}

function arg(argv, name) {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : undefined;
}

async function main(argv) {
  if (argv[0] !== "classify") throw new Error(`unknown mode ${JSON.stringify(argv[0])} (classify)`);
  const r = classifyRelease(arg(argv, "app") ?? ".", arg(argv, "base") || null, arg(argv, "candidate"));
  console.log(JSON.stringify(r));
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `risk=${r.risk}\nledger_only=${r.ledger_only}\n`);
  return 0;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main(process.argv.slice(2)).then(
    (code) => process.exit(code),
    (err) => {
      console.error(`v11-release-risk could not run: ${err instanceof Error ? err.message : String(err)}`);
      process.exit(2);
    },
  );
}
