/**
 * Picture preparation for reading (W13.3), pure so it is tested in Node and
 * run unchanged on a canvas in the browser (lib/rfq/extract/browser.ts):
 *
 *   - at most READ_MAX_SIDE px on the long side — a phone photo is 12 MP, far
 *     more than the model uses, and the upload is often over mobile data;
 *   - grey, contrast stretched between the 1st and 99th brightness percentile.
 *
 * Measured on the W13.3 fixtures (docs/RFQ_INSTANT_EXTRACT.md): the grey,
 * stretched picture made the vision model keep Persian zeros it otherwise
 * dropped («۱۸۰», «۶۰۰۰×۱۵۰۰×۱۰»). Only the copy sent for reading is changed;
 * the file attached to the RFQ is the customer's original.
 */
export const READ_MAX_SIDE = 1600;

/** Output size for a picture of `width`×`height`, long side ≤ READ_MAX_SIDE. */
export function readingSize(width: number, height: number): { width: number; height: number } {
  const scale = Math.min(1, READ_MAX_SIDE / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

/** In place on RGBA pixels: grey (Rec. 601 luma), then a 1–99 % percentile contrast stretch. Alpha → white paper. */
export function enhanceForReading(rgba: Uint8ClampedArray | Uint8Array): void {
  const histogram = new Uint32Array(256);
  const n = rgba.length / 4;
  for (let i = 0; i < rgba.length; i += 4) {
    const a = rgba[i + 3] / 255;
    const y = Math.round((0.299 * rgba[i] + 0.587 * rgba[i + 1] + 0.114 * rgba[i + 2]) * a + 255 * (1 - a));
    rgba[i] = y;
    histogram[y]++;
  }
  let low = 0;
  let high = 255;
  for (let seen = 0, v = 0; v < 256; v++) {
    seen += histogram[v];
    if (seen > n * 0.01) {
      low = v;
      break;
    }
  }
  for (let seen = 0, v = 255; v >= 0; v--) {
    seen += histogram[v];
    if (seen > n * 0.01) {
      high = v;
      break;
    }
  }
  const span = Math.max(1, high - low);
  const map = new Uint8Array(256);
  for (let v = 0; v < 256; v++) map[v] = Math.max(0, Math.min(255, Math.round(((v - low) * 255) / span)));
  for (let i = 0; i < rgba.length; i += 4) {
    const y = map[rgba[i]];
    rgba[i] = y;
    rgba[i + 1] = y;
    rgba[i + 2] = y;
    rgba[i + 3] = 255;
  }
}
