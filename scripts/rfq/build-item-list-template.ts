/**
 * Writes the RFQ item-list templates (D-RFQ-FILE) to public/downloads/:
 *   node scripts/rfq/build-item-list-template.ts
 * Deterministic; lib/rfq/item-list-template.test.ts fails when a committed
 * file differs from this output.
 */
import fs from "node:fs";
import path from "node:path";
import { locales } from "../../config/locales.ts";
import { buildItemListTemplate, ITEM_LIST_TEMPLATE_PATH } from "../../lib/rfq/item-list-template.ts";

const root = path.resolve(import.meta.dirname, "../..");
for (const locale of locales) {
  const file = path.join(root, "public", ITEM_LIST_TEMPLATE_PATH(locale));
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, buildItemListTemplate(locale));
  console.log(`${path.relative(root, file)} ${fs.statSync(file).size} B`);
}
