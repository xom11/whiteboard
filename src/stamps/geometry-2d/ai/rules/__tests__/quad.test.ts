import { quadRule } from '../quad';
import { segmentClauses } from '../../deterministic/coverage';

function run(problem: string) {
  return quadRule.match({ problem, clauses: segmentClauses(problem) });
}

describe('quadRule', () => {
  it('"hình vuông ABCD" → draw-shape square standard', () => {
    const m = run('Cho hình vuông ABCD');
    expect(m.length).toBe(1);
    const intent = m[0].intents[0] as any;
    expect(intent.op).toBe('draw-shape');
    expect(intent.shape).toBe('square');
    expect(intent.labels).toEqual(['A', 'B', 'C', 'D']);
    expect(intent.variant).toBe('standard');
    expect(m[0].clauseIds).toContain(0);
  });

  it('"hình chữ nhật ABCD" → rectangle wide', () => {
    const m = run('Cho hình chữ nhật ABCD');
    const intent = m[0].intents[0] as any;
    expect(intent.shape).toBe('rectangle');
    expect(intent.labels).toEqual(['A', 'B', 'C', 'D']);
    expect(intent.variant).toBe('wide');
  });

  it('"hình bình hành ABCD" → parallelogram standard', () => {
    const m = run('Cho hình bình hành ABCD');
    const intent = m[0].intents[0] as any;
    expect(intent.shape).toBe('parallelogram');
    expect(intent.labels).toEqual(['A', 'B', 'C', 'D']);
    expect(intent.variant).toBe('standard');
  });

  it('"hình thoi ABCD" → rhombus standard', () => {
    const m = run('Cho hình thoi ABCD');
    const intent = m[0].intents[0] as any;
    expect(intent.shape).toBe('rhombus');
    expect(intent.labels).toEqual(['A', 'B', 'C', 'D']);
    expect(intent.variant).toBe('standard');
  });

  it('"hình thang ABCD" → trapezoid general', () => {
    const m = run('Cho hình thang ABCD');
    const intent = m[0].intents[0] as any;
    expect(intent.shape).toBe('trapezoid');
    expect(intent.labels).toEqual(['A', 'B', 'C', 'D']);
    expect(intent.variant).toBe('general');
  });

  it('"hình thang cân ABCD" → trapezoid isoceles (ưu tiên hơn thang chung)', () => {
    const m = run('Cho hình thang cân ABCD');
    expect(m.length).toBe(1);
    const intent = m[0].intents[0] as any;
    expect(intent.shape).toBe('trapezoid');
    expect(intent.variant).toBe('isoceles');
    expect(intent.labels).toEqual(['A', 'B', 'C', 'D']);
  });

  it('"hình thang vuông ABCD" → trapezoid right', () => {
    const m = run('Cho hình thang vuông MNPQ');
    expect(m.length).toBe(1);
    const intent = m[0].intents[0] as any;
    expect(intent.shape).toBe('trapezoid');
    expect(intent.variant).toBe('right');
    expect(intent.labels).toEqual(['M', 'N', 'P', 'Q']);
  });

  it('"tứ giác ABCD" → quadrilateral any', () => {
    const m = run('Cho tứ giác ABCD');
    const intent = m[0].intents[0] as any;
    expect(intent.shape).toBe('quadrilateral');
    expect(intent.labels).toEqual(['A', 'B', 'C', 'D']);
    expect(intent.variant).toBe('any');
  });

  it('không trích được 4 đỉnh HOA liền → bỏ qua (escalate)', () => {
    const m = run('Cho một hình vuông bất kỳ');
    expect(m.length).toBe(0);
  });

  it('nhiều hình trong đề → mỗi clause khớp 1 RuleMatch', () => {
    const m = run('Cho hình vuông ABCD. Gọi tứ giác EFGH là tứ giác nội tiếp');
    expect(m.length).toBe(2);
    const shapes = m.map((x) => (x.intents[0] as any).shape).sort();
    expect(shapes).toEqual(['quadrilateral', 'square']);
  });

  // --- BUG 1: 2 hình trong CÙNG clause → emit-all theo thứ tự TEXT -----------
  it('"hình bình hành ABCD và hình chữ nhật EFGH" → 2 shape, theo thứ tự text', () => {
    const m = run('Cho hình bình hành ABCD và hình chữ nhật EFGH');
    expect(m.length).toBe(2);
    const a = m[0].intents[0] as any;
    const b = m[1].intents[0] as any;
    expect(a.shape).toBe('parallelogram');
    expect(a.labels).toEqual(['A', 'B', 'C', 'D']);
    expect(b.shape).toBe('rectangle');
    expect(b.labels).toEqual(['E', 'F', 'G', 'H']);
  });

  it('"hình thoi ABCD và hình vuông EFGH" → rhombus + square (thứ tự text)', () => {
    const m = run('Cho hình thoi ABCD và hình vuông EFGH');
    expect(m.length).toBe(2);
    expect((m[0].intents[0] as any).shape).toBe('rhombus');
    expect((m[0].intents[0] as any).labels).toEqual(['A', 'B', 'C', 'D']);
    expect((m[1].intents[0] as any).shape).toBe('square');
    expect((m[1].intents[0] as any).labels).toEqual(['E', 'F', 'G', 'H']);
  });

  // --- BUG 2: modifier 'vuông'/'cân' đứng SAU đỉnh ---------------------------
  it('"hình thang ABCD vuông tại A" → trapezoid right (modifier hậu vị)', () => {
    const m = run('Cho hình thang ABCD vuông tại A');
    expect(m.length).toBe(1);
    const intent = m[0].intents[0] as any;
    expect(intent.shape).toBe('trapezoid');
    expect(intent.variant).toBe('right');
    expect(intent.labels).toEqual(['A', 'B', 'C', 'D']);
  });

  it('"hình thang ABCD cân" → trapezoid isoceles (modifier hậu vị)', () => {
    const m = run('Cho hình thang ABCD cân');
    expect(m.length).toBe(1);
    const intent = m[0].intents[0] as any;
    expect(intent.shape).toBe('trapezoid');
    expect(intent.variant).toBe('isoceles');
  });

  it('modifier hậu vị KHÔNG nuốt "vuông" của hình kế tiếp', () => {
    // "hình thang ABCD và hình vuông EFGH": thang phải là general, KHÔNG right.
    const m = run('Cho hình thang ABCD và hình vuông EFGH');
    expect(m.length).toBe(2);
    const trap = m.find((x) => (x.intents[0] as any).shape === 'trapezoid');
    const sq = m.find((x) => (x.intents[0] as any).shape === 'square');
    expect(trap).toBeDefined();
    expect((trap!.intents[0] as any).variant).toBe('general');
    expect(sq).toBeDefined();
    expect((sq!.intents[0] as any).labels).toEqual(['E', 'F', 'G', 'H']);
  });

  it('"hình thang vuông ABCD" (modifier TIỀN vị) vẫn → right', () => {
    const m = run('Cho hình thang vuông ABCD');
    expect(m.length).toBe(1);
    expect((m[0].intents[0] as any).variant).toBe('right');
    expect((m[0].intents[0] as any).labels).toEqual(['A', 'B', 'C', 'D']);
  });

  // --- BUG 3: 5+ đỉnh KHÔNG match (escalate, không cắt im lặng) --------------
  it('"tứ giác ABCDE" (5 đỉnh) → không match (escalate)', () => {
    const m = run('Cho tứ giác ABCDE');
    expect(m.length).toBe(0);
  });

  it('"hình vuông ABCDE" (5 đỉnh) → không match (escalate)', () => {
    const m = run('Cho hình vuông ABCDE');
    expect(m.length).toBe(0);
  });
});
