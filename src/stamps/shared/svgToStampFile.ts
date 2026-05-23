// SVG inline base64 helper dùng chung cho `restoreFileFromCustomData` của
// 3 stamp (geometry-2d, geometry-3d, graph-2d). Bake UTF-8 đúng cách (ký tự
// Việt + math symbol) + tự đo width/height từ SVG attr (fallback viewBox).
//
// Output luôn là SVG inline base64 — Excalidraw render native + tự đảo màu
// trong dark mode qua CSS filter. KHÔNG raster sang PNG.
//
// Note: KHÔNG generate fileId — caller (stamp index.tsx) đã có `element.fileId`
// và cần khớp với customData.fileId, không thể tự hash lại.

const DEFAULT_WIDTH = 200;
const DEFAULT_HEIGHT = 100;

export interface StampFileResult {
  fileId: string;
  dataURL: string;
  mimeType: 'image/svg+xml';
  width: number;
  height: number;
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
