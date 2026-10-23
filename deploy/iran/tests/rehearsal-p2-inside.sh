#!/bin/bash
# W32/W35 — the container half of docker-rehearsal-p2.sh. --network none: loopback only. Staging env, as RUNBOOK_P2.md
# installs it first. Every RFQ here is fake ("Rehearsal Buyer N", example.com).
set -uo pipefail
fail=0
pass=0
ok() { pass=$((pass + 1)); printf '  ok   %s\n' "$*"; }
bad() { fail=$((fail + 1)); printf '  FAIL %s\n' "$*"; }
I=/opt/iran/install.sh
ENV=staging
API=api-staging.ahanassa.ir
ARVAN=s3.ir-thr-at1.arvanstorage.ir
FILES_BUCKET=ahanassa-rfq-files-ir-staging

echo "== 0. test world: CA, /etc/hosts, stubs (Odoo on [::1] only = abroad; Arvan S3 + Bale on 127.0.0.3 = domestic)"
install -m 0755 /work/systemctl-shim.sh /usr/local/bin/systemctl
mkdir -p /etc/ahanassa-test && cd /etc/ahanassa-test
openssl req -x509 -newkey rsa:2048 -nodes -days 2 -subj "/CN=rehearsal CA" -keyout ca.key -out ca.pem 2>/dev/null
openssl req -newkey rsa:2048 -nodes -subj "/CN=stubs" -keyout stub.key -out stub.csr 2>/dev/null
printf 'subjectAltName=DNS:odoo.ahanassa.com,DNS:%s,DNS:tapi.bale.ai\n' "$ARVAN" > san.ext
openssl x509 -req -in stub.csr -CA ca.pem -CAkey ca.key -CAcreateserial -days 2 -extfile san.ext -out stub.pem 2>/dev/null
chmod 0644 ca.pem
cd /
{ echo "::1 odoo.ahanassa.com"; echo "127.0.0.3 $ARVAN tapi.bale.ai"; } >> /etc/hosts
ip addr add 127.0.0.3/8 dev lo 2>/dev/null || true
iptables -t nat -A OUTPUT -d 127.0.0.3 -p tcp --dport 443 -j DNAT --to-destination 127.0.0.1:9443 || bad "iptables nat (Arvan S3/Bale on :443)"
ip -6 addr show dev lo | grep -q '::1' && ok "IPv6 loopback present" || bad "no ::1"

echo "== 1. install (P1 steps + W32 P2 steps of deploy/iran/install.sh)"
set -e
bash $I users >/dev/null; bash $I dirs >/dev/null; bash $I code >/dev/null
bash $I signers /work/allowed_signers >/dev/null; bash $I bootstrap >/dev/null; bash $I tls-snakeoil >/dev/null; bash $I nginx >/dev/null
bash $I node v24.0.0-placeholder x 2>/dev/null && bad "node step accepted a bad version" || true
v=$(echo "$NODE_NAME" | sed -E 's/^node-(v[0-9.]+)-linux-.*/\1/')
bash $I node "$v" "$NODE_SHA" --from /work/node.tar.xz
bash $I rfq-users; bash $I rfq-dirs >/dev/null; bash $I rfq-config >/dev/null; bash $I rfq-nginx
set +e
/usr/local/lib/ahanassa-node/bin/node /work/p2-stubs.mjs /etc/ahanassa-test/stub.pem /etc/ahanassa-test/stub.key > /var/log/stubs.log 2>&1 &
sleep 1
STATS() { curl -s --cacert /etc/ahanassa-test/ca.pem "https://odoo.ahanassa.com:9444/__test/stats"; }
STATS | jq -e .odoo_rfqs >/dev/null && ok "stubs up (Odoo over IPv6)" || bad "stubs: $(cat /var/log/stubs.log)"
# The same stats from the domestic side (reachable during the cutoff drill).
STATSD() { curl -s --cacert /etc/ahanassa-test/ca.pem "https://$ARVAN/__test/stats"; }
STATSD | jq -e .store >/dev/null && ok "Arvan S3 stub up (domestic, IPv4)" || bad "domestic stub"
K=/etc/ahanassa/credentials/rfq-$ENV/altcha-hmac-key
[ "$(stat -c '%a %U' $K)" = "600 root" ] && [ "$(tr -d '\n' < $K | grep -cE '^[0-9a-f]{64}$')" = 1 ] && ok "rfq-dirs generated the ALTCHA key on the server (64 hex, root 0600)" || bad "altcha key $(stat -c '%a %U %s' $K)"
ksum=$(sha256sum < $K); bash $I rfq-dirs >/dev/null; [ "$(sha256sum < $K)" = "$ksum" ] && ok "rerunning rfq-dirs keeps the key" || bad "key regenerated"
[ ! -e /etc/ahanassa/credentials/rfq-$ENV/arcaptcha-secret ] && [ ! -e /etc/ahanassa/credentials/rfq-$ENV/r2-ir ] && ok "no arCaptcha / R2 credential placeholders" || bad "old credentials present"

