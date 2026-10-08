/**
 * not-found.tsx does not reliably receive the [locale] route param, so this
 * renders all three locales together rather than guessing one.
 */
export default function LocaleNotFound() {
  return <NotFoundContent />;
}

/**
 * r4 isolation (same technique as TargetEnquiryForm in contact/page.tsx).
 * The not-found boundary is serialized into EVERY page's RSC payload, next to
 * the target-specific robots value, whose length differs between the staging
 * and production artifacts. React Flight splits a row into lazy chunks once
 * it passes ~3200 characters, so markup growth here moved that split point
 * differently in the two targets and failed the allowlisted-diff gate (W10.2,
 * en/services and products/category/angle). This async boundary always
 * suspends once, so React always emits the not-found tree in its own row:
 * its size can no longer shift the structure of the row that carries the
 * target-specific value.
 */
async function NotFoundContent() {
  await Promise.resolve();
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
