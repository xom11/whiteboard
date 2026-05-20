/**
 * Pure hit-test helpers cho MiniBoard 2D.
 *
 * Tách khỏi MiniBoard.tsx (1) để unit-test được không cần JSXGraph runtime,
 * (2) để chỗ duy nhất khai báo "exclude phantom + preview" — invisible
 * cursor-phantom và live preview shape đều là JSXGraph elements nằm trong
 * board.objectsList; nếu không loại trừ, chúng sẽ shadow real hits và
 * findNearestPoint sẽ luôn trả về phantom (cách click ~0px) — khiến tool
 * multi-điểm bị "đứng" giữa chừng (xem `__tests__/hitTest.test.ts`).
 */

import { objKind } from './tools';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type JxgObj = any;

/** Trả về các object có `hasPoint(sx, sy) === true`, bỏ qua exclude set. */
export function hitObjectsAt(
  objs: JxgObj[],
  sx: number,
  sy: number,
  exclude: ReadonlySet<JxgObj>,
): JxgObj[] {
  const list: JxgObj[] = [];
  for (const o of objs) {
    if (!o || exclude.has(o)) continue;
    if (typeof o.hasPoint !== 'function') continue;
    try {
      if (o.hasPoint(sx, sy)) list.push(o);
    } catch {
      // skip broken objects
    }
  }
  return list;
}

/**
 * Tìm point gần (sx, sy) nhất trong `tolPx`. Bỏ qua exclude set — quan trọng
 * để không trả về invisible cursor-phantom (luôn ngồi đúng dưới con trỏ).
 */
export function findNearestPointInList(
  objs: JxgObj[],
  sx: number,
  sy: number,
  tolPx: number,
  exclude: ReadonlySet<JxgObj>,
): JxgObj | null {
  const tol2 = tolPx * tolPx;
  let best: { obj: JxgObj; d2: number } | null = null;
  for (const o of objs) {
    if (!o || exclude.has(o)) continue;
    if (objKind(o) !== 'point') continue;
    const pc = o.coords?.scrCoords;
    if (!pc) continue;
    const dx = pc[1] - sx;
    const dy = pc[2] - sy;
    const d2 = dx * dx + dy * dy;
    if (d2 <= tol2 && (!best || d2 < best.d2)) best = { obj: o, d2 };
  }
  return best ? best.obj : null;
}
