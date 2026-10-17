"use client";

import { LoaderCircle, MessageCircle, X } from "lucide-react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { WhatsAppIcon } from "@/components/icons/whatsapp-icon";
import { buttonVariants } from "@/components/ui/button";
import { usePublicPathname } from "@/components/layout/use-public-pathname";
import { livechatFrameUrl } from "@/config/livechat";
import { trackEvent } from "@/lib/analytics/events";
import { openState } from "@/lib/content/expert-open-state";
import type { LivechatLocation, LivechatProps } from "@/lib/content/livechat";
import { WHATSAPP_REL } from "@/lib/content/whatsapp";
import { trackLivechatEvent } from "@/lib/livechat/events";
import { ARTICLE_SCROLL_SHARE, isTeaserDwellPage, productPageSlug, stickyLivechatMode, TEASER_DWELL_MS } from "@/lib/livechat/placement";
import { cn } from "@/lib/utils";

/**
 * W21.2 — «چت با کارشناس». Owner decision 2026-10-17: no Odoo JS on the site; a click opens ONE panel per page
 * (LivechatHost, rendered once by the layout) holding Odoo's support page in an iframe
 * (`/im_livechat/support/<channel>?lang=<locale>&page=<this page's https URL>`). The panel never opens on its own.
 *
 * - LivechatHost: a dialog, ~380×600 bottom inline-end, full screen at ≤ 480 px. It takes focus when it opens, keeps
 *   Tab inside (sentinels around it: Tab cannot be caught inside a cross-origin iframe), and Esc (outside the
 *   iframe) or its close button closes it and returns focus to the button that opened it. Closed, it stays mounted,
 *   so the conversation survives close/reopen. chat_open when the iframe loads; if it has not loaded within 8 s,
 *   chat_load_error (`timeout`) and WhatsApp + «ارسال لیست خرید» instead — the next open tries again.
 * - LivechatButton `inline`: the expert section's live-chat slot (components/home/expert-contact.tsx). It reports
 *   expert_chat_click itself (the delegated listener of analytics-runtime.tsx sees links only).
 * - LivechatButton `floating`: fa only, the en/ar floating-WhatsApp corner, with the placement rules of
 *   lib/livechat/placement.ts (a fade, `invisible` while hidden, no transition under prefers-reduced-motion) and the
 *   teaser: only when Odoo's status page says an operator is online (no Odoo JS here either: a hidden iframe that
 *   posts one message), in sales hours, once per session, after 45 s on a price/product/chart page or on the 2nd
 *   product page. Desktop: a dismissible bubble; mobile: a dot on the button.
 *
 * Everything is position: fixed or absolute inside a fixed box, so nothing ever moves the page (no CLS).
 */

const PANEL_ID = "aa-livechat-panel";
const STATUS_MESSAGE = "ahanassa-livechat-status";
const TEASER_KEY = "aa-livechat-teaser";
const PRODUCTS_KEY = "aa-livechat-products";

// --- the one panel's open state, shared by every button on the page --------------------------------------------

interface PanelState {
  open: boolean;
  location: LivechatLocation;
  opener: HTMLElement | null;
}

const CLOSED: PanelState = { open: false, location: "sticky", opener: null };
let panel = CLOSED;
const listeners = new Set<() => void>();
const subscribePanel = (listener: () => void) => {
  listeners.add(listener);
  return () => void listeners.delete(listener);
};
const setPanel = (next: PanelState) => {
  panel = next;
  for (const listener of listeners) listener();
};
const usePanel = () => useSyncExternalStore(subscribePanel, () => panel, () => CLOSED);

function openPanel(location: LivechatLocation, opener: HTMLElement | null) {
  setPanel({ open: true, location, opener });
}

function closePanel() {
  const { opener } = panel;
  setPanel({ ...panel, open: false });
  if (opener?.isConnected) opener.focus();
}

/** sessionStorage, or nothing (private mode, blocked storage): the teaser then shows at most once per page view. */
function session(): Storage | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

/** This page's URL for Odoo (stored on the chat and the lead): https only, no query or hash. */
function pageUrl(pageOrigin: string): string {
  return `${location.protocol === "https:" ? location.origin : pageOrigin}${location.pathname}`;
}

// --- the panel -----------------------------------------------------------------------------------------------------

type FrameStatus = "loading" | "loaded" | "error";

