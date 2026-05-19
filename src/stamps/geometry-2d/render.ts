import { renderGeometryToSvg } from './renderInline';
import { deserializeIntoBoard, type SerializedBoard } from './serialize';
import { paletteFor } from './editor/theme';
import { safeJsx } from '../shared/safeJsx';

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
  const parsed = JSON.parse(jsonState) as SerializedBoard;
  // Stamps inserted vào Excalidraw canvas → luôn dùng light palette.
  // Excalidraw's THEME_FILTER tự đảo nét trong dark mode.
  const palette = paletteFor(false);
  const JXG = (await import('jsxgraph')).default;
  safeJsx('render.applyOptions', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const opts = (JXG as any).Options;
    if (opts) {
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
    }
  });
  const { width, height } = containerDimsForBbox(parsed.bbox);
  const container = document.createElement('div');
  const containerId = 'jxg_offscreen_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
  container.id = containerId;
  container.style.cssText = `position:absolute;top:-99999px;left:-99999px;width:${width}px;height:${height}px;visibility:hidden;pointer-events:none;`;
  document.body.appendChild(container);
  let board: unknown = null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    board = (JXG as any).JSXGraph.initBoard(containerId, {
      boundingbox: parsed.bbox,
      axis: !!parsed.showAxis,
      grid: !!parsed.showGrid,
      showCopyright: false,
      showNavigation: false,
      keepAspectRatio: true,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    deserializeIntoBoard(board as any, parsed, { palette });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (board as any).update();
    return renderGeometryToSvg(container);
  } finally {
    safeJsx('render.freeBoard', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (board) (JXG as any).JSXGraph.freeBoard(board);
    });
    if (container.parentNode) container.parentNode.removeChild(container);
  }
}
