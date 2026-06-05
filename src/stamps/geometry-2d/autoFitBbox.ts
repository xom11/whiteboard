// Pure geometry helpers for auto-fitting an AI-generated figure into a viewport.
//
// Two concerns, both visual-quality fixes:
//   1. Outlier-robust extent — a single far-flung point or an oversized circle
//      must not compress the main cluster into a sliver (eval cau-13, cau-04).
//      We use Tukey IQR fences per axis to trim statistical outliers.
//   2. Aspect correction — the offscreen container is sized from the DEFAULT
//      square bbox, so the fitted bbox must be expanded to the same aspect or
//      JSXGraph's setBoundingBox stretches the units → circles become ellipses
//      (eval cau-08). We grow the shorter axis (never shrink) so everything in
//      the robust extent stays visible.

/**
 * Robust [min, max] of a sample using Tukey fences (Q1 - k·IQR, Q3 + k·IQR).
 * Values outside the fence are dropped before taking min/max. With no outliers
 * this returns the raw [min, max]. For < 4 samples IQR is meaningless → raw range.
 */
export function robustRange(values: number[], k = 1.5): [number, number] {
  const n = values.length;
  if (n === 0) return [0, 0];
  const sorted = [...values].sort((a, b) => a - b);
  if (n < 4) return [sorted[0], sorted[n - 1]];
  const quantile = (p: number): number => {
    const idx = (n - 1) * p;
    const lo = Math.floor(idx);
    const hi = Math.ceil(idx);
    if (lo === hi) return sorted[lo];
    return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
  };
  const q1 = quantile(0.25);
  const q3 = quantile(0.75);
  const iqr = q3 - q1;
  const fenceLo = q1 - k * iqr;
  const fenceHi = q3 + k * iqr;
  let min = Infinity;
  let max = -Infinity;
  for (const v of sorted) {
    if (v < fenceLo || v > fenceHi) continue;
    if (v < min) min = v;
    if (v > max) max = v;
  }
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [sorted[0], sorted[n - 1]];
  return [min, max];
}

export interface CircleExtent {
  cx: number;
  cy: number;
  r: number;
}

// A circle whose radius exceeds this multiple of the point-cluster diagonal is
// treated as an oversized outlier and excluded from the fit (it still draws,
// just clipped). Keeps a normal circumcircle in-frame while preventing a single
// degenerate giant circle from compressing the whole figure (eval cau-13).
const CIRCLE_MAX_FACTOR = 1.0;

/**
 * Compute a JSXGraph bbox `[xmin, ymax, xmax, ymin]` fitted to the figure.
 *
 * Points are reduced to a robust extent via Tukey IQR fences (trims stray
 * intersection points that fly off to huge coords). Circles are included WHOLE
 * (never per-edge trimmed — a clipped circle looks broken) unless a circle is
 * egregiously larger than the point cluster, in which case it is excluded. The
 * result is padded and expanded to `aspect` (= container width / height) so
 * units stay square (round circles). Returns null when there is no geometry.
 */
export function computeAutoFitBbox(
  points: ReadonlyArray<readonly [number, number]>,
  circles: ReadonlyArray<CircleExtent>,
  aspect: number,
  padPct = 0.12,
): [number, number, number, number] | null {
  const xs = points.map((p) => p[0]).filter(Number.isFinite);
  const ys = points.map((p) => p[1]).filter(Number.isFinite);

  let xmin = Infinity, xmax = -Infinity, ymin = Infinity, ymax = -Infinity;
  let clusterDiag = 0;
  if (xs.length >= 2 && ys.length >= 2) {
    [xmin, xmax] = robustRange(xs);
    [ymin, ymax] = robustRange(ys);
    clusterDiag = Math.hypot(xmax - xmin, ymax - ymin);
  }

  for (const c of circles) {
    if (!Number.isFinite(c.cx) || !Number.isFinite(c.cy) || !Number.isFinite(c.r)) continue;
    // Exclude an oversized circle only when we have a point cluster to compare to.
    if (clusterDiag > 0 && c.r > CIRCLE_MAX_FACTOR * clusterDiag) continue;
    xmin = Math.min(xmin, c.cx - c.r); xmax = Math.max(xmax, c.cx + c.r);
    ymin = Math.min(ymin, c.cy - c.r); ymax = Math.max(ymax, c.cy + c.r);
  }

  if (!Number.isFinite(xmin) || !Number.isFinite(xmax) || !Number.isFinite(ymin) || !Number.isFinite(ymax)) {
    return null;
  }
  let w = xmax - xmin;
  let h = ymax - ymin;

  // Degenerate (all coincident / fully collinear on one axis): floor to 1 unit.
  if (w < 0.5) { const cx = (xmin + xmax) / 2; xmin = cx - 0.5; xmax = cx + 0.5; w = 1; }
  if (h < 0.5) { const cy = (ymin + ymax) / 2; ymin = cy - 0.5; ymax = cy + 0.5; h = 1; }

  const padX = w * padPct;
  const padY = h * padPct;
  xmin -= padX; xmax += padX; ymin -= padY; ymax += padY;
  w = xmax - xmin; h = ymax - ymin;

  // Expand the shorter axis so width/height matches the container aspect.
  const curAspect = w / h;
  if (curAspect < aspect) {
    const newW = h * aspect;
    const cx = (xmin + xmax) / 2;
    xmin = cx - newW / 2; xmax = cx + newW / 2;
  } else if (curAspect > aspect) {
    const newH = w / aspect;
    const cy = (ymin + ymax) / 2;
    ymin = cy - newH / 2; ymax = cy + newH / 2;
  }

  return [xmin, ymax, xmax, ymin];
}
