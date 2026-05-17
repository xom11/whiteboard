import type { Vec3 } from '../scene/types';
import type { Ray3D } from './rayCast';

const EPS = 1e-9;

export interface PlaneHit { point: Vec3; t: number }
export interface SphereHit { point: Vec3; t: number }
export interface SegmentHit { point: Vec3; t: number; tOnSegment: number }

function dot(a: Vec3, b: Vec3): number { return a[0]*b[0] + a[1]*b[1] + a[2]*b[2]; }
function sub(a: Vec3, b: Vec3): Vec3 { return [a[0]-b[0], a[1]-b[1], a[2]-b[2]]; }
function add(a: Vec3, b: Vec3): Vec3 { return [a[0]+b[0], a[1]+b[1], a[2]+b[2]]; }
function scale(a: Vec3, k: number): Vec3 { return [a[0]*k, a[1]*k, a[2]*k]; }
function norm2(a: Vec3): number { return dot(a, a); }

export function rayPlane(
  ray: Ray3D,
  plane: { point: Vec3; normal: Vec3 },
): PlaneHit | null {
  const denom = dot(ray.dir, plane.normal);
  if (Math.abs(denom) < EPS) return null;
  const t = dot(sub(plane.point, ray.origin), plane.normal) / denom;
  if (t < 0) return null;
  return { point: add(ray.origin, scale(ray.dir, t)), t };
}

export function rayGround(ray: Ray3D): PlaneHit | null {
  return rayPlane(ray, { point: [0, 0, 0], normal: [0, 0, 1] });
}

export function raySphere(
  ray: Ray3D,
  sphere: { center: Vec3; radius: number },
): SphereHit | null {
  const oc = sub(ray.origin, sphere.center);
  const b = dot(oc, ray.dir);
  const c = dot(oc, oc) - sphere.radius * sphere.radius;
  const disc = b * b - c;
  if (disc < 0) return null;
  const sqrtD = Math.sqrt(disc);
  const t1 = -b - sqrtD;
  const t2 = -b + sqrtD;
  const t = t1 >= 0 ? t1 : t2;
  if (t < 0) return null;
  return { point: add(ray.origin, scale(ray.dir, t)), t };
}

/**
 * Closest approach between ray and line segment. Accepts a distance threshold
 * (in world units; caller scales for pixel ratio).
 */
export function rayLineSegment(
  ray: Ray3D,
  seg: { a: Vec3; b: Vec3 },
  maxDistance: number,
): SegmentHit | null {
  const u = ray.dir;
  const v = sub(seg.b, seg.a);
  const w0 = sub(ray.origin, seg.a);
  const a = dot(u, u);
  const bb = dot(u, v);
  const cc = dot(v, v);
  const d = dot(u, w0);
  const e = dot(v, w0);
  const denom = a * cc - bb * bb;
  if (Math.abs(denom) < EPS) return null;
  const sc = (bb * e - cc * d) / denom;
  const tc = (a * e - bb * d) / denom;
  if (sc < 0 || tc < 0 || tc > 1) return null;
  const pRay = add(ray.origin, scale(u, sc));
  const pSeg = add(seg.a, scale(v, tc));
  const dist2 = norm2(sub(pRay, pSeg));
  if (dist2 > maxDistance * maxDistance) return null;
  return { point: pSeg, t: sc, tOnSegment: tc };
}
