import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { homepageCopy } from "./homepage.ts";
import { evaluationAxisIndex, EVALUATION_AXIS_COUNT } from "./evaluation-assurance.ts";

/**
 * docs/evaluation-assurance/AHANASSA_EVALUATION_ASSURANCE_FINAL_FROZEN_V2.1.md
 * acceptance-criteria regression coverage.
 *
 * `lib/content/homepage.ts` and `lib/content/evaluation-assurance.ts` are
 * plain data/pure functions (no `cloudflare:workers` dependency) so they are
 * directly unit-testable; the component itself is JSX and is pinned as
 * source-text invariants instead, matching this repo's established convention
 * (`lib/content/header-frozen-spec-invariants.test.ts`,
 * `lib/catalog/homepage-progressive-enhancement.test.ts` — no React
 * render-testing framework exists here).
 *
 * The Persian strings below are deliberately duplicated character-for-character
 * from the frozen spec rather than imported from the module under test. That
 * is the entire point: an accidental copy edit must fail here loudly.
 */

const REPO_ROOT = path.resolve(fileURLToPath(new URL(".", import.meta.url)), "../..");
const LOCALES = ["fa", "en", "ar"] as const;

function readSource(relativePath: string): string {
  return readFileSync(path.join(REPO_ROOT, relativePath), "utf8");
}

/**
 * Source with comments stripped. Several of this component's own doc comments
 * legitimately NAME the forbidden headings/patterns in order to explain why
 * they are avoided, which would otherwise produce false positives against the
 * "must not contain X" checks below.
 */
function readCode(relativePath: string): string {
  return readSource(relativePath)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .split("\n")
    .filter((line) => !/^\s*(\/\/|\*)/.test(line))
    .join("\n");
}

const COMPONENT = "components/home/evaluation-assurance.tsx";
const COMPONENT_SOURCE = readSource(COMPONENT);
const COMPONENT_CODE = readCode(COMPONENT);
const PAGE_CODE = readCode("app/[locale]/page.tsx");

// ---------------------------------------------------------------------------
// Legacy retirement — Capabilities and the old Assurance are gone, not moved
// ---------------------------------------------------------------------------

test("the retired Capabilities and Assurance component files no longer exist", () => {
  for (const file of ["components/home/capabilities.tsx", "components/home/assurance.tsx"]) {
    assert.ok(!existsSync(path.join(REPO_ROOT, file)), `${file} must be deleted, not merely unreferenced`);
  }
});

test("the Homepage no longer imports or renders Capabilities or the old Assurance", () => {
  assert.ok(!/from "@\/components\/home\/capabilities"/.test(PAGE_CODE), "the Capabilities import must be gone");
  assert.ok(!/from "@\/components\/home\/assurance"/.test(PAGE_CODE), "the old Assurance import must be gone");
  assert.ok(!/<Capabilities[\s/>]/.test(PAGE_CODE), "Capabilities must not be rendered");
  assert.ok(!/<Assurance[\s/>]/.test(PAGE_CODE), "the old Assurance must not be rendered");
});

test("nothing anywhere in the runtime tree still imports the retired components", () => {
  for (const file of ["app/[locale]/page.tsx", "app/[locale]/services/page.tsx", COMPONENT]) {
    const source = readSource(file);
    assert.ok(!source.includes('@/components/home/capabilities'), `${file} must not import the retired Capabilities`);
    assert.ok(!source.includes('@/components/home/assurance'), `${file} must not import the retired Assurance`);
  }
});

test("the retired copy keys are removed from homepageCopy for every locale", () => {
  for (const locale of LOCALES) {
    const copy = homepageCopy[locale] as unknown as Record<string, unknown>;
    assert.ok(!("capabilities" in copy), `${locale}: the orphaned capabilities copy must be removed`);
    assert.ok(!("assurance" in copy), `${locale}: the orphaned assurance copy must be removed`);
    assert.ok("evaluationAssurance" in copy, `${locale}: evaluationAssurance copy must exist`);
  }
});

