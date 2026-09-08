import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { homepageCopy } from "./homepage.ts";
import { buyerValuePromiseIndex, BUYER_VALUE_PROMISE_COUNT } from "./buyer-value.ts";

/**
 * docs/buyer-value/AHANASSA_BUYER_VALUE_SERVICE_PROMISE_COMPONENT_FREEZE_V1.0.md
 * acceptance-criteria regression coverage (§19).
 *
 * Same convention as lib/content/evaluation-assurance-frozen-spec-invariants.test.ts
 * and lib/content/purchase-process-frozen-spec-invariants.test.ts:
 * `lib/content/*.ts` is plain data and pure functions (no `cloudflare:workers`
 * dependency) so it is directly unit-testable; the component itself is JSX and
 * is pinned as source-text invariants instead, because no React
 * render-testing framework exists in this repo.
 *
 * Every canonical string is additionally cross-checked against the imported
 * freeze document itself, so this file cannot drift from the authority it
 * claims to encode — and a re-translation, paraphrase or "improvement" of the
 * approved FA/EN/AR copy fails here loudly rather than shipping.
 */

const REPO_ROOT = path.resolve(fileURLToPath(new URL(".", import.meta.url)), "../..");
const LOCALES = ["fa", "en", "ar"] as const;

function readSource(relativePath: string): string {
  return readFileSync(path.join(REPO_ROOT, relativePath), "utf8");
}

/**
 * Source with comments stripped. This component's doc comments legitimately
 * NAME the forbidden patterns (the `.eyebrow` utility, CTA, icons, shadows,
 * `grid-cols`, Reveal, "opacity: 0") in order to explain why they are avoided,
 * which would otherwise produce false positives against every "must not
 * contain X" check below.
 */
function readCode(relativePath: string): string {
  return readSource(relativePath)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .split("\n")
    .filter((line) => !/^\s*(\/\/|\*)/.test(line))
    .join("\n");
}

const COMPONENT = "components/home/buyer-value.tsx";
const COMPONENT_SOURCE = readSource(COMPONENT);
const COMPONENT_CODE = readCode(COMPONENT);
const PAGE_CODE = readCode("app/[locale]/page.tsx");
const SPEC_PATH = "docs/buyer-value/AHANASSA_BUYER_VALUE_SERVICE_PROMISE_COMPONENT_FREEZE_V1.0.md";
const SPEC = readSource(SPEC_PATH);

// The canonical copy, duplicated character-for-character from the freeze
// rather than imported from the module under test. That duplication IS the
// test: an accidental copy edit must fail here.
const FA = {
  eyebrow: "همراهی در خرید",
  title: "آهن آسا چگونه خرید آهن را برای شما آسان می‌کند؟",
  body: "از زمان ارسال درخواست تا انجام تعهدات توافق‌شده، بررسی، هماهنگی و پیگیری خرید شما در یک مسیر مشخص ادامه پیدا می‌کند.",
  titles: [
    "یک کارشناس واقعی، همراه خرید شماست",
    "اقلام متنوع، در یک مسیر هماهنگ",
    "کوچک یا عمده، درخواست شما جدی است",
    "پیگیری تا تحویل کالا ادامه دارد",
  ],
  bodies: [
    "درخواست شما صرفاً یک فرم یا شماره پیگیری نیست؛ یک کارشناس از زمان ارسال درخواست تا انجام تعهدات توافق‌شده، پاسخ‌گو و پیگیر آن است.",
    "فرقی نمی‌کند درخواست شما یک قلم مشخص باشد یا فهرستی از محصولات با مشخصات و شرایط متفاوت؛ بررسی و هماهنگی آن‌ها در یک مسیر منسجم انجام می‌شود.",
    "حجم سفارش، معیار کیفیت توجه ما نیست؛ هر درخواست با استاندارد مشخصی از بررسی، شفافیت و پیگیری دنبال می‌شود.",
    "کار ما با تأیید پیشنهاد تمام نمی‌شود؛ سفارش تا انجام تعهدات توافق‌شده پیگیری می‌شود و در صورت نیاز و توافق، هماهنگی بارگیری و حمل نیز انجام خواهد شد.",
  ],
};

const EN = {
  eyebrow: "Support throughout your purchase",
  title: "How does Ahan Asa make buying steel easier for you?",
  body: "From submitting your request through completion of the agreed commitments, your purchase follows a clear path of review, coordination, and follow-up.",
  titles: [
    "A real specialist stays with your request",
    "Diverse items, one coordinated path",
    "Small or bulk, your request matters",
    "Follow-up continues through delivery",
  ],
  bodies: [
    "Your request is more than a form or tracking number. A specialist remains available to answer questions and follow it through completion of the agreed commitments.",
    "Whether you need one specific item or a list of products with different specifications and conditions, their review and coordination are handled through one consistent path.",
    "Order volume does not determine the quality of our attention. Every request follows a defined standard of review, clarity, and follow-up.",
    "Our work does not end when you approve the proposal. We follow the order through the agreed commitments and, when needed and agreed, coordinate loading and transport as well.",
  ],
};

