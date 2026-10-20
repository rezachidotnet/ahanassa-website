import { ArrowRight, Check, Clock, FileText, Phone } from "lucide-react";
import type { ReactNode } from "react";
import type { Locale } from "@/config/locales";
import { WhatsAppIcon } from "@/components/icons/whatsapp-icon";
import { ButtonLink, buttonVariants } from "@/components/ui/button";
import { Reveal } from "@/components/ui/reveal";
import { ExpertOpenStatus } from "@/components/home/expert-open-status";
import { LivechatButton } from "@/components/livechat/livechat-button";
import { CONTACT_PHONE_DISPLAY, CONTACT_PHONE_E164 } from "@/lib/content/contact-channels";
import { GROUP_CARD_COPY, WORKING_HOURS, WORKING_HOURS_TEXT } from "@/lib/content/company";
import {
  EXPERT_SECTION_VARIANT,
  HOME_EXPERT_LOCATION,
  homeExpertCopy,
  homeExpertListHref,
  homeExpertProfile,
  homeExpertProofs,
  homeExpertWhatsAppHref,
} from "@/lib/content/home-expert";
import { livechatProps } from "@/lib/content/livechat";
import { WHATSAPP_REL } from "@/lib/content/whatsapp";
import { cn } from "@/lib/utils";

const HEADING_ID = "home-expert-heading";

/**
 * W20.3 (owner instruction 2026-10-16; redesign the same day, freeze amendment A2) — «با کارشناس فروش صحبت کنید»:
 * the homepage's way to reach a person, right before the Final CTA
 * (docs/homepage/AHANASSA_HOMEPAGE_COMPOSITION_AND_CUSTOMER_JOURNEY_FREEZE_V1.0.md §21–§22).
 *
 * Two layouts behind the build-time EXPERT_SECTION_VARIANT (lib/content/home-expert.ts):
 * - A "Concierge card": one elevated Featured panel (radius-xl, shadow-sm — Design System §9) on the Warm Cream
 *   band. Reading start: the expert (or the role), the H2, one reassurance line, and the hours with the live
 *   «open now» line. Reading end: three action tiles — the RFQ (navy, the section's one primary action), phone and
 *   WhatsApp.
 * - B "Split band": a benefit headline with the avatar beside it, three proof points taken verbatim from approved
 *   homepage copy (homeExpertProofs), and a button row: RFQ primary, phone and WhatsApp secondary.
 *
 * Both: the RFQ is the one primary action (CTA_STRATEGY §3.1, §4); phone and WhatsApp stay secondary. The expert
 * avatar renders only with a configured real photo and first name (SALES_EXPERT), and the «چت با کارشناس» button
 * only while live chat is on (config/livechat.ts; W21.2 components/livechat/livechat-button.tsx, which opens Odoo's
 * chat in an iframe panel on click and falls back to WhatsApp and the purchase list) — never a placeholder person or a dead button.
 *
 * Analytics: every action carries `data-expert-action`, which the delegated listener
 * (components/analytics/analytics-runtime.tsx) reports as expert_call_click / expert_whatsapp_click /
 * expert_rfq_click / expert_chat_click with `expert_variant`; the site-wide phone_click / whatsapp_click /
 * rfq_cta_click still fire with location home_expert. No script of its own beyond that.
 *
 * No layout shift: the avatar has its own width/height, the open-now line has a reserved fixed-height box, and the
 * shared Reveal (already on the homepage for Product Showcase) never hides content — it only plays a 6px/200ms
 * entrance on a card that is still below the fold, and nothing under prefers-reduced-motion. The open-now line is
 * the only new client JS (plus the live-chat button, only while live chat is on). Logical properties only, so one markup serves RTL fa/ar and LTR en; the phone number is
 * an LTR run. Light surfaces only, so it never sits Navy-on-Navy against the Final CTA (Visual System §14).
 */
export function ExpertContact({ locale }: { locale: Locale }) {
  const variant = EXPERT_SECTION_VARIANT;
  const actions: Actions = {
    rfq: homeExpertListHref(locale),
    whatsapp: homeExpertWhatsAppHref(locale),
    chat: livechatProps(locale),
  };
  const expert = homeExpertProfile(locale);

  return (
    <section
      aria-labelledby={HEADING_ID}
      data-home-expert={HOME_EXPERT_LOCATION}
      data-expert-variant={variant}
      className="border-border border-b bg-[var(--aa-color-bg-warm)] py-20 lg:py-28"
    >
      <div className="container-x">
        {variant === "A" ? <ConciergeCard locale={locale} expert={expert} actions={actions} /> : <SplitBand locale={locale} expert={expert} actions={actions} />}
      </div>
    </section>
  );
}

