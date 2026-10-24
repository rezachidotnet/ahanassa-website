/**
 * W41 — a minimal QR Code encoder (ISO/IEC 18004) for the story image: byte mode, error correction level M,
 * versions 1–10 (up to 213 bytes, enough for a site URL with UTM tags). No dependency: the matrix is drawn as SVG
 * by card.ts. The best of the 8 masks is chosen by the standard penalty rules; `mask` forces one (tests compare a
 * forced-mask matrix with the reference encoder's output, qr.test.ts).
 */

/** Per version (index 1–10): EC codewords per block, and the data codewords of each block (level M). */
const BLOCKS_M: ReadonlyArray<{ ec: number; data: readonly number[] }> = [
  { ec: 0, data: [] },
  { ec: 10, data: [16] },
  { ec: 16, data: [28] },
  { ec: 26, data: [44] },
  { ec: 18, data: [32, 32] },
  { ec: 24, data: [43, 43] },
  { ec: 16, data: [27, 27, 27, 27] },
  { ec: 18, data: [31, 31, 31, 31] },
  { ec: 22, data: [38, 38, 39, 39] },
  { ec: 22, data: [36, 36, 36, 37, 37] },
  { ec: 26, data: [43, 43, 43, 43, 44] },
];
const ALIGNMENT: ReadonlyArray<readonly number[]> = [[], [], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34], [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50]];
const REMAINDER_BITS = [0, 0, 7, 7, 7, 7, 7, 0, 0, 0, 0];
const MAX_VERSION = 10;

