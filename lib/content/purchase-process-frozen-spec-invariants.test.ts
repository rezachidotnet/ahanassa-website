import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { homepageCopy } from "./homepage.ts";
import { purchaseStepIndex, PURCHASE_STEP_COUNT } from "./purchase-process.ts";
import { evaluationAxisIndex } from "./evaluation-assurance.ts";

/**
 * docs/purchase-process/AHANASSA_PURCHASE_PROCESS_FINAL_FROZEN_V2.0.md
 * acceptance-criteria regression coverage.
 *
 * Same convention as lib/content/evaluation-assurance-frozen-spec-invariants.ts
 * and hero-frozen-spec-invariants.ts: `lib/content/*.ts` is plain data and pure
 * functions (no `cloudflare:workers` dependency) so it is directly unit-testable;
 * the component itself is JSX and is pinned as source-text invariants instead,
 * because no React render-testing framework exists in this repo.
 *
 * The Persian strings below are deliberately duplicated character-for-character
 * from the frozen spec rather than imported from the module under test. That is
 * the entire point: an accidental copy edit must fail here loudly. They are
 * additionally cross-checked against the imported spec document itself, so this
 * file cannot drift from the authority it claims to encode.
 */

const REPO_ROOT = path.resolve(fileURLToPath(new URL(".", import.meta.url)), "../..");
const LOCALES = ["fa", "en", "ar"] as const;

function readSource(relativePath: string): string {
  return readFileSync(path.join(REPO_ROOT, relativePath), "utf8");
}

/**
 * Source with comments stripped. This component's doc comments legitimately
 * NAME the forbidden patterns (grid-cols, Reveal, CTA, next/link, icons, the
 * retired step copy) in order to explain why they are avoided, which would
 * otherwise produce false positives against every "must not contain X" check.
 */
function readCode(relativePath: string): string {
  return readSource(relativePath)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .split("\n")
    .filter((line) => !/^\s*(\/\/|\*)/.test(line))
    .join("\n");
}

const COMPONENT = "components/home/process.tsx";
const COMPONENT_SOURCE = readSource(COMPONENT);
const COMPONENT_CODE = readCode(COMPONENT);
const PAGE_CODE = readCode("app/[locale]/page.tsx");
const SPEC = readSource("docs/purchase-process/AHANASSA_PURCHASE_PROCESS_FINAL_FROZEN_V2.0.md");

const FA_H2 = "از ارسال درخواست تا خرید چه اتفاقی می‌افتد؟";
const FA_TITLES = ["ارسال درخواست", "بررسی درخواست", "دریافت پیشنهاد", "تأیید و پیگیری سفارش"];
const FA_BODIES = [
  "لیست خرید یا مشخصات نیاز خود را ارسال می‌کنید.",
  "درخواست بررسی می‌شود و اگر اطلاعاتی برای تکمیل آن لازم باشد، با شما هماهنگ می‌کنیم.",
  "پیشنهاد و شرایط مرتبط برای بررسی و تصمیم‌گیری شما ارائه می‌شود.",
  "پس از تأیید پیشنهاد، سفارش بر اساس شرایط توافق‌شده وارد مرحله اجرا و پیگیری می‌شود.",
];

// ---------------------------------------------------------------------------
// Spec fidelity — the pinned FA copy IS the imported frozen document's copy
// ---------------------------------------------------------------------------

test("every pinned Persian string appears verbatim in the imported frozen spec (§4, §6-§10)", () => {
  for (const frozen of [FA_H2, ...FA_TITLES, ...FA_BODIES]) {
    assert.ok(SPEC.includes(frozen), `the frozen spec document must literally contain: ${frozen}`);
  }
});

test("the imported spec is the V2.0 baseline this component claims to implement (§40)", () => {
  assert.ok(SPEC.includes("AHAN ASA HOMEPAGE — PURCHASE PROCESS — FINAL FROZEN V2.0"), "spec identity line must be intact");
  assert.ok(COMPONENT_SOURCE.includes("AHANASSA_PURCHASE_PROCESS_FINAL_FROZEN_V2.0.md"), "the component must cite its frozen authority");
  assert.ok(!COMPONENT_SOURCE.includes("HOMEPAGE_SPEC.md §12"), "the retired six-stage HOMEPAGE_SPEC authority must no longer be cited");
});

// ---------------------------------------------------------------------------
// Frozen content — §4, §6, §7.2, §8.2, §9.2, §10.2
// ---------------------------------------------------------------------------

test("the frozen Persian H2 is pinned character-for-character (§4)", () => {
  assert.equal(homepageCopy.fa.purchaseProcess.title, FA_H2);
});

