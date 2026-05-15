import { getDefiningPoints } from '../transforms';

const mkPoint = () => ({ elType: 'point' });

describe('getDefiningPoints', () => {
  it('point trả về chính nó', () => {
    const p = mkPoint();
    expect(getDefiningPoints(p)).toEqual({ kind: 'point', points: [p], attrs: {} });
  });

  it('segment trả về point1 + point2', () => {
    const p1 = mkPoint(),
      p2 = mkPoint();
    const seg = { elType: 'segment', point1: p1, point2: p2, visProp: {} };
    const r = getDefiningPoints(seg);
    expect(r?.kind).toBe('segment');
    expect(r?.points).toEqual([p1, p2]);
  });

  it('line, ray (line with straightFirst:false), arrow đều thuộc line family', () => {
    const p1 = mkPoint(),
      p2 = mkPoint();
    expect(
      getDefiningPoints({ elType: 'line', point1: p1, point2: p2, visProp: {} })?.kind,
    ).toBe('line');
    expect(
      getDefiningPoints({ elType: 'arrow', point1: p1, point2: p2, visProp: {} })?.kind,
    ).toBe('arrow');
  });

  it('circle (center+point) trả về [center, point2]', () => {
    const c = mkPoint(),
      p2 = mkPoint();
    const circ = { elType: 'circle', center: c, point2: p2, visProp: {} };
    const r = getDefiningPoints(circ);
    expect(r?.kind).toBe('circleCenter');
    expect(r?.points).toEqual([c, p2]);
  });

  it('circumcircle trả về 3 điểm', () => {
    const a = mkPoint(),
      b = mkPoint(),
      d = mkPoint();
    const cc = { elType: 'circumcircle', point1: a, point2: b, point3: d, visProp: {} };
    const r = getDefiningPoints(cc);
    expect(r?.kind).toBe('circle3');
    expect(r?.points).toEqual([a, b, d]);
  });

  it('null cho object không biết', () => {
    expect(getDefiningPoints({ elType: 'angle' })).toBeNull();
  });
});
