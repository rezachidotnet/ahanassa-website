/**
 * not-found.tsx does not reliably receive the [locale] route param, so this
 * renders all three locales together rather than guessing one.
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
      <a href="/" className="mt-6 inline-block text-[var(--aa-color-text-accent)] underline">
        آهن آسا
      </a>
    </div>
  );
}
