import { Clock, FileText, MessageCircle, Phone } from "lucide-react";
import type { ReactNode } from "react";
import type { Locale } from "@/config/locales";
import { WhatsAppIcon } from "@/components/icons/whatsapp-icon";
import { buttonVariants } from "@/components/ui/button";
import { SectionHeading } from "@/components/ui/section-heading";
import { CONTACT_PHONE_DISPLAY, CONTACT_PHONE_E164 } from "@/lib/content/contact-channels";
import { GROUP_CARD_COPY, WORKING_HOURS_TEXT } from "@/lib/content/company";
import { HOME_EXPERT_LOCATION, homeExpertCopy, homeExpertListHref, homeExpertLiveChat, homeExpertProfile, homeExpertWhatsAppHref } from "@/lib/content/home-expert";
import { WHATSAPP_REL } from "@/lib/content/whatsapp";
import { cn } from "@/lib/utils";

const HEADING_ID = "home-expert-heading";

// Mobile first: a compact row — icon beside the text (a two-column grid, so every child stays a direct child of
// the card) — then from sm a vertical card with the action pinned to the bottom.
const card = "border-border bg-background grid h-full grid-cols-[auto_1fr] content-start gap-x-4 border p-5 sm:flex sm:flex-col sm:p-6";
const linkCard = `${card} group hover:bg-surface transition-colors`;
const iconBox = "bg-surface text-copper row-span-3 inline-flex size-11 shrink-0 items-center justify-center self-start rounded-[var(--aa-radius-md)]";

/**
 * W20.3 (owner instruction 2026-10-16) — «با کارشناس فروش صحبت کنید»: the homepage's channel choice, right
 * before the Final CTA (Composition freeze amendment A1, docs/homepage/HOMEPAGE_SUPERSESSION_REGISTER.md).
 *
 * Equal options in one row of cards: phone (tel:), WhatsApp (prefilled greeting per locale; omitted without a
 * valid number), the RFQ form on /contact at its attachments heading, and the working hours (not a link). The
 * Final CTA keeps the one primary action; here every option has the same weight, so nothing competes with it.
 *
 * Analytics: `data-home-expert` makes the delegated listener (components/analytics/analytics-runtime.tsx)
 * report phone_click / whatsapp_click with `link_location: home_expert` and rfq_cta_click with
 * `cta_location: home_expert` — no script of its own.
 *
 * Server-rendered, no images, no Reveal, no client JS: nothing loads late, so there is no layout shift. Warm
 * Cream surface after the white Industries band, and never Navy-on-Navy against the Final CTA (Visual System
 * §14). Logical properties only, so the same markup reads right-to-left in fa/ar and left-to-right in en; the
 * phone number is an LTR run.
 *
 * Two optional slots, both absent by default (then the markup is exactly the one without them):
 * - the real expert (company.ts SALES_EXPERT): a round photo with its own width/height, the first name and the
 *   role, under the intro — only with a configured photo AND first name, never a placeholder person;
 * - «چت با کارشناس» (LIVECHAT_ENABLED + LIVECHAT_URL, W21): a secondary button at the heading row's end on wide
 *   screens, below the intro on narrow ones.
 */
export function ExpertContact({ locale }: { locale: Locale }) {
  const t = homeExpertCopy[locale];
  const hours = WORKING_HOURS_TEXT[locale];
  const whatsappHref = homeExpertWhatsAppHref(locale);
  const expert = homeExpertProfile(locale);
  const chat = homeExpertLiveChat(locale);
  const heading = <SectionHeading headingId={HEADING_ID} eyebrow={t.role} title={t.title} body={t.body} />;

  return (
    <section aria-labelledby={HEADING_ID} data-home-expert={HOME_EXPERT_LOCATION} className="border-border border-b bg-[var(--aa-color-bg-warm)] py-20 lg:py-28">
      <div className="container-x">
        {expert || chat ? (
          <div className="flex flex-wrap items-end justify-between gap-8">
            <div className="max-w-2xl">
              {heading}
              {expert && (
                <p className="mt-6 flex items-center gap-4">
                  {/* alt="": the name is the text right beside it. Fixed 56px box: no layout shift. */}
                  <img src={expert.src} width={expert.width} height={expert.height} alt="" loading="lazy" decoding="async" className="size-14 shrink-0 rounded-full object-cover" />
                  <span>
                    <span className="text-navy block font-bold">{expert.name}</span>
                    <span className="text-muted-foreground block text-sm">{expert.role}</span>
                  </span>
                </p>
              )}
            </div>
            {chat && (
              <a href={chat.href} className={cn(buttonVariants({ variant: "secondary", size: "button" }), "h-auto min-h-12 py-3")}>
                <MessageCircle aria-hidden="true" />
                {chat.label}
              </a>
            )}
          </div>
        ) : (
          heading
        )}

        <ul role="list" className={`mt-10 grid gap-4 sm:grid-cols-2 lg:mt-12 ${whatsappHref ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}>
          <li>
            <a href={`tel:${CONTACT_PHONE_E164}`} className={linkCard}>
              <Option icon={<Phone aria-hidden="true" className="size-5" />} title={t.phone.title} hint={t.phone.hint}>
                <span dir="ltr" className="text-navy text-lg font-bold tabular-nums group-hover:underline">
                  {CONTACT_PHONE_DISPLAY}
                </span>
              </Option>
            </a>
          </li>
          {whatsappHref && (
            <li>
              <a href={whatsappHref} target="_blank" rel={WHATSAPP_REL} className={linkCard}>
                <Option icon={<WhatsAppIcon className="size-5" />} title={t.whatsapp.title} hint={t.whatsapp.hint}>
                  <span className="text-navy font-semibold group-hover:underline">{t.whatsapp.action}</span>
                  <span className="sr-only"> {GROUP_CARD_COPY[locale].newTab}</span>
                </Option>
              </a>
            </li>
          )}
          <li>
            <a href={homeExpertListHref(locale)} className={linkCard}>
              <Option icon={<FileText aria-hidden="true" className="size-5" />} title={t.list.title} hint={t.list.hint}>
                <span className="text-navy font-semibold group-hover:underline">{t.list.action}</span>
              </Option>
            </a>
          </li>
          <li className={card}>
            {/* A direct list (no Option wrapper), so the Markdown mirror keeps one line per day range. */}
            <span className={iconBox}>
              <Clock aria-hidden="true" className="size-5" />
            </span>
            <h3 className="text-navy text-lg font-bold sm:mt-5">{t.hoursTitle}</h3>
            <ul className="text-muted-foreground mt-1 space-y-1 sm:mt-2 text-sm leading-relaxed">
              {hours.lines.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </li>
        </ul>
      </div>
    </section>
  );
}

/** A link card's body: icon, H3, hint, then the channel's value or action pinned to the bottom. */
function Option({ icon, title, hint, children }: { icon: ReactNode; title: string; hint: string; children: ReactNode }) {
  return (
    <>
      <span className={iconBox}>{icon}</span>
      <h3 className="text-navy text-lg font-bold sm:mt-5">{title}</h3>
      <p className="text-muted-foreground mt-1 text-sm leading-relaxed sm:mt-2">{hint}</p>
      <div className="mt-auto pt-3 sm:pt-5">{children}</div>
    </>
  );
}
