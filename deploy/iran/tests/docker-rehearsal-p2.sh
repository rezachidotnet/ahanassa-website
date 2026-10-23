#!/bin/bash
# W32 — rehearse RUNBOOK_P2.md (the domestic RFQ intake) on a throwaway Ubuntu 26.04 container, like the P1 rehearsal.
#
#   deploy/iran/tests/docker-rehearsal-p2.sh <node tarball node-v24.x.y-linux-<arch>.tar.xz> <its sha256>
#
# Host side: p2-prep.ts builds a staging artifact, the domestic bundle WITH rfq/rfq-ir.mjs (as CI does) and the stubs;
# throwaway signing keys sign the activation exactly as CI will. Container side (rehearsal-p2-inside.sh), with
# `--network none` (loopback only): install.sh P1 + P2 steps, the REAL activator activates the bundle and starts the
# services through the real unit files, then the drills run against stubs on loopback — Odoo + R2 on IPv6 only
# ("abroad"), arCaptcha + Bale on IPv4 ("domestic").
set -euo pipefail
repo=$(cd "$(dirname "$0")/../../.." && pwd)
tarball=$(cd "$(dirname "${1:?usage: docker-rehearsal-p2.sh <node tarball> <sha256>}")" && pwd)/$(basename "$1")
tsha=${2:?sha256}
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT
env=staging

node "$repo/deploy/iran/tests/p2-prep.ts" "$work" > "$work/summary.json"
b=$work/bundle/iran-bundle.json
bsha=$(jq -r .bundle_sha256 "$b"); snap=$(jq -r .snapshot_version "$b"); msha=$(jq -r .manifest_sha256 "$b"); code=$(jq -r .code_sha "$b"); bytes=$(jq -r .bundle_bytes "$b")

mkdir -p "$work/keys" "$work/steps"
ssh-keygen -q -t ed25519 -N "" -C ci-production -f "$work/keys/ci-production"
ssh-keygen -q -t ed25519 -N "" -C ci-staging -f "$work/keys/ci-staging"
{
  echo "ci-production namespaces=\"ahanassa-ir-release\" $(cat "$work/keys/ci-production.pub")"
  echo "ci-staging namespaces=\"ahanassa-ir-release\" $(cat "$work/keys/ci-staging.pub")"
} > "$work/allowed_signers"
activation() { # seq reason out-dir
  mkdir -p "$3"
  jq -cn --arg env "$env" --argjson seq "$1" --arg reason "$2" --arg code "$code" --arg snap "$snap" --arg msha "$msha" --arg bsha "$bsha" --argjson bytes "$bytes" \
    '{schema:"iran-activation.v1",env:$env,seq:$seq,reason:$reason,run_id:1,code_sha:$code,snapshot_version:$snap,manifest_sha256:$msha,bundle_sha256:$bsha,bundle_bytes:$bytes,bundle_artifact:("iran-bundle-"+$env+"-"+$snap),created_at:"2026-10-22T12:00:00Z"}' > "$3/activation.json"
  ssh-keygen -Y sign -q -f "$work/keys/ci-staging" -n ahanassa-ir-release "$3/activation.json"
  cp "$work/bundle/iran-bundle.zip" "$3/bundle.zip"
}
activation 1761140000001 publish "$work/steps/1"
activation 1761140000002 publish "$work/steps/2"
cp "$tarball" "$work/node.tar.xz"
cp "$repo/deploy/iran/tests/systemctl-shim.sh" "$work/"
chmod -R a+rX "$work"

docker build -q -t ahanassa-iran-rehearsal-p2 -f - "$repo/deploy/iran" <<'EOF' >/dev/null
FROM ubuntu:26.04
COPY install.sh /tmp/install.sh
RUN bash /tmp/install.sh packages >/dev/null && bash /tmp/install.sh rfq-packages >/dev/null \
 && DEBIAN_FRONTEND=noninteractive apt-get install -y -q --no-install-recommends jq iptables iproute2 unzip openssl xz-utils util-linux >/dev/null
EOF
docker run --rm --network none --cap-add NET_ADMIN --sysctl net.ipv6.conf.lo.disable_ipv6=0 \
  -v "$repo/deploy/iran:/opt/iran:ro" -v "$work:/work:ro" -e NODE_SHA="$tsha" -e NODE_NAME="$(basename "$tarball")" \
  ahanassa-iran-rehearsal-p2 bash /opt/iran/tests/rehearsal-p2-inside.sh
