import { countGeometryKeywords, GEOMETRY_KEYWORDS } from '../vocabulary';

describe('vocabulary', () => {
  test('GEOMETRY_KEYWORDS includes core nouns', () => {
    expect(GEOMETRY_KEYWORDS).toEqual(
      expect.arrayContaining([
        'tam giác', 'đường tròn', 'trung điểm', 'đường cao',
        'phân giác', 'tiếp tuyến', 'nội tiếp', 'ngoại tiếp',
      ]),
    );
  });

  test('countGeometryKeywords matches case-insensitive + diacritic', () => {
    expect(countGeometryKeywords('Cho tam giác ABC')).toBe(1);
    expect(countGeometryKeywords('TAM GIÁC ABC, đường cao AH, trung điểm M')).toBe(3);
    expect(countGeometryKeywords('Hello world')).toBe(0);
  });

  test('overlapping keyword counted once per occurrence', () => {
    expect(countGeometryKeywords('đường tròn nội tiếp tam giác ABC')).toBe(3);
  });

  // Issue #46 nhóm A: "⊥" ≡ "vuông góc" ở gate hasGeometry.
  test('ký hiệu ⊥ là tín hiệu hình học (tương đương "vuông góc")', () => {
    expect(GEOMETRY_KEYWORDS).toEqual(expect.arrayContaining(['⊥']));
    // Clause CHỈ có "⊥" làm tín hiệu hình học → phải đếm > 0 (như "vuông góc").
    expect(countGeometryKeywords('AH ⊥ BC tại H')).toBe(1);
    expect(countGeometryKeywords('AH vuông góc BC tại H')).toBe(1);
    // Nhiều ký hiệu trong 1 clause → đếm từng lần.
    expect(countGeometryKeywords('AH ⊥ BC và BK ⊥ AC')).toBe(2);
  });
});
