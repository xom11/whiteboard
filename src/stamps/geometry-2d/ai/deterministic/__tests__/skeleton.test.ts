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

describe('parseSkeleton — circle', () => {
  test('"(O; R=3)" → free O + circleCR radius 3', () => {
    const r = parseSkeleton('Cho đường tròn (O; R=3)');
    expect(r.points).toContainEqual({ name: 'O', kind: 'free', x: 0, y: 0 });
    expect(r.shapes).toContainEqual({ name: 'omega', kind: 'circleCR', center: 'O', radius: 3 });
    expect(r.matched).toContain('circle-cr');
  });

  test('"(O) bán kính 5" → radius 5', () => {
    const r = parseSkeleton('đường tròn (O) bán kính 5');
    expect(r.shapes[0]).toEqual({ name: 'omega', kind: 'circleCR', center: 'O', radius: 5 });
  });

  test('"đường tròn tâm I bán kính 2.5"', () => {
    const r = parseSkeleton('đường tròn tâm I bán kính 2.5');
    expect(r.points).toContainEqual({ name: 'I', kind: 'free', x: 0, y: 0 });
    expect(r.shapes[0]).toEqual({ name: 'omega', kind: 'circleCR', center: 'I', radius: 2.5 });
  });

  test('triangle + circle co-exist', () => {
    const r = parseSkeleton('Cho tam giác ABC và đường tròn (O; R=2)');
    expect(r.points.map((p) => p.name).sort()).toEqual(['A', 'B', 'C', 'O']);
    expect(r.shapes.some((s) => s.kind === 'circleCR')).toBe(true);
  });
});