test("the frozen Persian H2 is never one of the five generic headings §4 forbids", () => {
  for (const heading of ["روند خرید", "مراحل همکاری", "فرآیند ما", "نحوه کار ما", "مسیر تأمین"]) {
    assert.notEqual(homepageCopy.fa.purchaseProcess.title, heading, `§4 forbids "${heading}" as this component's H2`);
  }
});

test("the four frozen Persian step titles are pinned, in the frozen order (§6)", () => {
  assert.deepEqual(homepageCopy.fa.purchaseProcess.steps.map((s) => s.title), FA_TITLES);
});

test("the four frozen Persian step copies are pinned character-for-character (§7.2/§8.2/§9.2/§10.2)", () => {
  assert.deepEqual(homepageCopy.fa.purchaseProcess.steps.map((s) => s.body), FA_BODIES);
});

test("step 04 uses the repeatedly-frozen title, not §18's informal mobile mock-up variant", () => {
  // §10/§37/§39 all freeze "تأیید و پیگیری سفارش"; §18's illustration alone
  // says "تأیید و اجرا". The P0 audit resolved this in favour of the normative
  // sections and both acceptance matrices.
  assert.equal(homepageCopy.fa.purchaseProcess.steps[3].title, "تأیید و پیگیری سفارش");
  assert.notEqual(homepageCopy.fa.purchaseProcess.steps[3].title, "تأیید و اجرا");
});

test("the owner-approved English baseline is pinned (never strengthened past the Persian)", () => {
  const t = homepageCopy.en.purchaseProcess;
  assert.equal(t.title, "What happens from request submission through to purchase?");
  assert.deepEqual(t.steps.map((s) => s.title), ["Submit a request", "Request review", "Receive a proposal", "Approval and order follow-up"]);
  assert.deepEqual(t.steps.map((s) => s.body), [
    "You send your purchase list or the specifications of what you need.",
    "We review your request and, if any information is needed to complete it, we coordinate with you.",
    "A proposal and the related terms are presented for your review and decision.",
    "After you approve the proposal, the order moves into execution and follow-up based on the agreed terms.",
  ]);
});

test("the owner-approved Arabic baseline is pinned", () => {
  const t = homepageCopy.ar.purchaseProcess;
  assert.equal(t.title, "ماذا يحدث من إرسال الطلب حتى الشراء؟");
  assert.deepEqual(t.steps.map((s) => s.title), ["إرسال الطلب", "مراجعة الطلب", "استلام العرض", "التأكيد ومتابعة الطلب"]);
  assert.deepEqual(t.steps.map((s) => s.body), [
    "ترسل قائمة مشترياتك أو مواصفات احتياجك.",
    "تتم مراجعة طلبك، وإذا كانت هناك معلومات لازمة لاستكماله، نتواصل معك لاستكمالها.",
    "يُقدَّم لك العرض والشروط المرتبطة به لمراجعته واتخاذ القرار.",
    "بعد تأكيدك للعرض، ينتقل الطلب إلى مرحلة التنفيذ والمتابعة وفقًا للشروط المتفق عليها.",
  ]);
});

// ---------------------------------------------------------------------------
// Exactly four steps, and no retired fields — §6, §5, §23
// ---------------------------------------------------------------------------

test("every locale has exactly four steps — never five, never six (§6/§37/§39)", () => {
  assert.equal(PURCHASE_STEP_COUNT, 4);
  for (const locale of LOCALES) {
    assert.equal(homepageCopy[locale].purchaseProcess.steps.length, PURCHASE_STEP_COUNT, `${locale}: exactly four steps`);
  }
});

test("no supporting-paragraph field exists in any locale (§5/§39)", () => {
  for (const locale of LOCALES) {
    const t = homepageCopy[locale].purchaseProcess as unknown as Record<string, unknown>;
    assert.ok(!("body" in t), `${locale}: §5 freezes "H2 -> 4-step process", with no explanatory paragraph between them`);
    assert.ok(!("subtitle" in t), `${locale}: no subtitle field either`);
  }
});

test("no CTA field and no eyebrow field exist in any locale (§23/§4)", () => {
  for (const locale of LOCALES) {
    const t = homepageCopy[locale].purchaseProcess as unknown as Record<string, unknown>;
    assert.ok(!("cta" in t), `${locale}: §23 freezes "CTA = none" for V2.0`);
    assert.ok(!("eyebrow" in t), `${locale}: no eyebrow — every natural Persian candidate is on §4's forbidden list`);
  }
  for (const locale of LOCALES) {
    assert.deepEqual(Object.keys(homepageCopy[locale].purchaseProcess).sort(), ["steps", "title"], `${locale}: exactly title + steps`);
  }
});

test("each step carries exactly a title and a single body — never the retired input/activity/output triple", () => {
  for (const locale of LOCALES) {
    for (const step of homepageCopy[locale].purchaseProcess.steps) {
      assert.deepEqual(Object.keys(step).sort(), ["body", "title"], `${locale}: a step is a title plus one paragraph`);
    }
  }
});

