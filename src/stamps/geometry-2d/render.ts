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

export async function renderGeometrySvgFromState(jsonState: string): Promise<string> {
  const state = deserializeBoard(jsonState);
  const view = state.meta.domain === '2d' ? state.meta.view : DEFAULT_VIEW_2D;
  const bbox = view.bbox as [number, number, number, number];
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      return new JxgRenderer(store, board);
    },
  });
  return svgString;
}
