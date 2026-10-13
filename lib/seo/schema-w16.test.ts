import { test } from "node:test";
import assert from "node:assert/strict";
import { faqPageSchema, jsonLdGraph, localBusinessSchema, organizationSchema, ORGANIZATION_ADDRESS, TEHRAN_OFFICE } from "./schema.ts";
import { scanPublication } from "../static/publication-gate.ts";
import { CONTACT_PHONE_DISPLAY, CONTACT_PHONE_E164 } from "../content/contact-channels.ts";
import fs from "node:fs";

const html = (data: unknown) => `<html><body><script type="application/ld+json">${JSON.stringify(data)}</script></body></html>`;

test("LocalBusiness: the official (Isfahan) address and phone only — no postal code, hours, geo, rating or price", () => {
  for (const locale of ["fa", "en", "ar"] as const) {
    const lb = localBusinessSchema(locale);
    assert.equal(lb["@type"], "LocalBusiness");
    assert.equal(lb.telephone, CONTACT_PHONE_E164);
    assert.deepEqual(lb.address, { "@type": "PostalAddress", ...ORGANIZATION_ADDRESS[locale], addressCountry: "IR" });
    assert.deepEqual(lb.areaServed, ["IR", "IQ"]);
    assert.ok(!("department" in lb), "the Tehran office only where it is rendered (/contact)");
    const keys = JSON.stringify(lb);
    for (const forbidden of ["postalCode", "openingHours", "geo", "aggregateRating", "priceRange", "offers", "price"]) assert.ok(!keys.includes(`"${forbidden}"`), forbidden);
  }
});

test("D-COMPANY-INFO: /contact adds the Tehran coordination office as a department, with its postal code and no phone", () => {
  for (const locale of ["fa", "en", "ar"] as const) {
    const dep = localBusinessSchema(locale, { withTehranOffice: true }).department!;
    const { name, ...address } = TEHRAN_OFFICE[locale];
    assert.equal(dep["@type"], "LocalBusiness");
    assert.equal(dep.name, name);
    assert.deepEqual(dep.address, { "@type": "PostalAddress", ...address, addressCountry: "IR" });
    assert.equal(dep.address.postalCode, "1454954166");
    assert.ok(!("telephone" in dep), "no separate Tehran phone");
  }
  assert.deepEqual(organizationSchema("fa").contactPoint, { "@type": "ContactPoint", telephone: "+983135134", contactType: "sales", areaServed: ["IR", "IQ"] });
  assert.equal(CONTACT_PHONE_DISPLAY, "031-35134");
  const page = fs.readFileSync(new URL("../../app/[locale]/contact/page.tsx", import.meta.url), "utf8");
  assert.match(page, /localBusinessSchema\(locale, \{ withTehranOffice: true \}\)/);
  assert.match(page, /tehranLines: \["تهران، خیابان ستارخان، پلاک 660", "کد پستی 1454954166"\]/);
  assert.match(page, /href=\{`tel:\$\{CONTACT_PHONE_E164\}`\}/);
});

test("FAQPage: visible Q&A as Question/Answer; an item that mentions a currency stays out; none left -> null", () => {
  const faq = faqPageSchema([
    { q: "چه اطلاعاتی لازم است؟", a: "فاکتور یا لیست خرید." },
    { q: "قیمت میلگرد چند است؟", a: "حدود ۳۵٬۰۰۰ تومان" },
    { q: "Price?", a: "About 35,000 Toman per kg" },
  ])!;
  assert.deepEqual(faq, { "@type": "FAQPage", mainEntity: [{ "@type": "Question", name: "چه اطلاعاتی لازم است؟", acceptedAnswer: { "@type": "Answer", text: "فاکتور یا لیست خرید." } }] });
  assert.equal(faqPageSchema([{ q: "x", a: "10 ریال" }]), null);
  assert.equal(faqPageSchema([]), null);
});

test("publication gate accepts the new nodes and still refuses offers/price", () => {
  const ok = html(jsonLdGraph([localBusinessSchema("en", { withTehranOffice: true }), faqPageSchema([{ q: "q", a: "a" }])!]));
  assert.deepEqual(scanPublication([{ path: "contact.html", content: ok }], new Set()), []);
  const priced = html(jsonLdGraph([{ "@type": "Product", name: "x", offers: { "@type": "Offer", price: "1" } }]));
  const kinds = scanPublication([{ path: "products/x.html", content: priced }], new Set()).map((f) => `${f.kind}:${f.match}`);
  assert.ok(kinds.includes("jsonld_field_not_allowed:offers") && kinds.includes("jsonld_type_not_allowed:Offer"), kinds.join());
});
