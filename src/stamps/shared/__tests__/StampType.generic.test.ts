// src/stamps/shared/__tests__/StampType.generic.test.ts
// Verify generic StampType<TCustomData> narrows correctly via matchesCustomData.
// Compile-time assertions thực thi qua tsc khi chạy ts-jest.
import { geometryStamp, type GeometryCustomData } from '../../geometry-2d';
import { latexStamp, type LatexCustomData } from '../../latex';
import { findStampForCustomData, type StampType, type BaseStampCustomData } from '../registry';

describe('StampType<T> generic', () => {
  test('matchesCustomData type guard narrows data sang GeometryCustomData', () => {
    const data: unknown = { kind: 'geometry', version: 1, jsonState: '{"a":1}' };
    if (geometryStamp.matchesCustomData(data)) {
      const narrow: GeometryCustomData = data;
      expect(narrow.jsonState).toBe('{"a":1}');
      expect(narrow.kind).toBe('geometry');
    } else {
      throw new Error('expected geometryStamp to match data');
    }
  });

  test('matchesCustomData type guard narrows data sang LatexCustomData', () => {
    const data: unknown = { kind: 'latex', version: 1, src: 'E=mc^2', displayMode: false };
    if (latexStamp.matchesCustomData(data)) {
      const narrow: LatexCustomData = data;
      expect(narrow.src).toBe('E=mc^2');
      expect(narrow.displayMode).toBe(false);
    } else {
      throw new Error('expected latexStamp to match data');
    }
  });

  test('findStampForCustomData trả StampType<BaseStampCustomData> với default generic', () => {
    const data = { kind: 'geometry', version: 1, jsonState: '{}' };
    const stamp = findStampForCustomData(data);
    expect(stamp).not.toBeNull();
    if (stamp) {
      const _typed: StampType = stamp;
      const _kind: string = _typed.kind;
      expect(_kind).toBe('geometry');
    }
  });

  test('geometryStamp typed StampType<GeometryCustomData>', () => {
    const typed: StampType<GeometryCustomData> = geometryStamp;
    const data: GeometryCustomData = { kind: 'geometry', version: 1, jsonState: '{}' };
    // renderSvgFromCustomData type-checks với GeometryCustomData (compile-time check).
    expect(typeof typed.renderSvgFromCustomData).toBe('function');
    expect(typed.matchesCustomData(data)).toBe(true);
  });

  test('StampType<X> assignable to StampType<BaseStampCustomData> qua method bivariance', () => {
    // Đảm bảo ReadonlyArray<StampType> chứa được concrete generic stamps.
    const stamps: ReadonlyArray<StampType<BaseStampCustomData>> = [geometryStamp, latexStamp];
    expect(stamps).toHaveLength(2);
  });
});
