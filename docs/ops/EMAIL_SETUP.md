# Email setup (W19.1)

Status 2026-10-16. Contains no secrets. The company Gmail inbox is called "the company Gmail" here; its address is kept with the owner, not in this public repository.

## Owner decisions

- Marketing mail is sent only from the separate domain **ahanassaa.com**, so that a deliverability problem can never hurt **ahanassa.com** (website, RFQ, sales@).
- **Resend** only delivers mail. **Odoo** manages contacts, lists and unsubscribes (later step).
- Emails are **plain text**, with **no promotional wording** and **no open/click tracking**.
- Sender: `Ahan Asa | آهن آسا <news@ahanassaa.com>`, Reply-To `reply@ahanassaa.com`.

## ahanassa.com (main domain, Cloudflare zone)

| Type | Name | Value | Proxy | Note |
| --- | --- | --- | --- | --- |
| TXT | `@` | `v=spf1 include:_spf.mx.cloudflare.net include:_spf.google.com ~all` | DNS only | The only SPF record (was `v=spf1 -all`) |
| MX | `@` | `route1/2/3.mx.cloudflare.net` (Cloudflare-assigned priorities) | DNS only | Email Routing |
| TXT | `cf2024-1._domainkey` | Cloudflare Email Routing DKIM key | DNS only | Email Routing |
| TXT | `_dmarc` | `v=DMARC1; p=reject; sp=reject; adkim=s; aspf=s;` | DNS only | Existed before W19.1; left unchanged |
| TXT | `*._domainkey` | `v=DKIM1; p=` | DNS only | Existed before; null wildcard DKIM key |

Email Routing: `sales@ahanassa.com` → the company Gmail. **Pending:** routing is not enabled yet and the rule does not exist yet (see "Open items").

Note on the strict DMARC: `p=reject` with strict alignment means mail that *claims* to be from `@ahanassa.com` but is sent through Gmail's own servers ("Send mail as" via smtp.gmail.com) will fail DMARC and be rejected. Receiving and forwarding are not affected. Before anyone sends *as* sales@ahanassa.com, either add an aligned DKIM-signing sender or relax DMARC — owner decision.

### Transform Rules → Rewrite URL (Markdown for agents, W16.7)

| # | Name | Expression | Path |
| --- | --- | --- | --- |
| 1 | Markdown for agents: home | `any(lower(http.request.headers["accept"][*])[*] contains "text/markdown") and http.request.uri.path eq "/"` | Static `/index.md` |
| 2 | Markdown for agents: pages | `any(lower(http.request.headers["accept"][*])[*] contains "text/markdown") and http.request.uri.path ne "/" and not ends_with(http.request.uri.path, "/") and not ends_with(http.request.uri.path, ".md") and not starts_with(http.request.uri.path, "/_next/") and not http.request.uri.path contains "."` | Dynamic `concat(http.request.uri.path, ".md")` |

Query string preserved on both. The expression in the W16.7 report (`any(lower(…[*]) contains …)`) is rejected by Cloudflare: `lower()` of a header array returns an array, so `contains` needs `[*]` after it. The live rules use the corrected form; `MARKDOWN_REWRITE_RULES` in `lib/static/markdown-mirror.ts` is updated to match.

Verified on production: `/about` with `Accept: text/markdown` returns `text/markdown` + `x-robots-tag: noindex`; a browser `Accept` header gets `text/html`; `/` with Markdown returns `/index.md`.

Bot settings (must stay **off**): Managed robots.txt, Block AI bots, Bot Fight Mode. The setup token cannot read these settings. Checked from outside instead: robots.txt has no Cloudflare-managed block, and GPTBot, ClaudeBot, CCBot, Bytespider and python-requests all get HTTP 200 on `/about`. Confirm in the dashboard (Security → Bots, AI Crawl Control).

## ahanassaa.com (marketing domain, Cloudflare zone)

| Type | Name | Value | Proxy | Purpose |
| --- | --- | --- | --- | --- |
| AAAA | `@` | `100::` | Proxied | Redirect placeholder |
| AAAA | `www` | `100::` | Proxied | Redirect placeholder |
| TXT | `resend._domainkey` | Resend DKIM public key | DNS only | Resend DKIM |
| CNAME | `send` | `send.forge.rmta.net` | DNS only | Resend return path / SPF |
| CNAME | `rsend` | `rsend-apne1.forge.rmta.net` | DNS only | Resend return path / SPF (region ap-northeast-1) |
| TXT | `@` | `v=spf1 include:_spf.mx.cloudflare.net ~all` | DNS only | The only SPF record (Email Routing) |
| MX | `@` | `route1/2/3.mx.cloudflare.net` | DNS only | Email Routing (replies) |
| TXT | `cf2024-1._domainkey` | Cloudflare Email Routing DKIM key | DNS only | Email Routing |
| TXT | `_dmarc` | `v=DMARC1; p=none; rua=mailto:sales@ahanassa.com` | DNS only | Monitoring |

