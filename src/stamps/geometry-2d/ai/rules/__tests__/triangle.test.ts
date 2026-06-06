import { triangleRule } from '../triangle';
import { segmentClauses } from '../../deterministic/coverage';

function run(problem: string) {
  return triangleRule.match({ problem, clauses: segmentClauses(problem) });
}

describe('triangleRule', () => {
  it('"tam giác ABC" → draw-shape triangle any', () => {
    const m = run('Cho tam giác ABC');
    expect(m.length).toBe(1);
    const intent = m[0].intents[0] as any;
    expect(intent.op).toBe('draw-shape');
    expect(intent.shape).toBe('triangle');
    expect(intent.labels).toEqual(['A', 'B', 'C']);
    expect(intent.variant).toBe('any');
    expect(m[0].clauseIds).toContain(0);
  });

  it('"vuông tại A" → right-at-A', () => {
    const m = run('Cho tam giác ABC vuông tại A');
    expect((m[0].intents[0] as any).variant).toBe('right-at-A');
  });

  it('"cân tại A" → isoceles-BC (đáy 2 đỉnh còn lại)', () => {
    const m = run('Cho tam giác ABC cân tại A');
    expect((m[0].intents[0] as any).variant).toBe('isoceles-BC');
  });

  it('"đều" → equilateral', () => {
    const m = run('Cho tam giác ABC đều');
    expect((m[0].intents[0] as any).variant).toBe('equilateral');
  });
});
