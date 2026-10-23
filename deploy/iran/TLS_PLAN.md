# Origin TLS plan — Arvan → iransrv (W30 / W29 P1 §2.1)

Visitors never see the origin certificate: they get Arvan's edge certificate. This certificate protects the hop
**Arvan edge → iransrv:443** and must be valid in any case, whether or not Arvan verifies it (P0 check **A1**, still open).

## Layout (no site file ever changes)

```
/etc/ahanassa/tls/<host>/fullchain.pem  -> /etc/ssl/certs/ssl-cert-snakeoil.pem        (bootstrap)
/etc/ahanassa/tls/<host>/privkey.pem    -> /etc/ssl/private/ssl-cert-snakeoil.key
                                        -> /etc/letsencrypt/live/<host>/{fullchain,privkey}.pem   (after certbot)
```

`install.sh tls-snakeoil` creates the bootstrap links; `install.sh tls-letsencrypt <host> <email>` obtains the Let's
Encrypt certificate and swings the links, then `nginx -t` + reload. No OCSP stapling (it would be an outbound call that
fails during a cutoff).

## Per host

| Host | When | Method |
|---|---|---|
| `new.ahanassa.ir` | P1, after the owner creates its Arvan record (origin iransrv, HTTPS 443, Host passthrough) | **HTTP-01, webroot.** Let's Encrypt resolves the name to Arvan; Arvan forwards `/.well-known/acme-challenge/` to the origin on port 80 (open to Arvan only); nginx serves it from `/var/lib/ahanassa-acme`. Requirement: Arvan must not force-redirect HTTP→HTTPS **for that path** before the origin, or must follow the origin's port-80 answer. If Arvan's "HTTPS redirect" is on for the whole domain, turn it off for `new.` while issuing, or use the DNS-01 route below. |
| `staging.ahanassa.ir` | P1, same as above | HTTP-01 |
| `www.ahanassa.ir`, `ahanassa.ir` | **LATER — owner decision, not now** (RUNBOOK_P1.md §10) | HTTP-01 cannot work while Arvan sends these names to www.ahanassa.com. Two options, decided at switch time from A1: **(a)** Arvan does not verify origin certificates → switch with the snakeoil pair, then issue HTTP-01 through Arvan the same hour and swing the links; **(b)** Arvan verifies → issue once **before** the switch by DNS-01 (`certbot certonly --manual --preferred-challenges dns -d www.ahanassa.ir -d ahanassa.ir`, the owner adds the `_acme-challenge` TXT record in Arvan DNS), then renewals use HTTP-01 through Arvan after the switch (`certbot reconfigure --webroot -w /var/lib/ahanassa-acme`). |

## Renewal and the cutoff

- certbot's systemd timer renews at 30 days before expiry; the deploy hook runs `nginx -t && systemctl reload nginx`.
- During an international cutoff renewal fails (Let's Encrypt is abroad). A 90-day certificate renewed at day 60
  survives a cutoff of up to ~30 days with no action; certbot keeps retrying twice a day and succeeds when the link
  returns. If a cutoff runs longer, the fallback is option (a): Arvan → origin with the snakeoil pair (only if Arvan
  does not verify, A1).
- The `W29 §3.7` health timer (P2) alerts at 14 days to expiry; in P1 the operator checks with
  `openssl x509 -enddate -noout -in /etc/ahanassa/tls/new.ahanassa.ir/fullchain.pem`.