type Expert = ReturnType<typeof homeExpertProfile>;
type Actions = { rfq: string; whatsapp: string | null; chat: ReturnType<typeof livechatProps> };

/** A: the elevated two-pane card. */
function ConciergeCard({ locale, expert, actions }: { locale: Locale; expert: Expert; actions: Actions }) {
  const t = homeExpertCopy[locale];
  return (
    <Reveal className="border-border bg-background grid overflow-hidden rounded-[var(--aa-radius-xl)] border shadow-[var(--aa-shadow-sm)] lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <div className="p-6 sm:p-10 lg:p-12">
        {expert ? <ExpertBadge expert={expert} /> : <Eyebrow>{t.role}</Eyebrow>}
        <h2 id={HEADING_ID} className="text-navy mt-5 text-3xl leading-[1.15] font-bold text-balance sm:text-4xl">
          {t.title}
        </h2>
        <p className="text-muted-foreground mt-4 max-w-xl text-base leading-relaxed">{t.body}</p>
        <Hours locale={locale} className="border-border mt-8 border-t pt-6" />
      </div>

      <div className="border-border bg-surface flex flex-col justify-center gap-3 border-t p-4 sm:p-8 lg:border-t-0 lg:border-s lg:p-12">
        <ul role="list" className="grid gap-3">
          <li>
            <a href={actions.rfq} data-expert-action="rfq" className={cn(tile, "bg-navy border-navy text-white hover:bg-[var(--aa-color-action-primary-bg-hover)]")}>
              <TileBody icon={<FileText aria-hidden="true" className="size-5" />} iconClass="bg-white/10 text-white" title={t.rfq.title} hint={t.rfq.hint} hintClass="text-[var(--aa-color-brand-cream-50)]" />
            </a>
          </li>
          <li>
            <a href={`tel:${CONTACT_PHONE_E164}`} data-expert-action="call" className={cn(tile, "border-border bg-background text-navy hover:border-[var(--aa-color-neutral-300)]")}>
              <TileBody
                icon={<Phone aria-hidden="true" className="size-5" />}
                title={t.phone.title}
                hint={
                  <span dir="ltr" className="text-navy text-base font-bold tabular-nums">
                    {CONTACT_PHONE_DISPLAY}
                  </span>
                }
              />
            </a>
          </li>
          {actions.whatsapp && (
            <li>
              <a href={actions.whatsapp} target="_blank" rel={WHATSAPP_REL} data-expert-action="whatsapp" className={cn(tile, "border-border bg-background text-navy hover:border-[var(--aa-color-neutral-300)]")}>
                <TileBody icon={<WhatsAppIcon className="size-5" />} title={t.whatsapp.title} hint={t.whatsapp.hint} newTab={GROUP_CARD_COPY[locale].newTab} />
              </a>
            </li>
          )}
        </ul>
        {actions.chat && <LivechatButton chat={actions.chat} variant="inline" />}
      </div>
    </Reveal>
  );
}

/** B: the open band — headline, proof points, button row. */
function SplitBand({ locale, expert, actions }: { locale: Locale; expert: Expert; actions: Actions }) {
  const t = homeExpertCopy[locale];
  return (
    <Reveal>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end lg:gap-16">
        <div className="flex items-start gap-5">
          {expert && <Avatar expert={expert} className="mt-1 size-16 sm:size-20" />}
          <div className="max-w-2xl">
            {expert ? <p className="text-navy font-bold">{`${expert.name} · ${expert.role}`}</p> : <Eyebrow>{t.role}</Eyebrow>}
            <h2 id={HEADING_ID} className="text-navy mt-4 text-3xl leading-[1.15] font-bold text-balance sm:text-4xl lg:text-[2.75rem]">
              {t.bandTitle}
            </h2>
            <p className="text-muted-foreground mt-4 text-base leading-relaxed">{t.body}</p>
          </div>
        </div>
        <Hours locale={locale} className="lg:min-w-72" />
      </div>

      <ul role="list" className="border-navy/10 mt-10 grid gap-4 border-t pt-8 sm:grid-cols-3 sm:gap-8">
        {homeExpertProofs(locale).map((proof) => (
          <li key={proof} className="flex items-start gap-3">
            <span aria-hidden="true" className="text-copper bg-background border-border mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-full border">
              <Check className="size-4" />
            </span>
            <span className="text-navy leading-relaxed font-semibold">{proof}</span>
          </li>
        ))}
      </ul>

      <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <ButtonLink href={actions.rfq} data-expert-action="rfq" variant="primary" size="button" className="h-auto min-h-12 py-3">
          <FileText aria-hidden="true" className="size-5" />
          {t.rfq.title}
        </ButtonLink>
        <a href={`tel:${CONTACT_PHONE_E164}`} data-expert-action="call" className={cn(buttonVariants({ variant: "secondary", size: "button" }), "bg-background h-auto min-h-12 py-3")}>
          <Phone aria-hidden="true" className="size-5" />
          {t.phone.title}
          <span dir="ltr" className="tabular-nums">
            {CONTACT_PHONE_DISPLAY}
          </span>
        </a>
        {actions.whatsapp && (
          <a href={actions.whatsapp} target="_blank" rel={WHATSAPP_REL} data-expert-action="whatsapp" className={cn(buttonVariants({ variant: "secondary", size: "button" }), "bg-background h-auto min-h-12 py-3")}>
            <WhatsAppIcon className="size-5" />
            {t.whatsapp.action}
            <span className="sr-only"> {GROUP_CARD_COPY[locale].newTab}</span>
          </a>
        )}
        {actions.chat && <LivechatButton chat={actions.chat} variant="inline" className="sm:w-auto" />}
      </div>
    </Reveal>
  );
}

