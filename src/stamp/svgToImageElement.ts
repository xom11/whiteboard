export interface SvgImageResult {
  dataURL: string;
  fileId: string;
  width: number;
  height: number;
  mimeType: 'image/svg+xml';
}

async function hashString(input: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const buf = new TextEncoder().encode(input);
    const digest = await crypto.subtle.digest('SHA-256', buf);
    return Array.from(new Uint8Array(digest)).slice(0, 16).map(b => b.toString(16).padStart(2, '0')).join('');
  }
  // Double-hash FNV-1a (32-bit chained) → 16 hex chars
  let h1 = 0x811c9dc5;
  let h2 = 0xcbf29ce4;
  for (let i = 0; i < input.length; i++) {
    const c = input.charCodeAt(i);
    h1 ^= c;
    h1 = Math.imul(h1, 0x01000193);
    h2 ^= c + i;
    h2 = Math.imul(h2, 0x100000001b3 & 0xffffffff);
  }
  return (h1 >>> 0).toString(16).padStart(8, '0') + (h2 >>> 0).toString(16).padStart(8, '0');
}

function parseSize(svg: string, attr: 'width' | 'height'): number {
  const re = new RegExp(`<svg[^>]*\\s${attr}="(\\d+(?:\\.\\d+)?)`, 'i');
  const m = svg.match(re);
  if (m) return Math.max(1, Math.round(parseFloat(m[1])));
  // Fallback: try viewBox
  const vb = svg.match(/viewBox="([\d.\s-]+)"/i);
  if (vb) {
    const parts = vb[1].trim().split(/\s+/).map(parseFloat);
    if (parts.length === 4) return Math.max(1, Math.round(attr === 'width' ? parts[2] : parts[3]));
  }
  return attr === 'width' ? 200 : 100;
}

// SVG → image element data. Skips canvas rasterization entirely (canvas with
// foreignObject + external resources gets tainted by browser security model,
// blocking toDataURL). Excalidraw renders SVG natively via mimeType 'image/svg+xml'.
export async function svgToImageElement(svg: string): Promise<SvgImageResult> {
  const width = parseSize(svg, 'width');
  const height = parseSize(svg, 'height');
  // Use UTF-8 safe base64 encoding (btoa fails on non-Latin1 chars)
  const utf8 = unescape(encodeURIComponent(svg));
  const dataURL = 'data:image/svg+xml;base64,' + btoa(utf8);
  const fileId = await hashString(dataURL);
  return { dataURL, fileId, width, height, mimeType: 'image/svg+xml' };
}
