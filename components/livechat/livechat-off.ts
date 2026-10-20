/**
 * W21.2 — stands in for livechat-button.tsx in the static build while live chat is off (config/livechat.ts;
 * scripts/static/vite.config.static.ts `livechatOff`). It is a plain server module, not "use client", so the real
 * button never enters the build: no client chunk, no client-reference entry — zero bytes of live-chat JS. Never
 * rendered either way: while off, every call site gets no props and renders nothing.
 */
export function LivechatButton(): null {
  return null;
}

export function LivechatHost(): null {
  return null;
}