test("the retired Assurance content itself is not migrated into the new component", () => {
  // V2.1 is a clean replacement, not a repurposing — none of the old
  // evaluation-method-transparency copy may reappear anywhere in the new
  // component's content.
  const retired = [
    "شفاف و مستند",
    "مقایسه مکتوب گزینه‌های تأمین در برابر نیاز پروژه",
    "هر بررسی، مستند و قابل پیگیری است.",
    "Transparent & documented",
    "Every review is documented and traceable.",
  ];
  for (const locale of LOCALES) {
    const text = JSON.stringify(homepageCopy[locale].evaluationAssurance);
    for (const phrase of retired) {
      assert.ok(!text.includes(phrase), `${locale}: retired Assurance copy "${phrase}" must not be migrated`);
    }
  }
});

test("the shared servicesCopy module survives — only Capabilities' usage of it was retired", () => {
  // Capabilities read `servicesCopy[locale].functions`, but /services owns
  // that module independently. Deleting it would have been an over-deletion.
  assert.ok(existsSync(path.join(REPO_ROOT, "lib/content/pages.ts")), "lib/content/pages.ts must still exist");
  assert.ok(readSource("lib/content/pages.ts").includes("export const servicesCopy"), "servicesCopy must still be exported");
  assert.ok(readSource("app/[locale]/services/page.tsx").includes("servicesCopy"), "/services must still consume servicesCopy");
});

// ---------------------------------------------------------------------------
// Homepage sequence — V2.1 §2
// ---------------------------------------------------------------------------

test("exactly one Evaluation/Assurance section renders on the Homepage", () => {
  const rendered = PAGE_CODE.match(/<EvaluationAssurance[\s/>]/g) ?? [];
  assert.equal(rendered.length, 1, "there must be exactly one Evaluation/Assurance component in this role");
});

test("Homepage order is Product Showcase -> Evaluation/Assurance -> Purchase Process (§2)", () => {
  const showcase = PAGE_CODE.indexOf("<ProductShowcase");
  const evaluation = PAGE_CODE.indexOf("<EvaluationAssurance");
  const process = PAGE_CODE.indexOf("<Process");

  assert.ok(showcase > -1 && evaluation > -1 && process > -1, "all three sections must render");
  assert.ok(showcase < evaluation, "Evaluation/Assurance must follow Product Showcase");
  assert.ok(evaluation < process, "Evaluation/Assurance must precede Purchase Process");
});

// ---------------------------------------------------------------------------
// Frozen FA content — §4.1, §5, §7.2, §8.2, §9.2, §10.2
// ---------------------------------------------------------------------------

test("the frozen Persian H2 is pinned character-for-character (§4.1)", () => {
  assert.equal(homepageCopy.fa.evaluationAssurance.title, "پیش از ارائه پیشنهاد، چه چیزهایی بررسی می‌شود؟");
});

test("the frozen Persian supporting copy is pinned character-for-character (§5)", () => {
  assert.equal(
    homepageCopy.fa.evaluationAssurance.body,
    "هر درخواست از نظر مشخصات فنی، امکان تأمین، شرایط تجاری و الزامات تحویل بررسی می‌شود تا مبنای پیشنهاد برای شما روشن باشد.",
  );
});

test("the four frozen Persian axis titles are pinned, in the frozen order (§6)", () => {
  assert.deepEqual(
    homepageCopy.fa.evaluationAssurance.axes.map((a) => a.title),
    ["انطباق فنی", "امکان تأمین", "شرایط تجاری", "تحویل"],
  );
});

test("the four frozen Persian axis copies are pinned character-for-character (§7.2/§8.2/§9.2/§10.2)", () => {
  assert.deepEqual(
    homepageCopy.fa.evaluationAssurance.axes.map((a) => a.body),
    [
      "محصول، ابعاد، گرید، استاندارد و سایر مشخصات ضروری درخواست بررسی می‌شود. در صورت نیاز پروژه، الزامات مدارک فنی و کیفی نیز لحاظ می‌شود.",
      "امکان تهیه مورد درخواست و محدودیت‌های مؤثر بر آن بررسی می‌شود.",
      "مقدار و واحد، قیمت پیشنهادی، شرایط پرداخت و مدت اعتبار پیشنهاد به‌صورت روشن مشخص می‌شود.",
      "مقصد، زمان موردنیاز، شرایط حمل و مبنای تحویل در صورت اثرگذاری بر پیشنهاد بررسی می‌شود.",
    ],
  );
});

