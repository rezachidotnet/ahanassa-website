// W35: Vite's `?worker` import (components/contact/altcha-widget.ts) — the ALTCHA PBKDF2 worker as its own same-origin file.
declare module "altcha/workers/pbkdf2?worker" {
  const AltchaPbkdf2Worker: new () => Worker;
  export default AltchaPbkdf2Worker;
}
