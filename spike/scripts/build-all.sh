#!/usr/bin/env bash
# Spike S1: static export + post-processing. Env: APP_ENV (default staging),
# SPIKE_RFQ_ENDPOINT (absolute RFQ Worker URL for the spike; production uses same-origin /api/rfqs).
set -euo pipefail
cd "$(dirname "$0")/../.."
export APP_ENV="${APP_ENV:-staging}"
export NEXT_PUBLIC_TURNSTILE_SITE_KEY="${NEXT_PUBLIC_TURNSTILE_SITE_KEY:-1x00000000000000000000AA}"
./spike/scripts/build-static.sh
node spike/scripts/postprocess-static.mjs
