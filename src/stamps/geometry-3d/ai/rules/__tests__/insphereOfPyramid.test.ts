import { insphereOfPyramidRule } from '../insphereOfPyramid';
import { runRules3D } from '../registry';
import { segmentClauses3D } from '../../deterministic/coverage3d';

function ctxOf(problem: string) { return { problem, clauses: segmentClauses3D(problem).filter((c) => c.hasGeometry) }; }

describe('insphereOfPyramid rule', () => {
  it('chóp tứ giác đều (solidRule miss) → tự emit solid + insphere center + sphere', () => {
    const p = 'Bán kính mặt cầu nội tiếp hình chóp tứ giác đều S.ABCD có cạnh đáy bằng a là bao nhiêu.';
    const m = insphereOfPyramidRule.match(ctxOf(p) as any);
    expect(m.length).toBe(1);
    const ops = m[0].intents.map((i: any) => i.op + (i.constraint ? '/' + i.constraint.kind : ''));
    expect(ops).toContain('solid');                          // tự vẽ chóp (solidRule miss qualifier)
    expect(ops).toContain('add-point-3d/pyramidInsphereCenter');
    expect(ops).toContain('add-point-3d/centroid');          // surfacePoint = tâm đáy
    expect(ops).toContain('sphere');
    const cs = m[0].intents.find((i: any) => i.constraint?.kind === 'pyramidInsphereCenter') as any;
    expect(cs.constraint.apex).toBe('S');
    expect(cs.constraint.vertices).toEqual(['A', 'B', 'C', 'D']);
  });

  it('chóp bare có nhãn (solidRule vẽ) → KHÔNG emit solid (tránh dup)', () => {
    const p = 'Cho hình chóp S.ABCD. Mặt cầu nội tiếp hình chóp S.ABCD.';
    const m = insphereOfPyramidRule.match(ctxOf(p) as any);
    expect(m.length).toBe(1);
    expect(m[0].intents.map((i: any) => i.op)).not.toContain('solid');
  });

  it('lập phương → KHÔNG fire (insphereCube lo)', () => {
    const p = 'Mặt cầu nội tiếp hình lập phương cạnh a.';
    expect(insphereOfPyramidRule.match(ctxOf(p) as any).length).toBe(0);
  });

  it('"chóp NỘI TIẾP mặt cầu" (chóp-trong-cầu) → KHÔNG fire (cầu ngoại tiếp → circumsphere lo)', () => {
    const p = 'Cho hình chóp tứ giác đều S.ABCD nội tiếp mặt cầu bán kính R.';
    expect(insphereOfPyramidRule.match(ctxOf(p) as any).length).toBe(0);
  });

  it('mixed: chóp nội tiếp cầu (O) + mặt cầu ngoại tiếp chóp → CHỈ circumsphere (1 sphere, không dup tên O)', () => {
    const p = 'Cho hình chóp tứ giác đều S.ABCD nội tiếp mặt cầu (O). Mặt cầu ngoại tiếp hình chóp S.ABCD.';
    expect(insphereOfPyramidRule.match(ctxOf(p) as any).length).toBe(0); // insphere KHÔNG fire
    const all = runRules3D(ctxOf(p));
    expect(all.flatMap((m) => m.intents).filter((i: any) => i.op === 'sphere').length).toBe(1); // chỉ circumsphere
  });

  // GOTCHA honest-metric: clause "Tính bán kính mặt cầu nội tiếp…" bị coverage3d đánh
  // hasGeometry=false (PROOF_ONLY question) → rule không thấy clause. Render chỉ khi cầu
  // ở clause STATEMENT (vd "Mặt cầu nội tiếp …" / "Bán kính … là:"). Dataset: 21 statement
  // (fire diag); 35/53 "Tính…" (chỉ render qua text statement / e2e).
  it('co-fire: chóp tứ giác đều (cầu statement) → đúng 1 solid + 1 sphere', () => {
    const p = 'Cho hình chóp tứ giác đều S.ABCD có cạnh đáy bằng a. Mặt cầu nội tiếp hình chóp S.ABCD.';
    const all = runRules3D(ctxOf(p));
    const ops = all.flatMap((mm) => mm.intents).map((i: any) => i.op);
    expect(ops.filter((o: string) => o === 'solid').length).toBe(1);
    expect(ops.filter((o: string) => o === 'sphere').length).toBe(1);
  });
});
