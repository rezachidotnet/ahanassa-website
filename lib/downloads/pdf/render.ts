import type { Locale } from "../../../config/locales.ts";
import { localizedPath } from "../../../config/locales.ts";
import { CONTACT_PHONE_DISPLAY } from "../../content/contact-channels.ts";
import { OFFICES, WORKING_HOURS_TEXT } from "../../content/company.ts";
import { RAW_MATERIALS, RAW_MATERIALS_UI } from "../../content/raw-materials.ts";
import { dimensionColumnLabel, HOLLOW_SECTION_MASS_NOTE, isEn10219HollowSection, NOMINAL_WEIGHT_DISCLAIMER, orderedSpecKeys, variantPageNotes, weightColumnLabel } from "../../catalog/specification-presenter.ts";
import { downloadsCopy } from "../copy.ts";
import { catalogChapters, sortBySize, templateGrade, templateStandard, type DownloadCatalog, type DownloadCategory, type DownloadTemplate } from "../model.ts";
import { rawMaterialChapters, type RawMaterialTemplate } from "../raw-materials.ts";
import { fmt } from "../sections.ts";
import { siteConfig } from "../../metadata/site.ts";
import { A4, BrandDocument, COLORS } from "./document.ts";

/**
 * W17.2 — the Download Center PDFs: one spec sheet per product family (public category), the "Sections & steel
 * products" catalog and the "Raw materials" catalog, each in fa/en/ar. Content is the catalog data only —
 * no price field reaches this module — plus the company facts' single sources (offices, phone, hours).
 */

export interface RenderedPdf {
  bytes: Uint8Array;
  /** Every string drawn into the PDF, for the build's no-price / no-source-name check. */
  texts: string[];
  pages: number;
}

const SITE = "www.ahanassa.com";

function footerLine(locale: Locale): string {
  return `${SITE} · ${CONTACT_PHONE_DISPLAY}`;
}

/** "Mehr 1405" / "October 2026" / "أكتوبر 2026" for the content date. */
export function editionLabel(locale: Locale, date: Date): string {
  const tag = locale === "fa" ? "fa-IR" : locale === "ar" ? "ar-u-nu-latn" : "en-GB";
  return new Intl.DateTimeFormat(tag, { year: "numeric", month: "long", timeZone: "Asia/Tehran" }).format(date);
}

async function finish(d: BrandDocument): Promise<RenderedPdf> {
  const bytes = await d.save();
  return { bytes, texts: [d.meta.title, d.meta.subject, ...d.texts], pages: d.doc.getPageCount() };
}

// --- shared blocks -----------------------------------------------------------------------------------------------

function templateBlock(d: BrandDocument, t: DownloadTemplate, category: DownloadCategory, locale: Locale) {
  const c = downloadsCopy(locale).pdf;
  d.heading(t.name, 2);
  const standard = templateStandard(t);
  const grade = templateGrade(t);
  const facts: Array<[string, string]> = [];
  if (standard) facts.push([c.standard, standard]);
  if (grade) facts.push([c.grade, grade]);
  if (locale !== "fa" && category.nameFa) facts.push([c.marketName, category.nameFa]);
  d.facts(facts);
  d.y -= 6;
  const variants = sortBySize(t.variants);
  const dimKeys = orderedSpecKeys(variants.map((v) => v.dimensions), "dimensions");
  const weightKeys = orderedSpecKeys(variants.map((v) => v.nominalWeight), "weight");
  const columns = [
    { label: c.size, weight: 1.7, align: "start" as const },
    ...dimKeys.map((k) => ({ label: dimensionColumnLabel(k, locale), weight: 1 })),
    ...weightKeys.map((k) => ({ label: weightColumnLabel(k, locale), weight: 1.15 })),
  ];
  const cell = (r: Record<string, number> | null, k: string) => (r && typeof r[k] === "number" ? fmt(r[k]) : "–");
  d.table(
    columns,
    variants.map((v) => [v.size, ...dimKeys.map((k) => cell(v.dimensions, k)), ...weightKeys.map((k) => cell(v.nominalWeight, k))]),
  );
  // W9.12: under an SHS/RHS (EN 10219-2) table, the hollow-section mass note.
  if (weightKeys.length && variants.some((v) => isEn10219HollowSection(v))) {
    d.y -= 4;
    d.paragraph(HOLLOW_SECTION_MASS_NOTE[locale], { size: 8, color: COLORS.muted, gapAfter: 2 });
  }
  // W9.13: the page notes of the same table (domestic channel, mill-wall pipe, thin coil, rebar Ø36/40, plate sizes).
  const notes = variantPageNotes(variants, locale);
  if (notes.length) d.y -= 4;
  for (const note of notes) d.paragraph(note, { size: 8, color: COLORS.muted, gapAfter: 2 });
  d.y -= 16;
}

