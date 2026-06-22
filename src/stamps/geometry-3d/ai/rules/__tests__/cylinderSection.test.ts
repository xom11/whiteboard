import { cylinderRule } from '../cylinder';
import { runRules3D } from '../registry';
import { segmentClauses3D } from '../../deterministic/coverage3d';

function clause(text: string, id = 0) { return { id, text, hasGeometry: true }; }
function ctxOf(problem: string) {
  return { problem, clauses: segmentClauses3D(problem).filter((c) => c.hasGeometry) };
}

describe('cylinder rule — thiết diện qua trục', () => {
  it('trụ + thiết diện qua trục hình vuông → cylinder + 4 điểm + polygon(4 đỉnh)', () => {
    const ctx = { problem: 'Cho hình trụ có thiết diện qua trục là một hình vuông.', clauses: [clause('Cho hình trụ có thiết diện qua trục là một hình vuông', 0)] };
    const m = cylinderRule.match(ctx as any);
    expect(m.length).toBe(1);
    const ops = m[0].intents.map((i: any) => i.op);
    expect(ops).toContain('cylinder');
    expect(ops).toContain('polygon');
    expect(ops.filter((o: string) => o === 'add-point-3d').length).toBe(6); // 2 tâm + 4 đầu mút
    const poly = m[0].intents.find((i: any) => i.op === 'polygon') as any;
    expect(poly.vertices).toHaveLength(4);
  });

  it('trụ standalone KHÔNG thiết diện → Phase 4 behavior', () => {
    const ctx = { problem: 'Cho hình trụ có chiều cao h.', clauses: [clause('Cho hình trụ có chiều cao h', 0)] };
    expect(cylinderRule.match(ctx as any)[0].intents.map((i: any) => i.op)).not.toContain('polygon');
  });

  it('co-firing: 1 cylinder, 0 cross-section', () => {
    const p = 'Cho hình trụ có thiết diện qua trục là hình vuông cạnh 2.';
    const ops = runRules3D(ctxOf(p)).flatMap((mm) => mm.intents).map((i: any) => i.op);
    expect(ops.filter((o: string) => o === 'cylinder').length).toBe(1);
    expect(ops.filter((o: string) => o === 'cross-section').length).toBe(0);
  });
});