export function LivechatHost({ chat }: { chat: LivechatProps }) {
  const { copy } = chat;
  const state = usePanel();
  const [frame, setFrame] = useState<{ key: number; src: string; status: FrameStatus } | null>(null);
  const statusRef = useRef<FrameStatus | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  statusRef.current = frame?.status ?? null;

  // Open: the iframe is created on the first open (and again after a failed one); a loaded one is reused.
  useEffect(() => {
    if (!state.open) return;
    closeRef.current?.focus();
    if (statusRef.current === "loaded") trackLivechatEvent("chat_open", { chat_location: panel.location });
    else if (statusRef.current !== "loading") setFrame((f) => ({ key: (f?.key ?? 0) + 1, src: livechatFrameUrl(chat.config, chat.locale, pageUrl(chat.pageOrigin)), status: "loading" }));
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closePanel();
    };
    document.addEventListener("keydown", onKey);
    // Full screen on a phone: the page behind does not scroll.
    const root = document.documentElement;
    const lock = window.matchMedia("(max-width: 480px)").matches;
    if (lock) root.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      if (lock) root.style.overflow = "";
    };
  }, [state.open, chat]);

  // The 8 s budget: an iframe gives no error event, so "not loaded in time" is the failure.
  useEffect(() => {
    if (frame?.status !== "loading") return;
    const id = setTimeout(() => {
      if (statusRef.current !== "loading") return;
      setFrame((f) => (f && f.status === "loading" ? { ...f, status: "error" } : f));
      trackLivechatEvent("chat_load_error", { chat_location: panel.location, chat_error: "timeout" });
    }, chat.timeoutMs);
    return () => clearTimeout(id);
  }, [frame?.key, frame?.status, chat.timeoutMs]);

  const onLoad = () => {
    if (statusRef.current !== "loading") return;
    setFrame((f) => (f ? { ...f, status: "loaded" } : f));
    trackLivechatEvent("chat_open", { chat_location: panel.location });
  };

  // Focus trap: the sentinels send Tab back to the other end of the dialog.
  const focusEdge = (edge: "first" | "last") => {
    const items = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>("[data-livechat-focus]") ?? []).filter((el) => el.getClientRects().length > 0);
    (edge === "first" ? items[0] : items[items.length - 1])?.focus();
  };

  const expert = state.location === "home_expert";
  const error = frame?.status === "error";

  return (
    <div
      id={PANEL_ID}
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={`${PANEL_ID}-title`}
      hidden={!state.open}
      data-livechat-panel=""
      className={cn(
        state.open ? "flex" : "hidden",
        "bg-background text-navy fixed inset-0 z-50 flex-col print:hidden",
        "min-[481px]:border-border min-[481px]:inset-auto min-[481px]:end-4 min-[481px]:bottom-[max(1rem,env(safe-area-inset-bottom))] min-[481px]:h-[min(600px,calc(100dvh-2rem))] min-[481px]:w-[380px] min-[481px]:overflow-hidden min-[481px]:rounded-[var(--aa-radius-lg)] min-[481px]:border min-[481px]:shadow-[var(--aa-shadow-md)]",
      )}
    >
      <span tabIndex={0} onFocus={() => focusEdge("last")} />
      <div className="bg-navy flex min-h-14 shrink-0 items-center gap-3 ps-4 pe-2 pt-[env(safe-area-inset-top)] text-white min-[481px]:pt-0">
        <MessageCircle aria-hidden="true" className="size-5 shrink-0" />
        <h2 id={`${PANEL_ID}-title`} className="flex-1 text-base font-bold">
          {copy.title}
        </h2>
        <button ref={closeRef} type="button" data-livechat-focus="" onClick={closePanel} aria-label={copy.close} className="inline-flex size-11 shrink-0 items-center justify-center rounded-full hover:bg-white/10">
          <X aria-hidden="true" className="size-5" />
        </button>
      </div>
      <div className="relative min-h-0 flex-1">
        {frame && !error && (
          <iframe
            key={frame.key}
            src={frame.src}
            title={copy.frameTitle}
            onLoad={onLoad}
            data-livechat-focus=""
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-downloads"
            className="absolute inset-0 size-full border-0"
          />
        )}
        {frame?.status === "loading" && (
          <div className="bg-background absolute inset-0 flex items-center justify-center">
            <LoaderCircle aria-hidden="true" className="text-navy size-8 animate-spin motion-reduce:animate-none" />
          </div>
        )}
        <span role="status" className="sr-only">
          {frame?.status === "loading" ? copy.loading : ""}
        </span>
        {error && (
          <div className="p-5 text-start">
            <p className="text-sm leading-relaxed">{copy.unavailable}</p>
            <ul role="list" className="mt-4 grid gap-2">
              {chat.whatsappHref && (
                <li>
                  <a href={chat.whatsappHref} target="_blank" rel={WHATSAPP_REL} data-livechat-focus="" {...(expert ? { "data-expert-action": "whatsapp" } : {})} className={cn(buttonVariants({ variant: "secondary", size: "button" }), "h-auto min-h-11 w-full py-2")}>
                    <WhatsAppIcon className="size-5" />
                    {copy.whatsapp}
                    <span className="sr-only"> {copy.newTab}</span>
                  </a>
                </li>
              )}
              <li>
                <a href={chat.rfqHref} data-livechat-focus="" {...(expert ? { "data-expert-action": "rfq" } : {})} className={cn(buttonVariants({ variant: "primary", size: "button" }), "h-auto min-h-11 w-full py-2")}>
                  {copy.rfq}
                </a>
              </li>
            </ul>
          </div>
        )}
      </div>
      <span tabIndex={0} onFocus={() => focusEdge("first")} />
    </div>
  );
}

