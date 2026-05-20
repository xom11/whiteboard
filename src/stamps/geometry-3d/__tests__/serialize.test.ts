import {
  isGeometry3DCustomData,
  serializeBoard3D,
  deserializeBoard3D,
  parseSerializedBoard3D,
} from '../serialize';
import { createEmptyState } from '../../../core/scene';

describe('3d/serialize: customData type guard', () => {
  it('reject null/undefined/non-object', () => {
    expect(isGeometry3DCustomData(null)).toBe(false);
    expect(isGeometry3DCustomData(undefined)).toBe(false);
    expect(isGeometry3DCustomData('string')).toBe(false);
    expect(isGeometry3DCustomData(42)).toBe(false);
  });

  it('reject wrong kind', () => {
    expect(isGeometry3DCustomData({ kind: 'geometry', version: 1, jsonState: '{}' })).toBe(false);
    expect(isGeometry3DCustomData({ kind: 'latex', version: 1, jsonState: '{}' })).toBe(false);
  });

  it('reject wrong version', () => {
    expect(isGeometry3DCustomData({ kind: 'geometry3d', version: 3, jsonState: '{}' })).toBe(false);
    expect(isGeometry3DCustomData({ kind: 'geometry3d', version: 0, jsonState: '{}' })).toBe(false);
  });

  it('reject thiếu jsonState', () => {
    expect(isGeometry3DCustomData({ kind: 'geometry3d', version: 1 })).toBe(false);
  });

  it('accept version 1 và 2', () => {
    expect(
      isGeometry3DCustomData({
        kind: 'geometry3d',
        version: 1,
        jsonState: '{}',
        svgWidth: 100,
        svgHeight: 100,
      }),
    ).toBe(true);
    expect(
      isGeometry3DCustomData({
        kind: 'geometry3d',
        version: 2,
        jsonState: '{}',
        svgWidth: 100,
        svgHeight: 100,
      }),
    ).toBe(true);
  });
});

describe('3d/serialize: state v2 round-trip', () => {
  test('round-trip empty state', () => {
    const s = createEmptyState('3d');
    const raw = serializeBoard3D(s);
    expect(raw.version).toBe(2);
    const back = deserializeBoard3D(raw);
    expect(back).toEqual(s);
  });

  test('deserialize format không nhận diện → empty', () => {
    const s = deserializeBoard3D({ version: 1, foo: 'bar' });
    expect(s.objects).toEqual({});
    expect(s.order).toEqual([]);
    expect(s.meta.domain).toBe('3d');
  });

  test('serializeBoard3D giữ view nếu được cung cấp', () => {
    const s = createEmptyState('3d');
    const view = { azimuth: 0.7, elevation: 0.4, bbox3D: [-3, -3, -3, 3, 3, 3] as [number, number, number, number, number, number] };
    const raw = serializeBoard3D(s, view);
    expect(raw.view).toEqual(view);
  });

  test('parseSerializedBoard3D trả về state + view khi có', () => {
    const s = createEmptyState('3d');
    const view = { azimuth: 0.7, elevation: 0.4, bbox3D: [-3, -3, -3, 3, 3, 3] as [number, number, number, number, number, number] };
    const raw = serializeBoard3D(s, view);
    const parsed = parseSerializedBoard3D(raw);
    expect(parsed.view).toEqual(view);
    expect(parsed.state).toEqual(s);
  });

  test('parseSerializedBoard3D fallback về state rỗng nếu format lạ', () => {
    const parsed = parseSerializedBoard3D({ version: 1 });
    expect(parsed.state.objects).toEqual({});
    expect(parsed.view).toBeUndefined();
  });
});
