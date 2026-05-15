import { renderGeometryToSvg } from './renderGeometryToSvg';
import { deserializeIntoBoard, type SerializedBoard } from './serializeBoard';
import { paletteFor } from './geometryTheme';

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
 * Lý do JXG.Options.text.display = 'internal': JSXGraph mặc định render
 * label bằng HTML <div> overlay → clone SVG export sẽ thiếu label.
 */
export async function renderGeometrySvgFromState(jsonState: string): Promise<string> {
  const parsed = JSON.parse(jsonState) as SerializedBoard;
  // Stamps inserted vào Excalidraw canvas → luôn dùng light palette.
  // Excalidraw's THEME_FILTER tự đảo nét trong dark mode.
  const palette = paletteFor(false);
  const JXG = (await import('jsxgraph')).default;
  try {
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
  } catch { /* ignore */ }
  const container = document.createElement('div');
  const containerId = 'jxg_offscreen_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
  container.id = containerId;
  container.style.cssText = 'position:absolute;top:-99999px;left:-99999px;width:400px;height:300px;visibility:hidden;pointer-events:none;';
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
      keepAspectRatio: false,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    deserializeIntoBoard(board as any, parsed, { palette });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (board as any).update();
    return renderGeometryToSvg(container);
  } finally {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (board) (JXG as any).JSXGraph.freeBoard(board);
    } catch { /* ignore */ }
    if (container.parentNode) container.parentNode.removeChild(container);
  }
}
