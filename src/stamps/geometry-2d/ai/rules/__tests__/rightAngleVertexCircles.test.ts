import { rightAngleVertexCirclesRule } from '../rightAngleVertexCircles';
import { segmentClauses } from '../../deterministic/coverage';
import { tryDeterministicFigure } from '../../deterministic/tryDeterministicFigure';

function intents(problem: string) {
  return rightAngleVertexCirclesRule
    .match({ problem, clauses: segmentClauses(problem) })
    .flatMap((m) => m.intents as any[]);
}

const HTTCD94 =
  'Cho góc vuông xOy. Lấy các điểm I và K lần lượt trên các tia Ox và Oy. ' +
  'Vẽ đường tròn (I; OK) cắt tia Ox tại M (I nằm giữa O và M). ' +
  'Vẽ đường tròn (K; OI) cắt tia Oy tại N (K nằm giữa O và N).';

describe('rightAngleVertexCirclesRule', () => {
  it('httcd:94 → O đỉnh + I,K trên 2 tia + 2 đường tròn + M,N giao thứ hai', () => {
    const all = intents(HTTCD94);
    const byName = (n: string) => all.find((i) => i.name === n);
    expect(byName('O')?.constraint.kind).toBe('free');
    expect(byName('I')?.constraint.kind).toBe('onSegment');
    expect(byName('K')?.constraint.kind).toBe('onSegment');
    expect(byName('M')?.constraint.kind).toBe('secondIntersection');
    expect(byName('N')?.constraint.kind).toBe('secondIntersection');
    expect(all.filter((i) => i.op === 'draw-circle')).toHaveLength(2);
  });

  it('end-to-end: hình hợp lệ chứa O,I,K,M,N', () => {
    const r = tryDeterministicFigure(HTTCD94);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const names = (r as any).figure.dsl.points.map((p: any) => p.name);
    expect(names).toEqual(expect.arrayContaining(['O', 'I', 'K', 'M', 'N']));
  });

  it('bỏ qua khi không có "góc vuông xOy"', () => {
    expect(intents('Cho tam giác ABC vuông tại A.')).toHaveLength(0);
  });
});
