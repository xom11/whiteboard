import * as pkg from '../../../index';

describe('public API back-compat aliases (sẽ xoá ở 0.6.0)', () => {
  it('isMathStamp resolve về isStampElement', () => {
    expect(pkg.isMathStamp).toBeDefined();
    expect(pkg.isMathStamp).toBe(pkg.isStampElement);
  });

  it('restoreMissingMathStampFiles resolve về restoreMissingStampFiles', () => {
    expect(pkg.restoreMissingMathStampFiles).toBeDefined();
    expect(pkg.restoreMissingMathStampFiles).toBe(pkg.restoreMissingStampFiles);
  });

  it('export tên mới đầy đủ', () => {
    expect(pkg.Whiteboard).toBeDefined();
    expect(pkg.DEFAULT_STAMPS).toBeDefined();
    expect(pkg.geometryStamp).toBeDefined();
    expect(pkg.latexStamp).toBeDefined();
    expect(pkg.isStampElement).toBeDefined();
    expect(pkg.findStampForCustomData).toBeDefined();
    expect(pkg.isGeometryCustomData).toBeDefined();
    expect(pkg.isLatexCustomData).toBeDefined();
  });
});
