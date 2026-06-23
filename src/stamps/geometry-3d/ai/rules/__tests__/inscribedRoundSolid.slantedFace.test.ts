import { inscribedRoundSolidRule } from '../inscribedRoundSolid';
import { runRules3D } from '../registry';
import { segmentClauses3D } from '../../deterministic/coverage3d';

function ctxOf(problem: string) {
  return { problem, clauses: segmentClauses3D(problem).filter((c) => c.hasGeometry) };
}
const opKinds = (ms: any[]) =>
  ms[0].intents.map((i: any) => i.op + (i.constraint ? '/' + i.constraint.kind : ''));

describe('inscribedRoundSolid — trụ trên mặt nghiêng tứ diện (Câu 73/85)', () => {
  it('Câu 73: trụ đáy NỘI TIẾP tam giác BCD (tứ diện đều) → centroid + midpoint + pointAboveFace + cylinder, KHÔNG solid', () => {
    const p = 'Cho tứ diện đều ABCD có cạnh bằng 4. Diện tích xung quanh của hình trụ có một đường tròn đáy là đường tròn nội tiếp tam giác BCD và chiều cao bằng chiều cao của tứ diện ABCD.';
    const ms = inscribedRoundSolidRule.match(ctxOf(p) as any);
    expect(ms.length).toBe(1);
    const ops = opKinds(ms);
    expect(ops).toContain('cylinder');
    expect(ops).toContain('add-point-3d/centroid');      // tâm incircle mặt đều ≡ centroid
    expect(ops).toContain('add-point-3d/midpoint');       // radiusTo = trung điểm cạnh
    expect(ops).toContain('add-point-3d/pointAboveFace');  // topCenter ⊥ mặt
    expect(ms[0].intents.some((i: any) => i.op === 'solid')).toBe(false); // solidRule vẽ tứ diện
    const cyl = ms[0].intents.find((i: any) => i.op === 'cylinder');
    expect(cyl.radiusTo).toBeTruthy();
    expect(cyl.baseCenter).toBeTruthy();
    expect(cyl.topCenter).toBeTruthy();
  });

  it('Câu 85: trụ đáy NGOẠI TIẾP tam giác BCD → faceCircumcenter + pointAboveFace + cylinder', () => {
    const p = 'Cho tứ diện đều ABCD có cạnh bằng a. Diện tích xung quanh của hình trụ có đáy là đường tròn ngoại tiếp tam giác BCD và có chiều cao bằng chiều cao của tứ diện.';
    const ms = inscribedRoundSolidRule.match(ctxOf(p) as any);
    expect(ms.length).toBe(1);
    const ops = opKinds(ms);
    expect(ops).toContain('add-point-3d/faceCircumcenter');
    expect(ops).toContain('add-point-3d/pointAboveFace');
    const cyl = ms[0].intents.find((i: any) => i.op === 'cylinder');
    expect(cyl.radiusTo).toBeTruthy();
  });

  it('pointAboveFace ref đúng: base=tâm mặt, apex=đỉnh ĐỐI (A), vertices=mặt (BCD)', () => {
    const p = 'Cho tứ diện đều ABCD có cạnh bằng 4. Diện tích xung quanh của hình trụ có một đường tròn đáy là đường tròn nội tiếp tam giác BCD và chiều cao bằng chiều cao của tứ diện ABCD.';
    const ms = inscribedRoundSolidRule.match(ctxOf(p) as any);
    const paf = ms[0].intents.find((i: any) => i.constraint?.kind === 'pointAboveFace');
    expect(paf.constraint.apex).toBe('A');                       // đỉnh đối diện mặt BCD
    expect(paf.constraint.vertices).toEqual(['B', 'C', 'D']);
    const cyl = ms[0].intents.find((i: any) => i.op === 'cylinder');
    expect(cyl.topCenter).toBe(paf.name);                        // topCenter = pointAboveFace
    expect(paf.constraint.base).toBe(cyl.baseCenter);            // base = tâm mặt = baseCenter trụ
  });

  it('co-fire: đúng 1 tứ diện (solidRule + rule KHÔNG dup solid)', () => {
    const p = 'Cho tứ diện đều ABCD có cạnh bằng 4. Diện tích xung quanh của hình trụ có một đường tròn đáy là đường tròn nội tiếp tam giác BCD và chiều cao bằng chiều cao của tứ diện ABCD.';
    const all = runRules3D(ctxOf(p) as any);
    const solids = all.flatMap((m: any) => m.intents).filter((i: any) => i.op === 'solid');
    expect(solids.length).toBe(1);
  });
});
