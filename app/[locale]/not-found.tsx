/**
 * not-found.tsx does not reliably receive the [locale] route param, so this
 * renders all three locales together rather than guessing one.
 *
 * Keep this markup short: it is serialized into every page's RSC payload,
 * and a longer row moves React Flight's lazy-chunk split point differently
 * in the staging and production artifacts (r4 target-diff gate; W10.2 hit
 * this with the full Button class string). A plain link with a 44px target.
 */
export default function LocaleNotFound() {
  return (
    <div className="mx-auto max-w-[var(--aa-reading-max)] px-[var(--aa-page-gutter)] py-24 text-center">
      <p dir="rtl" lang="fa" className="text-[length:var(--aa-text-heading-md)] text-[var(--aa-color-text-brand)]">
        صفحه مورد نظر یافت نشد.
      </p>
      <p dir="ltr" lang="en" className="mt-3 text-[var(--aa-color-text-secondary)]">
        Page not found.
      </p>
      <p dir="rtl" lang="ar" className="mt-1 text-[var(--aa-color-text-secondary)]">
        الصفحة غير موجودة.
      </p>
      <a href="/" className="text-copper mt-4 inline-flex min-h-11 items-center underline">
        آهن آسا
      </a>
    </div>
  );
}
