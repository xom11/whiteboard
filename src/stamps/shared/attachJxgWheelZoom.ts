import { safeJsx } from './safeJsx';

/**
 * Minimal JSXGraph board surface that wheel-zoom logic depends on.
 * Local shape to avoid importing the (untyped) jsxgraph default export here.
 */
export interface JxgBoardZoomable {
  zoomIn: (x?: number, y?: number) => void;
  zoomOut: (x?: number, y?: number) => void;
  // JSXGraph older versions may not expose this — wheel still works, just
  // without cursor-anchored zoom (falls back to board-center).
  getUsrCoordsOfMouse?: (e: WheelEvent) => unknown;
}

/**
 * Attach Excalidraw-style Ctrl/Cmd + wheel zoom to a container element.
 *
 * - Khi wheel kèm Ctrl/Cmd: preventDefault + zoom in/out với anchor tại
 *   con trỏ (nếu board hỗ trợ `getUsrCoordsOfMouse`).
 * - Khi wheel không kèm modifier: bỏ qua → page scroll bình thường.
 *
 * Returns cleanup fn. Caller chịu trách nhiệm gọi trong cleanup của useEffect.
 *
 * @param target  Container element (`HTMLDivElement` hoặc `SVGSVGElement`).
 * @param board   JSXGraph board instance đã initBoard xong.
 * @param label   Tag để log dev-mode khi safeJsx swallow lỗi (vd "MiniBoard.2d").
 */
export function attachJxgWheelZoom(
  target: HTMLElement,
  board: JxgBoardZoomable,
  label = 'wheelZoom',
): () => void {
  const onWheel = (e: WheelEvent): void => {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    e.stopPropagation();
    let cx: number | undefined;
    let cy: number | undefined;
    safeJsx(`${label}.coords`, () => {
      const usr = board.getUsrCoordsOfMouse?.(e);
      if (Array.isArray(usr) && usr.length >= 2
          && Number.isFinite(usr[0]) && Number.isFinite(usr[1])) {
        cx = usr[0] as number;
        cy = usr[1] as number;
      }
    });
    if (e.deltaY < 0) safeJsx(`${label}.in`, () => board.zoomIn(cx, cy));
    else if (e.deltaY > 0) safeJsx(`${label}.out`, () => board.zoomOut(cx, cy));
  };
  target.addEventListener('wheel', onWheel, { passive: false });
  return () => { target.removeEventListener('wheel', onWheel); };
}
