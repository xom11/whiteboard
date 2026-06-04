import { deserializeBoard } from './serialize';
import { paletteFor } from './editor/theme';
import { createStore } from '../../core/scene';
import { DEFAULT_VIEW_2D } from '../../core/scene/types';
import { JxgRenderer } from '../../core/scene/render/JxgRenderer';
import { renderJsxgOffscreen } from '../shared/jxgOffscreenRender';

/**
 * Re-render geometry SVG từ jsonState đã serialize. Dùng cho:
 *   1. Restore math-stamp file sau khi reload page (Excalidraw mất binary files).
 *   2. Generate SVG lúc INSERT (thay vì clone DOM với màu theo theme editor).
 *
 * LƯU Ý quan trọng — luôn dùng LIGHT palette (nét đậm). Excalidraw apply CSS
 * `filter: invert(93%) hue-rotate(180deg)` lên canvas trong dark mode → nét
 * đậm tự đảo thành sáng. Nếu ta bake nét sáng vào SVG cho dark mode, filter
 * sẽ đảo thành đậm → chìm vào nền tối. Giải pháp: luôn dùng nét đậm + để
 * Excalidraw tự lo invert.
 *
 * Implementation: tạo 1 div ẩn (off-screen, real dimensions để JSXGraph render
 * chuẩn), initBoard, replay creation log từ jsonState, dump SVG, dọn dẹp.
 *
 * Container dimensions phải MATCH aspect ratio của bbox (đã được editor lưu
 * sau khi JSXGraph adjust với keepAspectRatio:true). Trước đây hardcode
 * 400×300 + keepAspectRatio:false làm shape bị kéo dãn (circle thành ellipse,
 * góc vuông lệch) khi bbox không 4:3 → ảnh hiển thị khác với editor lúc
 * double-click. Fix: tính container W/H từ bbox + keepAspectRatio:true để
 * SVG output khớp với view trong editor.
 *
 * Lý do JXG.Options.text.display = 'internal': JSXGraph mặc định render
 * label bằng HTML <div> overlay → clone SVG export sẽ thiếu label.
 */

const PIXELS_PER_UNIT = 20;
const MIN_DIM = 100;
const MAX_DIM = 1200;
const FALLBACK_W = 400;
const FALLBACK_H = 300;

export function containerDimsForBbox(bbox: [number, number, number, number]): { width: number; height: number } {
  const [xmin, ymax, xmax, ymin] = bbox;
  const w = Math.abs(xmax - xmin);
  const h = Math.abs(ymax - ymin);
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) {
    return { width: FALLBACK_W, height: FALLBACK_H };
  }
  let width = w * PIXELS_PER_UNIT;
  let height = h * PIXELS_PER_UNIT;
  const maxAxis = Math.max(width, height);
  if (maxAxis > MAX_DIM) {
    const ratio = MAX_DIM / maxAxis;
    width *= ratio;
    height *= ratio;
  }
  const minAxis = Math.min(width, height);
  if (minAxis < MIN_DIM) {
    const ratio = MIN_DIM / minAxis;
    width *= ratio;
    height *= ratio;
  }
  return { width: Math.round(width), height: Math.round(height) };
}

/**
 * Auto-fit board bbox sau khi entities đã render. Iterate point/circle elements
 * trên board để tính min/max x,y, thêm padding 15%, gọi setBoundingBox.
 *
 * Áp dụng khi state.meta.view.bbox còn là DEFAULT_VIEW_2D — i.e. AI-generated
 * figure chưa được editor zoom/pan. Stamp đã edit có bbox riêng của user, giữ
 * nguyên (consumer expectation: re-render khớp với view editor lúc save).
 *
 * Aspect ratio container đã được set theo bbox ban đầu; setBoundingBox với aspect
 * khác sẽ được JSXGraph adjust tự động (keepAspectRatio:true) → letterbox.
 */
