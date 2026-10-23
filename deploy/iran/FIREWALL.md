# iransrv firewall — notes for the domestic copy (W30 / W29 P1)

**Nothing in P1 changes the firewall.** The rules below are already in place (ops session 2026-10-22,
`~/claude-reports/iran-ops/CHANGES_20261022.md` step 5) and are exactly what P1 needs.

## 1. What is in place (ufw, verified 2026-10-22)

| Direction | Rule | Why it is enough for P1 |
|---|---|---|
| in 22/tcp | from the two admin hosts (sipsrv, newsrv) only | operator / agent SSH (root by key, host lock) |
| in 80,443/tcp | from the **14 Arvan IPv4 ranges** only (`/etc/ufw/arvan-edge-v4.txt`) | every visitor of `new.` / `staging.` (and later `www.`) `ahanassa.ir` arrives through Arvan's edge |
| in IPv6 | INPUT policy DROP, no ACCEPT | Arvan publishes no IPv6 ranges, so 80/443 on IPv6 stay closed |
| out | default allow | the sync agent needs `api.github.com` + the Azure blob host (IPv4 only — no AAAA) and the R2 S3 endpoint (IPv4 + IPv6) |

nginx listens on 0.0.0.0:80/443 and [::]:80/443, but the firewall decides who reaches it. The default server
(`sites/00-ahanassa-default.conf`) answers no unknown Host (444 / TLS handshake rejected). `set_real_ip_from` trusts
`X-Real-IP` only from the same 14 ranges (`snippets/ahanassa-arvan-real-ip.conf`, generated from
`config/arvan-ip-ranges.ts`; a test keeps them equal).

Loopback is not filtered: the activator's smoke test (`curl --resolve <host>:443:127.0.0.1`) needs it.

## 2. Optional egress tightening (not needed for P1; propose separately)

The sync agent is the only P1 process that talks to the internet. To pin it to what it needs, an nftables table
keyed on its uid (ufw does not match on uid):

```nft
table inet ahanassa_egress {
  chain out {
    type filter hook output priority 0; policy accept;
    meta skuid "ahanassa-sync" tcp dport 443 accept     # GitHub, Azure blob, R2, Arvan S3 — all HTTPS
    meta skuid "ahanassa-sync" udp dport 53 accept      # DNS via systemd-resolved stub is loopback anyway
    meta skuid "ahanassa-sync" oifname != "lo" drop
  }
}
```

This does not restrict *which* HTTPS hosts (their IPs change); the signature check is what makes a wrong host harmless.

## 3. When Arvan's edge list changes

`ahanassa-arvan-check.timer` (weekly, Sunday 09:00 Tehran) compares `https://www.arvancloud.ir/en/ips.txt` with
`/etc/ufw/arvan-edge-v4.txt` and **alerts only**. It never edits ufw or nginx, because a wrong list takes the site
down. On an alert, the operator (owner OK, host lock):

1. compares the two lists by hand and checks the change on Arvan's own docs page;
2. updates `/etc/ufw/arvan-edge-v4.txt` + the ufw rules (add new ranges first, remove old ones after 24 h);
3. updates `config/arvan-ip-ranges.ts` in a PR (date + sha256), which regenerates
   `deploy/iran/nginx/snippets/ahanassa-arvan-real-ip.conf` (`node scripts/iran/render-nginx.ts --arvan-real-ip <file>`),
   and reinstalls it with `install.sh nginx`.

## 4. Drill rules (RUNBOOK_P1.md §8) — temporary, with a dead-man's switch

Every drill table is removed automatically after 15 minutes even if the session is lost:

```bash
systemd-run --on-active=15min --unit=w30-drill-undo nft delete table inet w30drill
```

- **GitHub filtered (IPv4 cut for the agent only):** `meta skuid "ahanassa-sync" meta nfproto ipv4 drop`. GitHub and
  Azure have no IPv6, so the GitHub source fails; R2 still answers over IPv6 — the mirror path is proven.
- **All sources cut (agent only):** `meta skuid "ahanassa-sync" oifname != "lo" drop`.
- **Full international cutoff (whole server):** output `ct state established,related accept; oifname "lo" accept;
  drop`. Established inbound connections (Arvan → nginx, the operator's SSH) keep working; nothing new leaves the box.
