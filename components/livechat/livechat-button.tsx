"use client";

import { LoaderCircle, MessageCircle, X } from "lucide-react";
import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { WhatsAppIcon } from "@/components/icons/whatsapp-icon";
import { buttonVariants } from "@/components/ui/button";
import { trackEvent } from "@/lib/analytics/events";
import { trackLivechatEvent } from "@/lib/livechat/events";
import type { LivechatButtonProps } from "@/lib/content/livechat";
import { WHATSAPP_REL } from "@/lib/content/whatsapp";
import { isLivechatOnline, openOdooLivechat, subscribeLivechatOnline, type LivechatError } from "@/lib/livechat/odoo-widget";
import { cn } from "@/lib/utils";

type Status = "idle" | "loading" | "error";

/**
 * W21.2 — «چت با کارشناس»: a facade for the Odoo live chat. The page carries only this button; Odoo's scripts
 * load on the first click (lib/livechat/odoo-widget.ts), and the chat window that opens is Odoo's own.
 *
 * - `inline`: the expert section's live-chat slot (components/home/expert-contact.tsx). A click reports
 *   expert_chat_click (with expert_variant) here — the delegated listener of analytics-runtime.tsx sees links only —
 *   and its fallback links carry `data-expert-action`, so they count as the section's WhatsApp / RFQ actions.
 * - `floating`: fa pages only, bottom inline-end corner (left in RTL) — the spot of the en/ar floating WhatsApp
 *   button — with the same safe-area offset; hidden in print and on a page with a submit form (theme-extensions.css).
 *
 * While loading: a spinner in place of the icon, `aria-busy`, and a polite status line for screen readers; the
 * label and size never change. On success: chat_open (lib/livechat/events.ts), and a green dot once Odoo reported an operator online
 * (never before, never assumed). On failure within the 8 s budget: chat_load_error and a small panel with WhatsApp
 * and «ارسال لیست خرید». The panel is absolutely positioned above the button, so it never moves the page (no CLS);
 * it takes focus when it opens, and Esc or its close button closes it and returns focus to the button.
 */
export function LivechatButton({ chat, variant, className }: { chat: LivechatButtonProps; variant: "inline" | "floating"; className?: string }) {
  const { copy } = chat;
  const [status, setStatus] = useState<Status>("idle");
  const online = useSyncExternalStore(subscribeLivechatOnline, isLivechatOnline, () => false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const floating = variant === "floating";
  const expertAction = chat.location === "home_expert" ? { "data-expert-action": "chat" } : {};

  const open = async () => {
    if (status === "loading") return;
    // The delegated listener (analytics-runtime.tsx) reports links only; this button reports its own expert action.
    if (chat.location === "home_expert") trackEvent("expert_chat_click", { expert_variant: buttonRef.current?.closest("[data-expert-variant]")?.getAttribute("data-expert-variant") ?? undefined });
    setStatus("loading");
    const result = await openOdooLivechat(chat.config, chat.timeoutMs);
    if (result.ok) {
      setStatus("idle");
      trackLivechatEvent("chat_open", { chat_location: chat.location });
    } else {
      setStatus("error");
      trackLivechatEvent("chat_load_error", { chat_location: chat.location, chat_error: result.reason satisfies LivechatError });
    }
  };

  const close = () => {
    setStatus("idle");
    buttonRef.current?.focus();
  };

  useEffect(() => {
    if (status !== "error") return;
    panelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [status]);

  return (
    <div
      {...(floating ? { "data-sticky-livechat": "" } : {})}
      className={cn(floating ? "fixed end-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-30 print:hidden" : "relative", className)}
    >
      <button
        ref={buttonRef}
        type="button"
        {...expertAction}
        data-livechat-button={chat.location}
        aria-busy={status === "loading" || undefined}
        aria-expanded={status === "error"}
        aria-controls={panelId}
        onClick={open}
        className={cn(
          floating
            ? "bg-navy inline-flex min-h-12 items-center gap-2 rounded-full px-5 text-sm font-bold text-white shadow-[var(--aa-shadow-md)] ring-2 ring-white transition-colors hover:bg-[var(--aa-color-action-primary-bg-hover)]"
            : cn(buttonVariants({ variant: "secondary", size: "button" }), "bg-background h-auto min-h-12 w-full py-3"),
          "relative",
        )}
      >
        {status === "loading" ? <LoaderCircle aria-hidden="true" className="size-5 animate-spin motion-reduce:animate-none" /> : <MessageCircle aria-hidden="true" className="size-5" />}
        {copy.label}
        {online && (
          <span className={cn("absolute top-1 start-1 size-3 rounded-full bg-[var(--aa-color-success-700)] ring-2", floating ? "ring-white" : "ring-background")}>
            <span className="sr-only">{copy.online}</span>
          </span>
        )}
      </button>
      <span role="status" className="sr-only">
        {status === "loading" ? copy.loading : ""}
      </span>

      <div
        id={panelId}
        ref={panelRef}
        role="region"
        aria-label={copy.label}
        tabIndex={-1}
        hidden={status !== "error"}
        className="border-border bg-background text-navy absolute end-0 bottom-full z-30 mb-3 w-[min(20rem,calc(100vw-2rem))] rounded-[var(--aa-radius-lg)] border p-4 text-start shadow-[var(--aa-shadow-md)] focus:outline-none"
      >
        <div className="flex items-start gap-3">
          <p className="flex-1 text-sm leading-relaxed">{copy.unavailable}</p>
          <button type="button" onClick={close} aria-label={copy.close} className="text-muted-foreground hover:text-navy -m-1 inline-flex size-8 shrink-0 items-center justify-center rounded-full">
            <X aria-hidden="true" className="size-4" />
          </button>
        </div>
        <ul role="list" className="mt-3 grid gap-2">
          {chat.whatsappHref && (
            <li>
              <a href={chat.whatsappHref} target="_blank" rel={WHATSAPP_REL} {...(floating ? {} : { "data-expert-action": "whatsapp" })} className={cn(buttonVariants({ variant: "secondary", size: "button" }), "h-auto min-h-11 w-full py-2")}>
                <WhatsAppIcon className="size-5" />
                {copy.whatsapp}
                <span className="sr-only"> {copy.newTab}</span>
              </a>
            </li>
          )}
          <li>
            <a href={chat.rfqHref} {...(floating ? {} : { "data-expert-action": "rfq" })} className={cn(buttonVariants({ variant: "primary", size: "button" }), "h-auto min-h-11 w-full py-2")}>
              {copy.rfq}
            </a>
          </li>
        </ul>
      </div>
    </div>
  );
}
