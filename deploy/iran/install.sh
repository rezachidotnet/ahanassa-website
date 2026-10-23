#!/bin/bash
# W30 (W29 P1) — install the domestic copy on iransrv, ONE STEP AT A TIME (deploy/iran/RUNBOOK_P1.md).
#
#   deploy/iran/install.sh <step> [args]      run as root, from a checkout of the reviewed commit
#
# Order: packages, users, dirs, code, signers <file>, bootstrap, tls-snakeoil, nginx, units (RUNBOOK_P1.md §3–§4).
# W32 (P2, RUNBOOK_P2.md §3): rfq-packages, node, rfq-users, rfq-dirs, rfq-config, rfq-nginx, rfq-units <env>, rfq-enable <env>.
# Each step is idempotent, prints what it changes, and touches nothing outside its own list. The ops session runs one
# step per owner OK, under the host lock (/var/lib/host-change/LOCK.d). No step changes ArvanCloud, DNS, ufw, sshd, or
# anything that www.ahanassa.com / api.ahanassa.ir depend on. The same script is rehearsed in Docker
# (deploy/iran/tests/docker-rehearsal.sh).
set -euo pipefail

here=$(cd "$(dirname "$0")" && pwd)
ENVS=(production staging)
HOSTS=(new.ahanassa.ir staging.ahanassa.ir)
say() { printf '[install] %s\n' "$*"; }
need_root() { [ "$(id -u)" = 0 ] || { echo "run as root" >&2; exit 1; }; }
# systemd on iransrv; the Docker rehearsal has no systemd and runs nginx directly.
reload_nginx() { if [ -d /run/systemd/system ]; then systemctl reload nginx; else nginx -s reload 2>/dev/null || nginx; fi; }

step_packages() {
  # nginx 1.28 (Ubuntu 26.04 main), the brotli_static module, curl (smoke), ssh-keygen (signature check), python3
  # (stdlib only), ssl-cert (snakeoil bootstrap cert), brotli (precompression), certbot (origin certificate).
  apt-get update -q
  DEBIAN_FRONTEND=noninteractive apt-get install -y -q --no-install-recommends \
    nginx libnginx-mod-http-brotli-static ssl-cert brotli curl openssh-client python3 certbot
  nginx -v
}

step_users() {
  if id ahanassa-sync >/dev/null 2>&1; then say "user ahanassa-sync exists"; else
    useradd --system --no-create-home --home-dir /nonexistent --shell /usr/sbin/nologin --user-group ahanassa-sync
    say "created system user ahanassa-sync (no shell, no home)"
  fi
}

step_dirs() {
  install -d -m 0755 -o root -g root /srv/ahanassa /srv/ahanassa/incoming /srv/ahanassa/site /etc/ahanassa /var/lib/ahanassa-acme
  install -d -m 0700 -o root -g root /etc/ahanassa/credentials
  for env in "${ENVS[@]}"; do
    install -d -m 0750 -o ahanassa-sync -g ahanassa-sync "/srv/ahanassa/incoming/$env"
    install -d -m 0755 -o root -g root "/srv/ahanassa/site/$env" "/srv/ahanassa/site/$env/releases"
  done
  # Credentials not issued yet are empty placeholders (systemd LoadCredential= needs the file to exist).
  for c in github-token r2-read arvan-read bale-token; do
    [ -e "/etc/ahanassa/credentials/$c" ] || { install -m 0600 -o root -g root /dev/null "/etc/ahanassa/credentials/$c"; say "placeholder credential $c (empty)"; }
  done
  say "dirs ready"
}

step_code() {
  install -d -m 0755 /usr/local/lib/ahanassa
  install -m 0644 -o root -g root "$here/lib/ahanassa_iran.py" /usr/local/lib/ahanassa/ahanassa_iran.py
  install -m 0755 -o root -g root "$here/bin/ahanassa-sync" /usr/local/bin/ahanassa-sync
  install -m 0755 -o root -g root "$here/bin/ahanassa-activate" /usr/local/sbin/ahanassa-activate
  python3 -I -c 'import sys; sys.path.insert(0, "/usr/local/lib/ahanassa"); import ahanassa_iran' && say "code installed ($(sha256sum /usr/local/lib/ahanassa/ahanassa_iran.py | cut -c1-16))"
  if [ ! -e /etc/ahanassa/iran.json ]; then
    install -m 0644 "$here/etc/iran.json.example" /etc/ahanassa/iran.json
    say "/etc/ahanassa/iran.json created from the example — fill in the R2 endpoint/bucket (or set \"enabled\": false)"
  fi
}

