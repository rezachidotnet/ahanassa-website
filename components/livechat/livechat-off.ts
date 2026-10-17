/**
 * W21.2 — stands in for livechat-button.tsx in the static build while live chat is off (config/livechat.ts;
 * scripts/static/vite.config.static.ts `livechatOff`). It is a plain server module, not "use client", so the real
 * button never enters the build: no client chunk, no client-reference entry — zero bytes of live-chat JS. Never
 * rendered either way: while off, both call sites get no props and render nothing.
 */
export function LivechatButton(): null {
  return null;
}