test("the approved English baseline is pinned (§33 — never strengthened past the Persian)", () => {
  const t = homepageCopy.en.evaluationAssurance;
  assert.equal(t.title, "What is reviewed before a proposal is presented?");
  assert.equal(
    t.body,
    "Each request is reviewed for technical specifications, sourcing feasibility, commercial conditions, and delivery requirements so the basis of the proposal is clear to you.",
  );
  assert.deepEqual(t.axes.map((a) => a.title), ["Technical conformity", "Sourcing feasibility", "Commercial conditions", "Delivery"]);
  assert.deepEqual(t.axes.map((a) => a.body), [
    "The product, dimensions, grade, standard, and other essential request specifications are reviewed. Where required by the project, technical and quality documentation requirements are also considered.",
    "The feasibility of sourcing the requested item and the constraints that materially affect it are reviewed.",
    "The quantity and unit, proposed price, payment terms, and proposal validity period are stated clearly.",
    "Destination, required timing, transport conditions, and delivery basis are reviewed when they affect the proposal.",
  ]);
});

test("the approved Arabic baseline is pinned (§33)", () => {
  const t = homepageCopy.ar.evaluationAssurance;
  assert.equal(t.title, "ما الذي تتم مراجعته قبل تقديم العرض؟");
  assert.equal(
    t.body,
    "تتم مراجعة كل طلب من حيث المواصفات الفنية، وإمكانية التوريد، والشروط التجارية، ومتطلبات التسليم، بحيث يكون أساس العرض واضحًا لكم.",
  );
  assert.deepEqual(t.axes.map((a) => a.title), ["المطابقة الفنية", "إمكانية التوريد", "الشروط التجارية", "التسليم"]);
  assert.deepEqual(t.axes.map((a) => a.body), [
    "تتم مراجعة المنتج والأبعاد والدرجة والمواصفة القياسية وسائر المواصفات الأساسية للطلب. وعند حاجة المشروع، تؤخذ متطلبات الوثائق الفنية ووثائق الجودة في الاعتبار أيضًا.",
    "تتم مراجعة إمكانية توفير الصنف المطلوب والقيود المؤثرة في إمكانية توريده.",
    "يتم توضيح الكمية والوحدة والسعر المقترح وشروط الدفع ومدة صلاحية العرض بصورة واضحة.",
    "تتم مراجعة الوجهة والموعد المطلوب وشروط النقل وأساس التسليم عندما تكون مؤثرة في العرض.",
  ]);
});

// ---------------------------------------------------------------------------
// Exactly four axes — §6
// ---------------------------------------------------------------------------

test("every locale has exactly four axes — never a fifth (§6)", () => {
  assert.equal(EVALUATION_AXIS_COUNT, 4);
  for (const locale of LOCALES) {
    assert.equal(homepageCopy[locale].evaluationAssurance.axes.length, EVALUATION_AXIS_COUNT, `${locale}: exactly four axes`);
  }
});

test("no locale ships an empty, placeholder, or duplicated axis (§40 — raw keys/placeholders are a release FAIL)", () => {
  for (const locale of LOCALES) {
    const t = homepageCopy[locale].evaluationAssurance;
    const strings = [t.title, t.body, ...t.axes.flatMap((a) => [a.title, a.body])];
    for (const s of strings) {
      assert.ok(s.length > 0, `${locale}: no empty string`);
      assert.ok(!/undefined|TODO|TBD|Lorem|\{\{|\}\}/i.test(s), `${locale}: placeholder/raw key leaked: ${s}`);
    }
    assert.equal(new Set(t.axes.map((a) => a.title)).size, 4, `${locale}: axis titles must be distinct`);
    assert.equal(new Set(t.axes.map((a) => a.body)).size, 4, `${locale}: axis copies must be distinct`);
  }
});

test("no 'what we do' second list is reintroduced anywhere in the component's content (§15)", () => {
  const forbidden = ["بررسی نیاز", "مقایسه تأمین‌کنندگان", "هماهنگی خرید", "پیگیری سفارش", "آنچه ما انجام می‌دهیم", "What we do", "ما نقوم به"];
  for (const locale of LOCALES) {
    const text = JSON.stringify(homepageCopy[locale].evaluationAssurance);
    for (const phrase of forbidden) {
      assert.ok(!text.includes(phrase), `${locale}: §15 forbids the "what we do" item "${phrase}" inside this component`);
    }
  }
});

