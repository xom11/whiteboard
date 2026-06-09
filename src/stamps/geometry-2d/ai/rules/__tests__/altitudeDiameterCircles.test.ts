import { altitudeDiameterCirclesRule } from '../altitudeDiameterCircles';
import { segmentClauses } from '../../deterministic/coverage';

function intents(problem: string) {
  return altitudeDiameterCirclesRule
    .match({ problem, clauses: segmentClauses(problem) })
    .flatMap((m) => m.intents as any[]);
}

describe('altitudeDiameterCirclesRule', () => {
  it('dựng tam giác, hai đường cao BE/CF, hai đường tròn đường kính và giao điểm X/Y', () => {
    const problem =
      'Cho tam giác nhọn, không cân ABC có các đường cao BE, CF (với E ∈ AC, F ∈ AB). ' +
      'Đường tròn đường kính BE và đường tròn đường kính CF cắt nhau tại các điểm X, Y.';
    const all = intents(problem);

    expect(all).toContainEqual({
      op: 'draw-shape',
      shape: 'triangle',
      labels: ['A', 'B', 'C'],
      variant: 'any',
    });
    expect(all).toContainEqual({
      op: 'add-point',
      name: 'E',
      constraint: { kind: 'perpFoot', from: 'B', onLine: 'AC' },
    });
    expect(all).toContainEqual({
      op: 'add-point',
      name: 'F',
      constraint: { kind: 'perpFoot', from: 'C', onLine: 'AB' },
    });
    expect(all).toContainEqual({
      op: 'draw-circle',
      name: 'kBE',
      spec: 'diameter',
      endpoints: ['B', 'E'],
    });
    expect(all).toContainEqual({
      op: 'draw-circle',
      name: 'kCF',
      spec: 'diameter',
      endpoints: ['C', 'F'],
    });
    expect(all).toContainEqual({
      op: 'add-point',
      name: 'X',
      constraint: { kind: 'circleIntersection', c1: 'kBE', c2: 'kCF', which: 0 },
    });
    expect(all).toContainEqual({
      op: 'add-point',
      name: 'Y',
      constraint: { kind: 'circleIntersection', c1: 'kBE', c2: 'kCF', which: 1 },
    });
  });

  it('dựng thêm N, P, M cho đề đầy đủ', () => {
    const problem =
      'Cho tam giác nhọn, không cân ABC có các đường cao BE, CF (với E ∈ AC, F ∈ AB). ' +
      'Đường tròn đường kính BE và đường tròn đường kính CF cắt nhau tại các điểm X, Y. ' +
      'Đoạn thẳng BE cắt đường tròn đường kính CF tại điểm N. ' +
      'Đoạn thẳng CF cắt đường tròn đường kính BE tại điểm P. ' +
      'Các đường thẳng XY và EF cắt nhau tại M.';
    const all = intents(problem);

    expect(all).toContainEqual({
      op: 'add-point',
      name: 'N',
      constraint: { kind: 'intersection', of: ['BE', 'kCF'], branch: 0 },
    });
    expect(all).toContainEqual({
      op: 'add-point',
      name: 'P',
      constraint: { kind: 'intersection', of: ['CF', 'kBE'], branch: 0 },
    });
    expect(all).toContainEqual({
      op: 'add-point',
      name: 'M',
      constraint: { kind: 'intersection', of: ['XY', 'EF'] },
    });
  });

  it('claim toàn bộ clause cho coverage gate', () => {
    const problem =
      'Cho tam giác nhọn, không cân ABC có các đường cao BE, CF. ' +
      'Đường tròn đường kính BE và đường tròn đường kính CF cắt nhau tại các điểm X, Y.';
    const clauses = segmentClauses(problem);
    const matches = altitudeDiameterCirclesRule.match({ problem, clauses });
    expect(matches).toHaveLength(1);
    expect(matches[0].clauseIds.sort()).toEqual(clauses.map((c) => c.id).sort());
  });

  it('không đúng cặp đường cao/đường kính → bỏ qua', () => {
    const problem =
      'Cho tam giác ABC có các đường cao BE, CF. ' +
      'Đường tròn đường kính BE và đường tròn đường kính CD cắt nhau tại các điểm X, Y.';
    expect(intents(problem)).toEqual([]);
  });
});