test("no locale ships an empty, placeholder, or duplicated step (§29 — raw keys/placeholders are a release FAIL)", () => {
  for (const locale of LOCALES) {
    const t = homepageCopy[locale].purchaseProcess;
    for (const s of [t.title, ...t.steps.flatMap((x) => [x.title, x.body])]) {
      assert.ok(s.length > 0, `${locale}: no empty string`);
      assert.ok(!/undefined|TODO|TBD|Lorem|\{\{|\}\}/i.test(s), `${locale}: placeholder/raw key leaked: ${s}`);
    }
    assert.equal(new Set(t.steps.map((s) => s.title)).size, 4, `${locale}: step titles must be distinct`);
    assert.equal(new Set(t.steps.map((s) => s.body)).size, 4, `${locale}: step copies must be distinct`);
  }
});

// ---------------------------------------------------------------------------
// Legacy six-stage model is retired FROM THE HOMEPAGE — P0 audit P1 finding 1
// ---------------------------------------------------------------------------

test("the Homepage Process component no longer reads the legacy six-stage copy", () => {
  assert.ok(COMPONENT_CODE.includes("homepageCopy[locale].purchaseProcess"), "the component must consume the frozen four-step field");
  assert.ok(!/homepageCopy\[locale\]\.process\b/.test(COMPONENT_CODE), "the legacy `process` field must not be read by the Homepage component");
});

test("no retired six-stage step survives in the frozen four-step copy (§12/§13)", () => {
  const retired = [
    "ارزیابی تأمین", "پیشنهاد و تصمیم", "تأیید خرید", "هماهنگی تأمین و تحویل", "بررسی نیاز",
    "Sourcing evaluation", "Proposal & decision", "Purchase confirmation", "Sourcing & delivery coordination", "Requirement review",
    "تقييم التوريد", "العرض والقرار", "تأكيد الشراء", "تنسيق التوريد والتسليم", "مراجعة الاحتياج",
  ];
  for (const locale of LOCALES) {
    const text = JSON.stringify(homepageCopy[locale].purchaseProcess);
    for (const phrase of retired) {
      assert.ok(!text.includes(phrase), `${locale}: retired six-stage step "${phrase}" must not reappear`);
    }
  }
});

test("no internal procurement theater or supplier-chain narration in any locale (§12/§13)", () => {
  const forbidden = [
    "تأمین‌کننده", "مقایسه گزینه‌های تأمین", "سفارش خرید", "انبار", "حسابداری",
    "supplier", "purchase order", "warehouse", "accounting", "invoice matching", "comparison matrix", "manager approval",
    "المورد", "أمر شراء", "المستودع", "المحاسبة",
  ];
  for (const locale of LOCALES) {
    const text = JSON.stringify(homepageCopy[locale].purchaseProcess).toLowerCase();
    for (const phrase of forbidden) {
      assert.ok(!text.includes(phrase.toLowerCase()), `${locale}: §12/§13 forbid exposing "${phrase}" in the public process`);
    }
  }
});

test("no Evaluation/Assurance criteria leak into the Process steps (§8.3 boundary)", () => {
  const evaluationOnly = [
    "گرید", "استاندارد", "مدارک فنی", "شرایط پرداخت", "مبنای تحویل", "امکان تأمین",
    "grade", "standard", "payment terms", "incoterm", "delivery basis", "sourcing feasibility", "technical documentation",
    "الدرجة", "شروط الدفع", "أساس التسليم", "إمكانية التوريد",
  ];
  for (const locale of LOCALES) {
    const text = JSON.stringify(homepageCopy[locale].purchaseProcess).toLowerCase();
    for (const phrase of evaluationOnly) {
      assert.ok(!text.includes(phrase.toLowerCase()), `${locale}: §8.3 assigns "${phrase}" to Evaluation/Assurance, not to Process`);
    }
  }
});

test("the legacy `process` field is intentionally retained for /services and /contact, and is documented as out of scope", () => {
  // Reshaping it would have broken two pages this task is not authorised to
  // restructure. Recorded here so its survival is a deliberate, visible
  // decision rather than an oversight — see the P1 implementation report.
  for (const locale of LOCALES) {
    assert.ok("process" in (homepageCopy[locale] as unknown as Record<string, unknown>), `${locale}: /services and /contact still consume this`);
  }
  const homepageSource = readSource("lib/content/homepage.ts");
  assert.ok(homepageSource.includes("LEGACY six-stage procurement narrative"), "the legacy field must carry its out-of-scope warning");
  for (const page of ["app/[locale]/services/page.tsx", "app/[locale]/contact/page.tsx"]) {
    assert.ok(readSource(page).includes("homepageCopy[locale].process"), `${page} still depends on the legacy field`);
  }
});

