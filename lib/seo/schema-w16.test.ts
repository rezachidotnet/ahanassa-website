import { test } from "node:test";
import assert from "node:assert/strict";
import { faqPageSchema, jsonLdGraph, localBusinessSchema, ORGANIZATION_ADDRESS } from "./schema.ts";
import { scanPublication } from "../static/publication-gate.ts";
import { CONTACT_PHONE_E164 } from "../content/contact-channels.ts";

const html = (data: unknown) => `<html><body><script type="application/ld+json">${JSON.stringify(data)}</script></body></html>`;

test("LocalBusiness: the confirmed address and phone only — no postal code, hours, geo, rating or price", () => {
  for (const locale of ["fa", "en", "ar"] as const) {
    const lb = localBusinessSchema(locale);
    assert.equal(lb["@type"], "LocalBusiness");
    assert.equal(lb.telephone, CONTACT_PHONE_E164);
    assert.deepEqual(lb.address, { "@type": "PostalAddress", ...ORGANIZATION_ADDRESS[locale], addressCountry: "IR" });
    const keys = JSON.stringify(lb);
    for (const forbidden of ["postalCode", "openingHours", "geo", "aggregateRating", "priceRange", "offers", "price"]) assert.ok(!keys.includes(`"${forbidden}"`), forbidden);
  }
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
  const ok = html(jsonLdGraph([localBusinessSchema("en"), faqPageSchema([{ q: "q", a: "a" }])!]));
  assert.deepEqual(scanPublication([{ path: "contact.html", content: ok }], new Set()), []);
  const priced = html(jsonLdGraph([{ "@type": "Product", name: "x", offers: { "@type": "Offer", price: "1" } }]));
  const kinds = scanPublication([{ path: "products/x.html", content: priced }], new Set()).map((f) => `${f.kind}:${f.match}`);
  assert.ok(kinds.includes("jsonld_field_not_allowed:offers") && kinds.includes("jsonld_type_not_allowed:Offer"), kinds.join());
});
