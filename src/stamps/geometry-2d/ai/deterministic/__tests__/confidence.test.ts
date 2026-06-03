import { scoreConfidence } from '../confidence';

describe('scoreConfidence', () => {
  test('full coverage → 1.0', () => {
    const c = scoreConfidence('Cho tam giác ABC, đường cao AH', ['triangle', 'altitude']);
    expect(c).toBeCloseTo(1.0, 2);
  });

  test('partial coverage → fraction', () => {
    const c = scoreConfidence('tam giác ABC, đường tròn Euler', ['triangle']);
    expect(c).toBeCloseTo(0.5, 2);
  });

  test('no keywords → 0', () => {
    expect(scoreConfidence('Hello world', [])).toBe(0);
  });

  test('matched but no keywords in text → 1.0 fallback', () => {
    expect(scoreConfidence('xyz', ['triangle'])).toBe(1.0);
  });
});