function disclaimer(d: BrandDocument, locale: Locale) {
  d.paragraph(NOMINAL_WEIGHT_DISCLAIMER[locale], { size: 8, color: COLORS.muted, gapAfter: 2 });
  d.paragraph(downloadsCopy(locale).pdf.noPrices, { size: 8, color: COLORS.muted });
}

function cover(d: BrandDocument, title: string, subtitle: string, locale: Locale, date: Date) {
  const page = d.addBarePage();
  const [W, H] = A4;
  page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: COLORS.navy });
  page.drawRectangle({ x: 0, y: 0, width: W, height: 10, color: COLORS.copper });
  const markW = 150;
  d.mark(page, (W - markW) / 2, H - 170, markW, { body: COLORS.white, diamond: COLORS.copper });
  const brand = locale === "en" ? "Ahan Assa" : "آهن آسا";
  d.line(brand, { page, size: 26, weight: "extraBold", color: COLORS.white, x: W / 2, y: H - 330, align: "center" });
  if (locale === "fa") d.line(siteConfig.tagline, { page, size: 13, color: COLORS.accentOnNavy, x: W / 2, y: H - 360, align: "center" });
  page.drawRectangle({ x: W / 2 - 30, y: H - 395, width: 60, height: 2.5, color: COLORS.copper });
  let y = d.box(page, title, { x: 70, y: H - 450, width: W - 140, size: 28, weight: "extraBold", color: COLORS.white, lineHeight: 42, align: "center" });
  if (subtitle) y = d.box(page, subtitle, { x: 90, y: y - 8, width: W - 180, size: 12, color: COLORS.accentOnNavy, lineHeight: 20, align: "center" });
  const c = downloadsCopy(locale).pdf;
  d.line(`${c.edition}: ${editionLabel(locale, date)}`, { page, size: 10, color: COLORS.white, x: W / 2, y: 120, align: "center" });
  d.line(footerLine(locale), { page, size: 10, weight: "bold", color: COLORS.white, x: W / 2, y: 96, align: "center" });
}

function contactPage(d: BrandDocument, locale: Locale) {
  const c = downloadsCopy(locale).pdf;
  const offices = OFFICES[locale];
  const hours = WORKING_HOURS_TEXT[locale];
  d.addPage();
  d.heading(c.contactTitle, 1);
  const block = (label: string, lines: string[]) => {
    d.ensure(20 + lines.length * 18);
    d.y -= 11;
    d.line(label, { size: 11, weight: "bold", color: COLORS.navy });
    d.y -= 6;
    for (const l of lines) d.paragraph(l, { size: 10, lineHeight: 17 });
    d.y -= 12;
  };
  block(offices.head.label, [offices.head.address]);
  block(offices.tehran.label, [offices.tehran.address]);
  block(c.phone, [CONTACT_PHONE_DISPLAY]);
  block(hours.label, hours.lines);
  block(c.website, [SITE]);
  block(c.request, [`${SITE}${localizedPath(locale, "/contact")}`]);
  d.y -= 6;
  d.paragraph(c.noPrices, { size: 9, color: COLORS.muted });
}

/** The contents page (inserted after the cover): chapter titles with their page numbers. */
function contents(d: BrandDocument, locale: Locale, entries: Array<{ title: string; page: number }>) {
  const page = d.insertPage(1);
  const c = downloadsCopy(locale).pdf;
  let y = d.top - 22;
  d.line(c.contents, { page, size: 17, weight: "extraBold", color: COLORS.navy, y });
  const ruleX = d.dir === "rtl" ? d.right - 36 : d.left;
  page.drawRectangle({ x: ruleX, y: y - 13, width: 36, height: 2.5, color: COLORS.copper });
  y -= 46;
  const endX = d.dir === "rtl" ? d.left : d.right;
  for (const e of entries) {
    d.line(e.title, { page, size: 11, y });
    d.line(String(e.page), { page, size: 11, weight: "bold", color: COLORS.navy, x: endX, y, align: d.dir === "rtl" ? "left" : "right" });
    page.drawLine({ start: { x: d.left, y: y - 8 }, end: { x: d.right, y: y - 8 }, thickness: 0.5, color: COLORS.border });
    y -= 26;
  }
}

