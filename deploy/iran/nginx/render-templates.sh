#!/bin/sh
# W30 — render the per-environment nginx files from the .in templates (RUNBOOK_P1.md §3).
#   deploy/iran/nginx/render-templates.sh <out-dir>
# Writes <out>/conf.d/ahanassa-maps-{production,staging}.conf and <out>/snippets/ahanassa-{static,headers,rfq-proxy}-{env}.conf.
set -eu
here=$(cd "$(dirname "$0")" && pwd)
out=${1:?usage: render-templates.sh <out-dir>}
mkdir -p "$out/conf.d" "$out/snippets"
for env in production staging; do
  sed "s/@ENV@/$env/g" "$here/conf.d/ahanassa-maps.conf.in" > "$out/conf.d/ahanassa-maps-$env.conf"
  sed "s/@ENV@/$env/g" "$here/snippets/ahanassa-static.conf.in" > "$out/snippets/ahanassa-static-$env.conf"
  sed "s/@ENV@/$env/g" "$here/snippets/ahanassa-headers.conf.in" > "$out/snippets/ahanassa-headers-$env.conf"
  # W32: the domestic RFQ intake's port per env (deploy/iran/etc/rfq-<env>.json.example listen.port).
  case $env in production) port=8711 ;; staging) port=8712 ;; esac
  sed -e "s/@ENV@/$env/g" -e "s/@PORT@/$port/g" "$here/snippets/ahanassa-rfq-proxy.conf.in" > "$out/snippets/ahanassa-rfq-proxy-$env.conf"
done
if grep -rnE '@(ENV|PORT)@' "$out"; then echo "unrendered placeholder" >&2; exit 1; fi
echo "rendered into $out"
