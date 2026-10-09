import Link from "@/components/ui/link";
import { localizedPath } from "@/config/locales";
import { cardVariants } from "@/components/ui/surface-variants";
import { ARTICLE_COPY, formatArticleDate } from "@/lib/articles/copy";
import { categoryLabel, type ArticleSummary } from "@/lib/articles/repository";
import { ARTICLE_COVER_SIZE, ARTICLE_TEXT_ATTRIBUTE, articleCoverPath, articlePath } from "@/lib/articles/routes";

/**
 * W11.1 — one article in a listing or "related articles": the WebP cover (decorative — the title is the
 * link text), category, title, description, date and reading time. Never a price.
 */
export function ArticleCard({ article, headingLevel = 2 }: { article: ArticleSummary; headingLevel?: 2 | 3 }) {
  const t = ARTICLE_COPY[article.locale];
  const Heading = headingLevel === 2 ? "h2" : "h3";
  return (
    <Link href={localizedPath(article.locale, articlePath(article.slug))} className={cardVariants({ variant: "interactive", className: "group h-full w-full" })}>
      <img src={articleCoverPath(article.locale, article.slug, "webp")} alt="" width={ARTICLE_COVER_SIZE.width} height={ARTICLE_COVER_SIZE.height} loading="lazy" decoding="async" className="bg-navy aspect-[1200/630] h-auto w-full object-cover" />
      <div className="flex flex-1 flex-col gap-3 p-5">
        <p className="text-copper text-xs font-bold">{categoryLabel(article.category, article.locale)}</p>
        <Heading {...{ [ARTICLE_TEXT_ATTRIBUTE]: "title" }} className="text-navy group-hover:text-copper text-lg leading-snug font-bold transition-colors">
          {article.title}
        </Heading>
        <p {...{ [ARTICLE_TEXT_ATTRIBUTE]: "description" }} className="text-muted-foreground line-clamp-3 flex-1 text-sm leading-relaxed">
          {article.description}
        </p>
        <p className="text-tertiary border-border mt-auto flex flex-wrap gap-x-3 gap-y-1 border-t pt-3 text-xs font-semibold">
          <time dateTime={article.date}>{formatArticleDate(article.date, article.locale)}</time>
          <span aria-hidden="true">·</span>
          <span>{t.minutes(article.readingMinutes)}</span>
        </p>
      </div>
    </Link>
  );
}
