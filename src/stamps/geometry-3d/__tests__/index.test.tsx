import { geometry3dStamp, isGeometry3DCustomData } from '../index';

describe('geometry3dStamp', () => {
  it('có đủ trường StampType', () => {
    expect(geometry3dStamp.kind).toBe('geometry3d');
    expect(geometry3dStamp.shortcutKey).toBe('d');
    expect(geometry3dStamp.Host).toBeDefined();
    expect(typeof geometry3dStamp.matchesCustomData).toBe('function');
    expect(typeof geometry3dStamp.restoreFileFromCustomData).toBe('function');
  });

  it('matchesCustomData chỉ accept kind=geometry3d', () => {
    expect(
      geometry3dStamp.matchesCustomData({
        kind: 'geometry3d',
        version: 1,
        jsonState: '{}',
      }),
    ).toBe(true);
    expect(
      geometry3dStamp.matchesCustomData({ kind: 'geometry', version: 1, jsonState: '{}' }),
    ).toBe(false);
  });

  it('re-exports isGeometry3DCustomData', () => {
    expect(typeof isGeometry3DCustomData).toBe('function');
  });
});
