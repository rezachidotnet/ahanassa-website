#!/bin/bash
# W32 Docker rehearsal only: a tiny `systemctl` for a container without systemd. It runs what the INSTALLED unit files
# say — ExecStart (with %i), User, LoadCredential (copied into a per-unit credentials dir owned by that user, as
# systemd does) — so the rehearsal exercises the real deploy/iran/systemd units, not a copy of their commands.
#   daemon-reload | enable --now U… | start U… | stop U… | restart U… | kill -s SIG U | is-active [--quiet] U | reload nginx
set -uo pipefail
UNITDIR=/etc/systemd/system
RUN=/run/shim
mkdir -p "$RUN/creds"

parse() { # unit -> sets file inst
  local u=$1
  if [[ $u == *@*.* ]]; then file="$UNITDIR/${u%%@*}@.${u##*.}"; inst=${u#*@}; inst=${inst%.*}; else file="$UNITDIR/$u"; inst=""; fi
}
field() { grep -m1 "^$1=" "$file" | cut -d= -f2- | sed "s/%i/$inst/g"; }

start() {
  local u=$1
  [[ $u == *.timer || $u == *.path ]] && return 0
  [[ $u == nginx* ]] && { nginx -s reload 2>/dev/null || nginx; return; }
  parse "$u"
  [ -f "$file" ] || { echo "shim: no unit file $file" >&2; return 1; }
  local user exec type creds
  user=$(field User); exec=$(field ExecStart); type=$(field Type)
  creds="$RUN/creds/$u"
  rm -rf "$creds"; mkdir -p "$creds"
  while IFS= read -r line; do
    local name=${line%%:*} src=${line#*:}
    cp "$src" "$creds/$name"
  done < <(grep '^LoadCredential=' "$file" | cut -d= -f2- | sed "s/%i/$inst/g")
  chown -R "$user:$user" "$creds"; chmod 0500 "$creds"; chmod 0400 "$creds"/* 2>/dev/null || true
  # shellcheck disable=SC2086
  if [ "$type" = oneshot ]; then
    setpriv --reuid="$user" --regid="$user" --init-groups env CREDENTIALS_DIRECTORY="$creds" NODE_EXTRA_CA_CERTS=/etc/ahanassa-test/ca.pem $exec >> "/var/log/shim-$u.log" 2>&1
    return $?
  fi
  setpriv --reuid="$user" --regid="$user" --init-groups env CREDENTIALS_DIRECTORY="$creds" NODE_EXTRA_CA_CERTS=/etc/ahanassa-test/ca.pem $exec >> "/var/log/shim-$u.log" 2>&1 &
  echo $! > "$RUN/$u.pid"
}
pid_of() { cat "$RUN/$1.pid" 2>/dev/null; }
alive() { local p; p=$(pid_of "$1"); [ -n "$p" ] && kill -0 "$p" 2>/dev/null; }
stop() {
  local p; p=$(pid_of "$1") || true
  [ -n "$p" ] || return 0
  kill -TERM "$p" 2>/dev/null
  for _ in $(seq 1 50); do kill -0 "$p" 2>/dev/null || break; sleep 0.2; done
  kill -KILL "$p" 2>/dev/null || true
  rm -f "$RUN/$1.pid"
}

cmd=${1:-}; shift || true
case "$cmd" in
  daemon-reload) exit 0 ;;
  enable) [ "${1:-}" = --now ] && shift; rc=0; for u in "$@"; do start "$u" || rc=1; done; exit $rc ;;
  start) rc=0; for u in "$@"; do start "$u" || rc=1; done; exit $rc ;;
  stop) for u in "$@"; do stop "$u"; done ;;
  restart) rc=0; for u in "$@"; do stop "$u"; start "$u" || rc=1; done; exit $rc ;;
  reload) [[ ${1:-} == nginx* ]] && { nginx -s reload; exit $?; }; for u in "$@"; do kill -HUP "$(pid_of "$u")"; done ;;
  kill) [ "${1:-}" = -s ] && { sig=$2; shift 2; } || sig=TERM; for u in "$@"; do kill -s "$sig" "$(pid_of "$u")" || exit 1; done ;;
  is-active) [ "${1:-}" = --quiet ] && shift; alive "$1" ;;
  *) echo "shim: unsupported: systemctl $cmd $*" >&2; exit 1 ;;
esac