// --- documents ----------------------------------------------------------------------------------------------------

export async function renderSpecSheet(category: DownloadCategory, locale: Locale, date: Date): Promise<RenderedPdf> {
  const c = downloadsCopy(locale).pdf;
  const title = `${c.specSheet}: ${category.name}`;
  const d = await BrandDocument.create({ locale, title, subject: title, date, runningTitle: title, footer: footerLine(locale) });
  d.addPage();
  d.heading(category.name, 1);
  for (const t of category.templates) templateBlock(d, t, category, locale);
  disclaimer(d, locale);
  return finish(d);
}

export async function renderSectionsCatalog(catalog: DownloadCatalog): Promise<RenderedPdf> {
  const { locale } = catalog;
  const c = downloadsCopy(locale).pdf;
  const date = new Date(catalog.contentDate);
  const d = await BrandDocument.create({ locale, title: c.sectionsTitle, subject: c.sectionsTitle, date, runningTitle: c.sectionsTitle, footer: footerLine(locale) });
  cover(d, c.sectionsTitle, "", locale, date);
  const entries: Array<{ title: string; index: number }> = [];
  for (const chapter of catalogChapters(catalog)) {
    d.addPage();
    entries.push({ title: chapter.name, index: d.pageIndex() });
    d.heading(chapter.name, 1);
    for (const t of chapter.templates) templateBlock(d, t, chapter, locale);
  }
  disclaimer(d, locale);
  contactPage(d, locale);
  entries.push({ title: c.contactTitle, index: d.pageIndex() });
  // Page numbers count the contents page inserted at index 1: body index i becomes page i + 2.
  contents(d, locale, entries.map((e) => ({ title: e.title, page: e.index + 2 })));
  return finish(d);
}

function rawTemplateBlock(d: BrandDocument, t: RawMaterialTemplate, locale: Locale) {
  const c = downloadsCopy(locale).pdf;
  d.heading(t.name[locale], 2);
  const facts: Array<[string, string]> = [];
  if (t.standard) facts.push([c.standard, t.standard]);
  if (t.grade) facts.push([c.grade, t.grade]);
  d.facts(facts);
  d.y -= 4;
  d.paragraph(t.description[locale], { size: 9.5, lineHeight: 17, gapAfter: 4 });
  d.ensure(24);
  const boxH = 20;
  d.page.drawRectangle({ x: d.left, y: d.y - boxH, width: d.width, height: boxH, color: COLORS.cream });
  const s = d.start;
  d.line(c.specOnRequest, { size: 9, weight: "bold", color: COLORS.copper, x: s.align === "right" ? s.x - 8 : s.x + 8, y: d.y - 13.5 });
  d.y -= boxH + 18;
}

export async function renderRawMaterialsCatalog(locale: Locale, date: Date, templates?: readonly RawMaterialTemplate[]): Promise<RenderedPdf> {
  const c = downloadsCopy(locale).pdf;
  const d = await BrandDocument.create({ locale, title: c.rawTitle, subject: c.rawTitle, date, runningTitle: c.rawTitle, footer: footerLine(locale) });
  cover(d, c.rawTitle, RAW_MATERIALS_UI[locale].hubDescription, locale, date);
  const entries: Array<{ title: string; index: number }> = [];
  d.addPage();
  d.paragraph(c.rawIntro, { size: 10, lineHeight: 18, color: COLORS.muted, gapAfter: 10 });
  for (const chapter of rawMaterialChapters(templates)) {
    d.ensure(220);
    entries.push({ title: RAW_MATERIALS[chapter.slug][locale].h1, index: d.pageIndex() });
    d.heading(RAW_MATERIALS[chapter.slug][locale].h1, 1);
    d.paragraph(`${SITE}${localizedPath(locale, `/raw-materials/${chapter.slug}`)}`, { size: 8.5, color: COLORS.copper, gapAfter: 6 });
    for (const t of chapter.templates) rawTemplateBlock(d, t, locale);
  }
  d.paragraph(c.noPrices, { size: 8, color: COLORS.muted });
  contactPage(d, locale);
  entries.push({ title: c.contactTitle, index: d.pageIndex() });
  contents(d, locale, entries.map((e) => ({ title: e.title, page: e.index + 2 })));
  return finish(d);
}
