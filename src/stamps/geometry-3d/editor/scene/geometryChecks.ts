import type { Vec3 } from './types';
import type { Scene3D } from './Scene3D';
import { constraintToWorld } from './constraintMath';

const EPS = 1e-6;

function getWorld(id: string, scene: Scene3D): Vec3 | null {
  const obj = scene.get(id);
  if (!obj || obj.kind !== 'point') return null;
  return constraintToWorld(obj.constraint, scene);
}

export function areCollinear3(p1Id: string, p2Id: string, p3Id: string, scene: Scene3D): boolean {
  const p1 = getWorld(p1Id, scene);
  const p2 = getWorld(p2Id, scene);
  const p3 = getWorld(p3Id, scene);
  if (!p1 || !p2 || !p3) return true;
  const a: Vec3 = [p2[0]-p1[0], p2[1]-p1[1], p2[2]-p1[2]];
  const b: Vec3 = [p3[0]-p1[0], p3[1]-p1[1], p3[2]-p1[2]];
  const c: Vec3 = [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
  return Math.hypot(c[0], c[1], c[2]) < EPS;
}

export function apexCoplanarWithBase(baseIds: string[], apexId: string, scene: Scene3D): boolean {
  if (baseIds.length < 3) return false;
  const p1 = getWorld(baseIds[0], scene);
  const p2 = getWorld(baseIds[1], scene);
  const p3 = getWorld(baseIds[2], scene);
  const apex = getWorld(apexId, scene);
  if (!p1 || !p2 || !p3 || !apex) return false;
  const a: Vec3 = [p2[0]-p1[0], p2[1]-p1[1], p2[2]-p1[2]];
  const b: Vec3 = [p3[0]-p1[0], p3[1]-p1[1], p3[2]-p1[2]];
  const n: Vec3 = [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
  const d: Vec3 = [apex[0]-p1[0], apex[1]-p1[1], apex[2]-p1[2]];
  const dotND = n[0]*d[0] + n[1]*d[1] + n[2]*d[2];
  return Math.abs(dotND) < EPS;
}
