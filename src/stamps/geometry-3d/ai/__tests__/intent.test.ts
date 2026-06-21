// __tests__/intent.test.ts
import { Intent3DZ, solid, addPoint3d, plane3d, connect3d } from '../intent';

describe('Intent3D schema', () => {
  it('accepts a pyramid solid intent', () => {
    const i = solid({ flavor: 'pyramid', baseLabels: ['A','B','C','D'], baseVariant: 'square', apex: 'S', apexVariant: 'regular' });
    expect(Intent3DZ.parse(i).op).toBe('solid');
  });
  it('accepts a midpoint add-point-3d', () => {
    const i = addPoint3d('M', { kind: 'midpoint', p1: 'B', p2: 'C' });
    expect(() => Intent3DZ.parse(i)).not.toThrow();
  });
  it('accepts a named plane (three points)', () => {
    expect(() => Intent3DZ.parse(plane3d('mp_SBC', { kind: 'threePoints', p1: 'S', p2: 'B', p3: 'C' }))).not.toThrow();
  });
  it('rejects an unknown op', () => {
    expect(() => Intent3DZ.parse({ op: 'bogus' } as any)).toThrow();
  });
  it('connect3d defaults style=segment', () => {
    expect(connect3d('A','B')).toMatchObject({ op: 'connect', from: 'A', to: 'B', style: 'segment' });
  });
});
