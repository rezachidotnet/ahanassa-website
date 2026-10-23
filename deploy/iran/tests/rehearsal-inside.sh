#!/bin/bash
# W30 — the container half of docker-rehearsal.sh. Runs with --network none: loopback only.
set -uo pipefail
fail=0
pass=0
ok() { pass=$((pass + 1)); printf '  ok   %s\n' "$*"; }
bad() { fail=$((fail + 1)); printf '  FAIL %s\n' "$*"; }
I=/opt/iran/install.sh
H=new.ahanassa.ir

echo "== install (deploy/iran/install.sh, as on iransrv)"
set -e
bash $I users >/dev/null
bash $I dirs >/dev/null
bash $I code >/dev/null
bash $I signers /mirror/allowed_signers >/dev/null
bash $I bootstrap >/dev/null
bash $I tls-snakeoil >/dev/null
bash $I nginx
set +e
cat > /etc/ahanassa/iran.json <<'EOF'
{
  "nginx_reload": ["nginx", "-s", "reload"],
  "sources": [
    { "name": "github", "type": "github" },
    { "name": "mirror", "type": "s3", "endpoint": "http://127.0.0.1:8088", "bucket": "bucket", "prefix": "iran", "credential": "none" }
  ],
  "timeouts": { "api": 5, "download": 30 }
}
EOF
mkdir -p /tmp/s3/bucket/iran/production && cp -r /mirror/bucket/iran/production/bundles /tmp/s3/bucket/iran/production/
(cd /tmp/s3 && python3 -m http.server 8088 --bind 127.0.0.1 >/dev/null 2>&1 &)
sleep 1

offer() { cp "/mirror/steps/$1/activation.json" "/mirror/steps/$1/activation.json.sig" /tmp/s3/bucket/iran/production/; chmod a+r /tmp/s3/bucket/iran/production/*; }
agent() { runuser -u ahanassa-sync -- env AHANASSA_IRAN_CONFIG=/etc/ahanassa/iran.json /usr/local/bin/ahanassa-sync production; }
activate() { AHANASSA_IRAN_CONFIG=/etc/ahanassa/iran.json /usr/local/sbin/ahanassa-activate production; }
current() { basename "$(readlink /srv/ahanassa/site/production/current)"; }

echo "== 1. signed activation via the mirror (GitHub unreachable: --network none)"
offer 1
out=$(agent 2>&1); echo "$out" | grep -q '"source": "github", "step": "activation"' && ok "github source failed (no network) and was skipped" || bad "github not tried first: $out"
echo "$out" | grep -q '"event": "handed_off"' && ok "agent handed seq 1 over from the mirror" || bad "agent: $out"
[ "$(stat -c %U /srv/ahanassa/incoming/production/1761130000001/bundle.zip)" = ahanassa-sync ] && ok "agent wrote only as ahanassa-sync" || bad "owner"
activate > /tmp/act1.log 2>&1 && ok "activator: activated ($(current))" || { bad "activator refused: $(grep -E "refused|error" /tmp/act1.log | tail -3)"; }
grep -q '"event": "activated"' /tmp/act1.log || bad "no activated event"

echo "== 2. behaviour (curl --resolve $H:443:127.0.0.1)"
req() { curl -sk --resolve "$H:443:127.0.0.1" -o /tmp/body -D /tmp/hdr -w '%{http_code}' "$@"; }
hdr() { grep -i "^$1:" /tmp/hdr | head -1 | cut -d' ' -f2- | tr -d '\r'; }
check() { # path status [location]
  local s; s=$(req "https://$H$1")
  if [ "$s" != "$2" ]; then bad "$1 -> $s (want $2)"; return; fi
  if [ -n "${3:-}" ] && [ "$(hdr location)" != "$3" ] && [ "$(hdr location)" != "https://$H$3" ]; then bad "$1 Location $(hdr location) (want $3)"; return; fi
  ok "$1 -> $2${3:+ $3}"
}
check / 200
cmp -s /tmp/body /artifact/index.html && ok "/ body = artifact index.html" || bad "/ body differs"
check /about 200
check /about/ 307 /about
check /about.html 307 /about
check /index.html 307 /
check /en 200
check /en/ 307 /en
check /en/about 200
check /products 200
check "/about?utm=1" 200
check "/about.html?x=1" 307 "/about?x=1"
check /fa 308 /
check /fa/about 308 /about
check /request 308 /contact
check /en/prices 302 /en/products
check /does-not-exist 404
cmp -s /tmp/body /artifact/404.html && ok "unknown path -> root 404.html body" || bad "root 404 body"
check /en/does-not-exist 404
cmp -s /tmp/body /artifact/en/404.html && ok "unknown /en/ path -> en/404.html body" || bad "en 404 body"
check /ar/x/y 404
cmp -s /tmp/body /artifact/ar/404.html && ok "unknown /ar/ path -> ar/404.html body" || bad "ar 404 body"
check /_headers 404
check /_redirects 404
check /.assetsignore 404
check /index.html.gz 404
chunk=$(cd /artifact && ls _next/static/chunks/*.js | head -1)
check "/$chunk" 200
case "$(hdr cache-control)" in *immutable*) ok "chunk: $(hdr cache-control)" ;; *) bad "chunk Cache-Control $(hdr cache-control)" ;; esac
check /_next/static/chunks/missing-0000.js 404
case "$(hdr cache-control)" in *immutable*) bad "404 chunk is immutable" ;; "public, max-age=0, must-revalidate") ok "missing chunk 404: max-age=0 (W10.6)" ;; *) bad "missing chunk Cache-Control $(hdr cache-control)" ;; esac
check /data/rfq-catalog.fa.json 200
[ "$(hdr cache-control)" = "public, max-age=300" ] && ok "v1 catalog: max-age=300" || bad "catalog cc $(hdr cache-control)"
[ "$(hdr x-robots-tag)" = noindex ] && ok "/data/*: X-Robots-Tag noindex" || bad "data robots '$(hdr x-robots-tag)'"
check /index.md 200
case "$(hdr content-type)" in text/markdown*) ok "md: $(hdr content-type)" ;; *) bad "md content-type $(hdr content-type)" ;; esac
[ "$(hdr x-robots-tag)" = noindex ] && ok "*.md: X-Robots-Tag noindex" || bad "md robots"
check /manifest.public.json 200
[ "$(hdr x-robots-tag)" = noindex ] && ok "manifest.public.json noindex" || bad "manifest robots"
req "https://$H/about" >/dev/null
[ -z "$(hdr x-robots-tag)" ] && ok "pages: no X-Robots-Tag (production indexable)" || bad "page robots $(hdr x-robots-tag)"
for h in x-content-type-options referrer-policy x-frame-options permissions-policy content-security-policy-report-only content-signal; do
  [ -n "$(hdr $h)" ] && ok "200 has $h" || bad "200 lacks $h"
done
[ "$(hdr content-security-policy-report-only)" = "$(grep -m1 'Content-Security-Policy-Report-Only:' /artifact/_headers | sed 's/^ *Content-Security-Policy-Report-Only: //')" ] && ok "CSP = the artifact's _headers CSP" || bad "CSP differs"
req "https://$H/x-404" >/dev/null; [ -n "$(hdr x-frame-options)" ] && ok "404 has security headers" || bad "404 lacks security headers"
req "https://$H/fa/x" >/dev/null; [ -z "$(hdr content-security-policy-report-only)" ] && ok "redirect: no /* headers (as Cloudflare)" || bad "redirect has /* headers"
s=$(curl -sk --resolve "$H:443:127.0.0.1" -H 'Accept-Encoding: gzip' -o /dev/null -D /tmp/hdr -w '%{http_code}' "https://$H/about")
[ "$(hdr content-encoding)" = gzip ] && ok "gzip_static: /about served precompressed" || bad "no gzip ($s)"
s=$(curl -sk --resolve "$H:443:127.0.0.1" -H 'Accept-Encoding: br' -o /dev/null -D /tmp/hdr -w '%{http_code}' "https://$H/about")
[ "$(hdr content-encoding)" = br ] && ok "brotli_static: /about served precompressed" || bad "no br ($(hdr content-encoding))"
n=0; m=0
while IFS= read -r f; do
  p="/${f%.html}"; p="${p%/index}"; [ "$f" = index.html ] && p=/
  case "$f" in 404.html|*/404.html) continue ;; esac
  n=$((n + 1))
  s=$(req "https://$H$p"); if [ "$s" = 200 ] && cmp -s /tmp/body "/artifact/$f"; then m=$((m + 1)); else bad "page $p -> $s or body differs"; fi