age-keygen -o /root/owner-age.key 2>/dev/null
RECIPIENT=$(grep -o 'age1[0-9a-z]*' /root/owner-age.key | head -1)
cat > /etc/ahanassa/rfq-$ENV.json <<EOF
{
  "env": "$ENV",
  "listen": { "host": "127.0.0.1", "port": 8712 },
  "public_origin": "https://$API",
  "allowed_origins": ["https://staging.ahanassa.ir"],
  "data_dir": "/var/lib/ahanassa-rfq/$ENV",
  "release_dir": "/srv/ahanassa/site/$ENV/current",
  "captcha": { "provider": "altcha" },
  "files_enabled": true,
  "odoo": { "base_url": "https://odoo.ahanassa.com:9444", "intake_v11": true },
  "files_store": { "endpoint": "https://$ARVAN", "bucket": "$FILES_BUCKET", "region": "ir-thr-at1" },
  "files_store_wait_ms": 7200000,
  "files_storage_hint": "held on the domestic server; open with https://$API/__admin/ir/",
  "bale": { "chat_id": "-1001" },
  "backup": { "dir": "/var/backups/ahanassa-rfq/$ENV", "age_recipient": "$RECIPIENT", "offsite": { "endpoint": "https://$ARVAN", "bucket": "ahanassa-backup-ir", "region": "ir-thr-at1" } }
}
EOF
C=/etc/ahanassa/credentials/rfq-$ENV
echo rehearsal-admin > $C/admin-token; echo rehearsal-ir-bearer > $C/odoo-token
# W35: one Arvan machine user (ahanassa-iransrv) for the files bucket and the backup bucket, one credential file per unit.
echo '{"access_key_id":"AKREHEARSAL","secret_access_key":"rehearsal-secret"}' | tee $C/files-s3 > $C/backup-s3; echo "123:REHEARSALBALE" > $C/bale-token
cat > /etc/ahanassa/iran.json <<'EOF'
{ "nginx_reload": ["nginx", "-s", "reload"], "sources": [{ "name": "github", "type": "github" }], "timeouts": { "api": 5, "download": 30 } }
EOF

offer() { # step dir name
  local seq; seq=$(jq -r .seq "/work/steps/$1/activation.json")
  install -d -o ahanassa-sync "/srv/ahanassa/incoming/$ENV/$seq"
  cp /work/steps/$1/{activation.json,activation.json.sig,bundle.zip} "/srv/ahanassa/incoming/$ENV/$seq/"
  touch "/srv/ahanassa/incoming/$ENV/$seq.ready"
}
activate() { AHANASSA_IRAN_CONFIG=/etc/ahanassa/iran.json /usr/local/sbin/ahanassa-activate "$ENV"; }

