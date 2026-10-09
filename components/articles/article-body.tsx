import type { ReactNode } from "react";
import Link from "@/components/ui/link";
import { inlineText, type Block, type Inline } from "@/lib/articles/markdown";
import { ARTICLE_TEXT_ATTRIBUTE } from "@/lib/articles/routes";

/**
 * W11.1 — renders a parsed article body (lib/articles/markdown.ts) as React elements: no HTML string from
 * the article is ever injected. Internal links are plain <a> (components/ui/link.tsx); external links
 * open in a new tab with rel="nofollow noopener noreferrer". The whole body is an article-text region
 * (ARTICLE_TEXT_ATTRIBUTE) for the price gate.
 */
const EXTERNAL = /^https?:\/\/(?!(?:www\.)?ahanassa\.com(?:\/|$))/i;

function renderInline(nodes: readonly Inline[], key = ""): ReactNode[] {
  return nodes.map((n, i) => {
    const k = `${key}${i}`;
    switch (n.t) {
      case "text":
        return n.v;
      case "strong":
        return (
          <strong key={k} className="text-navy font-bold">
            {renderInline(n.c, `${k}-`)}
          </strong>
        );
      case "em":
        return <em key={k}>{renderInline(n.c, `${k}-`)}</em>;
      case "code":
        return (
          <code key={k} dir="ltr" className="bg-surface rounded px-1 py-0.5 text-[0.9em]">
            {n.v}
          </code>
        );
      case "link": {
        const className = "text-copper font-semibold underline underline-offset-4 hover:text-navy";
        const href = n.href.replace(/^https?:\/\/(?:www\.)?ahanassa\.com(?=\/)/i, "");
        return EXTERNAL.test(n.href) ? (
          <a key={k} href={n.href} target="_blank" rel="nofollow noopener noreferrer" className={className}>
            {renderInline(n.c, `${k}-`)}
          </a>
        ) : (
          <Link key={k} href={href} className={className}>
            {renderInline(n.c, `${k}-`)}
          </Link>
        );
      }
    }
  });
}

const ALIGN = { start: "text-start", center: "text-center", end: "text-end" } as const;

function renderBlock(b: Block, i: number): ReactNode {
  switch (b.t) {
    case "heading": {
      const content = renderInline(b.c);
      if (b.level === 2)
        return (
          <h2 key={i} id={b.id} className="text-navy mt-12 scroll-mt-28 text-2xl font-extrabold first:mt-0">
            {content}
          </h2>
        );
      if (b.level === 3)
        return (
          <h3 key={i} id={b.id} className="text-navy mt-8 scroll-mt-28 text-xl font-bold">
            {content}
          </h3>
        );
      return (
        <h4 key={i} id={b.id} className="text-navy mt-6 scroll-mt-28 text-lg font-bold">
          {content}
        </h4>
      );
    }
    case "p":
      return (
        <p key={i} className="mt-5 leading-[1.95] text-neutral-800">
          {renderInline(b.c)}
        </p>
      );
    case "list": {
      const items = b.items.map((item, j) => (
        <li key={j} className="ps-1 leading-[1.9]">
          {renderInline(item)}
        </li>
      ));
      return b.ordered ? (
        <ol key={i} start={b.start} className="mt-5 list-decimal space-y-2 ps-6 text-neutral-800 marker:text-copper marker:font-bold">
          {items}
        </ol>
      ) : (
        <ul key={i} className="mt-5 list-disc space-y-2 ps-6 text-neutral-800 marker:text-copper">
          {items}
        </ul>
      );
    }
    case "table":
      return (
        // Scroll region like the product tables: focusable for keyboard scrolling, never widens the page.
        <div key={i} role="region" tabIndex={0} aria-label={b.head.map(inlineText).join(" · ")} className="border-border mt-6 overflow-x-auto rounded-[var(--aa-radius-card)] border">
          <table className="text-ui w-full border-separate border-spacing-0 text-sm">
            <thead>
              <tr>
                {b.head.map((h, j) => (
                  <th key={j} scope="col" className={`border-border bg-surface text-navy border-b px-4 py-3 font-bold whitespace-nowrap ${ALIGN[b.align[j] ?? "start"]}`}>
                    {renderInline(h)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {b.rows.map((row, r) => (
                <tr key={r}>
                  {row.map((cell, j) => (
                    <td key={j} className={`border-b border-[var(--aa-color-neutral-100)] px-4 py-2.5 text-neutral-800 ${ALIGN[b.align[j] ?? "start"]}`}>
                      {renderInline(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case "quote":
      return (
        <blockquote key={i} className="border-copper bg-surface mt-6 rounded-e-[var(--aa-radius-card)] border-s-4 px-5 py-1">
          {b.c.map(renderBlock)}
        </blockquote>
      );
    case "hr":
      return <hr key={i} className="border-border my-10" />;
  }
}

export function ArticleBody({ blocks }: { blocks: readonly Block[] }) {
  return (
    <div {...{ [ARTICLE_TEXT_ATTRIBUTE]: "body" }} className="text-[17px]">
      {blocks.map(renderBlock)}
    </div>
  );
}