test("axis boundaries hold: quantity/unit belong to Commercial, not Technical (§7.4/§9.3)", () => {
  const fa = homepageCopy.fa.evaluationAssurance.axes;
  const en = homepageCopy.en.evaluationAssurance.axes;
  assert.ok(!fa[0].body.includes("مقدار"), "§7.4: quantity was explicitly removed from the default Technical copy");
  assert.ok(fa[2].body.includes("مقدار و واحد"), "§9.3: quantity and unit are owned by Commercial Conditions");
  assert.ok(!/quantity/i.test(en[0].body), "§7.4: quantity must not reappear under Technical conformity");
  assert.ok(/quantity and unit/i.test(en[2].body), "§9.3: Commercial Conditions owns quantity and unit");
});

test("axis boundaries hold: the delivery basis is owned by Delivery, not duplicated under Commercial (§9.4/§10.3)", () => {
  const fa = homepageCopy.fa.evaluationAssurance.axes;
  const en = homepageCopy.en.evaluationAssurance.axes;
  assert.ok(fa[3].body.includes("مبنای تحویل"), "§10.3: Axis 04 is the canonical owner of delivery basis / Incoterm meaning");
  assert.ok(!fa[2].body.includes("مبنای تحویل"), "§9.4: the delivery term must not be duplicated under Commercial Conditions");
  assert.ok(/delivery basis/i.test(en[3].body), "§10.3: Delivery owns the delivery basis in English too");
  assert.ok(!/delivery basis|incoterm/i.test(en[2].body), "§9.4: Commercial Conditions must not claim delivery-term ownership");
});

// ---------------------------------------------------------------------------
// Index / digit policy — §20, §20.1
// ---------------------------------------------------------------------------

test("decorative indexes use the frozen per-locale digit script (§20.1)", () => {
  const expected = {
    fa: ["۰۱", "۰۲", "۰۳", "۰۴"],
    ar: ["٠١", "٠٢", "٠٣", "٠٤"],
    en: ["01", "02", "03", "04"],
  } as const;

  for (const locale of LOCALES) {
    const actual = [0, 1, 2, 3].map((i) => evaluationAxisIndex(locale, i));
    assert.deepEqual(actual, [...expected[locale]], `${locale}: frozen digit script`);
  }
});

test("digit scripts are never mixed within one locale (§20.1)", () => {
  const scripts = {
    fa: /^[۰-۹]+$/,
    ar: /^[٠-٩]+$/,
    en: /^[0-9]+$/,
  } as const;
  for (const locale of LOCALES) {
    for (let i = 0; i < 4; i += 1) {
      const value = evaluationAxisIndex(locale, i);
      assert.match(value, scripts[locale], `${locale}: index ${i} must use only that locale's digit script`);
      assert.equal(value.length, 2, `${locale}: index ${i} must be the zero-padded two-digit form`);
    }
  }
});

test("the decorative index is always aria-hidden and uses tabular figures, and is smaller than the row heading (§20)", () => {
  const indexSpan = /<span aria-hidden="true" className="([^"]*)">\s*\{evaluationAxisIndex\(locale, i\)\}/.exec(COMPONENT_CODE);
  assert.ok(indexSpan, "the index must render inside an aria-hidden span");
  assert.match(indexSpan![1], /\btabular-nums\b/, "§20 requires tabular figures");
  assert.match(indexSpan![1], /\btext-sm\b/, "§20: the index must be smaller than the row heading (text-lg)");
  assert.ok(!/rounded|bg-|border/.test(indexSpan![1]), "§20: do not style the index as a prominent badge or step indicator");
});

test("the index is derived, never stored as content — so it cannot drift from DOM order (§20.1)", () => {
  for (const locale of LOCALES) {
    const text = JSON.stringify(homepageCopy[locale].evaluationAssurance);
    for (const digits of ["۰۱", "٠١", '"01"', "index"]) {
      assert.ok(!text.includes(digits), `${locale}: the visible index must not be stored in the copy module (${digits})`);
    }
  }
});

// ---------------------------------------------------------------------------
// Semantic HTML — §29, §30
// ---------------------------------------------------------------------------