// ---------------------------------------------------------------------------
// Homepage sequence — §3, SUPERSEDED FOR THE HOMEPAGE
//
// V2.0 §3 placed this component on the Homepage after Evaluation/Assurance.
// That placement — and ONLY that placement — is superseded by
// docs/homepage/AHANASSA_HOMEPAGE_COMPOSITION_AND_CUSTOMER_JOURNEY_FREEZE_V1.0.md
// §8, which records Purchase Process V2.0 as "RETAINED OUTSIDE HOMEPAGE" for
// the future dedicated /process page, and §19.6.
//
// "Retained outside the Homepage" is deliberately NOT "globally superseded":
// Composition §12 assigns detailed process education to /process, and the
// Buyer Value freeze §21 says in terms that "Purchase Process remains a
// separate retained specification for the future /process page and is not
// superseded by this component." Every other assertion in this file — the
// frozen four steps, the <ol> semantics, the no-2x2 layout proof, the
// claim-safety rules — therefore remains fully in force and untouched.
// ---------------------------------------------------------------------------

test("the Homepage no longer renders Purchase Process as an independent section (Composition V1.0 §8/§19.6)", () => {
  assert.ok(!/<Process[\s/>]/.test(PAGE_CODE), "Composition §16.6: Purchase Process must not appear as an independent Homepage section");
  assert.ok(!/from "@\/components\/home\/process"/.test(PAGE_CODE), "the superseded Homepage import must be gone");
});

test("RETAINED OUTSIDE HOMEPAGE — the component, its copy and its spec all survive intact", () => {
  // Composition §8: historical specifications and files "SHOULD NOT be deleted
  // solely because they are no longer active", and this one is not even
  // historical — it is reserved for /process. Deleting any of it would be the
  // over-deletion this test exists to prevent.
  assert.ok(existsSync(path.join(REPO_ROOT, COMPONENT)), `${COMPONENT} must NOT be deleted — it is reserved for the future /process page`);
  assert.ok(existsSync(path.join(REPO_ROOT, "docs/purchase-process/AHANASSA_PURCHASE_PROCESS_FINAL_FROZEN_V2.0.md")), "the frozen V2.0 spec must be retained, not removed");
  for (const locale of LOCALES) {
    assert.ok("purchaseProcess" in (homepageCopy[locale] as unknown as Record<string, unknown>), `${locale}: the retained four-step copy must survive for /process`);
  }
});

