import { inscribedRoundSolidRule } from '../inscribedRoundSolid';
import { segmentClauses3D } from '../../deterministic/coverage3d';

function ctxOf(problem: string) { return { problem, clauses: segmentClauses3D(problem).filter((c) => c.hasGeometry) }; }
const find = (ms: any[], pred: (i: any) => boolean) => ms.flatMap((m) => m.intents).find(pred);

describe('inscribedRoundSolid — trụ', () => {
  it('Câu 73: trụ đáy nội tiếp tam giác BCD (tứ diện đều ABCD) → topCenter = đỉnh đối diện A + centroid + midpoint', () => {
    const p = 'Cho tứ diện đều ABCD có cạnh bằng 4. Diện tích xung quanh của hình trụ có một đường tròn đáy là đường tròn nội tiếp tam giác BCD và chiều cao bằng chiều cao của tứ diện.';
    const ms = inscribedRoundSolidRule.match(ctxOf(p) as any);
    expect(ms.length).toBe(1);
    const cyl = find([ms[0]], (i) => i.op === 'cylinder');
    expect(cyl).toBeDefined();
    expect(cyl.topCenter).toBe('A'); // đỉnh đối diện mặt BCD
    const kinds = ms[0].intents.map((i: any) => i.constraint?.kind).filter(Boolean);
    expect(kinds).toContain('centroid');  // incircle equilateral = centroid
    expect(kinds).toContain('midpoint');  // radiusTo
  });

  it('Câu 85: trụ đáy ngoại tiếp tam giác BCD → faceCircumcenter + radiusTo = đỉnh', () => {
    const p = 'Cho tứ diện đều ABCD có cạnh bằng a. Diện tích xung quanh của hình trụ có đáy là đường tròn ngoại tiếp tam giác BCD và chiều cao bằng chiều cao của tứ diện.';
    const ms = inscribedRoundSolidRule.match(ctxOf(p) as any);
    expect(ms.length).toBe(1);
    const cyl = find([ms[0]], (i) => i.op === 'cylinder');
    expect(cyl.topCenter).toBe('A');
    expect(cyl.radiusTo).toBe('B'); // circum: radiusTo = đỉnh đầu mặt BCD
    expect(ms[0].intents.map((i: any) => i.constraint?.kind)).toContain('faceCircumcenter');
  });

  it('Câu 75: trụ hai đáy nội tiếp lăng trụ đều ABC.A′B′C′ → 2 centroid (base+top)', () => {
    const p = 'Cho hình lăng trụ đều ABC.A′B′C′ có cạnh đáy bằng a. Thể tích của hình trụ có hai đáy nội tiếp hình lăng trụ.';
    const ms = inscribedRoundSolidRule.match(ctxOf(p) as any);
    expect(ms.length).toBe(1);
    const cyl = find([ms[0]], (i) => i.op === 'cylinder');
    expect(cyl).toBeDefined();
    const centroids = ms[0].intents.filter((i: any) => i.constraint?.kind === 'centroid');
    expect(centroids.length).toBe(2); // tâm 2 đáy
  });
});
