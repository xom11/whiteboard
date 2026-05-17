import type { Vec3 } from '../scene/types';

export const CURVED_SEGMENTS = 16;

export function cylinderFaces(
  center: Vec3,
  top: Vec3,
  radius: number,
): { vertices: Vec3[]; faces: number[][] } {
  const baseRing: Vec3[] = [];
  const topRing: Vec3[] = [];
  for (let i = 0; i < CURVED_SEGMENTS; i++) {
    const theta = (i / CURVED_SEGMENTS) * Math.PI * 2;
    const dx = radius * Math.cos(theta);
    const dy = radius * Math.sin(theta);
    baseRing.push([center[0] + dx, center[1] + dy, center[2]]);
    topRing.push([top[0] + dx, top[1] + dy, top[2]]);
  }
  const vertices = [...baseRing, ...topRing];
  const faces: number[][] = [];
  faces.push(baseRing.map((_, i) => i));
  faces.push(topRing.map((_, i) => CURVED_SEGMENTS + i));
  for (let i = 0; i < CURVED_SEGMENTS; i++) {
    const next = (i + 1) % CURVED_SEGMENTS;
    faces.push([i, next, CURVED_SEGMENTS + next, CURVED_SEGMENTS + i]);
  }
  return { vertices, faces };
}

export function coneFaces(
  baseCenter: Vec3,
  apex: Vec3,
  radius: number,
): { vertices: Vec3[]; faces: number[][] } {
  const baseRing: Vec3[] = [];
  for (let i = 0; i < CURVED_SEGMENTS; i++) {
    const theta = (i / CURVED_SEGMENTS) * Math.PI * 2;
    baseRing.push([
      baseCenter[0] + radius * Math.cos(theta),
      baseCenter[1] + radius * Math.sin(theta),
      baseCenter[2],
    ]);
  }
  const apexIdx = baseRing.length;
  const vertices = [...baseRing, apex];
  const faces: number[][] = [baseRing.map((_, i) => i)];
  for (let i = 0; i < CURVED_SEGMENTS; i++) {
    faces.push([i, (i + 1) % CURVED_SEGMENTS, apexIdx]);
  }
  return { vertices, faces };
}
