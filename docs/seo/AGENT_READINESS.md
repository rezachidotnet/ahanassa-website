# Agent readiness (W16.7)

Cloudflare's "Agent Readiness" checks (3/5 before this change) ask for content signals, `llms.txt` and Markdown on request. The zone is on Cloudflare Free, which has no "Markdown for Agents" conversion, so the static build makes the Markdown itself. The static Worker stays assets-only (architecture V1.1 A4).

| What | Where |
|---|---|
| `Content-Signal: search=yes, ai-input=yes, ai-train=yes` (owner decision: allow all three) in every robots.txt group and as a response header on every path | `lib/static/static-rules.ts` (`CONTENT_SIGNAL`) |
| `X.md` next to every page `X.html` (home `/index.md`): the page's `<main>` as Markdown, with title, canonical URL and language in front matter. Served as `text/markdown; charset=utf-8`, `X-Robots-Tag: noindex` on production (the HTML page is the indexed URL) | `lib/static/markdown-mirror.ts`, `lib/static/agent-files.ts` |
| `/llms.txt` (llmstxt.org) and `/llms-full.txt` (llms.txt plus every English page as Markdown). Built from the pages the artifact contains and from `lib/content/company.ts`. No date, amount, factory or price source | `lib/static/llms-txt.ts` |
| `Vary: Accept` on every response | `_headers` `/*` |
| `Accept: text/markdown` on `/about` → `/about.md`: two Rewrite URL rules in the Cloudflare dashboard, listed in `MARKDOWN_REWRITE_RULES`. `scripts/static/serve.ts` applies the same mapping locally | dashboard (owner) |

**Price rules.** The Markdown is built only from the page's rendered visible text, so it follows the same per-language rules as the HTML (D-PRICE-DISPLAY). The artifact gate enforces this:
- every word of a `.md` file must appear on its HTML page (`checkMarkdownMirrors`);
- `llms*.txt` and the en `.md` files contain no snapshot price amount, factory or place;
- the ar `.md` files contain no factory or place (`checkAgentTexts`);
- the leak, publication, price, article and source-name scans read `.md` files too.

Tests: `lib/static/agent-readiness-w167.test.ts`.