// --- the buttons ---------------------------------------------------------------------------------------------------

export function LivechatButton({ chat, variant, className }: { chat: LivechatProps; variant: "inline" | "floating"; className?: string }) {
  return variant === "floating" ? <FloatingLivechat chat={chat} /> : <InlineLivechat chat={chat} className={className} />;
}

function InlineLivechat({ chat, className }: { chat: LivechatProps; className?: string }) {
  const state = usePanel();
  const ref = useRef<HTMLButtonElement>(null);
  const open = () => {
    // The delegated listener (analytics-runtime.tsx) reports links only; this button reports its own expert action.
    trackEvent("expert_chat_click", { expert_variant: ref.current?.closest("[data-expert-variant]")?.getAttribute("data-expert-variant") ?? undefined });
    openPanel("home_expert", ref.current);
  };
  return (
    <button
      ref={ref}
      type="button"
      data-expert-action="chat"
      data-livechat-button="home_expert"
      aria-haspopup="dialog"
      aria-expanded={state.open && state.location === "home_expert"}
      aria-controls={PANEL_ID}
      onClick={open}
      className={cn(buttonVariants({ variant: "secondary", size: "button" }), "bg-background h-auto min-h-12 w-full py-3", className)}
    >
      <MessageCircle aria-hidden="true" className="size-5" />
      {chat.copy.label}
    </button>
  );
}

type Trigger = "dwell" | "second_product";

