#!/bin/bash
# W30 — rehearse RUNBOOK_P1.md on a throwaway Ubuntu 26.04 container (the iransrv release: nginx 1.28, Python 3.14).
#
#   deploy/iran/tests/docker-rehearsal.sh <artifact dir (manifest.json, public-assets/, private-snapshot/)>
#
# Host side: builds the bundle (scripts/iran/bundle.ts), makes throwaway CI signing keys, signs activations exactly as
# CI will (activation.json + ssh-keygen -Y sign) and lays out an S3-style mirror directory. Container side
# (rehearsal-inside.sh): installs with deploy/iran/install.sh, then runs the REAL sync agent and activator with
# `--network none` — no route to any host but loopback, i.e. a full international (and domestic) cutoff. GitHub fails,
# the mirror (served on 127.0.0.1) answers, and the site is checked with curl against the artifact's own files.
set -euo pipefail
repo=$(cd "$(dirname "$0")/../../.." && pwd)
artifact=$(cd "${1:?usage: docker-rehearsal.sh <artifact dir>}" && pwd)
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT
env=production

node "$repo/scripts/iran/bundle.ts" --artifact "$artifact" --out "$work/bundle" >/dev/null
bsha=$(jq -r .bundle_sha256 "$work/bundle/iran-bundle.json")
snap=$(jq -r .snapshot_version "$work/bundle/iran-bundle.json")
msha=$(jq -r .manifest_sha256 "$work/bundle/iran-bundle.json")
code=$(jq -r .code_sha "$work/bundle/iran-bundle.json")
bytes=$(jq -r .bundle_bytes "$work/bundle/iran-bundle.json")

mkdir -p "$work/keys" "$work/mirror/bucket/iran/$env/bundles" "$work/mirror/forged"
ssh-keygen -q -t ed25519 -N "" -C ci-production -f "$work/keys/ci-production"
ssh-keygen -q -t ed25519 -N "" -C ci-staging -f "$work/keys/ci-staging"
ssh-keygen -q -t ed25519 -N "" -C attacker -f "$work/keys/attacker"
{
  echo "ci-production namespaces=\"ahanassa-ir-release\" $(cat "$work/keys/ci-production.pub")"
  echo "ci-staging namespaces=\"ahanassa-ir-release\" $(cat "$work/keys/ci-staging.pub")"
} > "$work/mirror/allowed_signers"
cp "$work/bundle/iran-bundle.zip" "$work/mirror/bucket/iran/$env/bundles/$bsha.zip"

activation() { # seq reason key out-dir
  mkdir -p "$4"
  jq -cn --arg env "$env" --argjson seq "$1" --arg reason "$2" --arg code "$code" --arg snap "$snap" --arg msha "$msha" --arg bsha "$bsha" --argjson bytes "$bytes" \
    '{schema:"iran-activation.v1",env:$env,seq:$seq,reason:$reason,run_id:1,code_sha:$code,snapshot_version:$snap,manifest_sha256:$msha,bundle_sha256:$bsha,bundle_bytes:$bytes,bundle_artifact:("iran-bundle-"+$env+"-"+$snap),created_at:"2026-10-22T12:00:00Z"}' > "$4/activation.json"
  ssh-keygen -Y sign -q -f "$work/keys/$3" -n ahanassa-ir-release "$4/activation.json"
}
activation 1761130000001 publish ci-production "$work/mirror/steps/1"
activation 1761130000002 publish attacker "$work/mirror/steps/2-forged"
activation 1761130000003 publish ci-staging "$work/mirror/steps/3-wrong-principal"
activation 1761130000004 rollback ci-production "$work/mirror/steps/4-rollback"
cp "$artifact/manifest.json" "$work/mirror/manifest.json"
chmod -R a+rX "$work/mirror"

docker build -q -t ahanassa-iran-rehearsal -f - "$repo/deploy/iran" <<'EOF' >/dev/null
FROM ubuntu:26.04
COPY install.sh /tmp/install.sh
RUN bash /tmp/install.sh packages >/dev/null && apt-get install -y -q jq >/dev/null
EOF
docker run --rm --network none \
  -v "$repo/deploy/iran:/opt/iran:ro" -v "$work/mirror:/mirror:ro" -v "$artifact/public-assets:/artifact:ro" \
  ahanassa-iran-rehearsal bash /opt/iran/tests/rehearsal-inside.sh
