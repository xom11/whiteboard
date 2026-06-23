import { inscribedRoundSolidRule } from '../inscribedRoundSolid';
import { segmentClauses3D } from '../../deterministic/coverage3d';

function ctxOf(problem: string) { return { problem, clauses: segmentClauses3D(problem).filter((c) => c.hasGeometry) }; }
const find = (ms: any[], pred: (i: any) => boolean) => ms.flatMap((m) => m.intents).find(pred);

describe('inscribedRoundSolid — trụ', () => {
  it('Câu 73/85: trụ trên mặt NGHIÊNG tứ diện → DEFER (layout tetra không-đều → trục không ⊥ mặt, render lệch — MCP bắt)', () => {
    const p73 = 'Cho tứ diện đều ABCD. Hình trụ có một đường tròn đáy là đường tròn nội tiếp tam giác BCD và chiều cao bằng chiều cao của tứ diện.';
    const p85 = 'Cho tứ diện đều ABCD. Diện tích xung quanh của hình trụ có đáy là đường tròn ngoại tiếp tam giác BCD và chiều cao bằng chiều cao của tứ diện.';
    expect(inscribedRoundSolidRule.match(ctxOf(p73) as any).length).toBe(0);
    expect(inscribedRoundSolidRule.match(ctxOf(p85) as any).length).toBe(0);
  });

  it('Câu 75: trụ hai đáy nội tiếp lăng trụ đều ABC.A′B′C′ (trục ĐỨNG) → 2 centroid (base+top)', () => {
    const p = 'Cho hình lăng trụ đều ABC.A′B′C′ có cạnh đáy bằng a. Thể tích của hình trụ có hai đáy nội tiếp hình lăng trụ.';
    const ms = inscribedRoundSolidRule.match(ctxOf(p) as any);
    expect(ms.length).toBe(1);
    const cyl = find([ms[0]], (i) => i.op === 'cylinder');
    expect(cyl).toBeDefined();
    expect(cyl.radiusTo).toBeDefined();
    const centroids = ms[0].intents.filter((i: any) => i.constraint?.kind === 'centroid');
    expect(centroids.length).toBe(2); // tâm 2 đáy
  });
});
