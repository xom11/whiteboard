import type { Vec3 } from '../scene/types';

export interface View3DLike {
  unprojectScreen?(sx: number, sy: number, depth: number): [number, number, number];
  project3DTo2D?(x: number, y: number, z: number): [number, number, number, number];
}

export interface Ray3D {
  origin: Vec3;
  dir: Vec3;
}

export function screenToRay(screen: { x: number; y: number }, view: View3DLike): Ray3D {
  // Strategy: unproject the screen point at two depths to get a ray through the scene.
  // Prefer view.unprojectScreen if available (mock); fallback to bisection via project3DTo2D.
  const near = unproject(screen, view, +20);
  const far = unproject(screen, view, -20);
  const dir: Vec3 = [far[0] - near[0], far[1] - near[1], far[2] - near[2]];
  const n = Math.sqrt(dir[0] ** 2 + dir[1] ** 2 + dir[2] ** 2);
  const norm: Vec3 = n === 0 ? [0, 0, -1] : [dir[0] / n, dir[1] / n, dir[2] / n];
  return { origin: near, dir: norm };
}

function unproject(screen: { x: number; y: number }, view: View3DLike, depth: number): Vec3 {
  if (typeof view.unprojectScreen === 'function') {
    const v = view.unprojectScreen(screen.x, screen.y, depth);
    return [v[0], v[1], v[2]];
  }
  throw new Error('rayCast: view.unprojectScreen unavailable and fallback not implemented');
}
