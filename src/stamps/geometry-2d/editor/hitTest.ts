// src/stamps/geometry-2d/editor/hitTest.ts
import type { State, SceneObject } from '../../../core/scene';
import { listObjects } from '../../../core/scene';
import { safeJsx } from '../../shared/safeJsx';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type JxgObj = any;

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

/**
 * Lấy screen coords (x, y px) của event dưới cursor. Ưu tiên JSXGraph's
 * `getMousePosition`; fallback về container's getBoundingClientRect (cần cho
 * touch event hoặc khi board chưa cache mouse position).
 */
export function screenCoordsOf(
  board: JxgObj,
  container: HTMLElement | null,
  evt: JxgObj,
): [number, number] | null {
  if (!board) return null;
  try {
    const mp = board.getMousePosition ? board.getMousePosition(evt) : null;
    if (mp && mp.length >= 2) return [mp[0], mp[1]];
  } catch { /* fall through to container rect */ }
  if (container) {
    const rect = container.getBoundingClientRect();
    const cx = evt.clientX ?? evt.touches?.[0]?.clientX ?? 0;
    const cy = evt.clientY ?? evt.touches?.[0]?.clientY ?? 0;
    return [cx - rect.left, cy - rect.top];
  }
  return null;
}

/**
 * List JSXGraph objects whose `hasPoint(sx, sy)` chứa cursor — đã loại
 * `excludes` (vd phantom + preview shape + preview segments).
 *
 * Phantom là invisible point JSXGraph kéo theo cursor để dựng live-preview;
 * nếu không loại trừ, click chỗ trống sẽ snap trúng phantom (cách click 0px)
 * → drawing "đứng" vì pendingRef nhét phantom (không có scene id), tool
 * không tiến tới được `needs` threshold. (Regression từ commit 95a6c13.)
 */
export function objectsAt(
  board: JxgObj,
  container: HTMLElement | null,
  evt: JxgObj,
  excludes: Iterable<JxgObj>,
): JxgObj[] {
  const sc = screenCoordsOf(board, container, evt);
  if (!board || !sc) return [];
  const [sx, sy] = sc;
  const excludeSet = new Set<JxgObj>();
  for (const e of excludes) if (e) excludeSet.add(e);
  const out: JxgObj[] = [];
  safeJsx('hitTest.objectsAt', () => {
    for (const o of (board.objectsList || [])) {
      if (excludeSet.has(o)) continue;
      if (o && typeof o.hasPoint === 'function' && o.hasPoint(sx, sy)) out.push(o);
    }
  });
  return out;
}

/**
 * Tìm JSXGraph point gần cursor (trong `tolPx` pixels). Dùng `findNearestPoint`
 * với `pointCoord` đọc từ JSXGraph's `coords.scrCoords` qua resolver `jxgFromSceneId`.
 * Trả JSXGraph object (không phải scene id) để caller dùng làm pick.
 */
export function findNearestJxgPoint(
  board: JxgObj,
  container: HTMLElement | null,
  state: State,
  jxgFromSceneId: (id: string) => JxgObj | null,
  evt: JxgObj,
  tolPx = 12,
): JxgObj | null {
  const sc = screenCoordsOf(board, container, evt);
  if (!board || !sc) return null;
  const [sx, sy] = sc;
  const pointCoord = (id: string): [number, number] | null => {
    const j = jxgFromSceneId(id);
    const sc2 = j?.coords?.scrCoords;
    return sc2 ? [sc2[1], sc2[2]] : null;
  };
  const result = findNearestPoint(state, pointCoord, sx, sy, tolPx);
  return result ? jxgFromSceneId(result.id) : null;
}

/**
 * Khi user click trúng label text của một element, JSXGraph trả về text obj
 * thay vì owner. Promote về owner để properties popover hiển thị đúng
 * properties của shape, không phải của text.
 */
export function promoteToLabelOwner(board: JxgObj, o: JxgObj): JxgObj {
  if (!o) return o;
  const t = (o.elType || o.type || '').toString().toLowerCase();
  if (t !== 'text' || !board) return o;
  const promoted = safeJsx<JxgObj | null>('hitTest.promoteToLabelOwner', () => {
    for (const c of (board.objectsList || [])) {
      if (c.label === o) return c;
    }
    return null;
  }, null);
  return promoted ?? o;
}
