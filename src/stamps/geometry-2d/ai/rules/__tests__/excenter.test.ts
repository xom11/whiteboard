import { excenterRule } from '../excenter';
import { segmentClauses } from '../../deterministic/coverage';

function run(problem: string) {
  return excenterRule.match({ problem, clauses: segmentClauses(problem) });
}

describe('excenterRule', () => {
  it('"J là tâm bàng tiếp góc A" → excenter J, of=[A,B,C], opposite=A', () => {
    const m = run('Cho tam giác ABC, J là tâm bàng tiếp góc A.');
    expect(m.length).toBe(1);
    const intent = m[0].intents[0] as any;
    expect(intent.op).toBe('add-point');
    expect(intent.name).toBe('J');
    expect(intent.constraint.kind).toBe('excenter');
    expect(intent.constraint.of).toEqual(['A', 'B', 'C']);
    expect(intent.constraint.opposite).toBe('A');
  });

  it('"Gọi J là tâm đường tròn bàng tiếp góc A" (có "đường tròn" chêm) → excenter', () => {
    const m = run('Cho tam giác ABC. Gọi J là tâm đường tròn bàng tiếp góc A.');
    expect(m.length).toBe(1);
    const c = (m[0].intents[0] as any).constraint;
    expect((m[0].intents[0] as any).name).toBe('J');
    expect(c.kind).toBe('excenter');
    expect(c.opposite).toBe('A');
  });

  it('"tâm bàng tiếp trong góc B" → opposite=B', () => {
    const m = run('Cho tam giác ABC. Gọi K là tâm bàng tiếp trong góc B.');
    expect((m[0].intents[0] as any).constraint.opposite).toBe('B');
  });

  it('"bàng tiếp ứng với đỉnh C" → opposite=C', () => {
    const m = run('Cho tam giác ABC. Gọi L là tâm bàng tiếp ứng với đỉnh C.');
    expect((m[0].intents[0] as any).constraint.opposite).toBe('C');
  });

  it('"bàng tiếp đỉnh A" (không có "góc") → opposite=A', () => {
    const m = run('Cho tam giác ABC. Gọi J là tâm bàng tiếp đỉnh A.');
    expect((m[0].intents[0] as any).constraint.opposite).toBe('A');
  });

  it('đỉnh đối không thuộc tam giác → escalate (không match)', () => {
    const m = run('Cho tam giác ABC. Gọi J là tâm bàng tiếp góc D.');
    expect(m.length).toBe(0);
  });

  it('không có tam giác → escalate (không match)', () => {
    const m = run('Gọi J là tâm bàng tiếp góc A.');
    expect(m.length).toBe(0);
  });

  it('không trích được tên (không "X (là) tâm … bàng tiếp") → bỏ qua', () => {
    const m = run('Cho tam giác ABC. Vẽ đường tròn bàng tiếp góc A.');
    expect(m.length).toBe(0);
  });

  it('không nêu đỉnh đối ("góc/đỉnh X") → bỏ qua (đừng đoán)', () => {
    const m = run('Cho tam giác ABC. Gọi J là tâm bàng tiếp.');
    expect(m.length).toBe(0);
  });
});