test("the section is labelled by its own h2 (§29)", () => {
  assert.match(COMPONENT_CODE, /<section aria-labelledby=\{HEADING_ID\}/, "the section must carry aria-labelledby");
  assert.match(COMPONENT_CODE, /<h2 id=\{HEADING_ID\}/, "the h2 must carry the matching id");
});

test("the axes are an unordered list — never <ol> (§29: criteria, not chronological steps)", () => {
  assert.ok(COMPONENT_CODE.includes("<ul"), "the axes must render as a <ul>");
  assert.ok(COMPONENT_CODE.includes("</ul>"), "the <ul> must be closed");
  assert.ok(!/<ol[\s>]/.test(COMPONENT_CODE), "an <ol> would assert chronological process semantics this component must not claim");
});

test("heading hierarchy is h2 for the section and h3 per axis, with the index never a heading (§30)", () => {
  assert.equal((COMPONENT_CODE.match(/<h2[\s>]/g) ?? []).length, 1, "exactly one h2");
  assert.equal((COMPONENT_CODE.match(/<h3[\s>]/g) ?? []).length, 1, "exactly one h3 element (rendered once per axis in the map)");
  assert.ok(!/<h1[\s>]|<h4[\s>]/.test(COMPONENT_CODE), "no h1 (the Hero owns it) and no h4");
  assert.ok(!/<h[1-6][^>]*>\s*\{evaluationAxisIndex/.test(COMPONENT_CODE), "§30: the decorative number must never be a heading");
});

test("the supporting copy and each axis copy are real paragraphs in the DOM (§31)", () => {
  assert.match(COMPONENT_CODE, /<p[^>]*>\{t\.body\}<\/p>/, "the supporting copy must be a <p>");
  assert.match(COMPONENT_CODE, /<p[^>]*>\{axis\.body\}<\/p>/, "each axis copy must be a <p>");
});

// ---------------------------------------------------------------------------
// Visual contract — §18, §19, §21, §25, §46
// ---------------------------------------------------------------------------

test("no image is used or imported (§39: no image is required for this section)", () => {
  assert.ok(!/from "next\/image"/.test(COMPONENT_CODE), "no next/image import");
  assert.ok(!/<Image[\s/>]|<img[\s/>]/.test(COMPONENT_CODE), "no image element");
  assert.ok(!/\.png|\.jpg|\.jpeg|\.webp|\.svg/.test(COMPONENT_CODE), "no image asset reference");
  assert.ok(!/background-image|bg-\[url\(/.test(COMPONENT_CODE), "no decorative background image");
});

test("no icons (§21: 'Default decision: No icons')", () => {
  assert.ok(!/from "lucide-react"/.test(COMPONENT_CODE), "no icon library import");
  assert.ok(!/<svg[\s>]/.test(COMPONENT_CODE), "no inline svg icon");
  for (const icon of ["ArrowUpRight", "Check", "CheckCircle", "Shield", "Truck", "Gear", "Settings"]) {
    assert.ok(!COMPONENT_CODE.includes(icon), `§21 forbids a decorative ${icon} icon`);
  }
});

test("no CTA, button, or link of any kind (§25)", () => {
  assert.ok(!/from "next\/link"/.test(COMPONENT_CODE), "no next/link import");
  assert.ok(!/<Link[\s/>]|<a[\s>]|<button[\s>]|<Button[\s/>]/.test(COMPONENT_CODE), "no link or button element");
  assert.ok(!/\bhref\b/.test(COMPONENT_CODE), "no href anywhere");
  assert.ok(!/localizedPath/.test(COMPONENT_CODE), "no route helper — this section navigates nowhere");
});

test("no card grid — the rows are an editorial list, not four floating cards (§18/§46)", () => {
  const ul = /<ul className="([^"]*)"/.exec(COMPONENT_CODE);
  assert.ok(ul, "the axis list's className must be inspectable");
  assert.ok(!/grid-cols/.test(ul![1]), "§18: the axis list must not be a card grid");
  assert.ok(!/(^|\s)(rounded|shadow|bg-)/.test(ul![1]), "the list itself must not be a boxed surface");

  const li = /<li key=\{axis\.title\} className="([^"]*)"/.exec(COMPONENT_CODE);
  assert.ok(li, "the row className must be inspectable");
  assert.ok(!/\bborder(?!-)|rounded|shadow|backdrop-blur|bg-white|bg-background/.test(li![1]), `§17/§18/§46: rows must not be independent floating cards — got "${li![1]}"`);
});

