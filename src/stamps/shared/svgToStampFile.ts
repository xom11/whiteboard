// SVG inline base64 helper dùng chung cho 3 stamp (geometry-2d, geometry-3d,
// graph-2d):
//
// - `svgToStampFile(svg, fileId)` — sync, dùng cho `restoreFileFromCustomData`
//   khi caller đã có fileId từ element.
// - `createStampFile(svg)` — async, dùng cho insert path khi cần generate
//   fileId mới từ hash SVG content.
//
// Output luôn là SVG inline base64 — Excalidraw render native + tự đảo màu
// trong dark mode qua CSS filter. KHÔNG raster sang PNG.

const DEFAULT_WIDTH = 200;
const DEFAULT_HEIGHT = 100;

export interface StampFileResult {
  fileId: string;
  dataURL: string;
  mimeType: 'image/svg+xml';
  width: number;
  height: number;
}

async function hashSvgToFileId(input: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const buf = new TextEncoder().encode(input);
    const digest = await crypto.subtle.digest('SHA-256', buf);
    return Array.from(new Uint8Array(digest))
      .slice(0, 16)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
  // Double-hash FNV-1a (32-bit chained) → 16 hex chars. Fallback Node/jsdom.
  let h1 = 0x811c9dc5;
  let h2 = 0xcbf29ce4;
  for (let i = 0; i < input.length; i++) {
    const c = input.charCodeAt(i);
    h1 ^= c;
    h1 = Math.imul(h1, 0x01000193);
    h2 ^= c + i;
    h2 = Math.imul(h2, 0x100000001b3 & 0xffffffff);
  }
  return (
    (h1 >>> 0).toString(16).padStart(8, '0') +
    (h2 >>> 0).toString(16).padStart(8, '0')
  );
}

function parseDim(svg: string, attr: 'width' | 'height'): number {
  const re = new RegExp(`<svg[^>]*\\s${attr}="(\\d+(?:\\.\\d+)?)`, 'i');
  const m = svg.match(re);
  if (m) return Math.max(1, Math.round(parseFloat(m[1])));
  const vb = svg.match(/viewBox="([\d.\s-]+)"/i);
  if (vb) {
    const parts = vb[1].trim().split(/\s+/).map(parseFloat);
    if (parts.length === 4) {
      return Math.max(1, Math.round(attr === 'width' ? parts[2] : parts[3]));
    }
  }
  return attr === 'width' ? DEFAULT_WIDTH : DEFAULT_HEIGHT;
}

export function parseSvgDims(svg: string): { width: number; height: number } {
  return { width: parseDim(svg, 'width'), height: parseDim(svg, 'height') };
}

export function svgToStampFile(svgString: string, fileId: string): StampFileResult {
  const { width, height } = parseSvgDims(svgString);
  const utf8 = unescape(encodeURIComponent(svgString));
  const base64 = typeof btoa !== 'undefined'
    ? btoa(utf8)
    : Buffer.from(utf8, 'binary').toString('base64');
  return {
    fileId,
    dataURL: `data:image/svg+xml;base64,${base64}`,
    mimeType: 'image/svg+xml',
    width,
    height,
  };
}

// Async variant cho insert path: hash SVG → fileId rồi gọi svgToStampFile.
// Identical SVG content → identical fileId (Excalidraw addFiles dedupe).
export async function createStampFile(svgString: string): Promise<StampFileResult> {
  const fileId = await hashSvgToFileId(svgString);
  return svgToStampFile(svgString, fileId);
}
