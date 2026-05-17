import type { Constraint } from '../../scene/types';
import type { Scene3D } from '../../scene/Scene3D';
import type { SceneHit } from '../../hitTest/hitTest';

export function hitToConstraint(hit: SceneHit): Constraint | null {
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
 * Given a SceneHit, return the id of an existing point (if hit is existingPoint),
 * or create a new constrained point on the hit surface and return its id.
 * Returns null for `empty` hits.
 */
export function ensurePoint(hit: SceneHit, scene: Scene3D): string | null {
  if (hit.kind === 'existingPoint') return hit.pointId;
  const c = hitToConstraint(hit);
  if (!c) return null;
  return scene.addPoint(c);
}
