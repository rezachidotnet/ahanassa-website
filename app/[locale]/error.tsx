"use client";

/**
 * Route-level error boundary. Locale-neutral for the same reason as
 * not-found.tsx — error boundaries don't reliably receive route params.
 */
export default function LocaleError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto max-w-[var(--aa-reading-max)] px-[var(--aa-page-gutter)] py-24 text-center">
      <p dir="rtl" lang="fa" className="text-[length:var(--aa-text-heading-md)] text-[var(--aa-color-text-brand)]">
        خطایی رخ داد.
      </p>
      <p dir="ltr" lang="en" className="mt-3 text-[var(--aa-color-text-secondary)]">
        Something went wrong.
      </p>
      <p dir="rtl" lang="ar" className="mt-1 text-[var(--aa-color-text-secondary)]">
        حدث خطأ ما.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-6 rounded-[var(--aa-radius-sm)] bg-[var(--aa-color-action-primary-bg)] px-4 py-2 text-[var(--aa-color-text-inverse)]"
      >
        Retry
      </button>
    </div>
  );
}
