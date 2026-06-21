// crossSectionGeometry.ts — pure vector math for cross-section computation.
export type Vec3 = [number, number, number];

const sub = (a: Vec3, b: Vec3): Vec3 => [a[0]-b[0], a[1]-b[1], a[2]-b[2]];
const dot = (a: Vec3, b: Vec3): number => a[0]*b[0] + a[1]*b[1] + a[2]*b[2];
const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1]*b[2] - a[2]*b[1],
  a[2]*b[0] - a[0]*b[2],
  a[0]*b[1] - a[1]*b[0],
];
const normalize = (a: Vec3): Vec3 => {
  const n = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0]/n, a[1]/n, a[2]/n];
};

export interface PlaneFrame { origin: Vec3; normal: Vec3; u: Vec3; v: Vec3 }

export function planeFrame(p1: Vec3, p2: Vec3, p3: Vec3): PlaneFrame {
  const normal = normalize(cross(sub(p2, p1), sub(p3, p1)));
  const u = normalize(sub(p2, p1));
  const v = normalize(cross(normal, u));
  return { origin: p1, normal, u, v };
}

export function signedDistance(p: Vec3, f: PlaneFrame): number {
  return dot(sub(p, f.origin), f.normal);
}

/** Strict crossing param in (0,1); null if same side or an endpoint lies on the plane. */
export function edgePlaneCrossing(a: Vec3, b: Vec3, f: PlaneFrame, eps = 1e-9): number | null {
  const dA = signedDistance(a, f);
  const dB = signedDistance(b, f);
  if (Math.abs(dA) < eps || Math.abs(dB) < eps) return null;
  if (dA * dB > 0) return null;
  return dA / (dA - dB);
}

/** Unordered, deduped edge index pairs from face rings. */
export function extractEdges(faces: number[][]): Array<[number, number]> {
  const seen = new Set<string>();
  const out: Array<[number, number]> = [];
  for (const face of faces) {
    for (let i = 0; i < face.length; i++) {
      const a = face[i];
      const b = face[(i + 1) % face.length];
      const key = a < b ? `${a},${b}` : `${b},${a}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push([a, b]);
    }
  }
  return out;
}

/** Permutation ordering points around their centroid in the plane (u,v) basis. */
export function orderAroundPerimeter(points: Vec3[], f: PlaneFrame): number[] {
  const proj = points.map((p) => {
    const d = sub(p, f.origin);
    return [dot(d, f.u), dot(d, f.v)] as [number, number];
  });
  const cx = proj.reduce((s, p) => s + p[0], 0) / proj.length;
  const cy = proj.reduce((s, p) => s + p[1], 0) / proj.length;
  return points
    .map((_, i) => i)
    .sort(
      (i, j) =>
        Math.atan2(proj[i][1] - cy, proj[i][0] - cx) -
        Math.atan2(proj[j][1] - cy, proj[j][0] - cx),
    );
}
