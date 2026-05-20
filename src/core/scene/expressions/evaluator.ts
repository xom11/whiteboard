// src/core/scene/expressions/evaluator.ts
// Numerical root + extrema scanning. Pure module.

const DEFAULT_SAMPLES = 1000;

/**
 * Quét nghiệm trong [xMin, xMax] bằng sign-change detection + bisection.
 * - Lấy DEFAULT_SAMPLES sample.
 * - Mỗi sub-interval đổi dấu → bisect 30 step.
 */
export function scanRoots(
  fn: (x: number) => number,
  xMin: number,
  xMax: number,
  samples = DEFAULT_SAMPLES,
): number[] {
  if (!Number.isFinite(xMin) || !Number.isFinite(xMax) || xMin >= xMax) return [];
  const out: number[] = [];
  const step = (xMax - xMin) / samples;
  let prev = fn(xMin);
  for (let i = 1; i <= samples; i++) {
    const x = xMin + i * step;
    const curr = fn(x);
    if (!Number.isFinite(prev) || !Number.isFinite(curr)) {
      prev = curr;
      continue;
    }
    // Sign change: strictly opposite signs (not both zero, not just touching zero)
    if (prev * curr < 0) {
      // Bisect
      const root = bisect(fn, x - step, x);
      if (Number.isFinite(root)) out.push(root);
    } else if (prev !== 0 && curr === 0) {
      // Exact root at x
      out.push(x);
    }
    prev = curr;
  }
  return out;
}

function bisect(fn: (x: number) => number, lo: number, hi: number): number {
  for (let i = 0; i < 50; i++) {
    const mid = (lo + hi) / 2;
    const fmid = fn(mid);
    if (!Number.isFinite(fmid)) break;
    if (Math.abs(fmid) < 1e-10) return mid;
    const flo = fn(lo);
    if (!Number.isFinite(flo)) break;
    if (flo * fmid <= 0) hi = mid;
    else lo = mid;
  }
  return (lo + hi) / 2;
}

export interface Extremum {
  x: number;
  y: number;
  type: 'max' | 'min';
}

/**
 * Quét cực trị bằng sample derivative sign-change.
 * - Lấy DEFAULT_SAMPLES sample y = fn(x).
 * - Derivative xấp xỉ Δy / Δx.
 * - Đổi dấu derivative + → - = max, - → + = min.
 */
export function scanExtrema(
  fn: (x: number) => number,
  xMin: number,
  xMax: number,
  samples = DEFAULT_SAMPLES,
): Extremum[] {
  if (!Number.isFinite(xMin) || !Number.isFinite(xMax) || xMin >= xMax) return [];
  const out: Extremum[] = [];
  const step = (xMax - xMin) / samples;
  // xs[0..samples+1] with xs[1..samples] covering [xMin..xMax], xs[0] and xs[samples+1] are guards
  const xs: number[] = [];
  const ys: number[] = [];
  for (let i = 0; i <= samples + 1; i++) {
    const x = xMin + (i - 1) * step;
    xs.push(x);
    ys.push(fn(x));
  }
  // xs[i] for i=1..samples corresponds to xMin + (i-1)*step
  // We check derivative sign change: d = ys[i+1] - ys[i-1]
  // When sign changes, extremum is at xs[i] = xMin + (i-1)*step
  let prevSign = 0;
  let prevSignIdx = 1;
  for (let i = 1; i <= samples; i++) {
    const d = ys[i + 1] - ys[i - 1];
    if (!Number.isFinite(d)) continue;
    const sign = d > 0 ? 1 : d < 0 ? -1 : 0;
    if (sign === 0) continue;
    if (prevSign !== 0 && sign !== prevSign) {
      const type: 'max' | 'min' = prevSign > 0 ? 'max' : 'min';
      // Extremum is between prevSignIdx and i — use midpoint
      const midI = Math.round((prevSignIdx + i) / 2);
      out.push({ x: xs[midI], y: ys[midI], type });
    }
    prevSign = sign;
    prevSignIdx = i;
  }
  return out;
}