test("no link to a /process route is invented while that route does not exist (§12)", () => {
  // Composition §12 permits a contextual link to /process, but the
  // implementation checklist is explicit: "Do not add links to a nonexistent
  // route." No such route exists in this repository yet.
  assert.ok(!existsSync(path.join(REPO_ROOT, "app/[locale]/process")), "if /process is ever created, this guard must be revisited deliberately");
  assert.ok(!/["'`]\/process["'`]/.test(PAGE_CODE), "the Homepage must not link to a route that does not exist");
});

test("the tail of the Homepage sequence is preserved: Buyer Value -> Industries -> Final CTA (Composition §4)", () => {
  // The Industries slot's occupant changed in the Industries V1.0 phase:
  // `<Reach>` was superseded for the Homepage by `<Industries>` (retained, not
  // deleted — asserted in homepage-composition-invariants.test.ts). What this
  // test guards is unchanged: Purchase Process must not reappear anywhere in
  // this tail, and the tail order itself must hold.
  const buyerValue = PAGE_CODE.indexOf("<BuyerValue");
  const industries = PAGE_CODE.indexOf("<Industries");
  const finalCta = PAGE_CODE.indexOf("<CtaBand");

  assert.ok(buyerValue > -1 && industries > -1 && finalCta > -1, "all three sections must render");
  assert.ok(buyerValue < industries, "§4: conditional Industries follows Buyer Value");
  assert.ok(industries < finalCta, "§4/§16.14: the Final CTA closes the content journey");
  assert.ok(!/<Process[\s/>]/.test(PAGE_CODE.slice(buyerValue)), "Purchase Process must not reappear in the Homepage tail");
});

// ---------------------------------------------------------------------------
// Semantic HTML — §16, §17, §30
// ---------------------------------------------------------------------------

test("the section is labelled by its own h2 (§17)", () => {
  assert.match(COMPONENT_CODE, /<section [^>]*aria-labelledby=\{HEADING_ID\}/, "the section must carry aria-labelledby");
  assert.match(COMPONENT_CODE, /<h2 id=\{HEADING_ID\}/, "the h2 must carry the matching id");
});

test("the steps are an ORDERED list — <ol>, never <ul> (§17: the inverse of Evaluation/Assurance)", () => {
  assert.ok(COMPONENT_CODE.includes("<ol"), "the steps must render as an <ol>");
  assert.ok(COMPONENT_CODE.includes("</ol>"), "the <ol> must be closed");
  assert.ok(!/<ul[\s>]/.test(COMPONENT_CODE), "§17: a <ul> would drop the chronological semantics this component exists to assert");

  // The deliberate, meaningful divergence from the sibling frozen component.
  const evaluationCode = readCode("components/home/evaluation-assurance.tsx");
  assert.ok(evaluationCode.includes("<ul"), "Evaluation/Assurance must keep its <ul> — its axes are criteria, not steps");
  assert.ok(!/<ol[\s>]/.test(evaluationCode), "Evaluation/Assurance must never gain an <ol>");
});

test("heading hierarchy is h2 for the section and h3 per step, with the index never a heading (§30)", () => {
  assert.equal((COMPONENT_CODE.match(/<h2[\s>]/g) ?? []).length, 1, "exactly one h2");
  assert.equal((COMPONENT_CODE.match(/<h3[\s>]/g) ?? []).length, 1, "exactly one h3 element (rendered once per step in the map)");
  assert.ok(!/<h1[\s>]|<h4[\s>]/.test(COMPONENT_CODE), "no h1 (the Hero owns it) and no h4");
  assert.ok(!/<h[1-6][^>]*>\s*\{purchaseStepIndex/.test(COMPONENT_CODE), "§16: the decorative number must never be a heading");
});

test("each step body is a single <p> — never a <dl> of input/activity/output (§17)", () => {
  assert.match(COMPONENT_CODE, /<p[^>]*>\{step\.body\}<\/p>/, "each step copy must be one paragraph");
  assert.equal((COMPONENT_CODE.match(/<p[\s>]/g) ?? []).length, 1, "exactly one <p> element, rendered once per step");
  for (const tag of ["<dl", "<dt", "<dd"]) {
    assert.ok(!COMPONENT_CODE.includes(tag), `the retired description-list framing "${tag}" must be gone`);
  }
  assert.ok(!/\binput\b|\bactivity\b|\boutput\b/i.test(COMPONENT_CODE), "the retired input/activity/output labels must be gone");
});

// ---------------------------------------------------------------------------
// Index / digit policy — §16, §32
// ---------------------------------------------------------------------------

test("decorative indexes use the frozen per-locale digit script (§32)", () => {
  const expected = { fa: ["۰۱", "۰۲", "۰۳", "۰۴"], ar: ["٠١", "٠٢", "٠٣", "٠٤"], en: ["01", "02", "03", "04"] } as const;
  for (const locale of LOCALES) {
    assert.deepEqual([0, 1, 2, 3].map((i) => purchaseStepIndex(locale, i)), [...expected[locale]], `${locale}: frozen digit script`);
  }
});

test("digit scripts are never mixed within one locale (§32)", () => {
  const scripts = { fa: /^[۰-۹]+$/, ar: /^[٠-٩]+$/, en: /^[0-9]+$/ } as const;
  for (const locale of LOCALES) {
    for (let i = 0; i < 4; i += 1) {
      const value = purchaseStepIndex(locale, i);
      assert.match(value, scripts[locale], `${locale}: index ${i} must use only that locale's digit script`);
      assert.equal(value.length, 2, `${locale}: index ${i} must be the zero-padded two-digit form`);
    }
  }
});

test("the duplicated locale-digit helpers cannot silently drift apart", () => {
  // purchaseStepIndex is deliberately NOT shared with evaluationAxisIndex —
  // the two frozen specs assert opposite semantics for their numbers and
  // reopening a frozen module to share four lines was judged the worse trade.
  // This pins the behavioural equivalence that justifies that choice.
  for (const locale of LOCALES) {
    for (let i = 0; i < 4; i += 1) {
      assert.equal(purchaseStepIndex(locale, i), evaluationAxisIndex(locale, i), `${locale}: index ${i} must agree with the sibling helper`);
    }
  }
});

test("the decorative index is always aria-hidden and uses tabular figures (§16/§32)", () => {
  const indexSpan = /<span aria-hidden="true" className="([^"]*)">\s*\{purchaseStepIndex\(locale, i\)\}/.exec(COMPONENT_CODE);
  assert.ok(indexSpan, "the index must render inside an aria-hidden span");
  assert.match(indexSpan![1], /\btabular-nums\b/, "§32 requires tabular figures");
  assert.match(indexSpan![1], /\btext-copper\b/, "§20 requires a restrained copper step marker");
  assert.ok(!/rounded|bg-|border|animate/.test(indexSpan![1]), "§22: never styled as a filled status node or step badge");
});

test("the index is derived, never stored as content — so it cannot drift from DOM order (§32)", () => {
  for (const locale of LOCALES) {
    const text = JSON.stringify(homepageCopy[locale].purchaseProcess);
    for (const digits of ["۰۱", "٠١", '"01"', "index"]) {
      assert.ok(!text.includes(digits), `${locale}: the visible index must not be stored in the copy module (${digits})`);
    }
  }
});

// ---------------------------------------------------------------------------
// Visual architecture — §14, §15, §18, §19, §38.3/§38.4
// ---------------------------------------------------------------------------

test("NO 2x2 and no grid of any kind at any breakpoint (§14/§38.3 — the primary regression gate)", () => {
  assert.ok(!/grid-cols/.test(COMPONENT_CODE), "§14: a column grid is exactly how the forbidden 2-up state was produced");
  assert.ok(!/\bgrid\b/.test(COMPONENT_CODE), "§15: no grid display at all — this is a timeline, not a card grid");
  // The retired implementation's exact class pair, pinned so it can never return.
  assert.ok(!COMPONENT_CODE.includes("sm:grid-cols-2"), "the retired 2-column intermediate state must never return");
  assert.ok(!COMPONENT_CODE.includes("lg:grid-cols-3"), "the retired 3-column desktop grid must never return");
});

test("the step list is a single non-wrapping flex line: vertical when narrow, horizontal at lg (§14/§18/§19)", () => {
  const ol = /<ol className="([^"]*)"/.exec(COMPONENT_CODE);
  assert.ok(ol, "the step list's className must be inspectable");
  const cls = ol![1];
  assert.match(cls, /\bflex\b/, "§14: a flex line, not a grid");
  assert.match(cls, /\bflex-col\b/, "§18: vertical timeline when narrow");
  assert.match(cls, /\blg:flex-row\b/, "§14: horizontal timeline on desktop");
  // `flex-wrap` defaults to nowrap; any wrap utility here would reintroduce a
  // second row, i.e. the forbidden 2x2 (§38.3).
  assert.ok(!/\bflex-wrap\b|\bwrap\b/.test(cls), "§38.3: the list must never be allowed to wrap onto a second row");
  assert.ok(!/(^|\s)(rounded|shadow|bg-|border)/.test(cls), "§15/§20: the list itself must not be a boxed surface");
});

