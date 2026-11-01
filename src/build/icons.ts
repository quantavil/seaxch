import { deflateSync } from "node:zlib";

/** Dependency-free PNG icon renderer: the lens mark on a terracotta tile. 4x4 supersampling for clean edges. */

const CRC = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (b: Uint8Array) => {
  let c = 0xffffffff;
  for (const x of b) c = CRC[(c ^ x) & 255]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
function chunk(type: string, data: Uint8Array): Buffer {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, "ascii");
  out.set(data, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
}
function encodePng(w: number, h: number, rgba: Uint8Array): Buffer {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) raw.set(rgba.subarray(y * w * 4, (y + 1) * w * 4), y * (w * 4 + 1) + 1);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw, { level: 9 })), chunk("IEND", new Uint8Array())]);
}

const BG = [255, 148, 102], FG = [42, 19, 8];
function roundRect(px: number, py: number, r: number) {
  const qx = Math.abs(px - 0.5) - (0.5 - r), qy = Math.abs(py - 0.5) - (0.5 - r);
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
}
/** The brand lens (same geometry as `markSvg` in svg.ts, in 24-unit space): a squircle ring, a round-capped handle, a dot. */
const sdBox = (x: number, y: number, cx: number, cy: number, h: number, r: number) => {
  const qx = Math.abs(x - cx) - (h - r), qy = Math.abs(y - cy) - (h - r);
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
};
const sdSeg = (x: number, y: number, ax: number, ay: number, bx: number, by: number) => {
  const dx = bx - ax, dy = by - ay, t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(x - ax - t * dx, y - ay - t * dy);
};
function inLens(u: number, v: number, k: number): boolean {
  // map the 24-unit glyph (bbox centre ~12,12) onto the tile, scaled by k about the centre
  const x = (u - 0.5) / k * 24 + 12, y = (v - 0.5) / k * 24 + 12;
  return (
    Math.abs(sdBox(x, y, 9.4, 9.4, 6.3, 4.6)) < 1.3 ||
    sdSeg(x, y, 15.6, 15.6, 20.7, 20.7) < 1.5 ||
    Math.hypot(x - 9.4, y - 9.4) < 1.9
  );
}

/** maskable: full-bleed square, glyph shrunk into the safe zone. */
export function renderIcon(size: number, maskable = false): Buffer {
  const px = new Uint8Array(size * size * 4);
  const S = 4;
  const k = maskable ? 0.74 : 1;
    for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < S; sy++) for (let sx = 0; sx < S; sx++) {
        const u = (x + (sx + 0.5) / S) / size, v = (y + (sy + 0.5) / S) / size;
        if (!maskable && roundRect(u, v, 0.22) > 0) continue;
        const c = inLens(u, v, 0.82 * k) ? FG : BG;
        r += c[0]!; g += c[1]!; b += c[2]!; a++;
      }
      const o = (y * size + x) * 4;
      if (a) { px[o] = r / a; px[o + 1] = g / a; px[o + 2] = b / a; }
      px[o + 3] = Math.round((a / (S * S)) * 255);
    }
  }
  return encodePng(size, size, px);
}
