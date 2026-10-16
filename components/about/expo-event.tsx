import Image from "@/components/ui/image";
import type { Locale } from "@/config/locales";
import { ABOUT_EVENTS_ANCHOR, ABOUT_EVENTS_COPY, EXPO_1405, EXPO_1405_MEDIA } from "@/lib/content/about-events";
import { variantPath } from "@/lib/media/image-sources";
import { cn } from "@/lib/utils";

const FIGURE = "overflow-hidden rounded-[var(--aa-radius-card)] border border-border bg-background shadow-[var(--aa-shadow-xs)]";
const CAPTION = "text-muted-foreground border-border border-t px-4 py-3 text-xs leading-relaxed";

/**
 * W20.2 — «رویدادها»: Isfahan Buildexpo 1405. The poster (organiser's phone row removed) and the closing photo go
 * through the image pipeline (gallery role, lazy, explicit width/height); the farewell video is click-to-play with
 * native controls, preload="none" and no autoplay, its poster frame the pipeline's 640w WebP. Every box has its
 * size before load (no layout shift).
 */
export function ExpoEvent({ locale }: { locale: Locale }) {
  const t = ABOUT_EVENTS_COPY[locale];
  const { poster, closing, video } = EXPO_1405_MEDIA;
  return (
    <section id={ABOUT_EVENTS_ANCHOR} aria-labelledby="about-events" className="border-border bg-background scroll-mt-24 border-b section-y">
      <div className="container-x">
        <h2 id="about-events" className="text-navy text-2xl font-extrabold">
          {t.title}
        </h2>
        <article aria-labelledby="about-events-expo" className="mt-8 grid gap-6 lg:grid-cols-12 lg:items-start">
          <div className="space-y-6 lg:col-span-5">
            <div>
              <h3 id="about-events-expo" className="text-navy text-xl leading-snug font-extrabold">
                {EXPO_1405.name[locale]}
              </h3>
              <p className="text-muted-foreground mt-3 leading-relaxed">{t.lead}</p>
              <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-1">
                <div className="bg-surface rounded-[var(--aa-radius-card)] p-4">
                  <dt className="text-tertiary text-xs font-semibold">{t.datesLabel}</dt>
                  <dd className="text-navy mt-1 font-bold">
                    <time dateTime={`${EXPO_1405.startDate}/${EXPO_1405.endDate}`}>{EXPO_1405.dates[locale]}</time>
                  </dd>
                </div>
                <div className="bg-surface rounded-[var(--aa-radius-card)] p-4">
                  <dt className="text-tertiary text-xs font-semibold">{t.venueLabel}</dt>
                  <dd className="text-navy mt-1 font-bold">{EXPO_1405.venue[locale]}</dd>
                </div>
              </dl>
            </div>
            <figure className={FIGURE}>
              <Image src={closing.src} width={closing.width} height={closing.height} alt={t.closingAlt} sizes="(min-width: 1024px) 40vw, 100vw" className="h-auto w-full" />
              <figcaption className={CAPTION}>{t.closingCaption}</figcaption>
            </figure>
          </div>
          <div className="grid gap-6 sm:grid-cols-[4fr_3fr] sm:items-start lg:col-span-7">
            <figure className={FIGURE}>
              <Image src={poster.src} width={poster.width} height={poster.height} alt={t.posterAlt} sizes="(min-width: 1024px) 32vw, (min-width: 640px) 55vw, 100vw" className="h-auto w-full" />
              <figcaption className={CAPTION}>{t.posterCaption}</figcaption>
            </figure>
            <figure className={cn(FIGURE, "mx-auto w-full max-w-xs sm:max-w-none")}>
              <video
                controls
                preload="none"
                playsInline
                width={video.width}
                height={video.height}
                poster={variantPath(video.posterFrame, 640, "webp")}
                aria-label={t.videoTitle}
                className="bg-navy block aspect-[9/16] h-auto w-full"
              >
                <source src={video.hls} type={video.hlsType} />
                <source src={video.src} type={video.type} />
                {t.videoFallback}
              </video>
              <figcaption className={CAPTION}>{t.videoCaption}</figcaption>
            </figure>
          </div>
        </article>
      </div>
    </section>
  );
}
