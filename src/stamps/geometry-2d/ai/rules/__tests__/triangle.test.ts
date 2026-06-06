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

  it('"cân tại B" → isoceles-CA (cyclic, không phải AC)', () => {
    const m = run('Cho tam giác ABC cân tại B');
    expect((m[0].intents[0] as any).variant).toBe('isoceles-CA');
  });

  it('"cân tại C" → isoceles-AB', () => {
    const m = run('Cho tam giác ABC cân tại C');
    expect((m[0].intents[0] as any).variant).toBe('isoceles-AB');
  });

  it('"đều" → equilateral', () => {
    const m = run('Cho tam giác ABC đều');
    expect((m[0].intents[0] as any).variant).toBe('equilateral');
  });

  it('"tam giác đều ABC" (leadMod) → equilateral', () => {
    const m = run('Cho tam giác đều ABC');
    const i = m.flatMap((x) => x.intents) as any[];
    expect(i).toHaveLength(1);
    expect(i[0].labels).toEqual(['A', 'B', 'C']);
    expect(i[0].variant).toBe('equilateral');
  });

  // --- MULTI-MATCH + WINDOW (bug adversarial) -------------------------------

  it('"tam giác ABC và tam giác ABD vuông tại A" → CẢ HAI: ABC any + ABD right-at-A', () => {
    const m = run('Cho tam giác ABC và tam giác ABD vuông tại A');
    const i = m.flatMap((x) => x.intents) as any[];
    expect(i).toHaveLength(2);
    expect(i[0].labels).toEqual(['A', 'B', 'C']);
    expect(i[0].variant).toBe('any'); // KHÔNG vơ "vuông tại A" của ABD
    expect(i[1].labels).toEqual(['A', 'B', 'D']);
    expect(i[1].variant).toBe('right-at-A');
  });

  it('"tam giác ABC và tam giác ACD cân tại A" → ABC any + ACD isoceles-BC (apex idx 0, POSITIONAL)', () => {
    const m = run('Cho tam giác ABC và tam giác ACD cân tại A');
    const i = m.flatMap((x) => x.intents) as any[];
    expect(i).toHaveLength(2);
    expect(i[0].labels).toEqual(['A', 'B', 'C']);
    expect(i[0].variant).toBe('any');
    expect(i[1].labels).toEqual(['A', 'C', 'D']);
    // apex A = vertex[0] của [A,C,D] → variant POSITIONAL isoceles-BC (builder
    // dựng vertex[0] làm đỉnh cân), KHÔNG phải nhãn 'isoceles-CD' (vô nghĩa enum).
    expect(i[1].variant).toBe('isoceles-BC');
  });

  it('"tam giác đều DEF nội tiếp tam giác ABC" → DEF equilateral + ABC any (KHÔNG drop DEF, KHÔNG gán đều cho ABC)', () => {
    const m = run('Cho tam giác đều DEF nội tiếp tam giác ABC');
    const i = m.flatMap((x) => x.intents) as any[];
    expect(i).toHaveLength(2);
    expect(i[0].labels).toEqual(['D', 'E', 'F']);
    expect(i[0].variant).toBe('equilateral');
    expect(i[1].labels).toEqual(['A', 'B', 'C']);
    expect(i[1].variant).toBe('any');
  });

  it('"tam giác ABC nội tiếp tam giác đều MNP" → ABC any + MNP equilateral', () => {
    const m = run('Cho tam giác ABC nội tiếp tam giác đều MNP');
    const i = m.flatMap((x) => x.intents) as any[];
    expect(i).toHaveLength(2);
    expect(i[0].labels).toEqual(['A', 'B', 'C']);
    expect(i[0].variant).toBe('any'); // KHÔNG vơ "đều" của MNP
    expect(i[1].labels).toEqual(['M', 'N', 'P']);
    expect(i[1].variant).toBe('equilateral');
  });

  it('cân tại đỉnh KHÔNG thuộc tam giác → bỏ qua bind (any)', () => {
    // "vuông tại D" nhưng tam giác là ABC (D không thuộc) → any, không right-at-D bậy.
    const m = run('Cho tam giác ABC vuông tại D');
    const i = m.flatMap((x) => x.intents) as any[];
    expect(i).toHaveLength(1);
    expect(i[0].variant).toBe('any');
  });
});
