import { tryDeterministicFigure } from '../tryDeterministicFigure';

const PROBLEM =
  'Cho đường tròn (O) và ba dây cung AB, AC, AD bất kì. ' +
  'Các đường tròn đường kính AB, AC, AD đôi một cắt nhau lần thứ hai tại M, N, P.';

describe('diameter-circle-pairwise e2e (no AI)', () => {
  it('qua HẾT 4 lớp gate → figure render-ready', () => {
    const res = tryDeterministicFigure(PROBLEM);
    if (!res.ok) throw new Error(`escalate: ${res.reason} ${res.detail ?? ''}`);
    const { dsl } = res.figure;

    // O (free center) + A,B,C,D (onCircle) + M,N,P (circleSecondIntersection).
    const names = dsl.points.map((p) => p.name).sort();
    expect(names).toEqual(['A', 'B', 'C', 'D', 'M', 'N', 'O', 'P']);

    expect(dsl.points.find((p) => p.name === 'O')!.kind).toBe('free');
    for (const n of ['A', 'B', 'C', 'D']) {
      expect(dsl.points.find((p) => p.name === n)!.kind).toBe('onCircle');
    }
    for (const n of ['M', 'N', 'P']) {
      const p = dsl.points.find((x) => x.name === n)!;
      expect(p.kind).toBe('circleSecondIntersection');
      expect((p as any).exclude).toBe('A');
    }

    // (O) circleCR + 3 đường tròn đường kính + 3 dây cung.
    const oCirc = dsl.shapes.find((s) => s.kind === 'circleCR');
    expect(oCirc).toBeDefined();
    const dia = dsl.shapes.filter((s) => s.kind === 'circleDiameter');
    expect(dia.map((d) => d.name).sort()).toEqual(['kAB', 'kAC', 'kAD']);
    const segs = dsl.shapes.filter((s) => s.kind === 'segment');
    expect(segs).toHaveLength(3);
  });
});
