/**
 * W23 test fixtures: a /prices page in the live markup (lib/price-channel/source.ts), with invented factory names.
 */
import { BASKET } from "../../config/price-channel.ts";

export interface FixtureRow {
  variant: string;
  family?: string;
  name: string;
  size: string;
  factory: string;
  location: string;
  toman: number;
  at: string;
  rank?: number;
}

const fa = (n: number) => new Intl.NumberFormat("fa-IR", { useGrouping: true }).format(n);

export function pageHtml(rows: readonly FixtureRow[], opts: { unit?: boolean } = {}): string {
  const head = opts.unit === false ? "<th>قیمت روز</th>" : "<th>قیمت روز <span>تومان / کیلوگرم</span></th>";
  const body = rows
    .map(
      (r, i) =>
        `<tr class="group" data-aa-family="${r.family ?? "REBAR"}" data-aa-factory="${r.factory}"><th scope="row" class="x"><a href="/products/x?variant=${r.variant}" class="text-navy">${r.name}</a><span class="text-tertiary block text-xs font-semibold">خانواده</span></th><td data-aa-price-cell="${r.variant}" data-aa-price-rank="${r.rank ?? i}" class="x"><span class="text-navy font-bold">${fa(r.toman)}</span><span class="text-neutral-700 ms-1.5 inline-flex">بدون تغییر</span><span class="text-tertiary block text-xs">${r.factory}، ${r.location}</span><time dateTime="${r.at}" class="text-tertiary block text-xs">x</time><a href="/contact?variant=${r.variant}" class="aa-button">استعلام قیمت نهایی</a></td><td class="x"><span dir="ltr">${r.size}</span></td></tr>`,
    )
    .join("");
  return `<!doctype html><html><body><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></body></html>`;
}

/** Page names/sizes the basket's `expect` accepts. */
const PAGE = Object.fromEntries(BASKET.map((b) => [b.id, { name: `${b.label.product} ${b.expect.name}`, size: b.expect.size }]));

/**
 * Two factory rows per basket item at `at` (ISO): «کارخانه الف» (price) and «کارخانه ب» (price + 2000).
 * `price(id)` returns the «الف» price, or null to leave the item off the page.
 */
export function basketRows(at: string, price: (id: string, index: number) => number | null): FixtureRow[] {
  return BASKET.flatMap((b, i) => {
    const p = price(b.id, i);
    if (p === null) return [];
    return [
      { variant: b.variant, name: PAGE[b.id].name, size: PAGE[b.id].size, factory: "کارخانه الف", location: "درب کارخانه", toman: p, at, rank: 0 },
      { variant: b.variant, name: PAGE[b.id].name, size: PAGE[b.id].size, factory: "کارخانه ب", location: "انبار تهران", toman: p + 2000, at, rank: 1 },
    ];
  });
}

export const basePrice = (_id: string, i: number) => 100_000 + i * 5_000;
