# Email setup (W19.1)

Status 2026-10-16. Contains no secrets. The company Gmail inbox is called "the company Gmail" here; its address is kept with the owner, not in this public repository.

## Owner decisions

- Marketing mail is sent only from the separate domain **ahanassaa.com**, so that a deliverability problem can never hurt **ahanassa.com** (website, RFQ, sales@).
- **Resend** only delivers mail. **Odoo** manages contacts, lists and unsubscribes (later step).
- Emails are **plain text**, with **no promotional wording** and **no open/click tracking**.
- Marketing sender: `Ahan Asa | آهن آسا <sales@ahanassaa.com>`, Reply-To `sales@ahanassa.com`. There is no news@ or reply@ address.
- 1:1 sales mail is sent from Gmail as `sales@ahanassa.com` through Resend, so it passes the strict DMARC on ahanassa.com.

## ahanassa.com (main domain, Cloudflare zone)

| Type | Name | Value | Proxy | Note |
| --- | --- | --- | --- | --- |
| TXT | `@` | `v=spf1 include:_spf.mx.cloudflare.net include:_spf.google.com ~all` | DNS only | The only SPF record (was `v=spf1 -all`) |
| MX | `@` | `route1/2/3.mx.cloudflare.net` (Cloudflare-assigned priorities) | DNS only | Email Routing |
| TXT | `cf2024-1._domainkey` | Cloudflare Email Routing DKIM key | DNS only | Email Routing |
| TXT | `_dmarc` | `v=DMARC1; p=reject; sp=reject; adkim=s; aspf=s;` | DNS only | Existed before W19.1; left unchanged |
| TXT | `*._domainkey` | `v=DKIM1; p=` | DNS only | Existed before; null wildcard DKIM key |

Email Routing (enabled): `sales@ahanassa.com` → the company Gmail. All other addresses: drop (Cloudflare default, catch-all disabled).

Resend (1:1 send-as, region eu-west-1, verified, tracking off):

| Type | Name | Value | Proxy |
| --- | --- | --- | --- |
| TXT | `resend._domainkey` | Resend DKIM public key (overrides the `*._domainkey` null key for this selector) | DNS only |
| MX | `send` | `10 feedback-smtp.eu-west-1.amazonses.com` | DNS only |
| TXT | `send` | `v=spf1 include:amazonses.com ~all` | DNS only |
| CNAME | `rsend` | `send.forge.rmta.net` | DNS only |

Resend API key `gmail-sendas`: sending access, restricted to ahanassa.com, kept only in the owner secrets folder.

Strict DMARC (`p=reject`, `adkim=s`, `aspf=s`) stays. Mail sent through Resend passes because the DKIM signature is `d=ahanassa.com` (strictly aligned); SPF passes on `send.ahanassa.com`, which is not strictly aligned, and DMARC needs only one aligned pass. Never send as @ahanassa.com through Gmail's own SMTP (smtp.gmail.com): it signs with `gmail.com` and would be rejected.

### Gmail "Send mail as" sales@ahanassa.com

Gmail → Settings → Accounts → Send mail as → Add another email address: name `Ahan Asa | آهن آسا`, address `sales@ahanassa.com`, untick "Treat as an alias". SMTP server `smtp.resend.com`, port `587`, username `resend`, password = the `gmail-sendas` key, "Secured connection using TLS". Gmail sends a confirmation code to sales@ahanassa.com, which Email Routing forwards back to the same inbox.

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

Email Routing (enabled): `sales@ahanassaa.com` → the company Gmail. It catches bounces and any replies sent to the marketing From address. No news@ or reply@.

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
- Sender `Ahan Asa | آهن آسا <sales@ahanassaa.com>`, Reply-To `sales@ahanassa.com`. Never send marketing from `@ahanassa.com`; that domain is for 1:1 mail only.

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

Odoo handles contacts, mailing lists, unsubscribes and the List-Unsubscribe headers. Resend only delivers. Set the mailing "From" to `Ahan Asa | آهن آسا <sales@ahanassaa.com>` and Reply-To to `sales@ahanassa.com`, and use plain-text mailings.

## Verification (2026-10-16, Gmail "Show original")

| Test | From | SPF | DKIM | DMARC |
| --- | --- | --- | --- | --- |
| 1 marketing domain | `sales@ahanassaa.com` (Resend ap-northeast-1) | pass (`rsend.ahanassaa.com`) | pass `d=ahanassaa.com s=resend` | pass (p=NONE) |
| 2 send-as path | `sales@ahanassa.com` (Resend eu-west-1) | pass (`send.ahanassa.com`) | pass `d=ahanassa.com s=resend` | pass (p=REJECT) |

Both arrived over TLS 1.3 as `text/plain; charset=utf-8`, with no tracking links or pixels. Test 2 passes the strict DMARC through the aligned DKIM signature.

## Open items

- DMARC on ahanassaa.com: move to `p=quarantine` after two clean weeks (see plan above).
- Delete the temporary setup credentials (the setup Resend key and the Cloudflare API token used for W19.1).
