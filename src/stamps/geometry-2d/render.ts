import { deserializeBoard } from './serialize';
import { paletteFor } from './editor/theme';
import { createStore } from '../../core/scene';
import { DEFAULT_VIEW_2D } from '../../core/scene/types';
import { JxgRenderer } from '../../core/scene/render/JxgRenderer';
import { renderJsxgOffscreen } from '../shared/jxgOffscreenRender';
import { computeAutoFitBbox } from './autoFitBbox';
import { radialLabelOffsets } from './labelLayout';

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

// Canvas max-axis (px) cho view tham chiếu (un-zoomed). Trước đây dùng
// PIXELS_PER_UNIT=20 cố định → figure px BẤT BIẾN với zoom (chỉ canvas đổi),
// và zoom-in (bbox nhỏ lại) lại cho element NHỎ hơn — ngược trực giác. Giờ
// pxPerUnit = DEFAULT_VIEW_PX / maxSpan(bbox): max-axis canvas luôn ~constant,
// figure bên trong scale theo zoom (zoom-in → span nhỏ → figure to ra) → ảnh
// chèn KHỚP với view trong editor (WYSIWYG). Bump 400→500 nên figure mặc định
// (gen ra) cũng to hơn một tí.
const DEFAULT_VIEW_PX = 500;
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
  const pxPerUnit = DEFAULT_VIEW_PX / Math.max(w, h);
  let width = w * pxPerUnit;
  let height = h * pxPerUnit;
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
 * Auto-fit board bbox sau khi entities đã render. Thu thập toạ độ point + 4
 * điểm biên của mỗi circle, đưa qua `computeAutoFitBbox` (Tukey IQR trim
 * outlier + expand theo aspect container) rồi gọi setBoundingBox.
 *
 * Áp dụng khi state.meta.view.bbox còn là DEFAULT_VIEW_2D — i.e. AI-generated
 * figure chưa được editor zoom/pan. Stamp đã edit có bbox riêng của user, giữ
 * nguyên (consumer expectation: re-render khớp với view editor lúc save).
 *
 * `aspect` = container width/height. computeAutoFitBbox expand bbox về đúng
 * aspect này nên setBoundingBox (keepAspectRatio mặc định) cho units vuông →
 * circle tròn (không méo thành ellipse).
 */
function autoFitBboxFromBoard(board: any, aspect: number): void {
  const objs = board?.objectsList;
  if (!Array.isArray(objs)) return;
  const points: [number, number][] = [];
  const circles: { cx: number; cy: number; r: number }[] = [];
  for (const o of objs) {
    // OBJECT_CLASS_POINT = 1
    if (o?.elementClass === 1 && typeof o.X === 'function' && typeof o.Y === 'function') {
      const x = o.X(), y = o.Y();
      if (Number.isFinite(x) && Number.isFinite(y)) points.push([x, y]);
    } else if (o?.elementClass === 3 && o.center?.X && typeof o.Radius === 'function') {
      // OBJECT_CLASS_CIRCLE
      const cx = o.center.X(), cy = o.center.Y(), r = o.Radius();
      if (Number.isFinite(cx) && Number.isFinite(cy) && Number.isFinite(r)) {
        circles.push({ cx, cy, r });
      }
    }
  }
  const bbox = computeAutoFitBbox(points, circles, aspect);
  if (!bbox) return;
  try {
    board.setBoundingBox(bbox);
    if (typeof board.update === 'function') board.update();
    if (typeof board.fullUpdate === 'function') board.fullUpdate();
  } catch { /* ignore */ }
}

/**
 * Đẩy label điểm ra xa centroid (radial) để giảm chồng nhãn. Chỉ chạy cho
 * AI-generated figure (shouldAutoFit) — stamp user-edit giữ layout nhãn mặc định.
 */
function applyRadialLabelOffsets(board: any): void {
  const objs = board?.objectsList;
  if (!Array.isArray(objs)) return;
  const pts: { id: string; x: number; y: number; el: any }[] = [];
  for (const o of objs) {
    if (o?.elementClass === 1 && typeof o.X === 'function' && o.label) {
      const x = o.X(), y = o.Y();
      if (Number.isFinite(x) && Number.isFinite(y)) pts.push({ id: o.id, x, y, el: o });
    }
  }
  const offsets = radialLabelOffsets(pts.map((p) => ({ id: p.id, x: p.x, y: p.y })));
  if (offsets.size === 0) return;
  for (const p of pts) {
    const off = offsets.get(p.id);
    if (!off) continue;
    try { p.el.setAttribute({ label: { offset: off } }); } catch { /* ignore */ }
  }
  try {
    if (typeof board.update === 'function') board.update();
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
      if (shouldAutoFit) {
        autoFitBboxFromBoard(board, dims.width / dims.height);
        applyRadialLabelOffsets(board);
      }
      return renderer;
    },
  });
  return svgString;
}