// Action tile (A): a whole-card link, 72px+ tall, hover = stronger border and a 2px lift (Motion §13.1; none under
// reduced motion). The focus ring is the global one, offset onto the light pane.
const tile =
  "group flex min-h-18 items-center gap-4 rounded-[var(--aa-radius-lg)] border p-4 transition-[background-color,border-color,box-shadow,transform] duration-[160ms] hover:-translate-y-0.5 hover:shadow-[var(--aa-shadow-sm)] motion-reduce:hover:translate-y-0 sm:p-5";

function TileBody({ icon, iconClass, title, hint, hintClass, newTab }: { icon: ReactNode; iconClass?: string; title: string; hint: ReactNode; hintClass?: string; newTab?: string }) {
  return (
    <>
      <span className={cn("bg-surface text-copper inline-flex size-11 shrink-0 items-center justify-center rounded-[var(--aa-radius-md)]", iconClass)}>{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-base leading-snug font-bold sm:text-lg">{title}</span>
        <span className={cn("text-muted-foreground mt-1 block text-sm leading-relaxed", hintClass)}>{hint}</span>
        {newTab && <span className="sr-only"> {newTab}</span>}
      </span>
      <ArrowRight aria-hidden="true" className="size-5 shrink-0 opacity-70 transition-transform group-hover:translate-x-0.5 rtl:-scale-x-100 rtl:group-hover:-translate-x-0.5 motion-reduce:transition-none" />
    </>
  );
}

function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="eyebrow text-copper flex items-center gap-3">
      <span className="h-px w-6 bg-current" aria-hidden="true" />
      {children}
    </p>
  );
}

/** alt="": the name is the text right beside it. Own width/height plus a fixed box: no layout shift. */
function Avatar({ expert, className }: { expert: NonNullable<Expert>; className?: string }) {
  return <img src={expert.src} width={expert.width} height={expert.height} alt="" loading="lazy" decoding="async" className={cn("ring-background shrink-0 rounded-full object-cover ring-4", className)} />;
}

function ExpertBadge({ expert }: { expert: NonNullable<Expert> }) {
  return (
    <p className="flex items-center gap-4">
      <Avatar expert={expert} className="size-16" />
      <span>
        <span className="text-navy block text-lg font-bold">{expert.name}</span>
        <span className="text-copper block text-sm font-semibold">{expert.role}</span>
      </span>
    </p>
  );
}

/** The hours: the live open-now line (client) above the static lines from company.ts, which work without JS. */
function Hours({ locale, className }: { locale: Locale; className?: string }) {
  const t = homeExpertCopy[locale];
  return (
    <div className={className}>
      <ExpertOpenStatus locale={locale} hours={WORKING_HOURS} labels={t.status} />
      <h3 className="text-navy mt-3 flex items-center gap-2 text-sm font-bold">
        <Clock aria-hidden="true" className="text-copper size-4" />
        {t.hoursTitle}
      </h3>
      {/* A direct list, so the Markdown mirror keeps one line per day range. */}
      <ul className="text-muted-foreground mt-2 space-y-1 text-sm leading-relaxed">
        {WORKING_HOURS_TEXT[locale].lines.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </div>
  );
}