const AR = {
  eyebrow: "مرافقة خلال رحلة الشراء",
  title: "كيف تجعل آهن آسا شراء الحديد أسهل بالنسبة إليك؟",
  body: "من إرسال الطلب حتى تنفيذ الالتزامات المتفق عليها، تستمر مراجعة عملية الشراء وتنسيقها ومتابعتها ضمن مسار واضح.",
  titles: [
    "خبير حقيقي يرافق طلبك",
    "أصناف متنوعة ضمن مسار منسّق",
    "صغيراً كان أم بالجملة، يؤخذ طلبك بجدية",
    "تستمر المتابعة حتى استلام البضاعة",
  ],
  bodies: [
    "طلبك ليس مجرد نموذج أو رقم متابعة؛ يبقى خبير متاحاً للإجابة عن استفساراتك ومتابعة الطلب حتى تنفيذ الالتزامات المتفق عليها.",
    "سواء كان طلبك لصنف واحد محدد أو لقائمة منتجات بمواصفات وشروط مختلفة، تتم مراجعتها وتنسيقها ضمن مسار واحد ومنسجم.",
    "حجم الطلب لا يحدد مستوى اهتمامنا؛ فكل طلب يخضع لمعيار واضح من المراجعة والشفافية والمتابعة.",
    "لا ينتهي دورنا عند موافقتك على العرض؛ نتابع الطلب حتى تنفيذ الالتزامات المتفق عليها، وعند الحاجة وبالاتفاق، ننسق التحميل والنقل أيضاً.",
  ],
};

const CANONICAL = { fa: FA, en: EN, ar: AR } as const;

// ---------------------------------------------------------------------------
// Spec fidelity — the pinned copy IS the imported frozen document's copy
// ---------------------------------------------------------------------------

test("the frozen Buyer Value spec is imported into the repository", () => {
  assert.ok(existsSync(path.join(REPO_ROOT, SPEC_PATH)), `${SPEC_PATH} must exist — every assertion here is cross-checked against it`);
});

test("every pinned string appears verbatim in the imported frozen spec (§3, §4, §5)", () => {
  for (const locale of LOCALES) {
    const c = CANONICAL[locale];
    for (const frozen of [c.eyebrow, c.title, c.body, ...c.titles, ...c.bodies]) {
      assert.ok(SPEC.includes(frozen), `${locale}: the frozen spec document must literally contain: ${frozen}`);
    }
  }
});

// ---------------------------------------------------------------------------
// Canonical content — §3 (FA), §4 (EN), §5 (AR), §22.1, §22.2
// ---------------------------------------------------------------------------

for (const locale of LOCALES) {
  test(`${locale}: the canonical eyebrow, H2 and supporting statement are pinned character-for-character`, () => {
    const t = homepageCopy[locale].buyerValue;
    assert.equal(t.eyebrow, CANONICAL[locale].eyebrow);
    assert.equal(t.title, CANONICAL[locale].title);
    assert.equal(t.body, CANONICAL[locale].body);
  });

  test(`${locale}: exactly four promises, in the frozen order, pinned character-for-character (§19.3)`, () => {
    const promises = homepageCopy[locale].buyerValue.promises;
    assert.equal(promises.length, BUYER_VALUE_PROMISE_COUNT, "§22.2: exactly four service promises");
    assert.deepEqual(promises.map((p) => p.title), CANONICAL[locale].titles, "titles must be in the frozen order");
    assert.deepEqual(promises.map((p) => p.body), CANONICAL[locale].bodies, "bodies must be in the frozen order");
  });

  test(`${locale}: no promise field is empty or whitespace-only`, () => {
    const t = homepageCopy[locale].buyerValue;
    for (const value of [t.eyebrow, t.title, t.body, ...t.promises.flatMap((p) => [p.title, p.body])]) {
      assert.ok(value.trim().length > 0, "no frozen string may be blank");
    }
  });
}

test("the FA H2 is the exact canonical question the freeze names in §22.1", () => {
  assert.equal(homepageCopy.fa.buyerValue.title, "آهن آسا چگونه خرید آهن را برای شما آسان می‌کند؟");
  // Composition §6.4 quotes the same H2 — the two frozen documents must agree.
  const composition = readSource("docs/homepage/AHANASSA_HOMEPAGE_COMPOSITION_AND_CUSTOMER_JOURNEY_FREEZE_V1.0.md");
  assert.ok(composition.includes(homepageCopy.fa.buyerValue.title), "Composition §6.4 must name the same canonical H2");
});

test("the four FA message axes match Composition §6.4's independently frozen list", () => {
  const composition = readSource("docs/homepage/AHANASSA_HOMEPAGE_COMPOSITION_AND_CUSTOMER_JOURNEY_FREEZE_V1.0.md");
  for (const title of homepageCopy.fa.buyerValue.promises.map((p) => p.title)) {
    assert.ok(composition.includes(title), `Composition §6.4 must also contain the axis: ${title}`);
  }
});

