import type { GeometryDraftPreview } from '../shared/draftTypes';

interface ViewportAppState {
  scrollX: number;
  scrollY: number;
  width?: number;
  height?: number;
  zoom?: { value: number };
}

/** Đọc kích thước intrinsic của SVG (width/height attr, fallback viewBox, fallback 300x200). */
export function svgIntrinsicSize(svg: string): { width: number; height: number } {
  const w = svg.match(/<svg[^>]*\swidth="([\d.]+)"/);
  const h = svg.match(/<svg[^>]*\sheight="([\d.]+)"/);
  if (w && h) return { width: parseFloat(w[1]), height: parseFloat(h[1]) };
  const vb = svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
  if (vb) return { width: parseFloat(vb[1]), height: parseFloat(vb[2]) };
  return { width: 300, height: 200 };
}

/** Tạo draft đặt hình vào giữa viewport hiện tại (board coords). */
export function draftFromViewport(
  svg: string,
  appState: ViewportAppState,
  seq: number,
): GeometryDraftPreview {
  const { width, height } = svgIntrinsicSize(svg);
  const zoom = appState.zoom?.value ?? 1;
  const vw = appState.width ?? 800;
  const vh = appState.height ?? 600;
  const cx = appState.scrollX + vw / 2 / zoom;
  const cy = appState.scrollY + vh / 2 / zoom;
  return { svg, width, height, x: cx - width / 2, y: cy - height / 2, seq };
}

/** Dedupe: trả true nếu jsonState khác lần trước (và cập nhật seen.last). */
export function didStateChange(seen: { last: string | null }, jsonState: string): boolean {
  if (seen.last === jsonState) return false;
  seen.last = jsonState;
  return true;
}
