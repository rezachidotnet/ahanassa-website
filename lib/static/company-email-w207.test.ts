import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { COMPANY_EMAIL_PAGES, scanPublicFile } from "./leak-scan.ts";
import { scanPublication } from "./publication-gate.ts";
import { COMPANY_PUBLIC_EMAILS, COMPANY_PUBLIC_NUMBERS, CONTACT_SALES_EMAIL } from "../content/contact-channels.ts";
import { jsonLdGraph, localBusinessSchema, organizationSchema } from "../seo/schema.ts";
import { buildLlmsFullTxt } from "./llms-txt.ts";

/**
 * D-W207-EMAIL (owner, 2026-10-16): sales@ahanassa.com on /contact only (fa/en/ar, mailto: next to the
 * phone) and in that page's Organization contactPoint; the leak scan allows exactly this address, and
 * only in the /contact files.
 */

const ROOT = path.resolve(import.meta.dirname, "../..");
const read = (p: string) => fs.readFileSync(path.join(ROOT, p), "utf8");
const html = (data: unknown) => `<html><body><script type="application/ld+json">${JSON.stringify(data)}</script></body></html>`;
const contacts = (file: string, content: string) => scanPublicFile(file, content, COMPANY_PUBLIC_NUMBERS, COMPANY_PUBLIC_EMAILS).filter((f) => f.kind === "contact").map((f) => f.match);

test("exactly one public company address", () => {
  assert.equal(CONTACT_SALES_EMAIL, "sales@ahanassa.com");
  assert.deepEqual(COMPANY_PUBLIC_EMAILS, [CONTACT_SALES_EMAIL]);
});

test("leak scan: the company address passes on /contact (html + Markdown mirror, fa/en/ar)", () => {
  assert.deepEqual([...COMPANY_EMAIL_PAGES].sort(), ["ar/contact.html", "ar/contact.md", "contact.html", "contact.md", "en/contact.html", "en/contact.md"]);
  const page = `<a href="mailto:${CONTACT_SALES_EMAIL}">${CONTACT_SALES_EMAIL}</a>`;
  for (const file of COMPANY_EMAIL_PAGES) assert.deepEqual(contacts(file, page), [], file);
});

test("leak scan: the company address is a leak on every other page and file", () => {
  for (const file of ["index.html", "en.html", "about.html", "en/about.html", "ar/products/rebar.html", "about.md", "llms.txt", "sitemap.xml", "data/rfq-catalog.fa.json", "contact/x.html"]) {
    assert.deepEqual(contacts(file, `write to ${CONTACT_SALES_EMAIL}`), [CONTACT_SALES_EMAIL], file);
  }
});

test("leak scan: on /contact any other address is still a leak (other mailboxes, look-alike domains, case variants)", () => {
  for (const other of ["info@ahanassa.com", "sales@ahanassaa.com", "Sales@ahanassa.com", "x.sales@ahanassa.com", "someone@gmail.com"]) {
    assert.deepEqual(contacts("contact.html", `<a href="mailto:${other}">${other}</a>`), [other, other], other);
  }
});

test("leak scan: without the companyEmails option the address is refused even on /contact (callers must pass it)", () => {
  assert.deepEqual(scanPublicFile("contact.html", CONTACT_SALES_EMAIL, COMPANY_PUBLIC_NUMBERS).map((f) => f.match), [CONTACT_SALES_EMAIL]);
});

test("every artifact-gate caller passes COMPANY_PUBLIC_EMAILS next to COMPANY_PUBLIC_NUMBERS", () => {
  for (const file of ["scripts/content/checks.ts", "scripts/content/export.ts", "scripts/content/publish.ts", "scripts/static/build.ts", "scripts/static/gate.ts"]) {
    assert.match(read(file), /runArtifactGate\([^)]*\{ companyPhones: COMPANY_PUBLIC_NUMBERS, companyEmails: COMPANY_PUBLIC_EMAILS \}\)/, file);
  }
});