test("the three locales are genuinely distinct translations, not copies of one another", () => {
  const titles = LOCALES.map((l) => homepageCopy[l].buyerValue.title);
  assert.equal(new Set(titles).size, LOCALES.length, "§17: localization must be human-readable, not duplicated");
});

// ---------------------------------------------------------------------------
// Claim safety — §6, §19.5, §19.6, §19.7
// ---------------------------------------------------------------------------

test("no prohibited superiority, guarantee or availability claim appears in any locale (§6)", () => {
  // Scoped deliberately to THIS component's copy only. A broad keyword sweep
  // across unrelated site content would be brittle and would fail on
  // legitimate wording elsewhere.
  const forbidden = [
    // FA
    "ارزان‌ترین", "بهترین", "بالاترین کیفیت", "سریع‌ترین", "تضمین", "تضمین‌شده",
    "تأمین تضمینی", "تحویل تضمینی", "همان شرایط تجاری",
    // EN
    "cheapest", "best price", "lowest price", "highest quality", "fastest",
    "guarantee", "guaranteed", "same commercial terms", "always available",
    // AR
    "الأرخص", "الأفضل", "أعلى جودة", "الأسرع", "ضمان", "مضمون", "نفس الشروط التجارية",
  ];
  for (const locale of LOCALES) {
    const text = JSON.stringify(homepageCopy[locale].buyerValue).toLowerCase();
    for (const phrase of forbidden) {
      assert.ok(!text.includes(phrase.toLowerCase()), `${locale}: §6 prohibits the claim "${phrase}" in this component`);
    }
  }
});

test("commitments stay QUALIFIED as agreed — never unlimited (§6)", () => {
  // §6: the approved copy "intentionally uses `تعهدات توافق‌شده` instead of an
  // unlimited 'all commitments' claim".
  assert.ok(homepageCopy.fa.buyerValue.body.includes("تعهدات توافق‌شده"), "FA supporting statement must carry the agreed-commitments qualifier");
  assert.ok(homepageCopy.en.buyerValue.body.includes("agreed commitments"), "EN supporting statement must carry the agreed-commitments qualifier");
  assert.ok(homepageCopy.ar.buyerValue.body.includes("الالتزامات المتفق عليها"), "AR supporting statement must carry the agreed-commitments qualifier");

  for (const forbidden of ["همه تعهدات", "all commitments", "every commitment", "جميع الالتزامات"]) {
    for (const locale of LOCALES) {
      assert.ok(!JSON.stringify(homepageCopy[locale].buyerValue).toLowerCase().includes(forbidden.toLowerCase()), `${locale}: the unlimited-commitment claim "${forbidden}" is prohibited`);
    }
  }
});

test("loading and transport remain conditional on need AND agreement (§6, §19.6)", () => {
  // §6: "`در صورت نیاز و توافق` for loading and transport". Promise 04 is the
  // only place transport is mentioned, and it must never become unconditional.
  assert.ok(homepageCopy.fa.buyerValue.promises[3].body.includes("در صورت نیاز و توافق"), "FA promise 04 must qualify loading/transport");
  assert.ok(homepageCopy.en.buyerValue.promises[3].body.includes("when needed and agreed"), "EN promise 04 must qualify loading/transport");
  assert.ok(homepageCopy.ar.buyerValue.promises[3].body.includes("وعند الحاجة وبالاتفاق"), "AR promise 04 must qualify loading/transport");

  for (const unconditional of ["حمل رایگان", "free transport", "free delivery", "we always deliver", "النقل مجاني"]) {
    for (const locale of LOCALES) {
      assert.ok(!JSON.stringify(homepageCopy[locale].buyerValue).toLowerCase().includes(unconditional.toLowerCase()), `${locale}: §6 prohibits unconditional transport inclusion ("${unconditional}")`);
    }
  }
});

test("small vs bulk promises equal ATTENTION, never equal commercial terms (§6, §19.7)", () => {
  // §6: "quality of attention and review, not identical pricing or commercial
  // conditions, for small and bulk requests". Promise 03 is that promise.
  const p3 = { fa: homepageCopy.fa.buyerValue.promises[2], en: homepageCopy.en.buyerValue.promises[2], ar: homepageCopy.ar.buyerValue.promises[2] };
  assert.ok(p3.fa.body.includes("کیفیت توجه"), "FA promise 03 must speak of quality of attention");
  assert.ok(p3.en.body.includes("quality of our attention"), "EN promise 03 must speak of quality of attention");
  assert.ok(p3.ar.body.includes("مستوى اهتمامنا"), "AR promise 03 must speak of level of attention");

  for (const priceClaim of ["قیمت یکسان", "same price", "identical price", "same terms", "نفس السعر"]) {
    for (const locale of LOCALES) {
      assert.ok(!JSON.stringify(homepageCopy[locale].buyerValue).toLowerCase().includes(priceClaim.toLowerCase()), `${locale}: §6 prohibits implying identical commercial terms across volumes ("${priceClaim}")`);
    }
  }
});

