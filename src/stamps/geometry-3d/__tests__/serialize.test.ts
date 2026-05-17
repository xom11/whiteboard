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
    expect(isGeometry3DCustomData({ kind: 'geometry3d', version: 3, jsonState: '{}' })).toBe(false);
    expect(isGeometry3DCustomData({ kind: 'geometry3d', version: 0, jsonState: '{}' })).toBe(false);
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
        type: 'line3d',
        parents: ['@id:p1', '@id:p2'],
        attributes: { strokeColor: '#000', straightFirst: false, straightLast: false },
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
    expect(() => parseSerializedBoard3D('{"version":3,"elements":[]}')).toThrow(/version/);
  });
});

describe('SerializedBoard3D v1/v2 compatibility', () => {
  it('parseSerializedBoard3D accepts v1 stamps without constraint field', () => {
    const v1 = {
      version: 1,
      bbox: [0, 0, 100, 100],
      view: { azimuth: 0, elevation: 0, bbox3D: [-5, -5, -5, 5, 5, 5] },
      showAxes: true,
      showMesh: true,
      elements: [
        { type: 'point3d', parents: [1, 2, 3], attributes: { id: 'p1' }, id: 'p1' },
      ],
    };
    const parsed = parseSerializedBoard3D(JSON.stringify(v1));
    expect(parsed.version).toBe(1);
    expect(parsed.elements[0].constraint).toBeUndefined();
  });

  it('parseSerializedBoard3D accepts v2 stamps with constraint field', () => {
    const v2 = {
      version: 2,
      bbox: [0, 0, 100, 100],
      view: { azimuth: 0, elevation: 0, bbox3D: [-5, -5, -5, 5, 5, 5] },
      showAxes: true,
      showMesh: true,
      elements: [
        {
          type: 'point3d',
          parents: [],
          attributes: { id: 'p1' },
          id: 'p1',
          constraint: { kind: 'onGround', x: 1, y: 2 },
        },
      ],
    };
    const parsed = parseSerializedBoard3D(JSON.stringify(v2));
    expect(parsed.version).toBe(2);
    expect(parsed.elements[0].constraint).toEqual({ kind: 'onGround', x: 1, y: 2 });
  });

  it('parseSerializedBoard3D rejects v3 stamps', () => {
    const v3 = {
      version: 3,
      bbox: [0, 0, 0, 0],
      view: { azimuth: 0, elevation: 0, bbox3D: [0, 0, 0, 0, 0, 0] },
      showAxes: true,
      showMesh: true,
      elements: [],
    };
    expect(() => parseSerializedBoard3D(JSON.stringify(v3))).toThrow();
  });

  it('isGeometry3DCustomData accepts version 1 or 2', () => {
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
    expect(
      isGeometry3DCustomData({
        kind: 'geometry3d',
        version: 3,
        jsonState: '{}',
        svgWidth: 100,
        svgHeight: 100,
      }),
    ).toBe(false);
  });
});
