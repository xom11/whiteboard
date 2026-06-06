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
});
