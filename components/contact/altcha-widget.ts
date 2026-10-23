/**
 * W35: the ALTCHA widget (MIT, npm `altcha` 3.3.0) for the domestic RFQ intake's captcha — loaded ONLY when the RFQ API
 * names ALTCHA in GET /api/rfqs/capabilities, through a dynamic import from EnquiryForm, so www.ahanassa.com never
 * downloads it. Everything is bundled into our own static assets (same origin, no CDN): the `altcha/external` build
 * (no inline worker blobs), its stylesheet, and the PBKDF2 proof-of-work worker as a separate same-origin file. The
 * only network call is the challenge GET on the RFQ API host itself, so it works on the .ir copy during an
 * international cutoff. No footer link, no logo link, no human-interaction collection.
 *
 * The labels are ours (fa/en/ar); the widget sets dir="rtl" itself for fa and ar. Its checkbox is a real labelled
 * control (keyboard + screen reader), with a live status text.
 */
import "altcha/external";
import "altcha/altcha.css";
import Pbkdf2Worker from "altcha/workers/pbkdf2?worker";
import type { AltchaWidgetElement } from "altcha/types/generic";
import type { Locale } from "@/config/locales";

export type AltchaStatus = "interactive" | "verifying" | "success" | "failed";

export interface AltchaHandle {
  reset(): void;
  destroy(): void;
}

const STRINGS: Record<Locale, Record<string, string>> = {
  fa: {
    ariaLinkLabel: "ALTCHA",
    cancel: "انصراف",
    enterCode: "کد را وارد کنید",
    enterCodeAria: "کدی را که می‌شنوید وارد کنید. برای پخش صدا کلید فاصله را بزنید.",
    enterCodeFromImage: "برای ادامه، کد تصویر زیر را وارد کنید.",
    error: "بررسی امنیتی انجام نشد. دوباره تلاش کنید.",
    expired: "زمان بررسی امنیتی تمام شد. دوباره تیک بزنید.",
    footer: "ALTCHA",
    getAudioChallenge: "دریافت کد صوتی",
    label: "من ربات نیستم",
    loading: "در حال بارگذاری…",
    reload: "بارگذاری دوباره",
    verify: "بررسی",
    verificationRequired: "لطفاً بررسی امنیتی را کامل کنید.",
    verified: "بررسی شد",
    verifying: "در حال بررسی…",
    waitAlert: "در حال بررسی… لطفاً صبر کنید.",
  },
  en: {
    ariaLinkLabel: "ALTCHA",
    cancel: "Cancel",
    enterCode: "Enter the code",
    enterCodeAria: "Enter the code you hear. Press Space to play the audio.",
    enterCodeFromImage: "To continue, enter the code from the image below.",
    error: "The security check did not complete. Please try again.",
    expired: "The security check expired. Please tick the box again.",
    footer: "ALTCHA",
    getAudioChallenge: "Get an audio code",
    label: "I'm not a robot",
    loading: "Loading…",
    reload: "Reload",
    verify: "Verify",
    verificationRequired: "Please complete the security check.",
    verified: "Verified",
    verifying: "Checking…",
    waitAlert: "Checking… please wait.",
  },
  ar: {
    ariaLinkLabel: "ALTCHA",
    cancel: "إلغاء",
    enterCode: "أدخل الرمز",
    enterCodeAria: "أدخل الرمز الذي تسمعه. اضغط على المسافة لتشغيل الصوت.",
    enterCodeFromImage: "للمتابعة، أدخل الرمز الظاهر في الصورة أدناه.",
    error: "لم يكتمل التحقق الأمني. يرجى المحاولة مرة أخرى.",
    expired: "انتهت مهلة التحقق الأمني. يرجى التأشير مرة أخرى.",
    footer: "ALTCHA",
    getAudioChallenge: "الحصول على رمز صوتي",
    label: "أنا لست روبوتاً",
    loading: "جارٍ التحميل…",
    reload: "إعادة التحميل",
    verify: "تحقق",
    verificationRequired: "يرجى إكمال التحقق الأمني.",
    verified: "تم التحقق",
    verifying: "جارٍ التحقق…",
    waitAlert: "جارٍ التحقق… يرجى الانتظار.",
  },
};

let registered = false;
function register(): void {
  if (registered) return;
  registered = true;
  // The domestic intake issues PBKDF2/SHA-256 challenges only (lib/rfq-node/altcha.ts).
  $altcha.algorithms.set("PBKDF2/SHA-256", () => new Pbkdf2Worker());
  for (const [lang, strings] of Object.entries(STRINGS)) $altcha.i18n.set(lang, strings);
}

/**
 * Renders the widget into `container`. `onToken` gets the payload once the proof of work is done (the form sends it
 * as `turnstileToken`) and null whenever it is no longer valid (expired, reset, error).
 */
export function mountAltcha(container: HTMLElement, options: { challengeUrl: string; locale: Locale; onToken: (token: string | null) => void; onStatus: (status: AltchaStatus) => void }): AltchaHandle {
  register();
  const el = document.createElement("altcha-widget") as AltchaWidgetElement;
  el.setAttribute("challenge", options.challengeUrl);
  el.setAttribute("language", options.locale);
  el.setAttribute("type", "checkbox");
  // Solving starts when the visitor first focuses the form, so it is usually done before they reach Submit.
  el.setAttribute("auto", "onfocus");
  el.setAttribute("name", "altcha");
  el.setAttribute("configuration", JSON.stringify({ hideFooter: true, hideLogo: true, humanInteractionSignature: false }));
  const onState = (event: Event) => {
    const { state, payload } = (event as CustomEvent<{ state: string; payload: string | null }>).detail;
    if (state === "verified" && payload) {
      options.onToken(payload);
      options.onStatus("success");
      return;
    }
    options.onToken(null);
    options.onStatus(state === "verifying" ? "verifying" : state === "error" ? "failed" : "interactive");
  };
  el.addEventListener("statechange", onState);
  container.replaceChildren(el);
  return {
    reset: () => el.reset?.(),
    destroy: () => {
      el.removeEventListener("statechange", onState);
      container.replaceChildren();
    },
  };
}
