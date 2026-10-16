import { test } from "node:test";
import assert from "node:assert/strict";
import { faqPageSchema, jsonLdGraph, localBusinessSchema, organizationSchema, ORGANIZATION_ADDRESS, TEHRAN_OFFICE } from "./schema.ts";
import { scanPublication } from "../static/publication-gate.ts";
import { CONTACT_PHONE_DISPLAY, CONTACT_PHONE_E164 } from "../content/contact-channels.ts";
import fs from "node:fs";
import { companyPhoneDisplay } from "../content/company.ts";

const html = (data: unknown) => `<html><body><script type="application/ld+json">${JSON.stringify(data)}</script></body></html>`;

test("LocalBusiness: the official (Isfahan) address, phone and hours — no postal code, geo, rating or price", () => {
  for (const locale of ["fa", "en", "ar"] as const) {
    const lb = localBusinessSchema(locale);
    assert.equal(lb["@type"], "LocalBusiness");
    assert.equal(lb.telephone, CONTACT_PHONE_E164);
    assert.deepEqual(lb.address, { "@type": "PostalAddress", ...ORGANIZATION_ADDRESS[locale], addressCountry: "IR" });
    assert.deepEqual(lb.areaServed, ["IR", "IQ"]);
    assert.ok(!("department" in lb), "the Tehran office only where it is rendered (/contact)");
    const keys = JSON.stringify(lb);
    assert.deepEqual(lb.openingHoursSpecification, [
      { "@type": "OpeningHoursSpecification", dayOfWeek: ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday"], opens: "08:00", closes: "17:00" },
      { "@type": "OpeningHoursSpecification", dayOfWeek: ["Thursday"], opens: "08:00", closes: "12:00" },
    ]);
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
  assert.equal(companyPhoneDisplay(), CONTACT_PHONE_DISPLAY, "/about and the header/contact show the same number");
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

test("publication gate accepts the new nodes and still refuses offer shapes other than W20.7's", () => {
  const ok = html(jsonLdGraph([localBusinessSchema("en", { withTehranOffice: true }), faqPageSchema([{ q: "q", a: "a" }])!]));
  assert.deepEqual(scanPublication([{ path: "contact.html", content: ok }], new Set()), []);
  const priced = html(jsonLdGraph([{ "@type": "Product", name: "x", offers: { "@type": "AggregateOffer", lowPrice: "1", aggregateRating: 5 } }]));
  const kinds = scanPublication([{ path: "products/x.html", content: priced }], new Set()).map((f) => `${f.kind}:${f.match}`);
  assert.ok(kinds.includes("jsonld_type_not_allowed:AggregateOffer") && kinds.includes("jsonld_field_not_allowed:lowPrice") && kinds.includes("jsonld_field_not_allowed:aggregateRating"), kinds.join());
});

test("Organization: the parent group from lib/content/company.ts (name per locale, canonical URL, founded 1997)", () => {
  assert.deepEqual(organizationSchema("fa").parentOrganization, { "@type": "Organization", name: "فضاسازه نقش جهان", url: "https://fazasazeh.ir", foundingDate: "1997" });
  assert.equal(organizationSchema("en").parentOrganization.name, "Fazasazeh Naghsh-e Jahan");
  const page = html(jsonLdGraph([organizationSchema("en"), localBusinessSchema("en", { withTehranOffice: true })]));
  assert.deepEqual(scanPublication([{ path: "en/contact.html", content: page }], new Set()), [], "the gate allows OpeningHoursSpecification and foundingDate");
  const extra = html(jsonLdGraph([{ "@type": "LocalBusiness", openingHours: "Mo-Fr", geo: { "@type": "GeoCoordinates" } }]));
  const kinds = scanPublication([{ path: "x.html", content: extra }], new Set()).map((f) => f.match);
  assert.ok(kinds.includes("openingHours") && kinds.includes("geo") && kinds.includes("GeoCoordinates"), kinds.join());
});
