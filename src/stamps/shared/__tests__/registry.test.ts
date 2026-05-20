import {
  STABLE_STAMPS,
  EXPERIMENTAL_STAMPS,
  ALL_STAMPS,
  DEFAULT_STAMPS,
  geometryStamp,
  latexStamp,
  geometry3dStamp,
} from '../registry';

describe('registry exports', () => {
  it('STABLE_STAMPS = [geometry, latex]', () => {
    expect(STABLE_STAMPS.map((s) => s.kind)).toEqual(['geometry', 'latex']);
  });

  it('EXPERIMENTAL_STAMPS = [geometry3d]', () => {
    expect(EXPERIMENTAL_STAMPS.map((s) => s.kind)).toEqual([
      'geometry3d',
    ]);
  });

  it('ALL_STAMPS = STABLE + EXPERIMENTAL', () => {
    expect(ALL_STAMPS.map((s) => s.kind)).toEqual([
      'geometry',
      'latex',
      'geometry3d',
    ]);
  });

  it('DEFAULT_STAMPS = ALL_STAMPS (mặc định bật tất cả tool)', () => {
    expect(DEFAULT_STAMPS).toBe(ALL_STAMPS);
    expect(DEFAULT_STAMPS.map((s) => s.kind)).toEqual([
      'geometry',
      'latex',
      'geometry3d',
    ]);
  });

  it('experimental stamps có field experimental=true', () => {
    expect(geometry3dStamp.experimental).toBe(true);
  });

  it('stable stamps KHÔNG có experimental=true', () => {
    expect(geometryStamp.experimental).toBeFalsy();
    expect(latexStamp.experimental).toBeFalsy();
  });
});