test("nothing implies that sending a request creates a binding purchase (§6)", () => {
  for (const binding of ["خرید قطعی", "سفارش قطعی", "binding", "purchase order is placed", "شراء ملزم", "طلب ملزم"]) {
    for (const locale of LOCALES) {
      assert.ok(!JSON.stringify(homepageCopy[locale].buyerValue).toLowerCase().includes(binding.toLowerCase()), `${locale}: §6 prohibits implying an RFQ is a binding purchase ("${binding}")`);
    }
  }
});

test("the component does not restate the Hero's four-step purchase journey (§1, Composition §7)", () => {
  // Composition §7 gives the "Short four-step purchase path" a SOLE owner: the
  // Hero. The Buyer Value copy must not reproduce those four step labels.
  for (const locale of LOCALES) {
    const buyerValueText = JSON.stringify(homepageCopy[locale].buyerValue);
    // Multi-word labels only. A single-word step such as the FA "خرید"
    // ("purchase") is an ordinary noun that legitimately appears in this
    // component's own approved copy ("خرید شما", "خرید آهن"); banning the bare
    // word would be a false positive, not a duplication of the journey. What
    // §7 actually forbids is restating the STEPS, which are the multi-word
    // labels. The structural proof that only the Hero renders the rail lives
    // in lib/content/homepage-composition-invariants.test.ts.
    for (const heroStep of homepageCopy[locale].hero.process.filter((s) => s.includes(" "))) {
      assert.ok(!buyerValueText.includes(heroStep), `${locale}: the Hero step "${heroStep}" must not be repeated by Buyer Value`);
    }
  }
});

test("it does not take over Evaluation/Assurance's checklist job either (§2)", () => {
  // §2: this component does NOT own "the detailed technical/commercial review
  // process". The retained Evaluation/Assurance axis titles must not migrate.
  for (const locale of LOCALES) {
    const buyerValueText = JSON.stringify(homepageCopy[locale].buyerValue);
    // Multi-word axis titles only, for the same reason as the Hero check
    // above: the FA axis "تحویل" ("delivery") is a plain noun this component's
    // own promise 04 legitimately uses.
    for (const axis of homepageCopy[locale].evaluationAssurance.axes.filter((a) => a.title.includes(" "))) {
      assert.ok(!buyerValueText.includes(axis.title), `${locale}: the evaluation axis "${axis.title}" belongs to the retained component, not here`);
    }
  }
});

// ---------------------------------------------------------------------------
// Decorative index — §7, §8
// ---------------------------------------------------------------------------

test("promise indexes are locale-scripted, zero-padded and derived, never stored as content (§7)", () => {
  assert.deepEqual([0, 1, 2, 3].map((i) => buyerValuePromiseIndex("fa", i)), ["۰۱", "۰۲", "۰۳", "۰۴"]);
  assert.deepEqual([0, 1, 2, 3].map((i) => buyerValuePromiseIndex("ar", i)), ["٠١", "٠٢", "٠٣", "٠٤"]);
  assert.deepEqual([0, 1, 2, 3].map((i) => buyerValuePromiseIndex("en", i)), ["01", "02", "03", "04"]);

  // Never persisted in the content module — §7's "the numbers communicate
  // grouping and scanability, not a chronological process".
  for (const locale of LOCALES) {
    const text = JSON.stringify(homepageCopy[locale].buyerValue);
    for (const digits of ["01", "02", "03", "04", "۰۱", "٠١"]) {
      assert.ok(!text.includes(digits), `${locale}: the index "${digits}" must be derived at render time, not stored as copy`);
    }
  }
});

// ---------------------------------------------------------------------------
// Semantic structure — §8, §16, §19.17
// ---------------------------------------------------------------------------

test("the section is labelled by its own h2 (§8, §16)", () => {
  assert.match(COMPONENT_CODE, /<section [^>]*aria-labelledby=\{HEADING_ID\}/, "the section must carry aria-labelledby");
  assert.match(COMPONENT_CODE, /<h2 id=\{HEADING_ID\}/, "the h2 must carry the matching id");
});

test("the promises are an UNORDERED list — <ul role=\"list\">, never <ol> (§8)", () => {
  assert.match(COMPONENT_CODE, /<ul role="list"/, "§8/§16: one semantic list, with role=\"list\" restoring semantics past Preflight's list-style:none");
  assert.ok(COMPONENT_CODE.includes("</ul>"), "the <ul> must be closed");
  assert.ok(!/<ol[\s>]/.test(COMPONENT_CODE), "§8: an <ol> would assert a chronology these four promises explicitly do not have");

  // The deliberate, meaningful divergence from the retained sibling component.
  const processCode = readCode("components/home/process.tsx");
  assert.ok(processCode.includes("<ol"), "Purchase Process must keep its <ol> — its steps ARE chronological");
});

