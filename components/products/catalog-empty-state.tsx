import Link from "next/link";
import { localizedPath, type Locale } from "@/config/locales";
import { buttonVariants } from "@/components/ui/button";

const preparingCopy: Record<Locale, { title: string; body: string; cta: string }> = {
  fa: {
    title: "کاتالوگ آنلاین در حال آماده‌سازی است.",
    body: "محصولات واقعی از سامانه محصولات آهن آسا همگام‌سازی شده‌اند و در حال بازبینی ویرایشی‌اند؛ به‌محض تأیید هر گروه کالایی، در همین صفحه منتشر می‌شود. برای بررسی نیاز خود همین حالا فاکتور یا لیست خرید بفرستید.",
    cta: "ارسال فاکتور یا لیست خرید",
  },
  en: {
    title: "The online catalog is being prepared.",
    body: "Real products are already synchronized from Ahan Asa's product system and are under editorial review; each product group appears here as soon as it is approved. Send your invoice or purchase list now and we will review it directly.",
    cta: "Send invoice or purchase list",
  },
  ar: {
    title: "الكتالوج الإلكتروني قيد الإعداد.",
    body: "تمت مزامنة المنتجات الحقيقية من نظام منتجات آهن آسا وهي قيد المراجعة التحريرية؛ تُنشر كل مجموعة منتجات هنا فور اعتمادها. أرسل فاتورتك أو قائمة الشراء الآن وسنراجعها مباشرة.",
    cta: "إرسال الفاتورة أو قائمة الشراء",
  },
};

/**
 * Wording for a filtered-to-zero result — distinct from the global
 * "catalog is being prepared" state (Go-Live Readiness catalog-filter
 * audit). A visitor who reached this via a valid-but-unpublished filter
 * combination (constructed manually, or a stale link) should never read
 * this as a technical failure — the catalog itself works; this exact
 * combination simply has no published product behind it yet.
 */
const noFilterMatchCopy: Record<Locale, { title: string; body: string; cta: string; clear: string }> = {
  fa: {
    title: "در حال حاضر محصول منتشرشده‌ای با این مشخصات وجود ندارد.",
    body: "می‌توانید فیلترها را تغییر دهید یا برای بررسی نیاز خود، فاکتور یا لیست خرید بفرستید.",
    cta: "ارسال فاکتور یا لیست خرید",
    clear: "پاک کردن فیلترها",
  },
  en: {
    title: "There is currently no published product matching these filters.",
    body: "You can change the filters, or send your invoice or purchase list and we will review it directly.",
    cta: "Send invoice or purchase list",
    clear: "Clear filters",
  },
  ar: {
    title: "لا يوجد حاليًا منتج منشور يطابق هذه الفلاتر.",
    body: "يمكنك تغيير الفلاتر، أو إرسال فاتورتك أو قائمة الشراء وسنراجعها مباشرة.",
    cta: "إرسال الفاتورة أو قائمة الشراء",
    clear: "مسح الفلاتر",
  },
};

/**
 * The catalog listing's zero-result state — two distinct causes, two
 * distinct messages (Go-Live Readiness catalog-filter audit):
 *
 * - `"catalog-preparing"` — DB_PUBLIC has real, synced commercial data but
 *   (by design, see docs/CATALOG_EDITORIAL_PUBLICATION.md) no editorially
 *   approved/published content matches at all, with no filter active.
 *   Never replaced with fake/sample products to "look populated" (CLAUDE.md
 *   §11).
 * - `"no-filter-match"` — at least one template IS published, but the
 *   visitor's specific filter combination has no published template behind
 *   it. Must never read as a technical Catalog failure — offers a way back
 *   to the unfiltered listing.
 */
export function CatalogEmptyState({ locale, variant = "catalog-preparing" }: { locale: Locale; variant?: "catalog-preparing" | "no-filter-match" }) {
  if (variant === "no-filter-match") {
    const t = noFilterMatchCopy[locale];
    return (
      <div className="container-x py-16 text-center lg:py-24">
        <p className="text-navy mx-auto max-w-xl text-xl font-bold">{t.title}</p>
        <p className="text-muted-foreground mx-auto mt-4 max-w-xl text-sm leading-relaxed">{t.body}</p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Link href={localizedPath(locale, "/products")} className={buttonVariants({ variant: "outline", size: "lg" })}>
            {t.clear}
          </Link>
          <Link href={localizedPath(locale, "/contact")} className={buttonVariants({ variant: "default", size: "lg" })}>
            {t.cta}
          </Link>
        </div>
      </div>
    );
  }

  const t = preparingCopy[locale];
  return (
    <div className="container-x py-16 text-center lg:py-24">
      <p className="text-navy mx-auto max-w-xl text-xl font-bold">{t.title}</p>
      <p className="text-muted-foreground mx-auto mt-4 max-w-xl text-sm leading-relaxed">{t.body}</p>
      <Link href={localizedPath(locale, "/contact")} className={buttonVariants({ variant: "default", size: "lg", className: "mt-8" })}>
        {t.cta}
      </Link>
    </div>
  );
}
