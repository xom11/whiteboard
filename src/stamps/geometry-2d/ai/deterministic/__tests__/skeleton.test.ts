import { parseSkeleton } from '../skeleton';

describe('parseSkeleton — triangle', () => {
  test('plain "tam giác ABC" → 3 free points scalene + 3 segments', () => {
    const r = parseSkeleton('Cho tam giác ABC');
    expect(r.points).toEqual([
      { name: 'A', kind: 'free', x: 0, y: 3 },
      { name: 'B', kind: 'free', x: -2, y: 0 },
      { name: 'C', kind: 'free', x: 3, y: 0 },
    ]);
    expect(r.shapes).toEqual([
      { name: 'AB', kind: 'segment', p1: 'A', p2: 'B' },
      { name: 'BC', kind: 'segment', p1: 'B', p2: 'C' },
      { name: 'CA', kind: 'segment', p1: 'C', p2: 'A' },
    ]);
    expect(r.matched).toContain('triangle');
  });

  test('"tam giác vuông tại A" → right-triangle template', () => {
    const r = parseSkeleton('tam giác ABC vuông tại A');
    expect(r.points).toEqual([
      { name: 'A', kind: 'free', x: 0, y: 0 },
      { name: 'B', kind: 'free', x: 4, y: 0 },
      { name: 'C', kind: 'free', x: 0, y: 3 },
    ]);
    expect(r.matched).toContain('triangle-right');
  });

  test('"tam giác đều ABC" → equilateral template', () => {
    const r = parseSkeleton('tam giác đều ABC');
    expect(r.points[0]).toEqual({ name: 'A', kind: 'free', x: 0, y: 2.6 });
    expect(r.points[1]).toEqual({ name: 'B', kind: 'free', x: -1.5, y: 0 });
    expect(r.points[2]).toEqual({ name: 'C', kind: 'free', x: 1.5, y: 0 });
    expect(r.matched).toContain('triangle-equilateral');
  });

  test('"tam giác cân tại A" → isoceles template', () => {
    const r = parseSkeleton('tam giác ABC cân tại A');
    expect(r.points[0]).toEqual({ name: 'A', kind: 'free', x: 0, y: 3 });
    expect(r.points[1]).toEqual({ name: 'B', kind: 'free', x: -2, y: 0 });
    expect(r.points[2]).toEqual({ name: 'C', kind: 'free', x: 2, y: 0 });
    expect(r.matched).toContain('triangle-isoceles');
  });

  test('no triangle → empty result', () => {
    const r = parseSkeleton('Cho đường thẳng AB');
    expect(r.points).toEqual([]);
    expect(r.shapes).toEqual([]);
  });
});
