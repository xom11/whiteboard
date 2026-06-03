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
});
