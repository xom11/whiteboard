// Anti-collision label placement for AI-generated figures.
//
// JSXGraph places every point label at a fixed [10,10] pixel offset (up-right).
// When points cluster, labels overlap and overlap interior lines. We push each
// label radially OUTWARD from the figure centroid: points on the left get a
// left offset, points on the right get a right offset, etc. Offsets are in the
// SAME sign convention as JSXGraph's label `offset` attribute (it negates the
// y internally for screen space), so [dirX·R, dirY·R] in math coords maps
// directly to a screen offset away from the centroid.

export interface LabeledPoint {
  id: string;
  x: number;
  y: number;
}

export function radialLabelOffsets(
  points: LabeledPoint[],
  R = 14,
): Map<string, [number, number]> {
  const out = new Map<string, [number, number]>();
  if (points.length < 2) return out;

  const cx = points.reduce((s, p) => s + p.x, 0) / points.length;
  const cy = points.reduce((s, p) => s + p.y, 0) / points.length;

  for (const p of points) {
    let dx = p.x - cx;
    let dy = p.y - cy;
    const len = Math.hypot(dx, dy);
    if (len < 1e-9) {
      // Point sits on the centroid → no meaningful direction; push up.
      dx = 0;
      dy = 1;
    } else {
      dx /= len;
      dy /= len;
    }
    out.set(p.id, [Math.round(dx * R), Math.round(dy * R)]);
  }
  return out;
}
