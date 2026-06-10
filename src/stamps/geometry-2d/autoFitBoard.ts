import { DEFAULT_VIEW_2D } from '../../core/scene/types';
import { computeAutoFitBbox } from './autoFitBbox';

/**
 * Auto-fit helpers chia sẻ giữa offscreen render (render.ts) và editor MiniBoard.
 *
 * Trước đây logic này CHỈ nằm trong render.ts (offscreen) → ảnh chèn vào canvas
 * được fit gọn, NHƯNG editor MiniBoard lúc re-edit boot ở bbox default (không
 * fit) → figure trong editor nhỏ/lệch so với ảnh ngoài canvas. Tách ra để cả
 * hai dùng chung → editor view khớp ảnh đã chèn.
 */

type JxgBoardLike = {
  objectsList?: unknown[];
  setBoundingBox?: (bbox: [number, number, number, number]) => void;
  update?: () => void;
  fullUpdate?: () => void;
};

export function isDefaultBbox(bbox: readonly number[]): boolean {
  const d = DEFAULT_VIEW_2D.bbox;
  return bbox.length === 4 && bbox[0] === d[0] && bbox[1] === d[1] && bbox[2] === d[2] && bbox[3] === d[3];
}

/**
 * Thu thập toạ độ point + tâm/bán kính circle từ board rồi tính bbox fit
 * (Tukey IQR trim outlier + expand theo `aspect`). KHÔNG mutate board.
 * Trả null nếu board không có entity hợp lệ.
 */
export function fittedBboxFromBoard(
  board: unknown,
  aspect: number,
): [number, number, number, number] | null {
  const objs = (board as JxgBoardLike)?.objectsList;
  if (!Array.isArray(objs)) return null;
  const points: [number, number][] = [];
  const circles: { cx: number; cy: number; r: number }[] = [];
  for (const raw of objs) {

    const o = raw as any;
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
  const safeAspect = Number.isFinite(aspect) && aspect > 0 ? aspect : 1;
  return computeAutoFitBbox(points, circles, safeAspect);
}

/**
 * Tính bbox fit từ board rồi setBoundingBox (mutate board). No-op nếu board
 * rỗng / không tính được bbox.
 */
export function autoFitBoardToContent(board: unknown, aspect: number): void {
  const bbox = fittedBboxFromBoard(board, aspect);
  if (!bbox) return;
  const b = board as JxgBoardLike;
  try {
    b.setBoundingBox?.(bbox);
    if (typeof b.update === 'function') b.update();
    if (typeof b.fullUpdate === 'function') b.fullUpdate();
  } catch { /* ignore */ }
}
