import fs from "node:fs";
import path from "node:path";
import { htmlToMarkdown, markdownFileFor } from "./markdown-mirror.ts";
import { buildLlmsFullTxt, buildLlmsTxt, type LlmsPage } from "./llms-txt.ts";

/** The rendered H1 of a page, as plain text. */
export function pageH1(html: string): string {
  const inner = /<h1\b[^>]*>([\s\S]*?)<\/h1>/i.exec(html)?.[1] ?? "";
  return htmlToMarkdown(`<main><p>${inner}</p></main>`).split("\n---\n\n")[1]?.trim() ?? "";
}

/**
 * W16.7 build step (scripts/static/build.ts): the `.md` mirror of every public HTML page, then `/llms.txt` and
 * `/llms-full.txt`. Runs after the HTML is final; the artifact gate checks the output.
 */
export function writeAgentFiles(publicDir: string): { markdown: number; llmsBytes: number; llmsFullBytes: number } {
  const htmlFiles = (fs.readdirSync(publicDir, { recursive: true }) as string[]).map((f) => f.split(path.sep).join("/")).filter((f) => f.endsWith(".html")).sort();
  const pages: LlmsPage[] = [];
  let markdown = 0;
  for (const file of htmlFiles) {
    const md = markdownFileFor(file);
    if (!md) continue;
    const html = fs.readFileSync(path.join(publicDir, file), "utf8");
    fs.writeFileSync(path.join(publicDir, md), htmlToMarkdown(html));
    pages.push({ file, h1: pageH1(html) });
    markdown++;
  }
  const llms = buildLlmsTxt(pages);
  const full = buildLlmsFullTxt(llms, pages, (md) => (fs.existsSync(path.join(publicDir, md)) ? fs.readFileSync(path.join(publicDir, md), "utf8") : null));
  fs.writeFileSync(path.join(publicDir, "llms.txt"), llms);
  fs.writeFileSync(path.join(publicDir, "llms-full.txt"), full);
  return { markdown, llmsBytes: Buffer.byteLength(llms), llmsFullBytes: Buffer.byteLength(full) };
}
