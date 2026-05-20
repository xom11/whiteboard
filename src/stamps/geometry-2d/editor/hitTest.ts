// src/stamps/geometry-2d/editor/hitTest.ts
import type { State, SceneObject } from '../../../core/scene';
import { listObjects } from '../../../core/scene';

/**
 * Tìm point gần (x, y) nhất trong state, trong vòng tol.
 *
 * Sử dụng `pointCoord(id) => [x, y] | null` để hit-test theo toạ độ JSXGraph
 * thực tế (resolve qua JxgRenderer Map). Trả về `null` nếu không có point nào
 * trong vòng tol.
 */
export function findNearestPoint(
  state: State,
  pointCoord: (id: string) => [number, number] | null,
  x: number,
  y: number,
  tolPx: number,
  excludeIds: Set<string> = new Set(),
): SceneObject | null {
  let best: SceneObject | null = null;
  let bestDistSq = tolPx * tolPx;
  for (const obj of listObjects(state)) {
    if (obj.kind !== 'point' && obj.kind !== 'intersection') continue;
    if (excludeIds.has(obj.id)) continue;
    const coord = pointCoord(obj.id);
    if (!coord) continue;
    const dx = coord[0] - x;
    const dy = coord[1] - y;
    const d2 = dx * dx + dy * dy;
    if (d2 < bestDistSq) {
      bestDistSq = d2;
      best = obj;
    }
  }
  return best;
}
