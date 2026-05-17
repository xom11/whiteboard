import {
  STABLE_STAMPS,
  EXPERIMENTAL_STAMPS,
  ALL_STAMPS,
  DEFAULT_STAMPS,
  geometryStamp,
  latexStamp,
  geometry3dStamp,
  graph2dStamp,
} from '../registry';

describe('registry exports', () => {
  it('STABLE_STAMPS = [geometry, latex]', () => {
    expect(STABLE_STAMPS.map((s) => s.kind)).toEqual(['geometry', 'latex']);
  });

  it('EXPERIMENTAL_STAMPS = [geometry3d, graph2d]', () => {
    expect(EXPERIMENTAL_STAMPS.map((s) => s.kind)).toEqual([
      'geometry3d',
      'graph2d',
    ]);
  });

  it('ALL_STAMPS = STABLE + EXPERIMENTAL', () => {
    expect(ALL_STAMPS.map((s) => s.kind)).toEqual([
      'geometry',
      'latex',
      'geometry3d',
      'graph2d',
    ]);
  });

  it('DEFAULT_STAMPS = STABLE_STAMPS (production-safe)', () => {
    expect(DEFAULT_STAMPS).toBe(STABLE_STAMPS);
  });

  it('experimental stamps có field experimental=true', () => {
    expect(geometry3dStamp.experimental).toBe(true);
    expect(graph2dStamp.experimental).toBe(true);
  });

  it('stable stamps KHÔNG có experimental=true', () => {
    expect(geometryStamp.experimental).toBeFalsy();
    expect(latexStamp.experimental).toBeFalsy();
  });
});
