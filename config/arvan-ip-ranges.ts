/**
 * W27 Iran mirror — ArvanCloud CDN edge ranges (owner, 2026-10-22: www.ahanassa.ir, ahanassa.ir and api.ahanassa.ir
 * are ArvanCloud CDN hostnames whose origins are www.ahanassa.com / api.ahanassa.com). A request that comes through
 * Arvan reaches Cloudflare from an Arvan edge IP, so CF-Connecting-IP is that edge, not the visitor. Arvan passes the
 * visitor's address in a request header; lib/security/rate-limit.ts uses it ONLY when CF-Connecting-IP is inside
 * one of the ranges below — from any other address the header is ignored (anyone can send it).
 *
 * Sources (official ArvanCloud, read 2026-10-22):
 *   - Header: "Headers Sent by CDN to User and Origin Server", https://docs.arvancloud.ir/en/cdn/headers/ — section
 *     "Headers Sent to Origin Server": "X-Real-IP … the CDN server uses this HTTP header to send the user's real IP
 *     to the origin server". (X-Forwarded-For is also sent but is a list that includes proxies — not used.)
 *   - Ranges: https://www.arvancloud.ir/en/ips.txt (linked as "IP Ranges Arvancloud" in the docs footer; the fa list
 *     https://www.arvancloud.ir/fa/ips.txt is byte-identical). Fetched 2026-10-22, 14 IPv4 CIDRs, no IPv6,
 *     sha256 7357e3c11af8073d5a8c147c704e2c5a816a6c2cc4046918b00e5986e98e9967.
 *
 * Keeping it current: Arvan changes this list rarely and without notice. Re-fetch it when the mirror is touched, and
 * on a change update ARVAN_IP_RANGES + the date/hash above in one commit (a deploy of the RFQ Worker picks it up).
 * A stale list fails safe: a new Arvan edge is then simply treated like any other client (rate limit per edge IP).
 */
export const ARVAN_CLIENT_IP_HEADER = "x-real-ip";

export const ARVAN_IP_RANGES_SOURCE = "https://www.arvancloud.ir/en/ips.txt";
export const ARVAN_IP_RANGES_FETCHED = "2026-10-22";

export const ARVAN_IP_RANGES: readonly string[] = [
  "185.143.232.0/22",
  "188.229.116.16/30",
  "94.101.182.0/27",
  "2.144.3.128/28",
  "37.32.16.0/27",
  "37.32.17.0/27",
  "37.32.18.0/27",
  "37.32.19.0/27",
  "185.215.232.0/22",
  "178.131.120.48/28",
  "94.101.183.0/28",
  "78.157.36.112/28",
  "95.38.61.80/28",
  "193.24.119.0/29",
];
