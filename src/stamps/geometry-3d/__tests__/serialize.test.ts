import {
  isGeometry3DCustomData,
  parseSerializedBoard3D,
  serializeBoard3D,
  type SerializedBoard3D,
} from '../serialize';

describe('Geometry3D customData type guard', () => {
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
    expect(isGeometry3DCustomData({ kind: 'geometry3d', version: 2, jsonState: '{}' })).toBe(false);
  });

  it('reject thiếu jsonState', () => {
    expect(isGeometry3DCustomData({ kind: 'geometry3d', version: 1 })).toBe(false);
  });

  it('accept valid shape', () => {
    expect(
      isGeometry3DCustomData({
        kind: 'geometry3d',
        version: 1,
        jsonState: '{"version":1}',
        svgWidth: 1024,
        svgHeight: 768,
      }),
    ).toBe(true);
  });
});

describe('SerializedBoard3D round-trip', () => {
  const fullState: SerializedBoard3D = {
    version: 1,
    bbox: [-6, 6, 6, -6],
    view: { azimuth: 0.5, elevation: 0.3, bbox3D: [-3, -3, -3, 3, 3, 3] },
    showAxes: true,
    showMesh: false,
    elements: [
      {
        type: 'point3d',
        parents: [0, 0, 0],
        attributes: { name: 'A', size: 3 },
        id: 'p1',
        label: 'A',
      },
      {
        type: 'segment3d',
        parents: ['@id:p1', '@id:p2'],
        attributes: { strokeColor: '#000' },
        id: 's1',
      },
    ],
  };

  it('serializeBoard3D + parseSerializedBoard3D nguyên dạng', () => {
    const json = serializeBoard3D(fullState);
    const parsed = parseSerializedBoard3D(json);
    expect(parsed).toEqual(fullState);
  });

  it('parseSerializedBoard3D throws on malformed JSON', () => {
    expect(() => parseSerializedBoard3D('{not json')).toThrow();
  });

  it('parseSerializedBoard3D throws on wrong version', () => {
    expect(() => parseSerializedBoard3D('{"version":2,"elements":[]}')).toThrow(/version/);
  });
});
