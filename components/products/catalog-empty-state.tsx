import Link from "next/link";
import { localizedPath, type Locale } from "@/config/locales";
import { buttonVariants } from "@/components/ui/button";

const copy: Record<Locale, { title: string; body: string; cta: string }> = {
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
 * The catalog listing/detail's legitimate zero-result state — DB_PUBLIC
 * currently has real, synced commercial data but (by design, see
 * docs/CATALOG_EDITORIAL_PUBLICATION.md) no editorially-approved/published
 * content yet. Never replaced with fake/sample products to "look populated"
 * (CLAUDE.md §11, this task's own "Stage M" boundary).
 */
export function CatalogEmptyState({ locale }: { locale: Locale }) {
  const t = copy[locale];
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
