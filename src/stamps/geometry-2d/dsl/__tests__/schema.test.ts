// src/stamps/geometry-2d/dsl/__tests__/schema.test.ts
import { NameZ, DslInput } from '../schema';

describe('NameZ regex', () => {
  it.each([
    'A', 'B', 'AB', 'M_1', "A'", 'O₁', 'O₂', 'P12',
  ])('accepts %s', (s) => {
    expect(NameZ.safeParse(s).success).toBe(true);
  });

  it.each([
    '', '1A', 'a b', 'A.B', 'ThisLabelIsTooLong13',
  ])('rejects %s', (s) => {
    expect(NameZ.safeParse(s).success).toBe(false);
  });
});

describe('DslInput root', () => {
  it('parses empty version-1 input', () => {
    const r = DslInput.safeParse({ version: 1, points: [], shapes: [] });
    expect(r.success).toBe(true);
  });

  it('shapes defaults to []', () => {
    const r = DslInput.safeParse({ version: 1, points: [] });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.shapes).toEqual([]);
  });

  it('rejects version other than 1', () => {
    const r = DslInput.safeParse({ version: 2, points: [], shapes: [] });
    expect(r.success).toBe(false);
  });
});
