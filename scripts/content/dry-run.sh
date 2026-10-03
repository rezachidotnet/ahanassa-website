#!/usr/bin/env bash
# Content pipeline, steps 5-11 (architecture V1.1 §7.1 steps 1-6) — the same scripts, in the same order,
# as the `build` job of .github/workflows/content-publish.yml. No Cloudflare write: Odoo is read with GET
# only and DB_PUBLIC is only read. Needs wrangler auth for the DB_PUBLIC read.
#
#   scripts/content/dry-run.sh <work-dir-outside-the-repo> [--allow-decrease] [--skip-hydration]
set -euo pipefail

work="${1:?usage: dry-run.sh <work-dir> [--allow-decrease] [--skip-hydration]}"
shift
allow=""
skip=""
for arg in "$@"; do
  case "$arg" in
    --allow-decrease) allow="--allow-decrease" ;;
    --skip-hydration) skip="--skip-hydration" ;;
    *) echo "unknown option $arg" >&2; exit 2 ;;
  esac
done

cd "$(dirname "$0")/../.."
node scripts/content/fetch.ts --work "$work"
node scripts/content/validate.ts --work "$work" $allow
node scripts/content/snapshot.ts --work "$work"
node scripts/content/export.ts --work "$work"
npx tsc --noEmit
npm test
node scripts/content/checks.ts --work "$work" $skip
echo "dry run complete: $work/artifact (not published)"
