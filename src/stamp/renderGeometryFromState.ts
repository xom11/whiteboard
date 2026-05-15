import { renderGeometryToSvg } from './renderGeometryToSvg';
import { deserializeIntoBoard, type SerializedBoard } from './serializeBoard';

/**
 * Re-render geometry SVG từ jsonState đã serialize. Dùng cho 2 mục đích:
 *   1. Restore math-stamp file sau khi reload page (Excalidraw mất binary files).
 *   2. Có thể tái dùng trong tương lai khi cần export hoặc preview.
 *
 * Implementation: tạo 1 div ẩn (off-screen, real dimensions để JSXGraph render
 * chuẩn), initBoard, replay creation log từ jsonState, dump SVG, dọn dẹp.
 *
 * Lý do JXG.Options.text.display = 'internal': JSXGraph mặc định render
 * label bằng HTML <div> overlay → clone SVG export sẽ thiếu label.
 */
export async function renderGeometrySvgFromState(jsonState: string): Promise<string> {
  const parsed = JSON.parse(jsonState) as SerializedBoard;
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
      opts.label = opts.label || {};
      opts.label.display = 'internal';
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
    deserializeIntoBoard(board as any, parsed);
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
