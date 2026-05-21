import { containerDimsForBbox } from '../render';

describe('containerDimsForBbox', () => {
  // bbox theo convention JSXGraph: [xmin, ymax, xmax, ymin]
  it('preserves square aspect (1:1) when bbox is square', () => {
    const { width, height } = containerDimsForBbox([-10, 10, 10, -10]);
    expect(width).toBe(height);
    expect(width).toBeGreaterThanOrEqual(300);
  });

  it('preserves wide aspect ratio (bbox 3:2)', () => {
    const { width, height } = containerDimsForBbox([-15, 10, 15, -10]);
    expect(width / height).toBeCloseTo(30 / 20, 2);
  });

  it('preserves tall aspect ratio (bbox 1:2)', () => {
    const { width, height } = containerDimsForBbox([-5, 10, 5, -10]);
    expect(width / height).toBeCloseTo(10 / 20, 2);
  });

  it('clamps to MAX_DIM (3600) for very large bbox while keeping aspect', () => {
    const { width, height } = containerDimsForBbox([-100, 100, 100, -100]);
    expect(Math.max(width, height)).toBeLessThanOrEqual(3600);
    expect(width).toBe(height);
  });

  it('floors at MIN_DIM (300) for very small bbox while keeping aspect', () => {
    const { width, height } = containerDimsForBbox([-1, 1, 1, -1]);
    expect(Math.min(width, height)).toBeGreaterThanOrEqual(300);
    expect(width).toBe(height);
  });

  it('falls back to 1200x900 for degenerate bbox (zero width)', () => {
    const { width, height } = containerDimsForBbox([5, 10, 5, -10]);
    expect(width).toBe(1200);
    expect(height).toBe(900);
  });

  it('falls back to 1200x900 for degenerate bbox (zero height)', () => {
    const { width, height } = containerDimsForBbox([-10, 5, 10, 5]);
    expect(width).toBe(1200);
    expect(height).toBe(900);
  });

  it('falls back to 1200x900 for non-finite bbox', () => {
    const { width, height } = containerDimsForBbox([NaN, 10, 10, -10]);
    expect(width).toBe(1200);
    expect(height).toBe(900);
  });
});
