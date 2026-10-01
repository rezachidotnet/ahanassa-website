#!/usr/bin/env bash
# Spike S1: fully static export build. vinext 1.0.0-beta.8 refuses a build
# without @cloudflare/vite-plugin whenever a wrangler config exists in the
# project root (index.js hasWranglerConfig check), so the root wrangler.jsonc
# is moved aside for the duration of the build and always restored.
set -euo pipefail
cd "$(dirname "$0")/../.."
mv wrangler.jsonc wrangler.jsonc.spike-aside
trap 'mv wrangler.jsonc.spike-aside wrangler.jsonc' EXIT
rm -rf dist
SPIKE_STATIC_EXPORT=1 __VINEXT_IMAGE_UNOPTIMIZED=true npx vinext build "$@"
