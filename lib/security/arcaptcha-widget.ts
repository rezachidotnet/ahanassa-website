/**
 * W32: arCaptcha's browser widget (no server code here, so the form can import it). Script API, as arCaptcha's own
 * React wrapper (npm arcaptcha-react 0.4.0) uses it: `arcaptcha.render("#id", {"site-key", callback, expired_callback,
 * error_callback, lang})` → widget id; `arcaptcha.reset(id)`. The token the callback receives is verified server-side
 * (lib/security/arcaptcha.ts).
 */
export const ARCAPTCHA_WIDGET_URL = "https://widget.arcaptcha.ir/1/api.js";
