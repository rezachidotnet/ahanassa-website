import { siteHomepageUrl } from "@/lib/site";

export default function HomePage() {
  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "آهن آسا",
    url: siteHomepageUrl,
    inLanguage: "fa-IR",
  };

  return (
    <main className="site-shell">
      <div className="ambient-line ambient-line-top" aria-hidden="true" />
      <div className="ambient-line ambient-line-bottom" aria-hidden="true" />

      <section className="hero" aria-labelledby="page-title">
        <div className="brand-lockup">
          <span className="brand-mark" aria-hidden="true">
            آ
          </span>
          <p className="brand-name">آهن آسا</p>
        </div>

        <div className="hero-copy">
          <p className="eyebrow">آهن آسا</p>
          <h1 id="page-title">تأمین آهن‌آلات مطابق نیاز شما</h1>
          <p className="promise">ما مراقب سرمایه شما هستیم.</p>
        </div>

        <div className="status" role="status">
          <span className="status-dot" aria-hidden="true" />
          <p>وب‌سایت در دست طراحی است.</p>
        </div>
      </section>

      <footer className="site-footer">
        <p>آهن آسا</p>
        <p dir="ltr">www.ahanassa.com</p>
      </footer>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
      />
    </main>
  );
}
