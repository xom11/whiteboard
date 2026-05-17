import { nextPointLabel, nextDerivedLabel } from '../../editor/scene/labels';

test('nextPointLabel cycles A..Z then A_1..Z_1', () => {
  expect(nextPointLabel([])).toBe('A');
  expect(nextPointLabel(['A'])).toBe('B');
  expect(nextPointLabel(['A', 'B', 'C'])).toBe('D');
  const az = Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i));
  expect(nextPointLabel(az)).toBe('A_1');
  expect(nextPointLabel([...az, 'A_1'])).toBe('B_1');
});

test('nextDerivedLabel uses lowercase for lines/segments/vectors', () => {
  expect(nextDerivedLabel('segment', [])).toBe('a');
  expect(nextDerivedLabel('segment', ['a'])).toBe('b');
  expect(nextDerivedLabel('line', ['a'])).toBe('b');
});

test('nextDerivedLabel uses prefix for solids/curved', () => {
  expect(nextDerivedLabel('sphere', [])).toBe('s_1');
  expect(nextDerivedLabel('sphere', ['s_1'])).toBe('s_2');
  expect(nextDerivedLabel('polyhedron', [])).toBe('h_1');
});