echo "== 2. activation of a W32 bundle (the static copy + rfq/rfq-ir.mjs, one signed release)"
offer 1
activate > /tmp/act1.log 2>&1 && ok "activated $(basename "$(readlink /srv/ahanassa/site/$ENV/current)")" || bad "refused: $(grep -E 'refused' /tmp/act1.log | tail -1)"
REL=/srv/ahanassa/site/$ENV/current
[ -f $REL/rfq/rfq-ir.mjs ] && [ "$(stat -c %a $REL/rfq/rfq-ir.mjs)" = 644 ] && [ "$(stat -c %U $REL/rfq/rfq-ir.mjs)" = root ] && ok "rfq-ir.mjs in the release, root 0644 (the service cannot change its own code)" || bad "rfq file"
[ "$(sha256sum < $REL/rfq/rfq-ir.mjs | cut -d' ' -f1)" = "$(unzip -p /work/bundle/iran-bundle.zip rfq/rfq-ir.mjs | sha256sum | cut -d' ' -f1)" ] && ok "rfq-ir.mjs = the bundle's bytes" || bad "rfq bytes"

echo "== 3. services through the real unit files (rfq-units, then rfq-enable)"
bash $I rfq-units $ENV > /tmp/units.log 2>&1 && ok "rfq-units: $(tail -1 /tmp/units.log)" || bad "rfq-units: $(cat /tmp/units.log)"
grep -q '"ok":true' /tmp/units.log && ok "intake /healthz answered" || bad "healthz"
bash $I rfq-enable $ENV >/dev/null && ok "rfq-enable: the activator now manages the services" || bad "rfq-enable"
[ "$(stat -c %G $REL/private)" = ahanassa-rfq ] && ok "private/ (variant index) readable by the service group only" || bad "private group $(stat -c %G $REL/private)"
[ "$(stat -c %a /var/lib/ahanassa-rfq/$ENV/ops.sqlite)" = 600 ] && [ "$(stat -c %U /var/lib/ahanassa-rfq/$ENV/ops.sqlite)" = ahanassa-rfq ] && ok "ops.sqlite 0600 ahanassa-rfq" || bad "db perms"
grep -q '"event":"variant_index","version":"snap-0123456789abcdef"' /var/log/shim-ahanassa-rfq@$ENV.service.log && ok "intake loaded the release's variant index" || bad "variant index"