function autoFitBboxFromBoard(board: any, padPct = 0.15): void {
  const objs = board?.objectsList;
  if (!Array.isArray(objs)) return;
  let xmin = Infinity, xmax = -Infinity, ymin = Infinity, ymax = -Infinity;
  let count = 0;
  for (const o of objs) {
    // OBJECT_CLASS_POINT = 1
    if (o?.elementClass === 1 && typeof o.X === 'function' && typeof o.Y === 'function') {
      const x = o.X(), y = o.Y();
      if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
      xmin = Math.min(xmin, x); xmax = Math.max(xmax, x);
      ymin = Math.min(ymin, y); ymax = Math.max(ymax, y);
      count++;
    } else if (o?.elementClass === 3 && o.center?.X && typeof o.Radius === 'function') {
      // OBJECT_CLASS_CIRCLE — include bounds [cx ± r, cy ± r]
      const cx = o.center.X(), cy = o.center.Y(), r = o.Radius();
      if (!Number.isFinite(cx) || !Number.isFinite(cy) || !Number.isFinite(r)) continue;
      xmin = Math.min(xmin, cx - r); xmax = Math.max(xmax, cx + r);
      ymin = Math.min(ymin, cy - r); ymax = Math.max(ymax, cy + r);
      count++;
    }
  }
  if (count < 2 || !Number.isFinite(xmin)) return;
  let w = xmax - xmin, h = ymax - ymin;
  // Tránh degenerate (mọi điểm trùng / collinear hoàn toàn): floor 1 unit.
  if (w < 0.5) { const cx = (xmin + xmax) / 2; xmin = cx - 0.5; xmax = cx + 0.5; w = 1; }
  if (h < 0.5) { const cy = (ymin + ymax) / 2; ymin = cy - 0.5; ymax = cy + 0.5; h = 1; }
  const padX = w * padPct, padY = h * padPct;
  // JSXGraph bbox: [xmin, ymax, xmax, ymin] (y reversed)
  try {
    board.setBoundingBox([xmin - padX, ymax + padY, xmax + padX, ymin - padY]);
    if (typeof board.update === 'function') board.update();
    if (typeof board.fullUpdate === 'function') board.fullUpdate();
  } catch { /* ignore */ }
}

function isDefaultBbox(bbox: readonly number[]): boolean {
  const d = DEFAULT_VIEW_2D.bbox;
  return bbox.length === 4 && bbox[0] === d[0] && bbox[1] === d[1] && bbox[2] === d[2] && bbox[3] === d[3];
}

export async function renderGeometrySvgFromState(jsonState: string): Promise<string> {
  const state = deserializeBoard(jsonState);
  const view = state.meta.domain === '2d' ? state.meta.view : DEFAULT_VIEW_2D;
  const bbox = view.bbox as [number, number, number, number];
  const shouldAutoFit = isDefaultBbox(bbox);
  // Stamps inserted vào Excalidraw canvas → luôn dùng light palette.
  // Excalidraw's THEME_FILTER tự đảo nét trong dark mode.
  const palette = paletteFor(false);
  const dims = containerDimsForBbox(bbox);
  const { svgString } = await renderJsxgOffscreen({
    bbox,
    dims,
    axis: view.showAxis,
    grid: view.showGrid,
    keepAspectRatio: true,
    applyOptions: (JXG) => {
       
      const opts = (JXG as any).Options;
      if (!opts) return;
      opts.text = opts.text || {};
      opts.text.display = 'internal';
      opts.text.useASCIIMathML = false;
      opts.text.useMathJax = false;
      opts.text.useKatex = false;
      opts.text.strokeColor = palette.label;
      opts.label = opts.label || {};
      opts.label.display = 'internal';
      opts.label.strokeColor = palette.label;
      opts.axis = opts.axis || {};
      opts.axis.strokeColor = palette.axis;
      opts.grid = opts.grid || {};
      opts.grid.strokeColor = palette.grid;
    },
    setup: (board) => {
      const store = createStore(state);
      const renderer = new JxgRenderer(store, board);
      if (shouldAutoFit) autoFitBboxFromBoard(board);
      return renderer;
    },
  });
  return svgString;
}
