import { radialLabelOffsets } from '../labelLayout';

describe('radialLabelOffsets', () => {
  it('returns no offsets for < 2 points', () => {
    expect(radialLabelOffsets([]).size).toBe(0);
    expect(radialLabelOffsets([{ id: 'A', x: 0, y: 0 }]).size).toBe(0);
  });

  it('pushes each label radially outward from the centroid', () => {
    // Square around origin → centroid (0,0). Each corner pushes to its quadrant.
    const offs = radialLabelOffsets([
      { id: 'TR', x: 1, y: 1 },
      { id: 'TL', x: -1, y: 1 },
      { id: 'BR', x: 1, y: -1 },
      { id: 'BL', x: -1, y: -1 },
    ], 14);
    const [trx, try_] = offs.get('TR')!;
    expect(trx).toBeGreaterThan(0);
    expect(try_).toBeGreaterThan(0);
    const [blx, bly] = offs.get('BL')!;
    expect(blx).toBeLessThan(0);
    expect(bly).toBeLessThan(0);
  });

  it('offset magnitude is approximately R', () => {
    const offs = radialLabelOffsets([
      { id: 'A', x: 5, y: 0 },
      { id: 'B', x: -5, y: 0 },
    ], 14);
    const [ax, ay] = offs.get('A')!;
    expect(Math.hypot(ax, ay)).toBeCloseTo(14, 0);
  });

  it('points to the right of centroid get +x offset, left get -x', () => {
    const offs = radialLabelOffsets([
      { id: 'R', x: 10, y: 0 },
      { id: 'L', x: 0, y: 0 },
      { id: 'R2', x: 20, y: 0 },
    ], 12);
    // centroid x = 10 → L is left of centroid, R2 is right
    expect(offs.get('L')![0]).toBeLessThan(0);
    expect(offs.get('R2')![0]).toBeGreaterThan(0);
  });

  it('a point exactly at the centroid still gets a finite, non-zero offset', () => {
    const offs = radialLabelOffsets([
      { id: 'C', x: 0, y: 0 },
      { id: 'A', x: 2, y: 0 },
      { id: 'B', x: -2, y: 0 },
    ], 14);
    const c = offs.get('C')!;
    expect(c.every((v) => Number.isFinite(v))).toBe(true);
    expect(Math.hypot(c[0], c[1])).toBeGreaterThan(0);
  });
});
