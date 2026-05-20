import type { State } from '../../../../core/scene';
import type { Point3DAttrs } from '../../../../core/scene/kinds/point3d';
import { constraintToWorld, type Vec3 } from './constraintMath';

const EPS = 1e-6;

function getWorld(id: string, state: State): Vec3 | null {
  const obj = state.objects[id];
  if (!obj || obj.kind !== 'point3d') return null;
  const attrs = obj.attrs as Point3DAttrs;
  return constraintToWorld(attrs.constraint, state);
}

export function areCollinear3(p1Id: string, p2Id: string, p3Id: string, state: State): boolean {
  const p1 = getWorld(p1Id, state);
  const p2 = getWorld(p2Id, state);
  const p3 = getWorld(p3Id, state);
  if (!p1 || !p2 || !p3) return true;
  const a: Vec3 = [p2[0] - p1[0], p2[1] - p1[1], p2[2] - p1[2]];
  const b: Vec3 = [p3[0] - p1[0], p3[1] - p1[1], p3[2] - p1[2]];
  const c: Vec3 = [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  return Math.hypot(c[0], c[1], c[2]) < EPS;
}

export function apexCoplanarWithBase(baseIds: string[], apexId: string, state: State): boolean {
  if (baseIds.length < 3) return false;
  const p1 = getWorld(baseIds[0], state);
  const p2 = getWorld(baseIds[1], state);
  const p3 = getWorld(baseIds[2], state);
  const apex = getWorld(apexId, state);
  if (!p1 || !p2 || !p3 || !apex) return false;
  const a: Vec3 = [p2[0] - p1[0], p2[1] - p1[1], p2[2] - p1[2]];
  const b: Vec3 = [p3[0] - p1[0], p3[1] - p1[1], p3[2] - p1[2]];
  const n: Vec3 = [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const d: Vec3 = [apex[0] - p1[0], apex[1] - p1[1], apex[2] - p1[2]];
  const dotND = n[0] * d[0] + n[1] * d[1] + n[2] * d[2];
  return Math.abs(dotND) < EPS;
}
