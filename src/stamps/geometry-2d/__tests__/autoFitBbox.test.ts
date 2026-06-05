import { computeAutoFitBbox, robustRange } from '../autoFitBbox';

describe('robustRange (Tukey IQR fences)', () => {
  it('returns [min, max] when there are no outliers', () => {
    expect(robustRange([0, 1, 2, 3, 4])).toEqual([0, 4]);
  });

  it('trims a far high outlier', () => {
    const [lo, hi] = robustRange([0, 1, 2, 3, 4, 5, 100]);
    expect(lo).toBe(0);
    expect(hi).toBeLessThan(50);
  });

  it('trims a far low outlier', () => {
    const [lo, hi] = robustRange([-100, 0, 1, 2, 3, 4, 5]);
    expect(lo).toBeGreaterThan(-50);
    expect(hi).toBe(5);
  });
});

const NO_CIRCLES: { cx: number; cy: number; r: number }[] = [];

describe('computeAutoFitBbox', () => {
  it('returns null for no geometry', () => {
    expect(computeAutoFitBbox([], NO_CIRCLES, 1)).toBeNull();
    expect(computeAutoFitBbox([[0, 0]], NO_CIRCLES, 1)).toBeNull();
  });

  it('encloses all points when no outliers (square aspect → square bbox)', () => {
    const bbox = computeAutoFitBbox([[0, 0], [4, 0], [0, 4], [4, 4]], NO_CIRCLES, 1)!;
    const [xmin, ymax, xmax, ymin] = bbox;
    expect(xmin).toBeLessThanOrEqual(0);
    expect(xmax).toBeGreaterThanOrEqual(4);
    expect(ymin).toBeLessThanOrEqual(0);
    expect(ymax).toBeGreaterThanOrEqual(4);
    expect(Math.abs((xmax - xmin) - (ymax - ymin))).toBeLessThan(1e-6);
  });

  it('expands shorter axis to match aspect ratio 2:1', () => {
    const bbox = computeAutoFitBbox([[0, 0], [4, 0], [0, 4], [4, 4]], NO_CIRCLES, 2)!;
    const [xmin, ymax, xmax, ymin] = bbox;
    expect((xmax - xmin) / (ymax - ymin)).toBeCloseTo(2, 5);
  });

  it('trims a lonely outlier point so the cluster is not compressed', () => {
    const cluster: [number, number][] = [
      [0, 0], [1, 0], [0, 1], [1, 1], [0.5, 0.5], [2, 0], [0, 2], [2, 2],
    ];
    const bbox = computeAutoFitBbox([...cluster, [100, 100]], NO_CIRCLES, 1)!;
    const [xmin, ymax, xmax, ymin] = bbox;
    expect(xmax).toBeLessThan(20);
    expect(ymax).toBeLessThan(20);
    void xmin; void ymin;
  });

  it('includes a normal-sized circle fully (no clipping of its extent)', () => {
    // points span ~6 units; circle r=3 centered at (3,3) reaches x=6, y=6.
    const points: [number, number][] = [[3, 3], [0, 3], [1.5, 5.6], [1.5, 0.4], [-3, 3]];
    const circles = [{ cx: 3, cy: 3, r: 3 }, { cx: 0, cy: 3, r: 3 }];
    const bbox = computeAutoFitBbox(points, circles, 1)!;
    const [xmin, ymax, xmax, ymin] = bbox;
    // circle right edge x=6 and top y=6 must be inside the bbox
    expect(xmax).toBeGreaterThanOrEqual(6);
    expect(ymax).toBeGreaterThanOrEqual(6);
    expect(xmin).toBeLessThanOrEqual(-3);
    void ymin;
  });

  it('excludes an egregiously oversized circle (clips the giant)', () => {
    // small cluster ~5 units + a giant circle r=14 → giant excluded so cluster is visible
    const points: [number, number][] = [[0, 0], [5, 0], [4.5, 3.5], [0.5, 3], [2.3, 1.8], [3.1, 1.3]];
    const circles = [{ cx: 2.5, cy: 1.5, r: 2.9 }, { cx: -9, cy: 0, r: 14 }];
    const bbox = computeAutoFitBbox(points, circles, 1)!;
    const [xmin, ymax, xmax, ymin] = bbox;
    // bbox must NOT stretch to the giant circle's left extent (-23)
    expect(xmin).toBeGreaterThan(-15);
    // small cluster circle (reaches x≈5.4) stays included
    expect(xmax).toBeGreaterThanOrEqual(5);
    void ymax; void ymin;
  });

  it('includes all circles when there are no points', () => {
    const bbox = computeAutoFitBbox([], [{ cx: 0, cy: 0, r: 5 }], 1)!;
    const [xmin, ymax, xmax, ymin] = bbox;
    expect(xmin).toBeLessThanOrEqual(-5);
    expect(xmax).toBeGreaterThanOrEqual(5);
    expect(ymin).toBeLessThanOrEqual(-5);
    expect(ymax).toBeGreaterThanOrEqual(5);
  });

  it('handles fully-collinear / degenerate points without NaN', () => {
    const bbox = computeAutoFitBbox([[0, 0], [1, 0], [2, 0]], NO_CIRCLES, 1)!;
    expect(bbox.every((v) => Number.isFinite(v))).toBe(true);
    const [xmin, ymax, xmax, ymin] = bbox;
    expect(xmax - xmin).toBeGreaterThan(0);
    expect(ymax - ymin).toBeGreaterThan(0);
  });

  it('returns JSXGraph bbox order [xmin, ymax, xmax, ymin]', () => {
    const bbox = computeAutoFitBbox([[0, 0], [4, 6]], NO_CIRCLES, 1)!;
    const [xmin, ymax, xmax, ymin] = bbox;
    expect(xmin).toBeLessThan(xmax);
    expect(ymin).toBeLessThan(ymax);
  });
});