step_signers() {
  # deploy/iran/install.sh signers <allowed_signers file>  — the PUBLIC halves of the two CI signing keys.
  local f=${1:?usage: install.sh signers <allowed_signers file>}
  grep -Eq '^ci-production namespaces="ahanassa-ir-release" ssh-ed25519 ' "$f" || { echo "no ci-production ed25519 line" >&2; exit 1; }
  grep -Eq '^ci-staging namespaces="ahanassa-ir-release" ssh-ed25519 ' "$f" || { echo "no ci-staging ed25519 line" >&2; exit 1; }
  if grep -Ev '^(#.*|ci-(production|staging) namespaces="ahanassa-ir-release" ssh-ed25519 [A-Za-z0-9+/=]+( .*)?|)$' "$f"; then echo "unexpected line(s) above" >&2; exit 1; fi
  install -m 0644 -o root -g root "$f" /etc/ahanassa/allowed_signers
  ssh-keygen -lf /etc/ahanassa/allowed_signers 2>/dev/null || awk '/^ci-/{print $1, $3}' /etc/ahanassa/allowed_signers
  say "allowed_signers installed"
}

step_tls_snakeoil() {
  # The origin starts with the snakeoil pair; tls-letsencrypt replaces the symlinks later (TLS_PLAN.md).
  for h in "${HOSTS[@]}" "$@"; do
    install -d -m 0755 "/etc/ahanassa/tls/$h"
    [ -e "/etc/ahanassa/tls/$h/fullchain.pem" ] || ln -s /etc/ssl/certs/ssl-cert-snakeoil.pem "/etc/ahanassa/tls/$h/fullchain.pem"
    [ -e "/etc/ahanassa/tls/$h/privkey.pem" ] || ln -s /etc/ssl/private/ssl-cert-snakeoil.key "/etc/ahanassa/tls/$h/privkey.pem"
    say "tls $h -> $(readlink "/etc/ahanassa/tls/$h/fullchain.pem")"
  done
}

step_tls_letsencrypt() {
  # deploy/iran/install.sh tls-letsencrypt <host> <email>   (needs the host's Arvan record pointing here; TLS_PLAN.md)
  local h=${1:?host} email=${2:?email}
  certbot certonly --webroot -w /var/lib/ahanassa-acme -d "$h" --non-interactive --agree-tos -m "$email" --no-eff-email \
    --deploy-hook 'nginx -t && systemctl reload nginx'
  ln -sfn "/etc/letsencrypt/live/$h/fullchain.pem" "/etc/ahanassa/tls/$h/fullchain.pem"
  ln -sfn "/etc/letsencrypt/live/$h/privkey.pem" "/etc/ahanassa/tls/$h/privkey.pem"
  nginx -t && reload_nginx
  say "tls $h -> Let's Encrypt"
}