test("steps are not cards — no borders, boxes, shadows, or hover affordance (§15/§20/§38.4)", () => {
  const li = /<li key=\{step\.title\} className="([^"]*)"/.exec(COMPONENT_CODE);
  assert.ok(li, "the step className must be inspectable");
  assert.ok(
    !/\bborder(?!-)|rounded|shadow|backdrop-blur|bg-white|bg-background|bg-surface/.test(li![1]),
    `§15: steps must not be independent floating cards — got "${li![1]}"`,
  );
  assert.ok(!/hover:|group-hover:|cursor-pointer|transition/.test(COMPONENT_CODE), "steps must never appear clickable");
});

test("a static connector communicates chronology and can never animate or fill (§14/§21/§22)", () => {
  const connector = /<span aria-hidden="true" className="([^"]*)" \/>/.exec(COMPONENT_CODE);
  assert.ok(connector, "a decorative connector span must exist");
  const cls = connector![1];
  assert.match(cls, /\bbg-copper\/40\b/, "§20: restrained copper connector accent");
  assert.match(cls, /\bw-px\b/, "§18: a 1px vertical rule in the narrow/vertical timeline");
  assert.match(cls, /\blg:h-px\b/, "§14: a 1px horizontal rule in the desktop timeline");
  assert.ok(!/animate|transition|duration|ease-|\[width|\[height|progress/.test(cls), "§21: the connector must never animate or progressively fill");
  // Rendered for every step but the last, so the line ends on step 04.
  assert.match(COMPONENT_CODE, /\{i < lastIndex &&/, "the trailing connector after the final step must be omitted");
});

test("the connector uses logical, direction-aware properties only (§33)", () => {
  assert.ok(!/\bml-|\bmr-|\bpl-|\bpr-|\bleft-|\bright-|border-l|border-r|text-left|text-right/.test(COMPONENT_CODE), "§33: no physical direction utilities — FA/AR RTL and EN LTR share one implementation");
  assert.ok(!/rtl:|ltr:/.test(COMPONENT_CODE), "§33: no manually mirrored per-direction variant should be necessary");
  assert.match(COMPONENT_CODE, /\blg:ms-4\b/, "the connector's inset from the index must be logical (ms), not physical");
});

test("the surface is clean white with navy typography, contrasting the warm section above (§20)", () => {
  assert.match(COMPONENT_CODE, /\bbg-background\b/, "§20: clean light/white surface");
  assert.match(COMPONENT_CODE, /\btext-navy\b/, "§20: navy typography");
  assert.ok(!/bg-navy|bg-black|from-|via-|to-|bg-gradient|backdrop-blur/.test(COMPONENT_CODE), "§20 forbids a dark industrial background, gradients, and glassmorphism");
  assert.ok(!/bg-\[var\(--aa-color-bg-warm\)\]/.test(COMPONENT_CODE), "§20: this section must contrast with Evaluation/Assurance's warm cream, not repeat it");
});

test("no icons and no images (§15/§39)", () => {
  assert.ok(!/from "next\/image"/.test(COMPONENT_CODE), "no next/image import");
  assert.ok(!/from "lucide-react"/.test(COMPONENT_CODE), "no icon library import");
  assert.ok(!/<Image[\s/>]|<img[\s/>]|<svg[\s>]/.test(COMPONENT_CODE), "no image or inline svg element");
  assert.ok(!/\.png|\.jpg|\.jpeg|\.webp|\.svg|background-image|bg-\[url\(/.test(COMPONENT_CODE), "no image asset or decorative background image");
  for (const icon of ["ArrowUpRight", "Check", "CheckCircle", "ArrowRight", "ChevronRight"]) {
    assert.ok(!COMPONENT_CODE.includes(icon), `§15 forbids a decorative ${icon} icon, and §22 forbids a completion checkmark`);
  }
});

test("no CTA, button, or link of any kind (§23)", () => {
  assert.ok(!/from "next\/link"/.test(COMPONENT_CODE), "no next/link import");
  assert.ok(!/<Link[\s/>]|<a[\s>]|<button[\s>]|<Button[\s/>]/.test(COMPONENT_CODE), "no link or button element");
  assert.ok(!/\bhref\b/.test(COMPONENT_CODE), "no href anywhere");
  assert.ok(!/localizedPath/.test(COMPONENT_CODE), "no route helper — this section navigates nowhere");
  assert.ok(!/SectionHeading/.test(COMPONENT_CODE), "§5: SectionHeading's required eyebrow would mean inventing §4-forbidden copy");
});

// ---------------------------------------------------------------------------
// Interaction / motion / failure behavior — §21, §22, §28, §29
// ---------------------------------------------------------------------------

test("no interaction, disclosure, carousel, or fake-clickable affordance (§36/§38.13)", () => {
  for (const pattern of ["<details", "<summary", 'role="tab"', "aria-expanded", "aria-controls", "onClick", "onMouseEnter", "cursor-pointer", "tabIndex", "peer-", "snap-", "overflow-x", "sticky", "title="]) {
    assert.ok(!COMPONENT_CODE.includes(pattern), `§36/§38.13 forbid "${pattern}" — no step may be hidden behind interaction`);
  }
});

test("no fake live-progress or order-status styling (§22/§38.6)", () => {
  for (const pattern of ["completed", "in-progress", "aria-current", "isActive", "isCurrent", "isComplete", "checkmark", "progressbar", "role=\"progressbar\""]) {
    assert.ok(!COMPONENT_CODE.toLowerCase().includes(pattern.toLowerCase()), `§22: "${pattern}" would make this resemble a live order tracker`);
  }
});

test("zero dedicated JS — a server component with no client state, no reveal, no fetch (§28)", () => {
  assert.ok(!COMPONENT_SOURCE.includes('"use client"'), "must remain a server component");
  assert.ok(!/useState|useEffect|useRef|useMemo|fetch\(|useSWR|useQuery/.test(COMPONENT_CODE), "no client-side state or fetching");
  assert.ok(!/<Reveal[\s/>]|from "@\/components\/ui\/reveal"/.test(COMPONENT_CODE), "§28 targets 0 dedicated interaction JS — SSR, JS-off, and reduced-motion must be the same render");
  assert.ok(!/<noscript[\s>]/.test(COMPONENT_CODE), "a <noscript> duplicate would be the wrong fix for a problem this component does not have");
});

test("no opacity-0 or visibility hiding — no step can ever be stranded invisible (§29)", () => {
  assert.ok(!/opacity-0|\binvisible\b|visibility:\s*hidden|display:\s*none/.test(COMPONENT_CODE), "nothing in this section may start hidden");
  for (const className of COMPONENT_CODE.match(/className="[^"]*"/g) ?? []) {
    assert.ok(!/\bhidden\b|\bsr-only\b/.test(className), `no content may be visually hidden: ${className}`);
  }
});

// ---------------------------------------------------------------------------
// Data boundary — §27
// ---------------------------------------------------------------------------

test("zero data dependency: no Odoo, DB_PUBLIC, projections, RFQ state, or pricing (§27)", () => {
  const source = COMPONENT_SOURCE.replace(/\/\*[\s\S]*?\*\//g, "");
  for (const pattern of ["cloudflare:workers", "DB_PUBLIC", "DB_OPS", "odoo", "Odoo", "@/lib/catalog", "@/lib/pricing", "@/lib/processing", "listHomepageProductCandidates", "getHomepagePriceStrip", "rfq"]) {
    assert.ok(!source.includes(pattern), `§27 forbids a "${pattern}" dependency in this editorial component`);
  }
  const imports = [...COMPONENT_CODE.matchAll(/^import .*? from "([^"]+)";$/gm)].map((m) => m[1]);
  assert.deepEqual(imports.sort(), ["@/config/locales", "@/lib/content/homepage", "@/lib/content/purchase-process"]);
});

test("the section always renders — it has no data-driven omission path", () => {
  assert.ok(!/return null/.test(COMPONENT_CODE), "the section must always render (§29: RFQ/Odoo unavailable -> no effect)");
});

// ---------------------------------------------------------------------------
// Claim safety — §9.3, §24, §25, §26, §38
// ---------------------------------------------------------------------------

test("no prohibited marketing, SLA, or ownership claim in any locale's copy (§9.3/§25/§26/§38)", () => {
  const forbidden = [
    // FA
    "بهترین قیمت", "ارزان‌ترین", "تضمین", "تضمین‌شده", "بدون ریسک", "بدون واسطه", "فروش مستقیم کارخانه",
    "تولید مستقیم", "پشتیبانی ۲۴", "کارشناس اختصاصی", "تأمین‌کننده تأییدشده", "سریع‌ترین",
    // EN
    "best price", "cheapest", "lowest price", "guarantee", "guaranteed", "risk-free", "risk free",
    "trusted supplier", "approved supplier", "vetted supplier", "factory-direct", "factory direct",
    "no middleman", "without intermediaries", "24/7", "24-7", "dedicated account manager", "within 24 hours",
    // AR
    "أفضل سعر", "الأرخص", "ضمان", "مضمون", "بدون وسيط", "مورد معتمد", "مدير حساب مخصص",
  ];
  for (const locale of LOCALES) {
    const text = JSON.stringify(homepageCopy[locale].purchaseProcess).toLowerCase();
    for (const phrase of forbidden) {
      assert.ok(!text.includes(phrase.toLowerCase()), `${locale}: prohibited claim "${phrase}" must never appear in this component`);
    }
  }
});

test("no timing or SLA number is published without governed evidence (§26/§38.11)", () => {
  for (const locale of LOCALES) {
    const t = homepageCopy[locale].purchaseProcess;
    for (const s of [t.title, ...t.steps.flatMap((x) => [x.title, x.body])]) {
      assert.ok(!/\d/.test(s), `${locale}: no bare numeral belongs in this copy (a timing/SLA claim risk): ${s}`);
    }
  }
});

test("no unavailable request-input capability is claimed (§7.3)", () => {
  const unavailable = ["OCR", "voice", "صوتی", "نقشه‌خوانی", "Excel", "اکسل", "PDF", "صوت"];
  for (const locale of LOCALES) {
    const text = JSON.stringify(homepageCopy[locale].purchaseProcess);
    for (const phrase of unavailable) {
      assert.ok(!text.includes(phrase), `${locale}: §7.3 forbids claiming "${phrase}" support before it is public and validated`);
    }
  }
});

test("the customer-approval-before-execution gate is preserved in step 04 (§11/§38.9)", () => {
  assert.ok(homepageCopy.fa.purchaseProcess.steps[3].body.startsWith("پس از تأیید پیشنهاد"), "FA step 04 must be conditioned on the customer's approval");
  assert.match(homepageCopy.en.purchaseProcess.steps[3].body, /^After you approve the proposal/, "EN step 04 must be conditioned on the customer's approval");
  assert.match(homepageCopy.ar.purchaseProcess.steps[3].body, /^بعد تأكيدك للعرض/, "AR step 04 must be conditioned on the customer's approval");
});

test("no prohibited claim is hardcoded in the component source either", () => {
  const text = COMPONENT_CODE.toLowerCase();
  for (const phrase of ["best price", "guaranteed", "risk-free", "factory direct", "no middleman", "24/7", "بهترین قیمت", "تضمین", "أفضل سعر"]) {
    assert.ok(!text.includes(phrase.toLowerCase()), `prohibited claim "${phrase}" must not be hardcoded in the component`);
  }
});

test("the component holds no copy of its own — all user-facing text comes from the localized content module (§29)", () => {
  const jsxText = COMPONENT_CODE.match(/>\s*[A-Za-z؀-ۿ][^<>{}]{2,}\s*</g) ?? [];
  assert.deepEqual(jsxText, [], `no literal user-facing text may live in the component: ${JSON.stringify(jsxText)}`);
});