test("JSON-LD: the e-mail only in the /contact Organization contactPoint, never on the homepage node", () => {
  for (const locale of ["fa", "en", "ar"] as const) {
    assert.ok(!("email" in organizationSchema(locale).contactPoint), `${locale}: homepage Organization has no email`);
    assert.equal(organizationSchema(locale, { withSalesEmail: true }).contactPoint.email, CONTACT_SALES_EMAIL);
    assert.ok(!JSON.stringify(localBusinessSchema(locale, { withTehranOffice: true })).includes("@ahanassa.com"), `${locale}: LocalBusiness has no email`);
  }
  assert.deepEqual(organizationSchema("en", { withSalesEmail: true }).contactPoint, { "@type": "ContactPoint", telephone: "+983135134", email: CONTACT_SALES_EMAIL, contactType: "sales", areaServed: ["IR", "IQ"] });
  const page = html(jsonLdGraph([organizationSchema("ar", { withSalesEmail: true }), localBusinessSchema("ar", { withTehranOffice: true })]));
  assert.deepEqual(scanPublication([{ path: "ar/contact.html", content: page }], new Set()), [], "the publication gate allows contactPoint.email");
  assert.deepEqual(contacts("ar/contact.html", page), []);
  assert.deepEqual(contacts("ar.html", page), [CONTACT_SALES_EMAIL], "the same graph on the homepage would be a leak");
  assert.doesNotMatch(read("app/[locale]/page.tsx"), /withSalesEmail/);
});

test("/contact renders the address as a mailto: link next to the phone, in every locale, from the one constant", () => {
  const page = read("app/[locale]/contact/page.tsx");
  assert.match(page, /emailLabel: "ایمیل"/);
  assert.match(page, /emailLabel: "Email"/);
  assert.match(page, /emailLabel: "البريد الإلكتروني"/);
  assert.doesNotMatch("البريد الإلكتروني", /[پچژگکی]/, "the ar label has no Persian-only letters");
  const phone = page.indexOf("{CONTACT_PHONE_DISPLAY}");
  const mail = page.indexOf("href={`mailto:${CONTACT_SALES_EMAIL}`}");
  assert.ok(phone > 0 && mail > phone && mail - phone < 600, "the mailto: link follows the phone inside the same office card");
  assert.match(page, /dir="ltr" className="text-navy font-medium hover:underline">\s*\{CONTACT_SALES_EMAIL\}/);
  assert.match(page, /organizationSchema\(locale, \{ withSalesEmail: true \}\)/);
  assert.doesNotMatch(page, /@ahanassa\.com/, "no literal address — only the constant");
});

test("no e-mail anywhere else: no other app/ or components/ file uses the constant, a mailto: link or a company address", () => {
  const walk = (dir: string): string[] =>
    fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : /\.(tsx?|css)$/.test(e.name) && !e.name.endsWith(".test.ts") ? [path.join(dir, e.name)] : []));
  const offenders = [...walk("app"), ...walk("components"), ...walk("lib/content")]
    .filter((f) => f !== path.join("app", "[locale]", "contact", "page.tsx") && f !== path.join("lib", "content", "contact-channels.ts"))
    .filter((f) => /CONTACT_SALES_EMAIL|COMPANY_PUBLIC_EMAILS|mailto:|@ahanassaa?\.com/.test(read(f)));
  assert.deepEqual(offenders, []);
});

test("llms-full.txt drops the e-mail from its copy of en/contact, keeps the phone; the leak scan passes it", () => {
  const contactMd = `# Contact\n\nآهن آسا Hezar Jarib Street, No. 6 Phone: [031-35134](tel:+983135134) Email: [${CONTACT_SALES_EMAIL}](mailto:${CONTACT_SALES_EMAIL})\n\nNext steps`;
  const full = buildLlmsFullTxt("# Ahan Assa", [{ file: "en/contact.html", h1: "Contact" }, { file: "contact.html", h1: "تماس" }], (md) => (md === "en/contact.md" ? contactMd : "x"));
  assert.ok(!full.includes("@"), full);
  assert.match(full, /Phone: \[031-35134\]\(tel:\+983135134\)\n\nNext steps/);
  assert.deepEqual(contacts("llms-full.txt", full), []);
  assert.deepEqual(contacts("llms-full.txt", `${full}\n${CONTACT_SALES_EMAIL}`), [CONTACT_SALES_EMAIL], "any other rendering of the address in llms-full.txt still fails the gate");
});