Redirect rule (Rules → Redirect Rules): `(http.host in {"ahanassa.com" "www.ahanassa.com"})` → 301 to `concat("https://www.ahanassa.com", http.request.uri.path)`, query string preserved. Verified: `http://ahanassaa.com/` → `https://www.ahanassa.com/`, `https://ahanassaa.com/about?x=1` → `https://www.ahanassa.com/about?x=1`.

Resend: domain `ahanassaa.com`, region **ap-northeast-1** (it already existed there and was verified; the owner chose to keep it rather than delete it and re-create it in eu-west-1). Status **verified** (DKIM + SPF). Open tracking **off**, click tracking **off**.

Email Routing: `news@ahanassaa.com` and `reply@ahanassaa.com` → the company Gmail. **Pending**, same as sales@.

Resend API key `odoo-smtp`: sending access, restricted to ahanassaa.com. Kept only in the server secrets file, never in the repository.

### DMARC plan (not done yet)

After **two clean weeks** at `p=none` — that is, no aggregate reports at `sales@ahanassa.com` showing SPF or DKIM failures from Resend or any unknown sender — change `_dmarc.ahanassaa.com` to:

```
v=DMARC1; p=quarantine; rua=mailto:sales@ahanassa.com
```

The earliest date is two weeks after the first real send. Later, if reports stay clean, consider `p=reject`.

## Content rules for every email

- **Plain text only** (`text/plain; charset=utf-8`). No HTML, no images, no tracking pixels, no link redirection.
- **No promotional wording**: no "special offer", "discount", "limited time", "free", "buy now", exclamation marks, all caps or emoji. Write it as a professional procurement update (for example, a price-update notice or a reply to an RFQ).
- Prices only as the site presents them: qualified and dated, never a ticker.
- Links go straight to `https://www.ahanassa.com/...` (no shorteners, no redirect domains).
- Every bulk mail carries one-click unsubscribe (see below) plus a visible unsubscribe line at the end of the text.
- Sender `Ahan Asa | آهن آسا <news@ahanassaa.com>`, Reply-To `reply@ahanassaa.com`. Never send marketing from `@ahanassa.com`.

## Gmail / Yahoo bulk-sender requirements

These apply once we send 5,000 or more messages a day to Gmail. Meet them from the first send anyway.

1. SPF **and** DKIM pass for the sending domain, and **DMARC** exists (`p=none` is enough) with the From domain aligned. Resend's DKIM on ahanassaa.com provides the alignment.
2. **One-click unsubscribe** (RFC 8058) on every marketing message:
   `List-Unsubscribe: <https://…unsubscribe-url…>, <mailto:…>` and `List-Unsubscribe-Post: List-Unsubscribe=One-Click`. Honour every unsubscribe within **2 days**. Odoo must add these headers and process the request.
3. **Spam rate** in Google Postmaster Tools below **0.10 %**, and never at or above **0.30 %**. Register ahanassaa.com in Postmaster Tools.
4. TLS for transmission, valid forward and reverse DNS for the sending IPs, RFC 5322-formatted messages. Resend covers the infrastructure side.
5. Send only to people who asked for it; no purchased lists. Start with small volumes and increase gradually, because the domain is new.

## Next step: Odoo

Settings → Technical → Outgoing Mail Servers → new:

| Field | Value |
| --- | --- |
| SMTP server | `smtp.resend.com` |
| Port | `587` |
| Connection security | `STARTTLS` |
| Authentication | Username / password |
| Username | `resend` |
| Password | the `odoo-smtp` key from the server secrets file |
| FROM filtering | `ahanassaa.com` |

Odoo handles contacts, mailing lists, unsubscribes and the List-Unsubscribe headers. Resend only delivers. Set the mailing "From" to `Ahan Asa | آهن آسا <news@ahanassaa.com>` and Reply-To to `reply@ahanassaa.com`, and use plain-text mailings.

## Open items

- Enable Email Routing on both zones and create the rules: `sales@ahanassa.com`, `news@ahanassaa.com` and `reply@ahanassaa.com` → the company Gmail. The W19.1 setup token was refused (authentication error) on the enable call; it needs **Zone → Email Routing Rules: Edit**, or you can enable it in the dashboard. The MX, SPF and DKIM records are already in place, so the dashboard will not need to add records.
- One plain-text test email from news@ahanassaa.com to the company Gmail, then check SPF, DKIM and DMARC = pass in the headers.
- The strict DMARC decision on ahanassa.com, if the team wants to send *as* sales@ from Gmail.
