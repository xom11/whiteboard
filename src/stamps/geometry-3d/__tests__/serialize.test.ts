import {
  isGeometry3DCustomData,
  serializeBoard3D,
  deserializeBoard3D,
} from '../serialize';
import { createEmptyState, DEFAULT_VIEW_3D } from '../../../core/scene';

describe('3d/serialize: customData type guard', () => {
  it('reject null/undefined/non-object', () => {
    expect(isGeometry3DCustomData(null)).toBe(false);
    expect(isGeometry3DCustomData(undefined)).toBe(false);
    expect(isGeometry3DCustomData('string')).toBe(false);
    expect(isGeometry3DCustomData(42)).toBe(false);
  });

  it('reject wrong kind', () => {
    expect(isGeometry3DCustomData({ kind: 'geometry', version: 2, jsonState: '{}' })).toBe(false);
    expect(isGeometry3DCustomData({ kind: 'latex', version: 2, jsonState: '{}' })).toBe(false);
  });

  it('reject wrong version (chỉ v2 sau Tier D PR 3)', () => {
    expect(isGeometry3DCustomData({ kind: 'geometry3d', version: 1, jsonState: '{}' })).toBe(false);
    expect(isGeometry3DCustomData({ kind: 'geometry3d', version: 3, jsonState: '{}' })).toBe(false);
  });

  it('reject thiếu jsonState', () => {
    expect(isGeometry3DCustomData({ kind: 'geometry3d', version: 2 })).toBe(false);
  });

  it('accept version 2', () => {
    expect(
      isGeometry3DCustomData({
        kind: 'geometry3d',
        version: 2,
        jsonState: '{}',
      }),
    ).toBe(true);
  });
});

describe('3d/serialize: state roundtrip', () => {
  test('round-trip empty state với view bake vào state.meta.view', () => {
    const s = createEmptyState('3d');
    const view = { azimuth: 0.7, elevation: 0.4, bbox3D: [-3, 3, -3, 3, -3, 3] as const };
    const raw = serializeBoard3D(s, view);
    expect(typeof raw).toBe('string');
    const back = deserializeBoard3D(raw);
    expect(back.meta.domain).toBe('3d');
    if (back.meta.domain === '3d') {
      expect(back.meta.view.azimuth).toBe(0.7);
      expect(back.meta.view.elevation).toBe(0.4);
      expect(back.meta.view.bbox3D).toEqual([-3, 3, -3, 3, -3, 3]);
    }
  });

  test('deserialize garbage → empty state với default view', () => {
    const back = deserializeBoard3D('not json');
    expect(back.meta.domain).toBe('3d');
    if (back.meta.domain === '3d') {
      expect(back.meta.view).toEqual(DEFAULT_VIEW_3D);
    }
    expect(back.objects).toEqual({});
  });
});