echo "== 4. through nginx (curl --resolve $API:443:127.0.0.1)"
c() { curl -sk --resolve "$API:443:127.0.0.1" -H 'Origin: https://staging.ahanassa.ir' "$@"; }
caps=$(c "https://$API/api/rfqs/capabilities")
[ "$(echo "$caps" | jq -c .captcha)" = '{"provider":"altcha","challengePath":"/api/rfqs/captcha-challenge"}' ] && ok "capabilities: ALTCHA + its challenge path" || bad "capabilities: $caps"
hdr=$(c -D - -o /tmp/challenge.json "https://$API/api/rfqs/captcha-challenge")
grep -qi '^cache-control: no-store' <<< "$hdr" && grep -qi '^access-control-allow-origin: https://staging.ahanassa.ir' <<< "$hdr" && jq -e '.signature | test("^[0-9a-f]{64}$")' /tmp/challenge.json >/dev/null && ok "challenge through nginx: signed, no-store, exact-origin CORS" || bad "challenge: $hdr $(cat /tmp/challenge.json)"
[ "$(c -o /dev/null -w '%{http_code}' -X POST "https://$API/api/rfqs/captcha-challenge")" = 403 ] && ok "challenge path is GET-only at nginx" || bad "challenge POST"
[ "$(c -o /dev/null -w '%{http_code}' "https://$API/api/rfqs/extract" -X POST)" = 404 ] && ok "/api/rfqs/extract is 404 (Workers AI off)" || bad extract
[ "$(c -o /dev/null -w '%{http_code}' "https://$API/anything-else")" = 404 ] && ok "other paths 404" || bad "other"
big=$(head -c 30000 /dev/zero | tr '\0' a)
[ "$(c -o /dev/null -w '%{http_code}' -X POST -H 'content-type: application/json' --data "$big" "https://$API/api/rfqs")" = 413 ] && ok "a 30 kB submit body stops at nginx (413)" || bad "body limit"

solve() { c "https://$API/api/rfqs/captcha-challenge" | /usr/local/lib/ahanassa-node/bin/node /work/altcha-solve.mjs; }
submit() { # n token|solve files…   ("solve" = a fresh challenge, solved as the widget would)
  local n=$1 tok=$2; shift 2
  [ "$tok" = solve ] && tok=$(solve)
  local key att='[]' f
  key=$(cat /proc/sys/kernel/random/uuid)
  for f in "$@"; do att=$(jq -c --arg nm "$(basename "$f")" --argjson sz "$(stat -c %s "$f")" '. + [{name:$nm,size:$sz}]' <<< "$att"); done
  local body
  body=$(jq -cn --arg key "$key" --arg n "$n" --arg tok "$tok" --argjson att "$att" '{idempotencyKey:$key, locale:"fa", fullName:("Rehearsal Buyer "+$n), email:("buyer"+$n+"@example.com"), phoneCountry:"IR", phoneLocal:"9121234567", items:[{freeformTitle:("میلگرد "+$n), quantityText:"12", unit:"ton"}], website:"", formRenderedAt:((now*1000|floor)-60000), turnstileToken:$tok, catalogSnapshotVersion:"snap-0123456789abcdef"} + (if ($att|length)>0 then {attachments:$att} else {} end)')
  local out code ref
  out=$(c -X POST -H 'content-type: application/json' --data "$body" "https://$API/api/rfqs" -w '\n%{http_code}')
  code=$(tail -1 <<< "$out"); ref=$(head -1 <<< "$out" | jq -r '.reference // empty' 2>/dev/null)
  local i=1
  if [ "$code" = 201 ]; then for f in "$@"; do
    local pc; pc=$(c -o /dev/null -w '%{http_code}' -X PUT -H "x-rfq-key: $key" -H 'content-type: application/octet-stream' --data-binary "@$f" "https://$API/api/rfqs/files/$ref/$i")
    [ "$pc" = 201 ] || echo "PUT $ref/$i -> $pc" >&2; i=$((i + 1)); done; fi
  echo "$code $ref"
}
wait_for() { # seconds jq-condition-on-stats
  local t
  for t in $(seq 1 "$1"); do STATS | jq -e "$2" >/dev/null 2>&1 && return 0; sleep 1; done; return 1
}

r=$(submit 0 bad-token); [ "${r%% *}" = 403 ] && ok "a bogus captcha payload → 403 (fail closed)" || bad "bad token: $r"
t0=$(date +%s%N); tok1=$(solve); solve_ms=$(( ($(date +%s%N) - t0) / 1000000 ))
[ -n "$tok1" ] && ok "ALTCHA challenge solved in ${solve_ms} ms (Node, one core, this box)" || bad "solve"
r=$(submit 1 "$tok1" /work/files/list.png); ref1=${r#* }
[ "${r%% *}" = 201 ] && ok "submit + 1 file → 201 $ref1" || bad "submit: $r"
r=$(submit 1r "$tok1"); [ "${r%% *}" = 403 ] && ok "the same solution again (new idempotency key) → 403: single use" || bad "replay: $r"
[ "$(sqlite3 /var/lib/ahanassa-rfq/$ENV/ops.sqlite 'SELECT count(*) FROM ir_captcha_used')" = 1 ] && ok "the used challenge is recorded until it expires" || bad "captcha store"
wait_for 40 '.odoo_rfqs | length == 1' && ok "forwarded to Odoo within 40 s" || bad "not forwarded: $(STATS | jq -c .odoo_requests) — forwarder log: $(tail -5 /var/log/shim-ahanassa-rfq-forward@$ENV.service.log 2>&1)"
STATS | jq -e '.odoo_rfqs[0].idempotency_key | startswith("rfq-ir-")' >/dev/null && ok "Idempotency-Key rfq-ir-<ulid>" || bad "key prefix"
STATS | jq -e '[.odoo_families[] | select(. != "IPv6")] | length == 0' >/dev/null && ok "every Odoo connection came over IPv6 (the stub has no IPv4 socket at all)" || bad "families $(STATS | jq -c .odoo_families)"
png_sha=$(sha256sum < /work/files/list.png | cut -d' ' -f1)
STATS | jq -e --arg k "$FILES_BUCKET/rfq-files/$ref1/1.png" --arg s "$png_sha" '.store[$k].sha256 == $s and .store[$k].meta == $s' >/dev/null && ok "file in the Arvan files bucket under the v1.2 key, sha256 = the customer's bytes" || bad "store: $(STATS | jq -c .store)"
STATS | jq -e '(.store_families | length) > 0 and ([.store_families[] | select(. != "IPv4")] | length == 0)' >/dev/null && ok "the Arvan copy went over IPv4 (domestic); Odoo stayed IPv6" || bad "store families $(STATS | jq -c .store_families)"

echo "== 5. CUTOFF: all egress abroad dropped (ip6tables DROP to [::1]:9444) — the Arvan bucket and Bale are domestic and stay; the captcha is local"
ip6tables -A OUTPUT -d ::1 -p tcp --dport 9444 -j DROP
declare -A sent
for n in $(seq 2 11); do
  if [ $((n % 3)) = 0 ]; then r=$(submit $n solve /work/files/list.png /work/files/list.pdf); else r=$(submit $n solve); fi
  sent[$n]=${r#* }; [ "${r%% *}" = 201 ] || bad "cutoff submit $n: $r"
  sleep 1
done
[ ${#sent[@]} = 10 ] && ok "10 submits during the cutoff → all 201, stored on the server" || bad "cutoff submits"
sleep 45
before=$(curl -s --max-time 3 --cacert /etc/ahanassa-test/ca.pem https://odoo.ahanassa.com:9444/__test/stats >/dev/null; echo $?)
[ "$before" != 0 ] && ok "Odoo unreachable from the server (cutoff holds)" || bad "cutoff not effective"
in_store=1
pdf_sha=$(sha256sum < /work/files/list.pdf | cut -d' ' -f1)
for n in 3 6 9; do
  STATSD | jq -e --arg a "$FILES_BUCKET/rfq-files/${sent[$n]}/1.png" --arg b "$FILES_BUCKET/rfq-files/${sent[$n]}/2.pdf" --arg p "$png_sha" --arg d "$pdf_sha" '.store[$a].sha256 == $p and .store[$b].sha256 == $d' >/dev/null || in_store=0
done
[ $in_store = 1 ] && ok "DURING the cutoff the files are already in the Arvan bucket, sha256-checked (they stay in Iran)" || bad "cutoff files not in store: $(STATSD | jq -c '.store | keys')"
und=$(sqlite3 /var/lib/ahanassa-rfq/$ENV/ops.sqlite "SELECT count(*) FROM rfqs WHERE odoo_rfq_reference IS NULL")
[ "$und" = 10 ] && ok "10 RFQs held (pending/retry), none lost" || bad "held: $und"
adm=$(c -H 'authorization: Bearer rehearsal-admin' -H 'x-admin-actor: rehearsal' "https://$API/__admin/ir/rfqs?status=undelivered")
[ "$(echo "$adm" | jq '.rfqs | length')" = 10 ] && echo "$adm" | jq -e '.rfqs[0].full_name | startswith("Rehearsal Buyer")' >/dev/null && ok "admin view (bearer) shows the 10 held RFQs with contact details" || bad "admin: ${adm:0:200}"
[ "$(c -o /dev/null -w '%{http_code}' "https://$API/__admin/ir/rfqs")" = 404 ] && ok "admin without the token → 404" || bad "admin open"
ip6tables -D OUTPUT -d ::1 -p tcp --dport 9444 -j DROP
echo "   link restored at $(date -u +%T); waiting for delivery (backoff ≤ 2.4 min, then the rest at once)"
wait_for 420 '.odoo_rfqs | length == 11' && ok "all 10 delivered after the link returned" || bad "after restore: $(STATS | jq '.odoo_rfqs | length') of 11"
STATS | jq -e '[.odoo_requests[] | select(.status == 201)] | length == 11' >/dev/null && ok "exactly 11 creations in Odoo (no duplicate)" || bad "creations $(STATS | jq -c '[.odoo_requests[].status]')"
STATS | jq -e '[.odoo_requests[] | select(.status == 409)] | length == 0' >/dev/null && ok "no idempotency conflict" || bad "409s"
[ "$(sqlite3 /var/lib/ahanassa-rfq/$ENV/ops.sqlite "SELECT count(*) FROM rfqs WHERE attachment_count > 0 AND attachments_channel = 'odoo_v12'")" = 4 ] && ok "the 4 RFQs with files went to Odoo as v1.2 attachments (the Arvan objects)" || bad "cutoff file channel"
recv=$(sqlite3 /var/lib/ahanassa-rfq/$ENV/ops.sqlite "SELECT 'rfq-ir-'||id||'|'||submitted_at FROM rfqs ORDER BY id")
ok_ra=1
while IFS='|' read -r k t; do STATS | jq -e --arg k "$k" --arg t "$t" '.odoo_rfqs[] | select(.idempotency_key == $k) | (.received_at | sub("\\.[0-9]+";"") | sub("Z$";"")) == ($t | sub("\\.[0-9]+";"") | sub("Z$";""))' >/dev/null || ok_ra=0; done <<< "$recv"
[ $ok_ra = 1 ] && ok "received_at in Odoo = the domestic acceptance time (not the delivery time)" || bad "received_at"

echo "== 6. CRASH between Odoo's answer and the forwarder's result write"
touch /tmp/odoo-slow
r=$(submit 12 solve); ref12=${r#* }
wait_for 40 '.odoo_rfqs | length == 12' && ok "Odoo stored RFQ 12 (its answer is held 8 s)" || bad "crash prep"
kill -9 "$(cat /run/shim/ahanassa-rfq-forward@$ENV.service.pid)" && ok "forwarder killed (-9) before the answer"
rm -f /tmp/odoo-slow
st=$(sqlite3 /var/lib/ahanassa-rfq/$ENV/ops.sqlite "SELECT sync_status FROM rfqs WHERE reference_number='$ref12'")
[ "$st" = syncing ] && ok "RFQ 12 left claimed (syncing) by the dead run" || bad "state $st"
systemctl restart ahanassa-rfq-forward@$ENV.service
wait_for 40 '[.odoo_requests[] | select(.status == 200)] | length >= 1' && ok "restarted forwarder re-sent the same key → 200 replay" || bad "no replay"
STATS | jq -e '.odoo_rfqs | length == 12' >/dev/null && ok "still 12 RFQs in Odoo — no duplicate" || bad "duplicate"
sleep 2
st=$(sqlite3 /var/lib/ahanassa-rfq/$ENV/ops.sqlite "SELECT sync_status FROM rfqs WHERE reference_number='$ref12'")
[ "$st" = synced ] && ok "RFQ 12 synced" || bad "state after replay $st"

echo "== 7. re-activation of the same code (daily content run): SIGHUP, no restart"
pid_before=$(cat /run/shim/ahanassa-rfq@$ENV.service.pid)
offer 2
activate > /tmp/act2.log 2>&1 && ok "activation 2 applied" || bad "act2: $(grep refused /tmp/act2.log)"
grep -q '"action": "reloaded_index"' /tmp/act2.log && [ "$(cat /run/shim/ahanassa-rfq@$ENV.service.pid)" = "$pid_before" ] && ok "intake HUPed (same process), variant index re-read" || bad "act2 rfq: $(grep rfq /tmp/act2.log)"

echo "== 8. backups (age, owner key only), maintain, health"
systemctl start ahanassa-rfq-backup@$ENV.service && ok "hourly backup ran" || bad "backup: $(tail -3 /var/log/shim-ahanassa-rfq-backup@$ENV.service.log)"
f=$(ls /var/backups/ahanassa-rfq/$ENV/hourly/*.age | tail -1)
! grep -q "Rehearsal Buyer" "$f" && head -c 21 "$f" | grep -q age-encryption && ok "backup is age-encrypted (no plaintext)" || bad "backup plaintext"
[ -z "$(ls -A /var/backups/ahanassa-rfq/$ENV/.work)" ] && ok "no plaintext copy left in the work dir" || bad "plaintext left"
age -d -i /root/owner-age.key -o /tmp/restored.sqlite "$f" && [ "$(sqlite3 /tmp/restored.sqlite 'SELECT count(*) FROM rfqs')" = 12 ] && ok "restore drill: the owner's key decrypts it; 12 RFQs" || bad "restore"
systemctl start ahanassa-rfq-backup-offsite@$ENV.service && STATSD | jq -e --arg d "$(date -u +%Y%m%d)" '.store | keys | any(startswith("ahanassa-backup-ir/ahanassa-rfq/staging/" + $d + "/ops.sqlite.age"))' >/dev/null && ok "daily offsite backup in the Arvan backup bucket (ahanassa-backup-ir/ahanassa-rfq/staging/…)" || bad "offsite: $(tail -3 /var/log/shim-ahanassa-rfq-backup-offsite@$ENV.service.log) $(STATSD | jq -c '.store | keys')"
STATSD | jq -e '[.store[] | select(.bucket == "ahanassa-backup-ir")] | length >= 1' >/dev/null && ! STATSD | jq -r '.store | keys[]' | grep -q '^ahanassa-backup-ir/rfq-files/' && ok "backups and RFQ files in their own buckets" || bad "bucket split"
systemctl start ahanassa-rfq-maintain@$ENV.service && grep -q '"rfqsPurged":0' /var/log/shim-ahanassa-rfq-maintain@$ENV.service.log && ok "maintain: nothing purged before 30 days" || bad "maintain"
systemctl start ahanassa-rfq-health@$ENV.service; jq -e '.ok == true and .outbox_due == 0' /var/lib/ahanassa-rfq/$ENV/status.json >/dev/null && ok "health: ok, nothing due" || bad "health: $(cat /var/lib/ahanassa-rfq/$ENV/status.json)"
STATS | jq -e '.bale | length >= 12' >/dev/null && ok "Bale: one new-RFQ notice per RFQ ($(STATS | jq '.bale | length'))" || bad "bale $(STATS | jq '.bale | length')"
STATS | jq -e '[.bale[] | select(test("Rehearsal|example\\.com|912"))] | length == 0' >/dev/null && ok "Bale notices carry no personal data" || bad "PII in Bale"

echo "== 9. no personal data in the service logs or the API access log"
if grep -lE 'Rehearsal Buyer|example\.com|9121234567' /var/log/shim-ahanassa-rfq*.log /var/log/nginx/ahanassa-rfq-$ENV.access.log 2>/dev/null; then bad "PII in a log (files above)"; else ok "no name / e-mail / phone in any service or access log"; fi
grep -qE ' 127\.0\.0\.0/24 "POST /api/rfqs" 201' /var/log/nginx/ahanassa-rfq-$ENV.access.log && ok "access log: truncated IP, path without query" || bad "access log format: $(tail -1 /var/log/nginx/ahanassa-rfq-$ENV.access.log)"

echo
echo "== $pass passed, $fail failed"
[ $fail = 0 ]