test("the surface is the warm cream token with navy text and a copper index (§19)", () => {
  assert.match(COMPONENT_CODE, /bg-\[var\(--aa-color-bg-warm\)\]/, "§19 requires the warm neutral/cream surface");
  assert.ok(!/bg-navy|bg-black|from-|via-|to-|backdrop-blur|bg-gradient/.test(COMPONENT_CODE), "§19 forbids a dark industrial background, gradients as the primary surface, and glassmorphism");
  assert.match(COMPONENT_CODE, /text-navy/, "§19 requires navy text");
  assert.match(COMPONENT_CODE, /text-copper/, "§19 requires a restrained copper accent on the index");
});

test("dividers are subtle and the last row carries none (§22)", () => {
  const ul = /<ul className="([^"]*)"/.exec(COMPONENT_CODE);
  // `divide-y` (Tailwind v4) puts a bottom border on every row except the
  // last, which is exactly "between rows, none after the last" — confirmed
  // against the rendered page, not assumed from the utility name.
  assert.match(ul![1], /\bdivide-y\b/, "§22: subtle dividers between rows");
  assert.match(ul![1], /divide-border/, "§22: dividers use the subtle border token");
});

// ---------------------------------------------------------------------------
// Interaction / motion / data — §23, §24, §26, §36, §38
// ---------------------------------------------------------------------------

test("no interaction, disclosure, or fake-clickable affordance (§23/§24/§46)", () => {
  for (const pattern of ["<details", "<summary", 'role="tab"', "aria-expanded", "aria-controls", "onClick", "onMouseEnter", "cursor-pointer", "tabIndex", "group-hover:", "hover:", "peer-", "snap-", "overflow-x", "sticky", "title="]) {
    assert.ok(!COMPONENT_CODE.includes(pattern), `§23/§24 forbid "${pattern}" in this component`);
  }
});

test("no chronological/process framing leaks in (§16 boundary / §41 / §45.6)", () => {
  for (const pattern of ["Step ", "مرحله", "خطوة", "aa-step", "→", "-->", "connector", "arrow"]) {
    assert.ok(!COMPONENT_CODE.includes(pattern), `this component answers "what is checked", not "what happens next" — "${pattern}" must not appear`);
  }
  for (const locale of LOCALES) {
    const text = JSON.stringify(homepageCopy[locale].evaluationAssurance);
    for (const pattern of ["مرحله", "خطوة", "Step 1", "step 1"]) {
      assert.ok(!text.includes(pattern), `${locale}: §45.6 forbids turning the four criteria into chronological steps`);
    }
  }
});

