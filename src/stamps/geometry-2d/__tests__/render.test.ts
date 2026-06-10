import { containerDimsForBbox } from '../render';

describe('containerDimsForBbox', () => {
  // bbox theo convention JSXGraph: [xmin, ymax, xmax, ymin]
  it('preserves square aspect (1:1) when bbox is square', () => {
    const { width, height } = containerDimsForBbox([-10, 10, 10, -10]);
    expect(width).toBe(height);
    expect(width).toBeGreaterThanOrEqual(100);
  });

  it('preserves wide aspect ratio (bbox 3:2)', () => {
    const { width, height } = containerDimsForBbox([-15, 10, 15, -10]);
    expect(width / height).toBeCloseTo(30 / 20, 2);
  });

  it('preserves tall aspect ratio (bbox 1:2)', () => {
    const { width, height } = containerDimsForBbox([-5, 10, 5, -10]);
    expect(width / height).toBeCloseTo(10 / 20, 2);
  });

  it('clamps to MAX_DIM (1200) for very large bbox while keeping aspect', () => {
    const { width, height } = containerDimsForBbox([-100, 100, 100, -100]);
    expect(Math.max(width, height)).toBeLessThanOrEqual(1200);
    expect(width).toBe(height);
  });

  it('floors at MIN_DIM (100) for very small bbox while keeping aspect', () => {
    const { width, height } = containerDimsForBbox([-1, 1, 1, -1]);
    expect(Math.min(width, height)).toBeGreaterThanOrEqual(100);
    expect(width).toBe(height);
  });

  it('falls back to 400x300 for degenerate bbox (zero width)', () => {
    const { width, height } = containerDimsForBbox([5, 10, 5, -10]);
    expect(width).toBe(400);
    expect(height).toBe(300);
  });

  it('falls back to 400x300 for degenerate bbox (zero height)', () => {
    const { width, height } = containerDimsForBbox([-10, 5, 10, 5]);
    expect(width).toBe(400);
    expect(height).toBe(300);
  });

  it('falls back to 400x300 for non-finite bbox', () => {
    const { width, height } = containerDimsForBbox([NaN, 10, 10, -10]);
    expect(width).toBe(400);
    expect(height).toBe(300);
  });

  // Default size bump — figure mặc định khi gen ra to hơn một tí (was 400).
  it('renders the default square view at DEFAULT_VIEW_PX (500)', () => {
    const { width, height } = containerDimsForBbox([-10, 10, 10, -10]);
    expect(width).toBe(500);
    expect(height).toBe(500);
  });

  // Zoom WYSIWYG — canvas max-axis is constant regardless of zoom level, so the
  // figure inside scales with the editor zoom (zoom in → bbox span ↓ → figure ↑).
  it('keeps the canvas max-axis constant across zoom levels', () => {
    const zoomedOut = containerDimsForBbox([-20, 20, 20, -20]); // span 40
    const neutral = containerDimsForBbox([-10, 10, 10, -10]); //   span 20
    const zoomedIn = containerDimsForBbox([-2, 2, 2, -2]); //      span 4
    expect(Math.max(zoomedOut.width, zoomedOut.height)).toBe(500);
    expect(Math.max(neutral.width, neutral.height)).toBe(500);
    expect(Math.max(zoomedIn.width, zoomedIn.height)).toBe(500);
  });

  it('increases pixels-per-unit as the bbox shrinks (zoom in → bigger figure)', () => {
    const pxPerUnit = (bbox: [number, number, number, number]) => {
      const { width } = containerDimsForBbox(bbox);
      const spanX = Math.abs(bbox[2] - bbox[0]);
      return width / spanX;
    };
    const wide = pxPerUnit([-20, 20, 20, -20]); // span 40 → zoomed out
    const tight = pxPerUnit([-5, 5, 5, -5]); //    span 10 → zoomed in
    expect(tight).toBeGreaterThan(wide);
  });
});
