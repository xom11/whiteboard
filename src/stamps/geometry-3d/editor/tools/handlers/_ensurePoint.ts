import type { Store, SceneObject } from '../../../../../core/scene';
import { nextLabel } from '../../../../../core/scene';
import type { Constraint3D } from '../../../../../core/scene/kinds/3d-constraint';
import type { Point3DAttrs } from '../../../../../core/scene/kinds/point3d';
import type { SceneHit } from '../../hitTest/hitTest';

export function hitToConstraint(hit: SceneHit): Constraint3D | null {
  switch (hit.kind) {
    case 'onGround':  return { kind: 'onGround', x: hit.world[0], y: hit.world[1] };
    case 'onAxis':    return { kind: 'onAxis', axis: hit.axis, t: hit.t };
    case 'onPlane':   return { kind: 'onPlane', planeId: hit.planeId, u: hit.u, v: hit.v };
    case 'onLine':    return { kind: 'onLine', lineId: hit.lineId, t: hit.t };
    case 'onPolygon': return { kind: 'onPolygon', polygonId: hit.polygonId, u: hit.u, v: hit.v };
    case 'onSphere':  return { kind: 'onSphere', sphereId: hit.sphereId, theta: hit.theta, phi: hit.phi };
    default:          return null;
  }
}

/**
 * Sinh id `p{counter + offset}` cho point mới — đồng nhất tiền tố cũ của Scene3D
 * và không đụng id đã tồn tại trong state hiện tại.
 */
export function makePointId(store: Store, offset = 1): string {
  return `p${store.getState().counter + offset}`;
}

/**
 * Build SceneObject cho point3d (chưa dispatch). Caller sẽ dispatch ADD hoặc
 * gom trong transaction.
 */
export function buildPointObject(
  store: Store,
  constraint: Constraint3D,
  options: { idOffset?: number; label?: string; color?: string } = {},
): SceneObject<Point3DAttrs> {
  const id = makePointId(store, options.idOffset ?? 1);
  const state = store.getState();
  const label = options.label ?? nextLabel(state, 'point3d');
  return {
    id,
    kind: 'point3d',
    label,
    visible: true,
    locked: false,
    layer: 'default',
    schemaVersion: 1,
    attrs: { constraint, ...(options.color ? { color: options.color } : {}) },
  };
}

/**
 * Tương đương `scene.addPoint(constraint)` cũ: dispatch ADD point ngay và trả
 * về id của point vừa tạo.
 */
export function addPoint(store: Store, constraint: Constraint3D, color?: string): string {
  const obj = buildPointObject(store, constraint, color ? { color } : {});
  store.dispatch({ type: 'ADD', payload: { obj } });
  return obj.id;
}

/**
 * Given a SceneHit, return the id of an existing point (if hit is existingPoint),
 * or create a new constrained point on the hit surface and return its id.
 * Returns null for `empty` hits.
 */
export function ensurePoint(hit: SceneHit, store: Store): string | null {
  if (hit.kind === 'existingPoint') return hit.pointId;
  const c = hitToConstraint(hit);
  if (!c) return null;
  return addPoint(store, c);
}

/**
 * Id của ĐỐI TƯỢNG mà hit chạm vào (mặt phẳng/đường/đa giác/mặt cầu) — dùng cho
 * bước 'object' của tool (chọn cả đối tượng, không phải đặt điểm). null nếu hit
 * không gắn với một object (ground/axis/existingPoint/empty).
 */
export function hitObjectId(hit: SceneHit): string | null {
  switch (hit.kind) {
    case 'onPlane':   return hit.planeId;
    case 'onLine':    return hit.lineId;
    case 'onPolygon': return hit.polygonId;
    case 'onSphere':  return hit.sphereId;
    default:          return null;
  }
}