// GF(256) with the QR polynomial x^8 + x^4 + x^3 + x^2 + 1.
const EXP = new Uint8Array(512);
const LOG = new Uint8Array(256);
{
  let x = 1;
  for (let i = 0; i < 255; i++) {
    EXP[i] = x;
    LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
}
const mul = (a: number, b: number) => (a && b ? EXP[LOG[a] + LOG[b]] : 0);

function ecCodewords(data: readonly number[], n: number): number[] {
  let gen = [1];
  for (let i = 0; i < n; i++) {
    const next = new Array(gen.length + 1).fill(0);
    gen.forEach((g, j) => {
      next[j] ^= g;
      next[j + 1] ^= mul(g, EXP[i]);
    });
    gen = next;
  }
  const rem = [...data, ...new Array(n).fill(0)];
  for (let i = 0; i < data.length; i++) {
    const f = rem[i];
    if (f) for (let j = 0; j < gen.length; j++) rem[i + j] ^= mul(gen[j], f);
  }
  return rem.slice(data.length);
}

function dataCodewords(bytes: Uint8Array, version: number): number[] {
  const total = BLOCKS_M[version].data.reduce((a, b) => a + b, 0);
  const bits: number[] = [];
  const put = (v: number, len: number) => {
    for (let i = len - 1; i >= 0; i--) bits.push((v >>> i) & 1);
  };
  put(0b0100, 4);
  put(bytes.length, version < 10 ? 8 : 16);
  for (const b of bytes) put(b, 8);
  put(0, Math.min(4, total * 8 - bits.length));
  while (bits.length % 8) bits.push(0);
  const out: number[] = [];
  for (let i = 0; i < bits.length; i += 8) out.push(bits.slice(i, i + 8).reduce((a, b) => (a << 1) | b, 0));
  for (let pad = 0; out.length < total; pad++) out.push(pad % 2 ? 0x11 : 0xec);
  return out;
}

function interleave(data: number[], version: number): number[] {
  const { ec, data: sizes } = BLOCKS_M[version];
  const blocks: number[][] = [];
  let at = 0;
  for (const s of sizes) {
    blocks.push(data.slice(at, at + s));
    at += s;
  }
  const ecs = blocks.map((b) => ecCodewords(b, ec));
  const out: number[] = [];
  for (let i = 0; i < Math.max(...sizes); i++) for (const b of blocks) if (i < b.length) out.push(b[i]);
  for (let i = 0; i < ec; i++) for (const e of ecs) out.push(e[i]);
  return out;
}

const bch = (value: number, poly: number, bits: number) => {
  let v = value << bits;
  const top = 31 - Math.clz32(poly);
  while (31 - Math.clz32(v) >= top && v) v ^= poly << (31 - Math.clz32(v) - top);
  return (value << bits) | v;
};

const MASKS: ReadonlyArray<(r: number, c: number) => boolean> = [
  (r, c) => (r + c) % 2 === 0,
  (r) => r % 2 === 0,
  (_, c) => c % 3 === 0,
  (r, c) => (r + c) % 3 === 0,
  (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0,
  (r, c) => ((r * c) % 2) + ((r * c) % 3) === 0,
  (r, c) => (((r * c) % 2) + ((r * c) % 3)) % 2 === 0,
  (r, c) => (((r + c) % 2) + ((r * c) % 3)) % 2 === 0,
];

/** The function patterns of a version: modules (true = dark) and which cells are reserved. */
function base(version: number): { m: boolean[][]; fixed: boolean[][] } {
  const n = version * 4 + 17;
  const m = Array.from({ length: n }, () => new Array<boolean>(n).fill(false));
  const fixed = Array.from({ length: n }, () => new Array<boolean>(n).fill(false));
  const set = (r: number, c: number, dark: boolean) => {
    m[r][c] = dark;
    fixed[r][c] = true;
  };
  for (const [r0, c0] of [[0, 0], [0, n - 7], [n - 7, 0]]) {
    for (let r = -1; r <= 7; r++)
      for (let c = -1; c <= 7; c++) {
        const rr = r0 + r;
        const cc = c0 + c;
        if (rr < 0 || cc < 0 || rr >= n || cc >= n) continue;
        const ring = Math.max(Math.abs(r - 3), Math.abs(c - 3));
        set(rr, cc, r >= 0 && r <= 6 && c >= 0 && c <= 6 && ring !== 2);
      }
  }
  for (let i = 8; i < n - 8; i++) {
    set(6, i, i % 2 === 0);
    set(i, 6, i % 2 === 0);
  }
  const pos = ALIGNMENT[version];
  const last = pos.length - 1;
  pos.forEach((r, i) =>
    pos.forEach((c, j) => {
      // Not on the three finder corners.
      if ((i === 0 && j === 0) || (i === 0 && j === last) || (i === last && j === 0)) return;
      for (let dr = -2; dr <= 2; dr++) for (let dc = -2; dc <= 2; dc++) set(r + dr, c + dc, Math.max(Math.abs(dr), Math.abs(dc)) !== 1);
    }),
  );
  // Format areas (filled per mask) and the dark module.
  for (let i = 0; i <= 8; i++) {
    if (!fixed[8][i]) set(8, i, false);
    if (!fixed[i][8]) set(i, 8, false);
  }
  for (let i = 0; i < 8; i++) {
    set(8, n - 1 - i, false);
    set(n - 1 - i, 8, false);
  }
  set(n - 8, 8, true);
  if (version >= 7) {
    const info = bch(version, 0x1f25, 12);
    for (let i = 0; i < 18; i++) {
      const dark = ((info >>> i) & 1) === 1;
      const a = Math.floor(i / 3);
      const b = (i % 3) + n - 11;
      set(a, b, dark);
      set(b, a, dark);
    }
  }
  return { m, fixed };
}

function placeFormat(m: boolean[][], mask: number): void {
  const n = m.length;
  // Level M = 0b00.
  const f = bch(mask, 0x537, 10) ^ 0x5412;
  const bit = (i: number) => ((f >>> i) & 1) === 1;
  for (let i = 0; i <= 5; i++) m[i][8] = bit(i);
  m[7][8] = bit(6);
  m[8][8] = bit(7);
  m[8][7] = bit(8);
  for (let i = 9; i < 15; i++) m[8][14 - i] = bit(i);
  for (let i = 0; i < 8; i++) m[8][n - 1 - i] = bit(i);
  for (let i = 8; i < 15; i++) m[n - 15 + i][8] = bit(i);
}

function penalty(m: boolean[][]): number {
  const n = m.length;
  let p = 0;
  const line = (get: (i: number, j: number) => boolean) => {
    for (let i = 0; i < n; i++) {
      let run = 1;
      for (let j = 1; j <= n; j++) {
        if (j < n && get(i, j) === get(i, j - 1)) run++;
        else {
          if (run >= 5) p += run - 2;
          run = 1;
        }
      }
      for (let j = 0; j + 11 <= n; j++) {
        const s = Array.from({ length: 11 }, (_, k) => (get(i, j + k) ? "1" : "0")).join("");
        if (s === "10111010000" || s === "00001011101") p += 40;
      }
    }
  };
  line((i, j) => m[i][j]);
  line((i, j) => m[j][i]);
  for (let r = 0; r < n - 1; r++) for (let c = 0; c < n - 1; c++) if (m[r][c] === m[r][c + 1] && m[r][c] === m[r + 1][c] && m[r][c] === m[r + 1][c + 1]) p += 3;
  const dark = m.reduce((a, row) => a + row.filter(Boolean).length, 0);
  p += Math.floor(Math.abs((dark * 100) / (n * n) - 50) / 5) * 10;
  return p;
}

export interface QrCode {
  version: number;
  mask: number;
  /** modules[row][col], true = dark; no quiet zone. */
  modules: boolean[][];
}

export function encodeQr(text: string, opts: { mask?: number; minVersion?: number } = {}): QrCode {
  const bytes = new TextEncoder().encode(text);
  let version = Math.max(1, opts.minVersion ?? 1);
  const capacity = (v: number) => Math.floor((BLOCKS_M[v].data.reduce((a, b) => a + b, 0) * 8 - 4 - (v < 10 ? 8 : 16)) / 8);
  while (version <= MAX_VERSION && capacity(version) < bytes.length) version++;
  if (version > MAX_VERSION) throw new Error(`QR: ${bytes.length} bytes do not fit version ${MAX_VERSION} (level M)`);
  const codewords = interleave(dataCodewords(bytes, version), version);
  const bits: number[] = [];
  for (const cw of codewords) for (let i = 7; i >= 0; i--) bits.push((cw >>> i) & 1);
  for (let i = 0; i < REMAINDER_BITS[version]; i++) bits.push(0);

  const { m: raw, fixed } = base(version);
  const n = raw.length;
  // Data placement: two-column zigzag from the bottom right, skipping the timing column.
  const order: Array<[number, number]> = [];
  let up = true;
  for (let right = n - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let k = 0; k < n; k++) {
      const r = up ? n - 1 - k : k;
      for (const c of [right, right - 1]) if (!fixed[r][c]) order.push([r, c]);
    }
    up = !up;
  }
  const build = (mask: number) => {
    const m = raw.map((row) => [...row]);
    order.forEach(([r, c], i) => {
      const bit = i < bits.length ? bits[i] === 1 : false;
      m[r][c] = MASKS[mask](r, c) ? !bit : bit;
    });
    placeFormat(m, mask);
    return m;
  };
  if (opts.mask !== undefined) return { version, mask: opts.mask, modules: build(opts.mask) };
  let best: QrCode | null = null;
  let bestScore = Infinity;
  for (let mask = 0; mask < 8; mask++) {
    const m = build(mask);
    const score = penalty(m);
    if (score < bestScore) {
      bestScore = score;
      best = { version, mask, modules: m };
    }
  }
  return best!;
}

/** The QR as one SVG <path> of dark modules, `scale` px each, at (x, y), with a white 4-module quiet zone. */
export function qrSvg(qr: QrCode, x: number, y: number, scale: number): { svg: string; size: number } {
  const n = qr.modules.length;
  const size = (n + 8) * scale;
  let d = "";
  qr.modules.forEach((row, r) =>
    row.forEach((dark, c) => {
      if (dark) d += `M${x + (c + 4) * scale} ${y + (r + 4) * scale}h${scale}v${scale}h-${scale}z`;
    }),
  );
  return { svg: `<rect x="${x}" y="${y}" width="${size}" height="${size}" fill="#ffffff"/><path d="${d}" fill="#0b2545" shape-rendering="crispEdges"/>`, size };
}