done < <(cd /artifact && find . -name '*.html' | sed 's#^\./##' | sort)
[ "$n" = "$m" ] && ok "all $n HTML pages served byte-identical to the artifact"
s=$(curl -sk -o /dev/null -w '%{http_code}' --resolve "evil.example:443:127.0.0.1" https://evil.example/); [ "$s" = 000 ] && ok "unknown Host: TLS handshake rejected" || bad "unknown host -> $s"
s=$(curl -s -o /dev/null -w '%{http_code}' -H "Host: $H" http://127.0.0.1/about); [ "$s" = 301 ] && ok "port 80 -> 301 https" || bad "port 80 -> $s"

echo "== 3. forged and wrong-principal activations are ignored; the site keeps serving"
before=$(current)
offer 2-forged; agent >/tmp/a2.log 2>&1; ls /srv/ahanassa/incoming/production/*.ready >/dev/null 2>&1 && bad "forged activation handed over" || ok "forged signature: agent ignored it"
offer 3-wrong-principal; agent >/tmp/a3.log 2>&1; ls /srv/ahanassa/incoming/production/*.ready >/dev/null 2>&1 && bad "staging-key activation handed over" || ok "staging key for production: ignored"
# Even if a compromised agent hands one over, the root activator refuses it.
mkdir -p /srv/ahanassa/incoming/production/1761130000002 && cp /mirror/steps/2-forged/* /srv/ahanassa/incoming/production/1761130000002/ && touch /srv/ahanassa/incoming/production/1761130000002.ready
activate >/tmp/act2.log 2>&1; [ $? = 1 ] && [ "$(current)" = "$before" ] && ok "activator refused a forged hand-over, still on $before" || bad "activator: $(tail -2 /tmp/act2.log)"
check / 200

echo "== 4. rollback activation: reuses the local release, no download"
rm -rf /tmp/s3/bucket/iran/production/bundles
offer 4-rollback
out=$(agent 2>&1); echo "$out" | grep -q bundle_local && ok "agent: bundle already local" || bad "agent: $out"
activate >/tmp/act4.log 2>&1 && grep -q reuse_release /tmp/act4.log && ok "activator reused $(current)" || bad "rollback: $(tail -2 /tmp/act4.log)"

echo "== 5. full cutoff: every source down -> nothing changes, the last good copy serves"
pkill -f "http.server 8088"
before=$(current)
out=$(agent 2>&1); echo "$out" | grep -q no_source && ok "agent: no source reachable (exit quietly)" || bad "agent: $out"
[ "$(current)" = "$before" ] && ok "current unchanged ($before)"
check / 200
ss -tnp 2>/dev/null | grep -v '127.0.0.1\|::1' | grep -q ESTAB && bad "an outbound connection exists" || ok "no established connection to any non-loopback host"

echo "== result: $pass ok, $fail failed"
[ "$fail" = 0 ]