test("zero dedicated JS — a server component with no client state, no reveal, no fetch (§38)", () => {
  assert.ok(!COMPONENT_SOURCE.includes('"use client"'), "must remain a server component");
  assert.ok(!/useState|useEffect|useRef|useMemo|fetch\(|useSWR|useQuery/.test(COMPONENT_CODE), "no client-side state or fetching");
  assert.ok(!/<Reveal[\s/>]|from "@\/components\/ui\/reveal"/.test(COMPONENT_CODE), "§38 targets 0 dedicated interaction JS — this component deliberately takes no Reveal dependency, so SSR, JS-off, and reduced-motion are the same render");
  assert.ok(!/<noscript[\s>]/.test(COMPONENT_CODE), "a <noscript> duplicate would be the wrong fix for a problem this component does not have");
});

test("no opacity-0 or visibility hiding — content can never be stranded invisible", () => {
  assert.ok(!/opacity-0|\binvisible\b|visibility:\s*hidden|display:\s*none/.test(COMPONENT_CODE), "nothing in this section may start hidden");
  // `hidden` as a utility class specifically — `aria-hidden` on the decorative
  // index is correct and must not trip this check.
  for (const className of COMPONENT_CODE.match(/className="[^"]*"/g) ?? []) {
    assert.ok(!/\bhidden\b|\bsr-only\b/.test(className), `no content may be visually hidden: ${className}`);
  }
});

test("zero data dependency: no Odoo, DB_PUBLIC, projections, or pricing (§36)", () => {
  for (const pattern of ["cloudflare:workers", "DB_PUBLIC", "DB_OPS", "odoo", "Odoo", "@/lib/catalog", "@/lib/pricing", "@/lib/processing", "public_processing_groups", "listHomepageProductCandidates", "getHomepagePriceStrip"]) {
    assert.ok(!COMPONENT_SOURCE.replace(/\/\*[\s\S]*?\*\//g, "").includes(pattern), `§36 forbids a "${pattern}" dependency in this editorial component`);
  }
  // Its only imports are the localized content module, the pure index helper,
  // and a type — nothing that can perform I/O.
  const imports = [...COMPONENT_CODE.matchAll(/^import .*? from "([^"]+)";$/gm)].map((m) => m[1]);
  assert.deepEqual(imports.sort(), ["@/config/locales", "@/lib/content/evaluation-assurance", "@/lib/content/homepage"]);
});

test("the Homepage renders the section unconditionally — it has no data-driven omission path", () => {
  // Unlike Product Showcase (§35 "0 cards -> Section hidden") and the Price
  // Strip, this component is editorial: there is no state in which it should
  // vanish, and no `return null` that a future data change could trigger.
  assert.ok(!/return null/.test(COMPONENT_CODE), "the section must always render");
  assert.match(PAGE_CODE, /<EvaluationAssurance locale=\{locale\} \/>/, "rendered directly, with no conditional wrapper");
});

// ---------------------------------------------------------------------------
// Claim safety — §12, §13, §14, §45
// ---------------------------------------------------------------------------

test("the FA H2 is never one of the six generic headings §4.1 forbids", () => {
  const forbidden = ["روش ارزیابی", "آنچه بررسی می‌کنیم", "چرا آهن آسا", "مزایای خرید از ما", "فرآیند کنترل", "خدمات ما"];
  for (const heading of forbidden) {
    assert.notEqual(homepageCopy.fa.evaluationAssurance.title, heading, `§4.1 forbids "${heading}" as this component's H2`);
  }
});

test("no prohibited marketing or supplier-qualification claim appears in any locale's copy (§12/§13/§14/§45)", () => {
  const forbidden = [
    // FA — §12/§13/§14
    "بهترین قیمت", "ارزان‌ترین", "خرید مطمئن", "تضمین", "تأمین سریع", "بدون ریسک", "بهترین تأمین‌کننده",
    "قابل‌اتکا", "تأییدشده", "تضمین‌شده", "بدون واسطه", "فروش مستقیم کارخانه", "تولید مستقیم", "موجودی انبار",
    // EN
    "best price", "cheapest", "lowest price", "guarantee", "guaranteed", "risk-free", "risk free",
    "trusted supplier", "approved supplier", "vetted supplier", "factory-direct", "factory direct",
    "no middleman", "without intermediaries", "owned stock", "our own stock", "we manufacture",
    // AR
    "أفضل سعر", "الأرخص", "ضمان", "مضمون", "بدون وسيط", "مورد معتمد", "موردين موثوق", "مخزوننا",
  ];
  for (const locale of LOCALES) {
    const text = JSON.stringify(homepageCopy[locale].evaluationAssurance).toLowerCase();
    for (const phrase of forbidden) {
      assert.ok(!text.includes(phrase.toLowerCase()), `${locale}: prohibited claim "${phrase}" must never appear in this component`);
    }
  }
});

test("no prohibited claim is hardcoded in the component source either", () => {
  const text = COMPONENT_CODE.toLowerCase();
  for (const phrase of ["best price", "guaranteed", "risk-free", "factory direct", "no middleman", "بهترین قیمت", "تضمین", "أفضل سعر"]) {
    assert.ok(!text.includes(phrase.toLowerCase()), `prohibited claim "${phrase}" must not be hardcoded in the component`);
  }
});

test("the component holds no copy of its own — all user-facing text comes from the localized content module (§40)", () => {
  // Any bare string inside JSX text position would be an unlocalized claim
  // waiting to happen. Every rendered value must be an expression.
  const jsxText = COMPONENT_CODE.match(/>\s*[A-Za-z؀-ۿ][^<>{}]{2,}\s*</g) ?? [];
  assert.deepEqual(jsxText, [], `no literal user-facing text may live in the component: ${JSON.stringify(jsxText)}`);
});