test("heading hierarchy is one h2 plus an h3 per promise, and the index is never a heading (§16)", () => {
  assert.equal((COMPONENT_CODE.match(/<h2[\s>]/g) ?? []).length, 1, "exactly one h2");
  assert.equal((COMPONENT_CODE.match(/<h3[\s>]/g) ?? []).length, 1, "exactly one h3 element (rendered once per promise in the map)");
  assert.ok(!/<h1[\s>]|<h4[\s>]/.test(COMPONENT_CODE), "no h1 (the Hero owns the page's only h1) and no h4");
  assert.ok(!/<h[1-6][^>]*>\s*\{buyerValuePromiseIndex/.test(COMPONENT_CODE), "§7: the decorative number must never be a heading");
});

test("the decorative index is aria-hidden so it cannot be announced (§8, §16)", () => {
  assert.match(COMPONENT_CODE, /<span aria-hidden="true"[^>]*>\s*\{buyerValuePromiseIndex\(locale, i\)\}/, "the index span must be aria-hidden");
});

test("each promise renders exactly one h3 and one paragraph — no dl, no nested list (§7)", () => {
  assert.match(COMPONENT_CODE, /<h3[^>]*>\{promise\.title\}<\/h3>/, "each promise title must be one h3");
  assert.match(COMPONENT_CODE, /<p[^>]*>\{promise\.body\}<\/p>/, "each promise body must be one paragraph");
  for (const tag of ["<dl", "<dt", "<dd", "<table", "<details", "<summary"]) {
    assert.ok(!COMPONENT_CODE.includes(tag), `§14 forbids accordion/table framing — "${tag}" must not appear`);
  }
});

test("the rendered hierarchy is eyebrow -> h2 -> supporting statement -> promises (§7)", () => {
  const eyebrow = COMPONENT_CODE.indexOf("{t.eyebrow}");
  const h2 = COMPONENT_CODE.indexOf("<h2");
  const body = COMPONENT_CODE.indexOf("{t.body}");
  const list = COMPONENT_CODE.indexOf("<ul role=\"list\"");

  assert.ok(eyebrow > -1 && h2 > -1 && body > -1 && list > -1, "all four hierarchy levels must render");
  assert.ok(eyebrow < h2, "§7: the eyebrow precedes and must not compete with the H2");
  assert.ok(h2 < body, "§7: exactly one supporting statement follows the H2");
  assert.ok(body < list, "§7: the promise list comes last");
});

test("exactly one supporting statement is rendered, not several (§7)", () => {
  assert.equal((COMPONENT_CODE.match(/\{t\.body\}/g) ?? []).length, 1, "§7: 'one supporting statement'");
});

// ---------------------------------------------------------------------------
// Interaction and CTA policy — §14, §19.11, §19.17, §22.4
// ---------------------------------------------------------------------------

test("the component has NO CTA and nothing clickable at all (§14, §22.4)", () => {
  for (const f of ["<Link", "<button", "<a ", "href=", "onClick", "buttonVariants", "localizedPath"]) {
    assert.ok(!COMPONENT_CODE.includes(f), `§14: "${f}" would introduce a CTA or interaction this component must not have`);
  }
  assert.ok(!COMPONENT_SOURCE.includes('from "next/link"'), "§14/§22.4: no link import — conversion is owned by Header, Hero and Final CTA");
});

test("promise items do not appear clickable — no hover lift, pointer cursor or button border (§14, §19.11)", () => {
  for (const forbidden of ["cursor-pointer", "hover:-translate-y", "hover:translate-y", "hover:shadow", "group-hover", "hover:scale", "tabIndex", "role=\"button\""]) {
    assert.ok(!COMPONENT_CODE.includes(forbidden), `§14 forbids "${forbidden}" on non-interactive promise items`);
  }
});

test("no icons, no images, no stock imagery (§9.3, §19.12)", () => {
  for (const f of ["lucide-react", "next/image", "<Image", "<svg", "<img"]) {
    assert.ok(!COMPONENT_SOURCE.includes(f), `§9.3 prohibits generic stock icons and §9.1 prohibits an image panel — "${f}" must not appear`);
  }
});

test("no per-item card treatment: no shadow, no radius, no filled background (§9.3, §19.10)", () => {
  for (const forbidden of ["shadow-", "rounded", "bg-white", "bg-surface", "bg-background"]) {
    assert.ok(!COMPONENT_CODE.includes(forbidden), `§9.3/§19.10: "${forbidden}" would turn a flat promise into a floating card`);
  }
});

// ---------------------------------------------------------------------------
// Visual direction — §9, §19.8
// ---------------------------------------------------------------------------

test("the section surface is full-width Warm Cream #FBF5EB, via the shared token (§9.1)", () => {
  assert.match(COMPONENT_CODE, /bg-\[var\(--aa-color-bg-warm\)\]/, "§9.1: full-width Warm Cream section");

  // The token really is #FBF5EB, and the freeze really names that value.
  const tokens = readSource("styles/tokens.css");
  assert.match(tokens, /--aa-color-brand-cream-50:\s*#fbf5eb;/i, "the Warm Cream token must be #FBF5EB");
  assert.match(tokens, /--aa-color-bg-warm:\s*var\(--aa-color-brand-cream-50\);/, "--aa-color-bg-warm must resolve to Warm Cream");
  assert.ok(SPEC.includes("#FBF5EB"), "the freeze must name the same hex value");
});

test("headings use Steel Navy and the eyebrow/index use Forge Copper, from shared tokens (§9.2, §9.3)", () => {
  assert.match(COMPONENT_CODE, /<h2 id=\{HEADING_ID\} className="text-navy/, "§9.2: H2 in Steel Navy");
  assert.match(COMPONENT_CODE, /<h3 className="text-navy/, "§9.3: H3 in Steel Navy");
  assert.match(COMPONENT_CODE, /className="text-copper text-sm font-semibold">\{t\.eyebrow\}/, "§9.2: eyebrow in Forge Copper, small and restrained");
  assert.match(COMPONENT_CODE, /<span aria-hidden="true" className="text-copper/, "§9.3: numbers are a small Forge Copper typographic marker");

  const theme = readSource("styles/theme-extensions.css");
  assert.match(theme, /--color-navy: var\(--aa-color-brand-navy-900\);/, "text-navy must resolve to Steel Navy #0B2545");
  assert.match(theme, /--color-copper: var\(--aa-color-brand-copper-600\);/, "text-copper must resolve to Forge Copper #B04A2F");
  const tokens = readSource("styles/tokens.css");
  assert.match(tokens, /--aa-color-brand-navy-900:\s*#0b2545;/i);
  assert.match(tokens, /--aa-color-brand-copper-600:\s*#b04a2f;/i);
});

test("Copper stays restrained — only the eyebrow and the four markers (§9.3, Visual System §5.2)", () => {
  assert.equal((COMPONENT_CODE.match(/text-copper/g) ?? []).length, 2, "exactly two Copper usages in source: the eyebrow and the per-promise index");
  assert.ok(!/bg-copper/.test(COMPONENT_CODE), "Visual System §5.2: Copper must never become a background field here");
});

test("no outer floating card, engineering grid, image panel or section shadow (§9.1)", () => {
  for (const forbidden of ["hairline-grid", "rounded-", "shadow", "aspect-", "isolate", "overflow-hidden"]) {
    assert.ok(!COMPONENT_CODE.includes(forbidden), `§9.1/Visual System §7 (Card Soup): "${forbidden}" must not appear`);
  }
});

test("content aligns to the shared Homepage container (§9.1, Visual System §13)", () => {
  assert.ok(COMPONENT_CODE.includes("container-x"), "must use the same container utility as every other Homepage section");
  for (const sibling of ["components/home/product-showcase.tsx", "components/home/reach.tsx", "components/home/hero.tsx"]) {
    assert.ok(readCode(sibling).includes("container-x"), `${sibling} shares the same container — alignment must not diverge`);
  }
});

test("the heading block has a controlled maximum line length (§9.2, Visual System §12)", () => {
  assert.ok(COMPONENT_CODE.includes("max-w-2xl"), "§9.2: the heading block must not span the full container width");
});

test("the eyebrow does not use the tracked/uppercase utility, which would letter-space FA and AR (§12)", () => {
  // styles/theme-extensions.css's `.eyebrow` utility applies
  // `letter-spacing: 0.16em` and `text-transform: uppercase`. §12: "No
  // artificial letter-spacing is permitted for Persian or Arabic text."
  assert.ok(!/className="[^"]*\beyebrow\b/.test(COMPONENT_CODE), "§12: the .eyebrow utility must not be applied to this Persian/Arabic eyebrow");
  assert.ok(!/tracking-/.test(COMPONENT_CODE), "§12: no artificial letter-spacing anywhere in this component");

  const theme = readSource("styles/theme-extensions.css");
  assert.match(theme, /@utility eyebrow \{[\s\S]*?letter-spacing: 0\.16em;/, "the avoided utility really does apply tracking — if it stops, revisit this decision");
});

// ---------------------------------------------------------------------------
// Layout architecture — §9.3, §9.4, §15, §19.9, §22.7
// ---------------------------------------------------------------------------

test("the promise grid is 2x2 on desktop and one column on mobile — STRUCTURALLY, not by chance (§9.3, §19.9)", () => {
  // Exactly two column tracks, declared once, at one breakpoint. A bare `grid`
  // is single-column, so the mobile state needs no utility of its own.
  const gridCols = COMPONENT_CODE.match(/\bgrid-cols-\d+\b/g) ?? [];
  assert.deepEqual(gridCols, ["grid-cols-2"], "exactly one grid-cols utility, and it must be grid-cols-2");
  assert.match(COMPONENT_CODE, /className="mt-9 grid md:mt-12 md:grid-cols-2"/, "the list is a single grid: 1 column below md, 2 columns from md up");
});

test("a four-column state is structurally unreachable (§9.4)", () => {
  // §9.4: "Four columns are rejected for this version because the approved
  // Persian, English, and Arabic copy requires comfortable line length."
  for (const forbidden of ["grid-cols-3", "grid-cols-4", "lg:grid-cols", "xl:grid-cols", "sm:grid-cols", "flex-wrap", "auto-fit", "auto-fill"]) {
    assert.ok(!COMPONENT_CODE.includes(forbidden), `§9.4: "${forbidden}" could produce a third/fourth column or an unintended reflow`);
  }
});

test("there are exactly four promise cells and their classes are literal, not computed", () => {
  const cells = COMPONENT_CODE.match(/^\s*"[^"]*",$/gm) ?? [];
  assert.equal(cells.length, BUYER_VALUE_PROMISE_COUNT, "PROMISE_CELL_CLASSES must hold exactly four literal class strings");
  // A computed class name would be invisible to Tailwind's scanner and the
  // divider would silently vanish from the compiled stylesheet.
  assert.ok(!/className=\{`/.test(COMPONENT_CODE), "no template-literal class names");
  assert.ok(!/md:\$\{/.test(COMPONENT_CODE), "no interpolated Tailwind variants");
  assert.match(COMPONENT_CODE, /className=\{PROMISE_CELL_CLASSES\[i\]\}/, "cells must read from the literal table");
});

// ---------------------------------------------------------------------------
// Divider behaviour — §10, §19.10
// ---------------------------------------------------------------------------

test("2x2 shows exactly ONE central vertical and ONE central horizontal divider (§10)", () => {
  const cells = (COMPONENT_CODE.match(/^\s*"([^"]*)",$/gm) ?? []).map((line) => /"([^"]*)"/.exec(line)![1]);
  assert.equal(cells.length, 4);

  // Vertical rule: only the two right-hand (inline-end) cells carry border-s,
  // which draws ONE continuous rule between the two columns.
  const verticalCells = cells.map((c, i) => (c.includes("md:border-s") ? i : -1)).filter((i) => i >= 0);
  assert.deepEqual(verticalCells, [1, 3], "§10: one vertical divider between columns — cells 02 and 04 only");

  // Horizontal rule at md: cell 02 explicitly switches its border-t OFF again,
  // leaving only the second row (cells 03 and 04) drawing the rule.
  assert.ok(cells[0].includes("border-t") === false, "§10: the first item must not receive an unnecessary top border");
  assert.ok(cells[1].includes("md:border-t-0"), "§10: cell 02's mobile inter-item rule must be removed in the 2x2 state");
  assert.ok(cells[2].includes("border-t") && !cells[2].includes("md:border-t-0"), "§10: cell 03 draws the central horizontal rule");
  assert.ok(cells[3].includes("border-t") && !cells[3].includes("md:border-t-0"), "§10: cell 04 draws the central horizontal rule");
});

test("one column shows dividers only BETWEEN adjacent promises (§10)", () => {
  const cells = (COMPONENT_CODE.match(/^\s*"([^"]*)",$/gm) ?? []).map((line) => /"([^"]*)"/.exec(line)![1]);
  // Items 02, 03, 04 carry a top border; item 01 does not. Nothing carries a
  // bottom border, so no rule appears after the final item.
  assert.ok(!/\bborder-t\b/.test(cells[0]), "§10: 'The first item does not receive an unnecessary top border.'");
  for (const i of [1, 2, 3]) {
    assert.ok(/\bborder-t\b/.test(cells[i]), `§10: promise ${i + 1} must carry the inter-item rule in the one-column stack`);
  }
  for (const c of cells) {
    assert.ok(!/\bborder-b\b/.test(c), "§10: 'No divider appears after the final item.'");
  }
});

test("dividers are quiet and brand-derived — never full-strength Forge Copper (§10)", () => {
  const cells = (COMPONENT_CODE.match(/^\s*"([^"]*)",$/gm) ?? []).map((line) => /"([^"]*)"/.exec(line)![1]);
  for (const c of cells) {
    if (!/\bborder-(t|s)\b/.test(c)) continue;
    assert.ok(c.includes("border-border"), "dividers must use the subtle shared border token");
    assert.ok(!/border-copper/.test(c), "§10: dividers MUST NOT use full-strength Forge Copper");
  }
  const theme = readSource("styles/theme-extensions.css");
  assert.match(theme, /--color-border: var\(--aa-color-border-subtle\);/, "the divider token must be the approved subtle neutral");
});

test("directional utilities are logical, so one implementation serves RTL and LTR (§12, §15)", () => {
  for (const physical of ["border-l", "border-r", "pl-", "pr-", "ml-", "mr-", "text-left", "text-right"]) {
    assert.ok(!COMPONENT_CODE.includes(physical), `§15: "${physical}" is physical — FA/AR RTL and EN LTR must share one logical implementation`);
  }
  assert.ok(/\bmd:border-s\b/.test(COMPONENT_CODE), "the vertical divider must be logical (border-s)");
  assert.ok(/\bmd:ps-10\b/.test(COMPONENT_CODE) && /\bmd:pe-10\b/.test(COMPONENT_CODE), "divider-side padding must be logical (ps/pe)");
});

// ---------------------------------------------------------------------------
// Motion and progressive enhancement — §13, §16, §19.13, §19.14
// ---------------------------------------------------------------------------

test("the component is server-rendered with zero client JavaScript (§13, §16)", () => {
  // COMPONENT_CODE, not COMPONENT_SOURCE: the doc comment legitimately NAMES
  // `"use client"` and `Reveal` in order to record why neither is used.
  assert.ok(!COMPONENT_CODE.includes('"use client"'), "must remain a server component");
  assert.ok(!/useEffect|useState|useRef|IntersectionObserver|fetch\(/.test(COMPONENT_CODE), "no client hooks, observers, or fetching");
  assert.ok(!COMPONENT_CODE.includes("Reveal"), "§13: the simplest compliant implementation has no entrance animation at all");
});

test("no hidden resting state can survive a JavaScript or animation failure (§13, §19.14)", () => {
  // §13: "JavaScript or animation failure MUST NOT leave any item at
  // `opacity: 0` or translated off-screen." With no animation at all, SSR,
  // JS-off and reduced-motion are the same render — which is strictly stronger
  // than depending on components/ui/reveal.tsx's no-hidden-state contract.
  for (const forbidden of ["opacity-0", "invisible", "sr-only", "translate-y", "animate-", "transition"]) {
    assert.ok(!COMPONENT_CODE.includes(forbidden), `§13/§17: "${forbidden}" must not appear — all four promises are plain server-rendered text`);
  }
  // Checked as a class token rather than a substring: `aria-hidden="true"` on
  // the decorative index is required by §8 and must not trip this gate, while
  // a `hidden`/`md:hidden` display utility must.
  for (const className of COMPONENT_CODE.match(/className="[^"]*"/g) ?? []) {
    assert.ok(!/\b(?:[a-z]+:)?hidden\b/.test(className), `§13: a display-hiding utility must never appear: ${className}`);
  }
});

test("no prohibited motion pattern is present (§13)", () => {
  for (const forbidden of ["animation", "@keyframes", "duration-", "delay-", "ease-", "motion-safe", "framer", "gsap"]) {
    assert.ok(!COMPONENT_CODE.includes(forbidden), `§13 prohibits "${forbidden}" here — no counting numbers, no process-drawing, no bounce, no animation library`);
  }
});

test("all four promises are present as ordinary server-rendered text, with no crawler-only layer (§17)", () => {
  assert.ok(!/<noscript[\s>]/.test(COMPONENT_CODE), "no <noscript> duplicate");
  assert.ok(!/dangerouslySetInnerHTML/.test(COMPONENT_CODE), "no injected markup");
  assert.match(COMPONENT_CODE, /t\.promises\.map\(/, "the promises must render from the localized content module directly");
  // §17: no hidden alternate keyword-heavy copy for crawlers or agents.
  assert.ok(!/aria-label=/.test(COMPONENT_CODE), "no machine-only alternate text layer");
});

test("mobile and desktop carry identical content — layout differs, meaning does not (§15, §17)", () => {
  // One render path, one content source, no per-viewport branch.
  assert.equal((COMPONENT_CODE.match(/t\.promises\.map\(/g) ?? []).length, 1, "exactly one promise list is rendered");
  for (const forbidden of ["md:hidden", "lg:hidden", "hidden md:", "hidden lg:", "sm:hidden"]) {
    assert.ok(!COMPONENT_CODE.includes(forbidden), `§15: "${forbidden}" would omit content on one viewport class`);
  }
});

// ---------------------------------------------------------------------------
// Data independence — Composition §9, §15
// ---------------------------------------------------------------------------

test("zero data dependency: no Odoo, DB_PUBLIC, catalog projection or pricing (Composition §15)", () => {
  for (const pattern of ["cloudflare:workers", "DB_PUBLIC", "DB_OPS", "odoo", "Odoo", "@/lib/catalog", "@/lib/pricing", "@/lib/processing", "listHomepageProductCandidates", "getHomepagePriceStrip"]) {
    assert.ok(!COMPONENT_SOURCE.replace(/\/\*[\s\S]*?\*\//g, "").includes(pattern), `an always-present section must not be suppressible by "${pattern}"`);
  }
  const imports = [...COMPONENT_CODE.matchAll(/^import .*? from "([^"]+)";$/gm)].map((m) => m[1]);
  assert.deepEqual(imports.sort(), ["@/config/locales", "@/lib/content/buyer-value", "@/lib/content/homepage"]);
});

test("the component can never omit itself — Composition §5 marks it always present", () => {
  assert.ok(!/return null/.test(COMPONENT_CODE), "Buyer Value has no conditional-omission path");
  assert.ok(!/\?\s*\(/.test(COMPONENT_CODE.split("return (")[1] ?? ""), "no conditional wrapper around the section");
  assert.match(PAGE_CODE, /<BuyerValue locale=\{locale\} \/>/, "rendered directly on the Homepage, with no conditional wrapper");
});
