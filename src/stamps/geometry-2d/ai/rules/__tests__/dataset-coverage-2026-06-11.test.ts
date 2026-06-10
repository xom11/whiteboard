// Regression end-to-end: các bài dataset chuyển từ ESCALATE → dựng được nhờ batch
// 2026-06-11 (tangent rays, onSegment phân phối, reflection giữ prime, onCircle
// "trên" trần, intersection primed-comma, circle naming circumcircle-vs-diameter).
// Test qua CHÍNH gate thật (tryDeterministicFigure) — đảm bảo render-ready, không
// chỉ rule match.
import { tryDeterministicFigure } from '../../deterministic/tryDeterministicFigure';
import { reflectionRule } from '../reflection';
import { onSegmentPointRule } from '../onSegmentPoint';
import { intersectionRule } from '../intersection';
import { onCirclePointRule } from '../onCirclePoint';
import { segmentClauses } from '../../deterministic/coverage';

const intents = (rule: any, p: string) =>
  rule.match({ problem: p, clauses: segmentClauses(p) }).flatMap((m: any) => m.intents);

describe('dataset coverage batch 2026-06-11 (end-to-end)', () => {
  const OK_CASES: [string, string][] = [
    [
      'hinh9:16 tiếp tuyến tại M cắt tia Ax, By',
      'Cho nửa đường tròn (O) đường kính AB. Trên nửa mặt phẳng bờ AB chứa nửa đường tròn, kẻ các tia tiếp tuyến Ax, By. Một điểm M nằm trên nửa đường tròn. Tiếp tuyến tại M cắt Ax, By lần lượt tại C, D.',
    ],
    [
      'phang:1 trên BC, CA, AB lấy M, N, E + đối xứng',
      'Cho tam giác ABC trên BC, CA, AB thứ tự lấy các điểm M, N, E sao cho AN = NE, BM = ME. Gọi D là điểm đối xứng của E qua MN.',
    ],
    [
      'd80:10 M′ đối xứng + S = BM ∩ M′A',
      'Cho đường tròn tâm O đường kính AB và điểm M bất kì trên nửa đường tròn sao cho AM < MB. Gọi M′ là điểm đối xứng của M qua AB và S là giao điểm của hai tia BM, M′A. Gọi P là chân đường vuông góc từ S đến AB.',
    ],
  ];

  it.each(OK_CASES)('dựng được: %s', (_label, problem) => {
    const r = tryDeterministicFigure(problem);
    expect(r.ok).toBe(true);
  });

  it('reflection giữ prime: "M′ là điểm đối xứng của M qua AB" → name M′, of M', () => {
    const out = intents(reflectionRule, 'Gọi M′ là điểm đối xứng của M qua AB.') as any[];
    expect(out).toContainEqual({
      op: 'add-point',
      name: "M'",
      constraint: { kind: 'reflectLine', of: 'M', through: 'AB' },
    });
  });

  it('onSegment phân phối đoạn-trước (kể cả có metric): trên BC, CA, AB → M,N,E', () => {
    const out = intents(
      onSegmentPointRule,
      'Trên BC, CA, AB thứ tự lấy các điểm M, N, E sao cho AN = NE.',
    ) as any[];
    expect(out).toEqual([
      { op: 'add-point', name: 'M', constraint: { kind: 'onSegment', of: 'BC' } },
      { op: 'add-point', name: 'N', constraint: { kind: 'onSegment', of: 'CA' } },
      { op: 'add-point', name: 'E', constraint: { kind: 'onSegment', of: 'AB' } },
    ]);
  });

  it('intersection primed-comma: "S là giao điểm của hai tia BM, M′A"', () => {
    const out = intents(
      intersectionRule,
      'S là giao điểm của hai tia BM, M′A.',
    ) as any[];
    expect(out).toContainEqual({
      op: 'add-point',
      name: 'S',
      constraint: { kind: 'intersection', of: ['BM', "M'A"] },
    });
  });

  it('onCircle "trên đường tròn lấy điểm D" (trần) → D onCircle', () => {
    const out = intents(
      onCirclePointRule,
      'Cho đường tròn (O) đường kính AB. Trên đường tròn lấy điểm D khác A.',
    ) as any[];
    expect(out.some((i) => i.name === 'D' && i.constraint.kind === 'onCircle')).toBe(true);
  });
});
