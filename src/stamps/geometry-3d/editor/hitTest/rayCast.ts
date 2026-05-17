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
  // Fallback for real JSXGraph view3d (orthographic-affine projection).
  // Extract the world→screen affine coefficients by sampling project3DTo2D at origin
  // and the three unit-axis points, then solve the 2×2 in (x, y) at the given depth.
  if (typeof view.project3DTo2D === 'function') {
    const p0 = view.project3DTo2D(0, 0, 0);
    const px = view.project3DTo2D(1, 0, 0);
    const py = view.project3DTo2D(0, 1, 0);
    const pz = view.project3DTo2D(0, 0, 1);
    const ox = p0[1], oy = p0[2];
    const a = px[1] - ox, b = py[1] - ox, c = pz[1] - ox;
    const d = px[2] - oy, e = py[2] - oy, f = pz[2] - oy;
    const rhsX = screen.x - ox - c * depth;
    const rhsY = screen.y - oy - f * depth;
    const det = a * e - b * d;
    if (Math.abs(det) < 1e-9) return [0, 0, depth];
    const x = (e * rhsX - b * rhsY) / det;
    const y = (-d * rhsX + a * rhsY) / det;
    return [x, y, depth];
  }
  throw new Error('rayCast: view has neither unprojectScreen nor project3DTo2D');
}
