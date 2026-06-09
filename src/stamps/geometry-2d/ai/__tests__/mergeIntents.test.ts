// mergeIntents (hybrid partial-coverage Phase 1): gộp intent deterministic +
// intent LLM bù phần thiếu. Quy tắc: dedup exact + deterministic SỞ HỮU tên thì
// LLM KHÔNG được redefine (drop bản LLM). connect/ref KHÔNG sở hữu tên → giữ.
import { mergeIntents } from '../mergeIntents';
import { drawShape, addPoint, connect } from '../rules/_shared';

describe('mergeIntents', () => {
  it('dedup exact duplicate (cùng 1 intent ở cả det lẫn llm) → 1 bản', () => {
    const tri = drawShape('triangle', ['A', 'B', 'C'], 'any');
    const out = mergeIntents([tri], [tri]);
    expect(out).toHaveLength(1);
  });

  it('LLM redefine điểm deterministic SỞ HỮU → drop bản LLM (det thắng)', () => {
    const det = [
      drawShape('triangle', ['A', 'B', 'C'], 'any'),
      addPoint('M', { kind: 'midpoint', of: 'BC' }),
    ];
    const llm = [addPoint('M', { kind: 'free', at: [1, 1] })]; // redefine M khác
    const out = mergeIntents(det, llm);
    // M chỉ còn 1 (bản deterministic midpoint), không có bản free.
    const ms = out.filter((i: any) => i.op === 'add-point' && i.name === 'M');
    expect(ms).toHaveLength(1);
    expect((ms[0] as any).constraint.kind).toBe('midpoint');
  });

  it('LLM thêm điểm MỚI tham chiếu điểm det → giữ', () => {
    const det = [drawShape('triangle', ['A', 'B', 'C'], 'any')];
    const llm = [addPoint('D', { kind: 'midpoint', of: 'AB' })];
    const out = mergeIntents(det, llm);
    expect(out.some((i: any) => i.op === 'add-point' && i.name === 'D')).toBe(true);
  });

  it('draw-shape labels được bảo vệ: LLM redefine đỉnh A → drop', () => {
    const det = [drawShape('triangle', ['A', 'B', 'C'], 'any')];
    const llm = [addPoint('A', { kind: 'free', at: [0, 0] })];
    const out = mergeIntents(det, llm);
    expect(out.some((i: any) => i.op === 'add-point' && i.name === 'A')).toBe(false);
  });

  it('connect KHÔNG sở hữu tên → không bị drop dù tham chiếu điểm det', () => {
    const det = [drawShape('triangle', ['A', 'B', 'C'], 'any')];
    const llm = [connect('A', 'B', 'segment')];
    const out = mergeIntents(det, llm);
    expect(out.some((i: any) => i.op === 'connect')).toBe(true);
  });

  it('giữ thứ tự: det trước, llm (đã lọc) sau', () => {
    const det = [drawShape('triangle', ['A', 'B', 'C'], 'any')];
    const llm = [addPoint('D', { kind: 'midpoint', of: 'AB' })];
    const out = mergeIntents(det, llm);
    expect((out[0] as any).op).toBe('draw-shape');
    expect((out[1] as any).op).toBe('add-point');
  });
});
