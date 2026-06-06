import { circleTriangleRule } from '../circleTriangle';
import { segmentClauses } from '../../deterministic/coverage';

function run(problem: string) {
  return circleTriangleRule.match({ problem, clauses: segmentClauses(problem) });
}

describe('circleTriangleRule', () => {
  it('"đường tròn ngoại tiếp tam giác ABC" → through3 [A,B,C]', () => {
    const m = run('Vẽ đường tròn ngoại tiếp tam giác ABC');
    expect(m.length).toBe(1);
    const intent = m[0].intents[0] as any;
    expect(intent.op).toBe('draw-circle');
    expect(intent.spec).toBe('through3');
    expect(intent.points).toEqual(['A', 'B', 'C']);
    expect(intent.name).toBe('O');
  });

  it('"đường tròn (O) ngoại tiếp tam giác ABC" → name O từ (O)', () => {
    const m = run('Cho đường tròn (O) ngoại tiếp tam giác ABC');
    expect(m.length).toBe(1);
    const intent = m[0].intents[0] as any;
    expect(intent.spec).toBe('through3');
    expect(intent.name).toBe('O');
    expect(intent.points).toEqual(['A', 'B', 'C']);
  });

  it('tên tâm khác qua "(K)" → name K', () => {
    const m = run('Vẽ đường tròn (K) ngoại tiếp tam giác MNP');
    const intent = m[0].intents[0] as any;
    expect(intent.name).toBe('K');
    expect(intent.points).toEqual(['M', 'N', 'P']);
  });

  it('"đường tròn nội tiếp tam giác ABC" → inscribedIn {triangle}', () => {
    const m = run('Dựng đường tròn nội tiếp tam giác ABC');
    expect(m.length).toBe(1);
    const intent = m[0].intents[0] as any;
    expect(intent.op).toBe('draw-circle');
    expect(intent.spec).toBe('inscribedIn');
    expect(intent.triangle).toEqual(['A', 'B', 'C']);
    expect(intent.name).toBe('O');
  });

  it('"đường tròn (I) nội tiếp tam giác DEF" → inscribedIn name I', () => {
    const m = run('Vẽ đường tròn (I) nội tiếp tam giác DEF');
    const intent = m[0].intents[0] as any;
    expect(intent.spec).toBe('inscribedIn');
    expect(intent.name).toBe('I');
    expect(intent.triangle).toEqual(['D', 'E', 'F']);
  });

  it('"tam giác ABC nội tiếp đường tròn (O)" → circumcircle through3', () => {
    const m = run('Cho tam giác ABC nội tiếp đường tròn (O)');
    expect(m.length).toBe(1);
    const intent = m[0].intents[0] as any;
    expect(intent.spec).toBe('through3');
    expect(intent.points).toEqual(['A', 'B', 'C']);
  });

  it('fallback tam giác từ problem khi clause không có 3 đỉnh', () => {
    const m = run('Cho tam giác ABC. Vẽ đường tròn ngoại tiếp');
    // clause "Vẽ đường tròn ngoại tiếp" không có đỉnh → fallback toàn đề
    const circ = m.find((r) => (r.intents[0] as any).spec === 'through3');
    expect(circ).toBeDefined();
    expect((circ!.intents[0] as any).points).toEqual(['A', 'B', 'C']);
  });

  it('"nội tiếp" trần (không phân loại được) → bỏ qua escalate', () => {
    // không có "đường tròn nội tiếp tam giác" cũng không "tam giác ... nội tiếp
    // đường tròn" → mơ hồ → không emit
    const m = run('Tứ giác ABCD nội tiếp');
    expect(m.length).toBe(0);
  });

  it('không có tam giác → bỏ qua', () => {
    const m = run('Vẽ đường tròn ngoại tiếp');
    expect(m.length).toBe(0);
  });
});
