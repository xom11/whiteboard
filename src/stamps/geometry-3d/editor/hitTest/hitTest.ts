import { screenToRay, type View3DLike } from './rayCast';
import { rayGround, rayLineSegment, rayPlane, raySphere } from './intersect';
import { findSnapPoint } from './snapping';
import { constraintToWorld, type Vec3 } from '../scene/constraintMath';
import type { State } from '../../../../core/scene';
import { listObjects } from '../../../../core/scene';
import type { Point3DAttrs } from '../../../../core/scene/kinds/point3d';
import type { Plane3DAttrs } from '../../../../core/scene/kinds/plane3d';
import type { Sphere3DAttrs } from '../../../../core/scene/kinds/sphere3d';

// NOTE (v0.8.0): onPolygon and onLine SceneHit variants are typed but not yet
// produced by hitTest. They will be added once tools require placing points
// on user-defined lines/polygons (deferred from Task 2.4).

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
  state: State,
): SceneHit {
  // `screen` arrives in user-space; thresholds below are in pixels and need to
  // be converted to user units via the board's px-per-unit scale.
   
  const board = (view as any)?.board;
  // Fallback to 1 (no scaling) when board is missing so the hitTest unit tests,
  // whose mock view emits pixel-space coords directly, keep working unchanged.
  const ux = typeof board?.unitX === 'number' && board.unitX > 0 ? board.unitX : 1;
  const axisThresholdUser = AXIS_PIXEL_THRESHOLD / ux;

  // 1. Existing point snap
  const snap = findSnapPoint(screen, view, state);
  if (snap) return { kind: 'existingPoint', pointId: snap };

  const ray = screenToRay(screen, view);

  // 2. Spheres
  let bestSphere: { id: string; t: number; world: Vec3 } | null = null;
  for (const obj of listObjects(state)) {
    if (obj.kind !== 'sphere3d' || !obj.visible) continue;
    const attrs = obj.attrs as Sphere3DAttrs;
    const centerPoint = state.objects[attrs.center];
    const surfacePoint = state.objects[attrs.surfacePoint];
    if (!centerPoint || centerPoint.kind !== 'point3d') continue;
    if (!surfacePoint || surfacePoint.kind !== 'point3d') continue;
    const center = constraintToWorld((centerPoint.attrs as Point3DAttrs).constraint, state);
    const surface = constraintToWorld((surfacePoint.attrs as Point3DAttrs).constraint, state);
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
      if (d <= axisThresholdUser) {
        const hit = rayLineSegment(ray, { a: ax.a, b: ax.b }, 1e3);
        if (hit) {
          const t = ax.axis === 'x' ? hit.point[0] : ax.axis === 'y' ? hit.point[1] : hit.point[2];
          return { kind: 'onAxis', axis: ax.axis, t, world: hit.point };
        }
      }
    }
  }

  // 4. User-defined planes
  let bestPlane: { id: string; t: number; world: Vec3; basis: NonNullable<ReturnType<typeof planeBasis>> } | null = null;
  for (const obj of listObjects(state)) {
    if (obj.kind !== 'plane3d' || !obj.visible) continue;
    const basis = planeBasis(obj.attrs as Plane3DAttrs, state);
    if (!basis) continue;
    const ph = rayPlane(ray, { point: basis.origin, normal: basis.normal });
    if (ph && (bestPlane === null || ph.t < bestPlane.t)) {
      bestPlane = { id: obj.id, t: ph.t, world: ph.point, basis };
    }
  }
  // Compare best plane to best sphere — return whichever is closer
  if (bestPlane && (!bestSphere || bestPlane.t < bestSphere.t)) {
    const rel: Vec3 = [
      bestPlane.world[0] - bestPlane.basis.origin[0],
      bestPlane.world[1] - bestPlane.basis.origin[1],
      bestPlane.world[2] - bestPlane.basis.origin[2],
    ];
    const b1n = dot3(bestPlane.basis.basis1, bestPlane.basis.basis1);
    const b2n = dot3(bestPlane.basis.basis2, bestPlane.basis.basis2);
    const u = b1n === 0 ? 0 : dot3(rel, bestPlane.basis.basis1) / b1n;
    const v = b2n === 0 ? 0 : dot3(rel, bestPlane.basis.basis2) / b2n;
    return { kind: 'onPlane', planeId: bestPlane.id, u, v, world: bestPlane.world };
  }

  // 5. Sphere result (if found)
  if (bestSphere) {
    const sph = state.objects[bestSphere.id];
    if (sph && sph.kind === 'sphere3d') {
      const centerPt = state.objects[(sph.attrs as Sphere3DAttrs).center];
      if (centerPt && centerPt.kind === 'point3d') {
        const center = constraintToWorld((centerPt.attrs as Point3DAttrs).constraint, state);
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

  // 6. Ground
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

function planeBasis(
  plane: Plane3DAttrs,
  state: State,
): { origin: Vec3; basis1: Vec3; basis2: Vec3; normal: Vec3 } | null {
  const p1Obj = state.objects[plane.p1];
  const p2Obj = state.objects[plane.p2];
  const p3Obj = state.objects[plane.p3];
  if (!p1Obj || p1Obj.kind !== 'point3d') return null;
  if (!p2Obj || p2Obj.kind !== 'point3d') return null;
  if (!p3Obj || p3Obj.kind !== 'point3d') return null;
  const p1 = constraintToWorld((p1Obj.attrs as Point3DAttrs).constraint, state);
  const p2 = constraintToWorld((p2Obj.attrs as Point3DAttrs).constraint, state);
  const p3 = constraintToWorld((p3Obj.attrs as Point3DAttrs).constraint, state);
  const basis1: Vec3 = [p2[0] - p1[0], p2[1] - p1[1], p2[2] - p1[2]];
  const tmp: Vec3 = [p3[0] - p1[0], p3[1] - p1[1], p3[2] - p1[2]];
  const cx = basis1[1] * tmp[2] - basis1[2] * tmp[1];
  const cy = basis1[2] * tmp[0] - basis1[0] * tmp[2];
  const cz = basis1[0] * tmp[1] - basis1[1] * tmp[0];
  const cLen = Math.hypot(cx, cy, cz);
  if (cLen === 0) return null;
  const normal: Vec3 = [cx / cLen, cy / cLen, cz / cLen];
  const basis2: Vec3 = [
    normal[1] * basis1[2] - normal[2] * basis1[1],
    normal[2] * basis1[0] - normal[0] * basis1[2],
    normal[0] * basis1[1] - normal[1] * basis1[0],
  ];
  return { origin: p1, basis1, basis2, normal };
}

function dot3(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}
