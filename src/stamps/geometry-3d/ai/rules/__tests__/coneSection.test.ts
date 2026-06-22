import { coneRule } from '../cone';
import { runRules3D } from '../registry';
import { segmentClauses3D } from '../../deterministic/coverage3d';

function clause(text: string, id = 0) { return { id, text, hasGeometry: true }; }
function ctxOf(problem: string) {
  return { problem, clauses: segmentClauses3D(problem).filter((c) => c.hasGeometry) };
}

describe('cone rule — thiết diện qua trục', () => {
  it('nón đỉnh S + thiết diện qua trục → cone + 2 điểm đáy + polygon', () => {
    const ctx = { problem: 'Cho hình nón đỉnh S. Thiết diện qua trục là tam giác đều.', clauses: [clause('Cho hình nón đỉnh S', 0), clause('Thiết diện qua trục là tam giác đều', 1)] };
    const m = coneRule.match(ctx as any);
    expect(m.length).toBe(1);
    const ops = m[0].intents.map((i: any) => i.op);
    expect(ops).toContain('cone');
    expect(ops).toContain('polygon');
    expect(ops.filter((o: string) => o === 'add-point-3d').length).toBe(4); // base+apex + 2 điểm mặt cắt
    const poly = m[0].intents.find((i: any) => i.op === 'polygon') as any;
    expect(poly.vertices).toHaveLength(3);
    expect(poly.vertices[1]).toBe('S'); // đỉnh ở giữa tam giác qua trục
    // claim cả clause thiết diện (PARTIAL→FULL)
    expect(m[0].clauseIds).toEqual(expect.arrayContaining([0, 1]));
  });

  it('"mặt phẳng đi qua đỉnh" cũng kích hoạt mặt cắt (Câu 69)', () => {
    const ctx = { problem: 'Cho hình nón. Một mặt phẳng đi qua đỉnh hình nón cắt theo thiết diện tam giác đều.', clauses: [clause('Cho hình nón', 0), clause('Một mặt phẳng đi qua đỉnh hình nón cắt theo thiết diện tam giác đều', 1)] };
    const m = coneRule.match(ctx as any);
    expect(m[0].intents.map((i: any) => i.op)).toContain('polygon');
  });

  it('nón standalone KHÔNG thiết diện → Phase 4 behavior (no polygon)', () => {
    const ctx = { problem: 'Cho hình nón có chiều cao bằng 2.', clauses: [clause('Cho hình nón có chiều cao bằng 2', 0)] };
    const m = coneRule.match(ctx as any);
    expect(m[0].intents.map((i: any) => i.op)).not.toContain('polygon');
    expect(m[0].intents.filter((i: any) => i.op === 'add-point-3d').length).toBe(2);
  });

  it('co-firing: thiết diện qua trục KHÔNG kích hoạt crossSection (no paren token)', () => {
    const p = 'Cho hình nón đỉnh S. Thiết diện qua trục là tam giác vuông cân.';
    const all = runRules3D(ctxOf(p));
    const ops = all.flatMap((mm) => mm.intents).map((i: any) => i.op);
    expect(ops.filter((o: string) => o === 'cross-section').length).toBe(0);
    expect(ops.filter((o: string) => o === 'cone').length).toBe(1);
  });
});