function FloatingLivechat({ chat }: { chat: LivechatProps }) {
  const { copy } = chat;
  const pathname = usePublicPathname();
  const mode = stickyLivechatMode(pathname);
  const state = usePanel();
  const ref = useRef<HTMLButtonElement>(null);
  // The server and first client render agree: visible from load only where the rule says so.
  const [placed, setPlaced] = useState(mode === "always");
  const [trigger, setTrigger] = useState<Trigger | null>(null);
  const [probing, setProbing] = useState(false);
  const [teaser, setTeaser] = useState<"bubble" | "dot" | null>(null);
  const statusFrame = useRef<HTMLIFrameElement>(null);
  const visible = placed || (state.open && state.location === "sticky");

  // Placement (lib/livechat/placement.ts).
  useEffect(() => {
    if (mode === "always" || mode === "never") return setPlaced(mode === "always");
    setPlaced(false);
    if (mode === "article") {
      const onScroll = () => {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        if (max > 0 && window.scrollY / max >= ARTICLE_SCROLL_SHARE) {
          setPlaced(true);
          window.removeEventListener("scroll", onScroll);
        }
      };
      window.addEventListener("scroll", onScroll, { passive: true });
      onScroll();
      return () => window.removeEventListener("scroll", onScroll);
    }
    // home: after the first scroll, and neither the hero nor the expert section on screen.
    const hero = document.querySelector("[data-home-hero]");
    const expert = document.querySelector("[data-expert-variant]");
    let scrolled = window.scrollY > 0;
    let heroIn = Boolean(hero);
    let expertIn = false;
    const update = () => setPlaced(scrolled && !heroIn && !expertIn);
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === hero) heroIn = entry.isIntersecting;
        else expertIn = entry.isIntersecting;
      }
      update();
    });
    if (hero) observer.observe(hero);
    if (expert) observer.observe(expert);
    const onScroll = () => {
      scrolled = true;
      update();
      window.removeEventListener("scroll", onScroll);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
    };
  }, [mode, pathname]);

  // Teaser triggers: 45 s on a price/product/chart page, or the 2nd product page of the session.
  useEffect(() => {
    setTrigger(null);
    if (!chat.config.statusUrl) return; // no availability source: the teaser never shows
    const slug = productPageSlug(pathname);
    if (slug) {
      const store = session();
      let seen: string[] = [];
      try {
        seen = JSON.parse(store?.getItem(PRODUCTS_KEY) ?? "[]");
        if (!Array.isArray(seen)) seen = [];
        if (!seen.includes(slug)) store?.setItem(PRODUCTS_KEY, JSON.stringify((seen = [...seen, slug].slice(-10))));
      } catch {
        // Storage may be blocked: no second-page trigger then.
      }
      if (seen.length >= 2) return setTrigger("second_product");
    }
    if (!isTeaserDwellPage(pathname)) return;
    const id = setTimeout(() => setTrigger("dwell"), TEASER_DWELL_MS);
    return () => clearTimeout(id);
  }, [pathname, chat.config.statusUrl]);

  // A trigger fired: once per session, in sales hours, while the button shows and the panel is closed → ask Odoo.
  useEffect(() => {
    if (!trigger || teaser || state.open || !placed) return;
    try {
      if (session()?.getItem(TEASER_KEY)) return;
    } catch {
      // Storage blocked: at most once per page view (teaser state).
    }
    if (!openState(new Date(), chat.hours)?.open) return;
    setProbing(true);
  }, [trigger, placed, state.open, teaser, chat.hours]);

  // The availability answer: one postMessage from Odoo's status page ({type, online: true}); anything else = no teaser.
  useEffect(() => {
    if (!probing) return;
    const finish = (online: boolean) => {
      setProbing(false);
      setTrigger(null);
      if (!online || panel.open || !openState(new Date(), chat.hours)?.open) return;
      try {
        session()?.setItem(TEASER_KEY, "1");
      } catch {
        // see above
      }
      const form = window.matchMedia("(min-width: 768px)").matches ? "bubble" : "dot";
      setTeaser(form);
      trackLivechatEvent("chat_teaser_shown", { chat_location: "sticky", chat_teaser: form, chat_trigger: trigger ?? undefined });
    };
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== chat.config.origin || e.source !== statusFrame.current?.contentWindow) return;
      const data = e.data as { type?: unknown; online?: unknown } | null;
      if (data?.type === STATUS_MESSAGE) finish(data.online === true);
    };
    window.addEventListener("message", onMessage);
    const id = setTimeout(() => finish(false), chat.timeoutMs);
    return () => {
      window.removeEventListener("message", onMessage);
      clearTimeout(id);
    };
  }, [probing]);

  if (mode === "never") return null;

  const open = () => {
    setTeaser(null);
    openPanel("sticky", ref.current);
  };

  return (
    <div
      data-sticky-livechat=""
      className={cn(
        "fixed end-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-30 transition-[opacity,visibility] duration-300 motion-reduce:transition-none print:hidden",
        visible ? "visible opacity-100" : "invisible opacity-0",
      )}
    >
      {teaser === "bubble" && (
        <div role="status" className="border-border bg-background text-navy absolute end-0 bottom-full mb-3 flex w-[min(17rem,calc(100vw-2rem))] items-start gap-1 rounded-[var(--aa-radius-lg)] border p-1 shadow-[var(--aa-shadow-md)] motion-safe:animate-[aa-reveal_200ms_var(--aa-ease-enter)]">
          <button type="button" onClick={open} className="flex-1 rounded-[var(--aa-radius-md)] p-2 text-start text-sm leading-relaxed font-semibold hover:bg-[var(--aa-color-bg-warm)]">
            <span aria-hidden="true" className="me-2 inline-block size-2 rounded-full bg-[var(--aa-color-success-700)]" />
            {copy.teaser}
          </button>
          <button type="button" onClick={() => setTeaser(null)} aria-label={copy.dismiss} className="text-muted-foreground hover:text-navy inline-flex size-9 shrink-0 items-center justify-center rounded-full">
            <X aria-hidden="true" className="size-4" />
          </button>
        </div>
      )}
      <button
        ref={ref}
        type="button"
        data-livechat-button="sticky"
        aria-haspopup="dialog"
        aria-expanded={state.open && state.location === "sticky"}
        aria-controls={PANEL_ID}
        onClick={open}
        className="bg-navy relative inline-flex min-h-12 items-center gap-2 rounded-full px-5 text-sm font-bold text-white shadow-[var(--aa-shadow-md)] ring-2 ring-white transition-colors hover:bg-[var(--aa-color-action-primary-bg-hover)]"
      >
        <MessageCircle aria-hidden="true" className="size-5" />
        {copy.label}
        {teaser === "dot" && (
          <span className="absolute -top-0.5 -end-0.5 size-3.5 rounded-full bg-[var(--aa-color-success-700)] ring-2 ring-white">
            <span className="sr-only">{copy.online}</span>
          </span>
        )}
      </button>
      {probing && chat.config.statusUrl && <iframe ref={statusFrame} src={chat.config.statusUrl} title={copy.online} aria-hidden="true" tabIndex={-1} hidden sandbox="allow-scripts allow-same-origin" />}
    </div>
  );
}
