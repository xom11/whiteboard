import { parsePageRange } from '../parseRange';

describe('parsePageRange', () => {
  it('parse số đơn', () => {
    expect(parsePageRange('5', 10)).toEqual([5]);
  });

  it('parse danh sách số', () => {
    expect(parsePageRange('1,3,5', 10)).toEqual([1, 3, 5]);
  });

  it('parse range', () => {
    expect(parsePageRange('3-6', 10)).toEqual([3, 4, 5, 6]);
  });

  it('mix số + range, dedupe + sort', () => {
    expect(parsePageRange('5,1-3,4', 10)).toEqual([1, 2, 3, 4, 5]);
  });

  it('chấp nhận khoảng trắng làm separator', () => {
    expect(parsePageRange('1 3  5-7', 10)).toEqual([1, 3, 5, 6, 7]);
  });

  it('empty → []', () => {
    expect(parsePageRange('', 10)).toEqual([]);
    expect(parsePageRange('   ', 10)).toEqual([]);
  });

  it('full range "1-N"', () => {
    expect(parsePageRange('1-5', 5)).toEqual([1, 2, 3, 4, 5]);
  });

  it('throw khi số vượt giới hạn', () => {
    expect(() => parsePageRange('15', 10)).toThrow(/vượt giới hạn/);
  });

  it('throw khi range vượt giới hạn', () => {
    expect(() => parsePageRange('5-20', 10)).toThrow(/vượt giới hạn/);
  });

  it('throw khi range ngược', () => {
    expect(() => parsePageRange('10-5', 10)).toThrow(/ngược/);
  });

  it('throw khi token không hợp lệ', () => {
    expect(() => parsePageRange('abc', 10)).toThrow(/không hợp lệ/);
  });

  it('throw khi số <= 0', () => {
    expect(() => parsePageRange('0', 10)).toThrow(/vượt giới hạn/);
  });

  it('throw khi totalPages không hợp lệ', () => {
    expect(() => parsePageRange('1', 0)).toThrow(/số nguyên dương/);
    expect(() => parsePageRange('1', -1)).toThrow(/số nguyên dương/);
  });

  it('dedupe overlap range', () => {
    expect(parsePageRange('1-5,3-7', 10)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });
});
