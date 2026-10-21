import { test } from "node:test";
import assert from "node:assert/strict";
import { evaluateBasket } from "./basket.ts";
import { buildCard, CARD_SIZE, renderCard, rtl } from "./card.ts";
import { bulletinCard } from "./run.ts";
import { parsePricePage } from "./source.ts";
import { basePrice, basketRows, pageHtml } from "./test-fixtures.ts";

test("card: a size run is one LTR isolate (resvg would print «40×40×2.5» as «2.5×40×40»), never nested", () => {
  assert.equal(rtl("قوطی مربع 40×40×2.5"), "‏قوطی مربع ⁦40×40×2.5⁩‏");
  assert.equal(rtl("میلگرد آجدار A3 Ø16"), "‏میلگرد آجدار ⁦A3 Ø16⁩‏");
});

test("card: renders a vertical 1080×1350 PNG, byte-identical on a re-render (a retry posts the same image)", async () => {
  const e = evaluateBasket({ page: parsePricePage(pageHtml(basketRows("2026-10-20T07:50:00.000Z", basePrice))), date: "2026-10-20", history: [], snapshotVersion: null });
  const card = buildCard({ ...bulletinCard(e, false, "ahanassa.com/prices"), logoDataUri: "data:image/gif;base64,R0lGODlhAQABAAAAACw=" });
  const a = await renderCard(card);
  const b = await renderCard(card);
  assert.equal(a.sha256, b.sha256);
  assert.deepEqual([...a.png.subarray(1, 4)], [0x50, 0x4e, 0x47]);
  assert.equal(a.png.readUInt32BE(16), CARD_SIZE.width);
  assert.equal(a.png.readUInt32BE(20), CARD_SIZE.height);
});
