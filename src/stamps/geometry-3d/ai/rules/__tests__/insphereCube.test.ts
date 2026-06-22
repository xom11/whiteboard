import { insphereCubeRule } from '../insphereCube';
import { runRules3D } from '../registry';
import { segmentClauses3D } from '../../deterministic/coverage3d';
import { intentToScene3d } from '../../intentToScene3d';
import { verifyFigure3d } from '../../verify3d';

function clause(text: string, id = 0) { return { id, text, hasGeometry: true }; }
function ctxOf(problem: string) {
  return { problem, clauses: segmentClauses3D(problem).filter((c) => c.hasGeometry) };
}

describe('insphereCube rule', () => {
  it('lập phương vô nhãn → khung dây cube (8 đỉnh + 12 cạnh) + 2 centroid + sphere (KHÔNG solid box)', () => {
    const ctx = { problem: 'Mặt cầu nội tiếp hình lập phương cạnh a.', clauses: [clause('Mặt cầu nội tiếp hình lập phương cạnh a', 0)] };
    const m = insphereCubeRule.match(ctx as any);
    expect(m.length).toBe(1);
    const ops = m[0].intents.map((i: any) => i.op);
    // Layout box KHÔNG-cube ⟹ tự dựng cube free-coord (khung dây), KHÔNG dùng solid box.
    expect(ops).not.toContain('solid');
    expect(ops.filter((o: string) => o === 'connect').length).toBe(12); // 12 cạnh cube
    expect(ops).toContain('sphere');
    expect(ops.filter((o: string) => o === 'add-point-3d').length).toBe(10); // 8 đỉnh + tâm + tâm-mặt
    const cen = m[0].intents.find((i: any) => i.constraint?.kind === 'centroid' && i.constraint.vertices.length === 8) as any;
    expect(cen).toBeDefined();
  });

  it('lập phương CÓ nhãn → reference 8 đỉnh, KHÔNG emit box (solidRule lo)', () => {
    const ctx = { problem: 'Cho hình lập phương ABCD.A′B′C′D′. Mặt cầu nội tiếp hình lập phương đó.', clauses: [clause('Mặt cầu nội tiếp hình lập phương', 0)] };
    const m = insphereCubeRule.match(ctx as any);
    expect(m[0].intents.map((i: any) => i.op)).not.toContain('solid');
    const cen = m[0].intents.find((i: any) => i.constraint?.kind === 'centroid' && i.constraint.vertices.length === 8) as any;
    expect(cen.constraint.vertices).toEqual(['A', 'B', 'C', 'D', 'A′', 'B′', 'C′', 'D′']);
  });

  it('co-firing: lập phương vô nhãn → 0 solid (khung dây), 1 sphere, cone/cylinder skip', () => {
    const p = 'Mặt cầu nội tiếp hình lập phương cạnh a.';
    const ops = runRules3D(ctxOf(p)).flatMap((mm) => mm.intents).map((i: any) => i.op);
    expect(ops.filter((o: string) => o === 'solid').length).toBe(0); // solidRule không fire (vô nhãn); insphere dựng khung dây
    expect(ops.filter((o: string) => o === 'sphere').length).toBe(1);
    expect(ops.filter((o: string) => o === 'connect').length).toBe(12);
  });

  it('co-firing: lập phương CÓ nhãn → đúng 1 box (solidRule, KHÔNG dup từ insphere)', () => {
    const p = 'Cho hình lập phương ABCD.A′B′C′D′. Mặt cầu nội tiếp hình lập phương.';
    const ops = runRules3D(ctxOf(p)).flatMap((mm) => mm.intents).map((i: any) => i.op);
    expect(ops.filter((o: string) => o === 'solid').length).toBe(1);
  });

  it('e2e numeric: sphere R>0, verify ok', () => {
    const m = insphereCubeRule.match({ problem: 'Mặt cầu nội tiếp hình lập phương cạnh a.', clauses: [clause('Mặt cầu nội tiếp hình lập phương cạnh a', 0)] } as any);
    const st = intentToScene3d(m[0].intents);
    expect(Object.values(st.objects).some((o) => o.kind === 'sphere3d')).toBe(true);
    expect(verifyFigure3d(st).ok).toBe(true);
  });
});
