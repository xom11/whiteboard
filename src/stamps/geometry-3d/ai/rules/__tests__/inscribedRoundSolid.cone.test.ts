import { inscribedRoundSolidRule } from '../inscribedRoundSolid';
import { segmentClauses3D } from '../../deterministic/coverage3d';

function ctxOf(problem: string) { return { problem, clauses: segmentClauses3D(problem).filter((c) => c.hasGeometry) }; }
const find = (ms: any[], pred: (i: any) => boolean) => ms.flatMap((m) => m.intents).find(pred);

describe('inscribedRoundSolid — nón', () => {
  it('Câu 70: nón đỉnh S đáy nội tiếp tứ giác ABCD (chóp tứ giác đều) → cone radiusTo midpoint + centroid baseCenter + solid', () => {
    const p = 'Cho hình chóp tứ giác đều S.ABCD có cạnh đáy bằng a. Thể tích của khối nón có đỉnh S và đường tròn đáy nội tiếp tứ giác ABCD.';
    const ms = inscribedRoundSolidRule.match(ctxOf(p) as any);
    expect(ms.length).toBe(1);
    const ops = ms[0].intents.map((i: any) => i.op + (i.constraint ? '/' + i.constraint.kind : ''));
    expect(ops).toContain('solid');                       // chóp tứ giác đều → solidRule miss → tự vẽ
    expect(ops).toContain('cone');
    expect(ops).toContain('add-point-3d/centroid');       // tâm incircle = centroid (vuông)
    expect(ops).toContain('add-point-3d/midpoint');       // radiusTo = trung điểm cạnh
    const cone = find([ms[0]], (i) => i.op === 'cone');
    expect(cone.apex).toBe('S');
    expect(cone.radiusTo).toBeDefined();
  });

  it('Câu 88c: nón đỉnh O đáy ngoại tiếp tam giác ABC (tứ diện OABC) → DEFER (nón xiên, cone3d chỉ right-cone)', () => {
    const p = 'Cho tứ diện OABC có OA, OB, OC đôi một vuông góc. Diện tích xung quanh hình nón đỉnh O và đáy là đường tròn ngoại tiếp tam giác ABC.';
    expect(inscribedRoundSolidRule.match(ctxOf(p) as any).length).toBe(0);
  });

  it('nón đáy NGOẠI tiếp đáy vuông (chóp, right-cone ngang) → faceCircumcenter + radiusTo=đỉnh', () => {
    const p = 'Cho hình chóp S.ABCD có đáy là hình vuông. Khối nón có đỉnh S và đường tròn đáy ngoại tiếp tứ giác ABCD.';
    const ms = inscribedRoundSolidRule.match(ctxOf(p) as any);
    expect(ms.length).toBe(1);
    const ops = ms[0].intents.map((i: any) => i.op + (i.constraint ? '/' + i.constraint.kind : ''));
    expect(ops).toContain('add-point-3d/faceCircumcenter');
    const cone = find([ms[0]], (i) => i.op === 'cone');
    expect(cone.radiusTo).toBe('A'); // circum: radiusTo = đỉnh nằm trên đường tròn ngoại tiếp
  });

  it('incircle host KHÔNG đều → escalate (return [])', () => {
    const p = 'Cho hình chóp S.ABCD có đáy là hình bình hành. Khối nón đỉnh S đáy nội tiếp tứ giác ABCD.';
    expect(inscribedRoundSolidRule.match(ctxOf(p) as any).length).toBe(0);
  });
});
