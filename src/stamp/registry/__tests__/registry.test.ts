import {
  DEFAULT_STAMPS,
  findStampForCustomData,
  isStampElement,
  geometryStamp,
  latexStamp,
  isGeometryCustomData,
  isLatexCustomData,
} from '../index';

describe('DEFAULT_STAMPS', () => {
  it('chứa đúng geometry + latex (theo thứ tự)', () => {
    expect(DEFAULT_STAMPS).toHaveLength(2);
    expect(DEFAULT_STAMPS[0]).toBe(geometryStamp);
    expect(DEFAULT_STAMPS[1]).toBe(latexStamp);
  });

  it('không thể mutate (frozen)', () => {
    expect(Object.isFrozen(DEFAULT_STAMPS)).toBe(true);
  });

  it('không có 2 stamp trùng kind / shortcutKey', () => {
    const kinds = new Set(DEFAULT_STAMPS.map((s) => s.kind));
    const keys = new Set(DEFAULT_STAMPS.map((s) => s.shortcutKey));
    expect(kinds.size).toBe(DEFAULT_STAMPS.length);
    expect(keys.size).toBe(DEFAULT_STAMPS.length);
  });
});

describe('isGeometryCustomData / isLatexCustomData', () => {
  it('nhận diện geometry hợp lệ', () => {
    expect(isGeometryCustomData({ kind: 'geometry', version: 1, jsonState: '{}', svgWidth: 1, svgHeight: 1 })).toBe(true);
  });
  it('reject geometry sai version', () => {
    expect(isGeometryCustomData({ kind: 'geometry', version: 2, jsonState: '{}' })).toBe(false);
  });
  it('reject null / undefined / primitive', () => {
    expect(isGeometryCustomData(null)).toBe(false);
    expect(isGeometryCustomData(undefined)).toBe(false);
    expect(isGeometryCustomData('x')).toBe(false);
  });
  it('nhận diện latex hợp lệ', () => {
    expect(isLatexCustomData({ kind: 'latex', version: 1, src: 'x^2', displayMode: false })).toBe(true);
  });
  it('reject latex thiếu src', () => {
    expect(isLatexCustomData({ kind: 'latex', version: 1 })).toBe(false);
  });
});

describe('findStampForCustomData / isStampElement', () => {
  it('trả về geometry stamp cho geometry customData', () => {
    const stamp = findStampForCustomData({ kind: 'geometry', version: 1, jsonState: '{}', svgWidth: 0, svgHeight: 0 });
    expect(stamp).toBe(geometryStamp);
  });
  it('trả về latex stamp cho latex customData', () => {
    const stamp = findStampForCustomData({ kind: 'latex', version: 1, src: 'x', displayMode: false });
    expect(stamp).toBe(latexStamp);
  });
  it('trả về null nếu không match', () => {
    expect(findStampForCustomData({ kind: 'chart', version: 1 })).toBeNull();
    expect(findStampForCustomData(undefined)).toBeNull();
  });
  it('isStampElement true cho element có math customData', () => {
    expect(isStampElement({ customData: { kind: 'geometry', version: 1, jsonState: '{}' } })).toBe(true);
    expect(isStampElement({ customData: { kind: 'foo', version: 1 } })).toBe(false);
    expect(isStampElement({})).toBe(false);
  });
});

describe('renderSvgFromCustomData (type guards)', () => {
  it('geometryStamp.renderSvgFromCustomData throws với customData sai', async () => {
    await expect(geometryStamp.renderSvgFromCustomData({ kind: 'latex' })).rejects.toThrow();
  });
  it('latexStamp.renderSvgFromCustomData throws với customData sai', async () => {
    await expect(latexStamp.renderSvgFromCustomData({ kind: 'geometry' })).rejects.toThrow();
  });
});
