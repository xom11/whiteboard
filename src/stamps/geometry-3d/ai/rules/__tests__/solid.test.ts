import { solidRule } from '../solid';
import { segmentClauses3D, computeCoverage3D } from '../../deterministic/coverage3d';

function run(problem: string) {
  const clauses = segmentClauses3D(problem);
  return solidRule.match({ problem, clauses });
}

describe('solidRule', () => {
  it('hình chóp S.ABCD đáy hình vuông → pyramid/square/apex S', () => {
    const ms = run('Cho hình chóp S.ABCD có đáy ABCD là hình vuông.');
    const i = ms[0].intents[0] as any;
    expect(i.op).toBe('solid');
    expect(i.flavor).toBe('pyramid');
    expect(i.apex).toBe('S');
    expect(i.baseLabels).toEqual(['A', 'B', 'C', 'D']);
    expect(i.baseVariant).toBe('square');
  });

  it('SA ⊥ đáy → apexVariant over-vertex A', () => {
    const ms = run('Cho hình chóp S.ABCD có đáy là hình chữ nhật, SA vuông góc với mặt phẳng đáy.');
    const i = ms[0].intents[0] as any;
    expect(i.apexVariant).toBe('over-vertex');
    expect(i.apexAnchor).toBe('A');
    expect(i.baseVariant).toBe('rectangle');
  });

  it('tứ diện đều ABCD → tetrahedron, equilateral-triangle base, apex D', () => {
    const i = run('Cho tứ diện đều ABCD có cạnh bằng a.')[0].intents[0] as any;
    expect(i.flavor).toBe('tetrahedron');
    expect(i.baseLabels).toEqual(['A', 'B', 'C']);
    expect(i.apex).toBe('D');
    expect(i.baseVariant).toBe('equilateral-triangle');
  });

  it("lăng trụ ABC.A'B'C' → prism with top labels", () => {
    const i = run("Cho hình lăng trụ ABC.A'B'C' có đáy ABC là tam giác cân.")[0].intents[0] as any;
    expect(i.flavor).toBe('prism');
    expect(i.baseLabels).toEqual(['A', 'B', 'C']);
    expect(i.topLabels).toEqual(["A'", "B'", "C'"]);
  });

  it('claims the clause for coverage', () => {
    const ms = run('Cho hình chóp S.ABC.');
    expect(ms[0].clauseIds.length).toBeGreaterThan(0);
  });

  it('solid claim makes coverage complete for a single-clause pyramid', () => {
    const problem = 'Cho hình chóp S.ABCD có đáy là hình vuông.';
    const clauses = segmentClauses3D(problem);
    const ms = solidRule.match({ problem, clauses });
    const cov = computeCoverage3D(clauses, ms.flatMap((m) => m.clauseIds));
    expect(cov.complete).toBe(true);
  });
});
