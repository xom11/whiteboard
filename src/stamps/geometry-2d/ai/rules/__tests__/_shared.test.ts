import { extractPointName, pairFromToken, isCenterName } from '../_shared';

describe('extractPointName', () => {
  it('lời dẫn "Gọi M là trung điểm BC" → M', () => {
    expect(extractPointName('Gọi M là trung điểm BC')).toBe('M');
  });

  it('lời dẫn "Lấy điểm D trên cạnh AB" → D', () => {
    expect(extractPointName('Lấy điểm D trên cạnh AB')).toBe('D');
  });

  // Bug \b ASCII: `là\b` — 'à' là non-word-char ASCII nên \b sau "là" KHÔNG khớp
  // khi theo sau là space → fallback NAME_LA chết, "H là trực tâm" trả undefined.
  it('dạng tên-trước "H là trực tâm" → H (NAME_LA)', () => {
    expect(extractPointName('H là trực tâm của tam giác ABC')).toBe('H');
  });

  it('dạng tên-trước có prime "M′ là điểm đối xứng" → M', () => {
    // extractPointName trả CHỮ CÁI (prime do caller tự xử lý — reflection giữ prime riêng).
    expect(extractPointName("M′ là điểm đối xứng của M qua O")).toBe('M');
  });

  it('không có lời dẫn → undefined', () => {
    expect(extractPointName('tam giác ABC vuông tại A')).toBeUndefined();
  });

  // KHÔNG nhận nhầm "làm" (là + chữ cái tiếp theo) làm lời dẫn "là".
  it('không khớp "X làm" (chữ "làm" ≠ "là")', () => {
    expect(extractPointName('A làm chuẩn')).toBeUndefined();
  });
});

describe('pairFromToken', () => {
  it('"BC" → [B, C]; token khác → []', () => {
    expect(pairFromToken('BC')).toEqual(['B', 'C']);
    expect(pairFromToken(' AB ')).toEqual(['A', 'B']);
    expect(pairFromToken('ABC')).toEqual([]);
  });
});

describe('isCenterName', () => {
  it('nhận O, O′, O1; loại O_c, AB', () => {
    expect(isCenterName('O')).toBe(true);
    expect(isCenterName("O'")).toBe(true);
    expect(isCenterName('O1')).toBe(true);
    expect(isCenterName('O_c')).toBe(false);
    expect(isCenterName('AB')).toBe(false);
  });
});