step_nginx() {
  local tmp
  tmp=$(mktemp -d)
  "$here/nginx/render-templates.sh" "$tmp" >/dev/null
  install -m 0644 "$here/nginx/conf.d/ahanassa-common.conf" /etc/nginx/conf.d/ahanassa-common.conf
  install -m 0644 "$tmp"/conf.d/*.conf /etc/nginx/conf.d/
  install -m 0644 "$tmp"/snippets/*.conf "$here/nginx/snippets/ahanassa-tls.conf" "$here/nginx/snippets/ahanassa-acme.conf" "$here/nginx/snippets/ahanassa-arvan-real-ip.conf" /etc/nginx/snippets/
  rm -rf "$tmp"
  if ls /etc/nginx/modules-enabled/ 2>/dev/null | grep -q brotli-static; then
    install -m 0644 "$here/nginx/snippets/ahanassa-brotli.conf" /etc/nginx/snippets/ahanassa-brotli.conf
    say "brotli_static on"
  else
    rm -f /etc/nginx/snippets/ahanassa-brotli.conf
    say "brotli module not installed: gzip_static only"
  fi
  for f in 00-ahanassa-default.conf new.ahanassa.ir.conf staging.ahanassa.ir.conf; do
    install -m 0644 "$here/nginx/sites/$f" "/etc/nginx/sites-available/$f"
    ln -sfn "/etc/nginx/sites-available/$f" "/etc/nginx/sites-enabled/$f"
  done
  rm -f /etc/nginx/sites-enabled/default
  nginx -t
  reload_nginx
  say "nginx files installed and loaded (www.ahanassa.ir is NOT: owner decision, later)"
}

step_bootstrap() {
  # Before `nginx`: the site files include current/nginx/*, which must exist for nginx -t.
  for env in "${ENVS[@]}"; do /usr/local/sbin/ahanassa-activate bootstrap "$env"; done
  say "bootstrap releases in place (a holding page until the first activation)"
}

step_units() {
  install -m 0644 "$here"/systemd/ahanassa-*.{service,timer,path} /etc/systemd/system/
  systemctl daemon-reload
  for env in "${ENVS[@]}"; do systemctl enable --now "ahanassa-activate@$env.path" "ahanassa-sync@$env.timer"; done
  systemctl enable --now ahanassa-arvan-check.timer
  systemctl list-timers 'ahanassa-sync@*' --no-pager
}

step_status() {
  for env in "${ENVS[@]}"; do
    echo "== $env"; /usr/local/sbin/ahanassa-activate status "$env" || true
    systemctl --no-pager --lines=0 status "ahanassa-sync@$env.timer" "ahanassa-activate@$env.path" 2>/dev/null | grep -E 'Active|Trigger' || true
  done
}

# --- W32 (W29 P2): the domestic RFQ intake — RUNBOOK_P2.md §3. Same rules: one step per owner OK, idempotent. ---------
RFQ_CREDS=(admin-token arcaptcha-secret odoo-token r2-ir bale-token backup-s3)
NODE_HOME=/usr/local/lib/ahanassa-node

step_rfq_packages() {
  # sqlite3 (operator inspection, restore drill), age (backup encryption), logrotate (14-day API logs).
  apt-get update -q
  DEBIAN_FRONTEND=noninteractive apt-get install -y -q --no-install-recommends sqlite3 age logrotate
  age --version
}

step_node() {
  # install.sh node <vX.Y.Z> <sha256 of node-vX.Y.Z-linux-<arch>.tar.xz> [--from <local tarball>]
  # Node 24 LTS from the official tarball. The sha256 is checked TWICE: against nodejs.org's SHASUMS256.txt and against
  # the value the owner copied from nodejs.org on another machine (so a tampered download AND a tampered list fail).
  local v=${1:?version, e.g. v24.11.1} want=${2:?sha256 from https://nodejs.org/dist/<version>/SHASUMS256.txt} from=""
  [ "${3:-}" = "--from" ] && from=${4:?tarball}
  [[ $v =~ ^v24\.[0-9]+\.[0-9]+$ ]] || { echo "Node 24 only (got $v)" >&2; exit 1; }
  [[ $want =~ ^[0-9a-f]{64}$ ]] || { echo "sha256 must be 64 hex chars" >&2; exit 1; }
  local arch
  case $(uname -m) in x86_64) arch=x64 ;; aarch64) arch=arm64 ;; *) echo "unsupported arch" >&2; exit 1 ;; esac
  local name="node-$v-linux-$arch.tar.xz" tmp
  tmp=$(mktemp -d)
  if [ -n "$from" ]; then cp "$from" "$tmp/$name"; else
    curl -fsSL --retry 3 -o "$tmp/$name" "https://nodejs.org/dist/$v/$name"
    curl -fsSL --retry 3 -o "$tmp/SHASUMS256.txt" "https://nodejs.org/dist/$v/SHASUMS256.txt"
    grep -q "^$want  $name\$" "$tmp/SHASUMS256.txt" || { echo "the pasted sha256 is not nodejs.org's for $name" >&2; rm -rf "$tmp"; exit 1; }
  fi
  echo "$want  $tmp/$name" | sha256sum -c --quiet - || { echo "tarball sha256 mismatch" >&2; rm -rf "$tmp"; exit 1; }
  install -d -m 0755 "$NODE_HOME-$v"
  tar -xJf "$tmp/$name" -C "$NODE_HOME-$v" --strip-components=1 --no-same-owner
  rm -rf "$tmp"
  ln -sfn "$NODE_HOME-$v" "$NODE_HOME"
  "$NODE_HOME/bin/node" -e 'const m=+process.versions.node.split(".")[0]; if (m!==24) process.exit(1); require("node:sqlite")' || { echo "not a working Node 24 with node:sqlite" >&2; exit 1; }
  say "node $("$NODE_HOME/bin/node" --version) at $NODE_HOME (no npm is used on this server)"
}

step_rfq_users() {
  if id ahanassa-rfq >/dev/null 2>&1; then say "user ahanassa-rfq exists"; else
    useradd --system --no-create-home --home-dir /nonexistent --shell /usr/sbin/nologin --user-group ahanassa-rfq
    say "created system user ahanassa-rfq (no shell, no home)"
  fi
}

step_rfq_dirs() {
  for env in "${ENVS[@]}"; do
    install -d -m 0700 -o ahanassa-rfq -g ahanassa-rfq "/var/lib/ahanassa-rfq/$env"
    install -d -m 0700 -o ahanassa-rfq -g ahanassa-rfq "/var/backups/ahanassa-rfq/$env"
    install -d -m 0700 -o root -g root "/etc/ahanassa/credentials/rfq-$env"
    for c in "${RFQ_CREDS[@]}"; do
      [ -e "/etc/ahanassa/credentials/rfq-$env/$c" ] || { install -m 0600 -o root -g root /dev/null "/etc/ahanassa/credentials/rfq-$env/$c"; say "placeholder credential rfq-$env/$c (empty)"; }
    done
  done
  install -d -m 0755 /var/lib/ahanassa-rfq /var/backups/ahanassa-rfq
  [ -e /etc/ahanassa/rfq-admin-allow.conf ] || install -m 0644 "$here/etc/rfq-admin-allow.conf.example" /etc/ahanassa/rfq-admin-allow.conf
  install -m 0644 "$here/etc/logrotate-ahanassa-rfq" /etc/logrotate.d/ahanassa-rfq
  say "rfq dirs + credential placeholders ready"
}

step_rfq_config() {
  for env in "${ENVS[@]}"; do
    if [ ! -e "/etc/ahanassa/rfq-$env.json" ]; then
      install -m 0644 "$here/etc/rfq-$env.json.example" "/etc/ahanassa/rfq-$env.json"
      say "/etc/ahanassa/rfq-$env.json created from the example — fill in the <…> values"
    fi
    if grep -q '<' "/etc/ahanassa/rfq-$env.json"; then say "rfq-$env.json still has <placeholders>: $(grep -o '<[^>]*>' "/etc/ahanassa/rfq-$env.json" | head -3 | tr '\n' ' ')"; fi
  done
}

step_rfq_nginx() {
  local tmp
  tmp=$(mktemp -d)
  "$here/nginx/render-templates.sh" "$tmp" >/dev/null
  install -m 0644 "$here/nginx/conf.d/ahanassa-rfq.conf" /etc/nginx/conf.d/ahanassa-rfq.conf
  install -m 0644 "$tmp"/snippets/ahanassa-rfq-proxy-*.conf /etc/nginx/snippets/
  rm -rf "$tmp"
  step_tls_snakeoil api-staging.ahanassa.ir api-new.ahanassa.ir
  for f in api-staging.ahanassa.ir.conf api-new.ahanassa.ir.conf; do
    install -m 0644 "$here/nginx/sites/$f" "/etc/nginx/sites-available/$f"
    ln -sfn "/etc/nginx/sites-available/$f" "/etc/nginx/sites-enabled/$f"
  done
  nginx -t
  reload_nginx
  say "API hosts api-staging / api-new installed (api.ahanassa.ir is NOT: owner rule, it is not switched)"
}

step_rfq_enable() {
  # install.sh rfq-enable <env>  — AFTER rfq-units: from now on the activator restarts (new rfq-ir.mjs) or HUPs (new
  # variant index) the services after each activation of <env>, health-checks them, and refuses + restores if unhealthy.
  local env=${1:?env}
  systemctl is-active --quiet "ahanassa-rfq@$env.service" || { echo "ahanassa-rfq@$env is not running (run rfq-units $env first)" >&2; exit 1; }
  python3 -I - "$env" <<'PY'
import json, sys
env = sys.argv[1]
p = "/etc/ahanassa/iran.json"
d = json.load(open(p))
d["rfq_group"] = "ahanassa-rfq"
d.setdefault("envs", {}).setdefault(env, {})["rfq"] = {"enabled": True, "port": 8711 if env == "production" else 8712}
open(p, "w").write(json.dumps(d, indent=2) + "\n")
print(f"[install] iran.json: rfq enabled for {env}")
PY
}

step_rfq_units() {
  # install.sh rfq-units <env>  — install the units (all envs) and start them for <env>.
  local env=${1:?env}
  [ -x "$NODE_HOME/bin/node" ] || { echo "run install.sh node first" >&2; exit 1; }
  [ -f "/etc/ahanassa/rfq-$env.json" ] || { echo "run install.sh rfq-config first" >&2; exit 1; }
  [ -f "/srv/ahanassa/site/$env/current/rfq/rfq-ir.mjs" ] || { echo "the current $env release carries no rfq/rfq-ir.mjs yet (wait for a W32 activation)" >&2; exit 1; }
  # The current release was unpacked before the service group existed: give its private/ (the variant index) to it.
  chgrp -R ahanassa-rfq "/srv/ahanassa/site/$env/current/private"
  install -m 0644 "$here"/systemd/ahanassa-rfq*.{service,timer} /etc/systemd/system/
  systemctl daemon-reload
  systemctl enable --now "ahanassa-rfq@$env.service" "ahanassa-rfq-forward@$env.service" \
    "ahanassa-rfq-health@$env.timer" "ahanassa-rfq-maintain@$env.timer" "ahanassa-rfq-backup@$env.timer" "ahanassa-rfq-backup-offsite@$env.timer"
  sleep 2
  curl -fsS "http://127.0.0.1:$([ "$env" = production ] && echo 8711 || echo 8712)/healthz" && echo
  say "rfq $env running"
}

step_rfq_status() {
  for env in "${ENVS[@]}"; do
    echo "== rfq $env"
    systemctl --no-pager --lines=0 status "ahanassa-rfq@$env" "ahanassa-rfq-forward@$env" 2>/dev/null | grep -E '●|Active' || true
    [ -r "/var/lib/ahanassa-rfq/$env/status.json" ] && cat "/var/lib/ahanassa-rfq/$env/status.json"
  done
}

step=${1:-}
shift || true
need_root
case "$step" in
  packages) step_packages ;;
  users) step_users ;;
  dirs) step_dirs ;;
  code) step_code ;;
  signers) step_signers "$@" ;;
  tls-snakeoil) step_tls_snakeoil "$@" ;;
  tls-letsencrypt) step_tls_letsencrypt "$@" ;;
  nginx) step_nginx ;;
  bootstrap) step_bootstrap ;;
  units) step_units ;;
  status) step_status ;;
  rfq-packages) step_rfq_packages ;;
  node) step_node "$@" ;;
  rfq-users) step_rfq_users ;;
  rfq-dirs) step_rfq_dirs ;;
  rfq-config) step_rfq_config ;;
  rfq-nginx) step_rfq_nginx ;;
  rfq-enable) step_rfq_enable "$@" ;;
  rfq-units) step_rfq_units "$@" ;;
  rfq-status) step_rfq_status ;;
  *) echo "usage: install.sh packages|users|dirs|code|signers <file>|tls-snakeoil|tls-letsencrypt <host> <email>|nginx|bootstrap|units|status" >&2
     echo "       W32: rfq-packages|node <vX.Y.Z> <sha256> [--from <tarball>]|rfq-users|rfq-dirs|rfq-config|rfq-nginx|rfq-enable <env>|rfq-units <env>|rfq-status" >&2; exit 64 ;;
esac
