import { screenToRay, type View3DLike } from './rayCast';
import { rayGround, rayLineSegment, raySphere } from './intersect';
import { findSnapPoint } from './snapping';
import { constraintToWorld } from '../scene/constraintMath';
import type { Scene3D } from '../scene/Scene3D';
import type { Constraint, Vec3 } from '../scene/types';

export type SceneHit =
  | { kind: 'existingPoint'; pointId: string }
  | { kind: 'onGround'; world: Vec3 }
  | { kind: 'onAxis'; axis: 'x' | 'y' | 'z'; t: number; world: Vec3 }
  | { kind: 'onPlane'; planeId: string; u: number; v: number; world: Vec3 }
  | { kind: 'onLine'; lineId: string; t: number; world: Vec3 }
  | { kind: 'onPolygon'; polygonId: string; u: number; v: number; world: Vec3 }
  | { kind: 'onSphere'; sphereId: string; theta: number; phi: number; world: Vec3 }
  | { kind: 'empty' };

const AXIS_PIXEL_THRESHOLD = 12;

export function hitTest(
  screen: { x: number; y: number },
  view: View3DLike,
  scene: Scene3D,
): SceneHit {
  // 1. Existing point snap
  const snap = findSnapPoint(screen, view, scene);
  if (snap) return { kind: 'existingPoint', pointId: snap };

  const ray = screenToRay(screen, view);

  // 2. Spheres
  let bestSphere: { id: string; t: number; world: Vec3 } | null = null;
  for (const obj of scene.list()) {
    if (obj.kind !== 'sphere' || !obj.visible) continue;
    const centerPoint = scene.get(obj.center);
    const surfacePoint = scene.get(obj.surfacePoint);
    if (!centerPoint || centerPoint.kind !== 'point') continue;
    if (!surfacePoint || surfacePoint.kind !== 'point') continue;
    const center = constraintToWorld(centerPoint.constraint, scene);
    const surface = constraintToWorld(surfacePoint.constraint, scene);
    const radius = Math.hypot(
      surface[0] - center[0],
      surface[1] - center[1],
      surface[2] - center[2],
    );
    const sh = raySphere(ray, { center, radius });
    if (sh && (bestSphere === null || sh.t < bestSphere.t)) {
      bestSphere = { id: obj.id, t: sh.t, world: sh.point };
    }
  }

  // 3. Axis snap — project click onto each axis line in screen space, check pixel distance
  if (view.project3DTo2D) {
    const axes: { axis: 'x' | 'y' | 'z'; a: Vec3; b: Vec3 }[] = [
      { axis: 'x', a: [-10, 0, 0], b: [10, 0, 0] },
      { axis: 'y', a: [0, -10, 0], b: [0, 10, 0] },
      { axis: 'z', a: [0, 0, -10], b: [0, 0, 10] },
    ];
    for (const ax of axes) {
      const pa = view.project3DTo2D(ax.a[0], ax.a[1], ax.a[2]);
      const pb = view.project3DTo2D(ax.b[0], ax.b[1], ax.b[2]);
      const d = distScreenPointToSegment(screen, [pa[1], pa[2]], [pb[1], pb[2]]);
      if (d <= AXIS_PIXEL_THRESHOLD) {
        const hit = rayLineSegment(ray, { a: ax.a, b: ax.b }, 1e3);
        if (hit) {
          const t = ax.axis === 'x' ? hit.point[0] : ax.axis === 'y' ? hit.point[1] : hit.point[2];
          return { kind: 'onAxis', axis: ax.axis, t, world: hit.point };
        }
      }
    }
  }

  // 4. Sphere result (if found)
  if (bestSphere) {
    const sph = scene.get(bestSphere.id);
    if (sph && sph.kind === 'sphere') {
      const centerPt = scene.get(sph.center);
      if (centerPt && centerPt.kind === 'point') {
        const center = constraintToWorld(centerPt.constraint, scene);
        const relX = bestSphere.world[0] - center[0];
        const relY = bestSphere.world[1] - center[1];
        const relZ = bestSphere.world[2] - center[2];
        const r = Math.hypot(relX, relY, relZ);
        const phi = r === 0 ? 0 : Math.acos(relZ / r);
        const theta = Math.atan2(relY, relX);
        return { kind: 'onSphere', sphereId: bestSphere.id, theta, phi, world: bestSphere.world };
      }
    }
  }

  // 5. Ground
  const g = rayGround(ray);
  if (g) return { kind: 'onGround', world: g.point };

  return { kind: 'empty' };
}

function distScreenPointToSegment(
  p: { x: number; y: number },
  a: [number, number],
  b: [number, number],
): number {
  const vx = b[0] - a[0];
  const vy = b[1] - a[1];
  const wx = p.x - a[0];
  const wy = p.y - a[1];
  const c1 = vx * wx + vy * wy;
  if (c1 <= 0) return Math.hypot(wx, wy);
  const c2 = vx * vx + vy * vy;
  if (c2 <= c1) return Math.hypot(p.x - b[0], p.y - b[1]);
  const t = c1 / c2;
  const px = a[0] + t * vx;
  const py = a[1] + t * vy;
  return Math.hypot(p.x - px, p.y - py);
}

// The Constraint import is kept for future task 2.4 to extend with onPlane/onLine/onPolygon hits.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type _ReservedForNextTask = Constraint;
