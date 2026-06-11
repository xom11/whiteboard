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
    [
      "phang:6 nửa đường tròn (O') đối diện + EI ⊥ BC cắt (O') ở F",
      "Cho tam giác ABC vuông tại A đường cao AH. Trên nửa mặt phẳng bờ BC chứa A vẽ đường tròn (O) đường kính HC. Trên nửa mặt phẳng bờ BC không chứa A vẽ nửa đường tròn (O') đường kính BC. Qua điểm E thuộc nửa đường tròn (O) kẻ EI vuông góc với BC cắt nửa đường tròn (O') ở F. Gọi K là giao điểm của EH và BF.",
    ],
    [
      'phang:14 phân giác trong góc DAB cắt (O) tại E và cắt CH tại F',
      'Cho đường tròn (O) đường kính AB. Trên đường tròn lấy điểm D khác A và DAB > 60 độ. Trên đường kính AB lấy điểm C (C khác A, B) và kẻ CH vuông góc với AD tại H. Phân giác trong của góc DAB cắt đường tròn tại E và cắt CH tại F. Đường thẳng DF cắt đường tròn tại điểm thứ hai N.',
    ],
    [
      'phang:17 đường tròn đường kính MP cắt cung BC tại N (circle∩circle)',
      'Cho tam giác nhọn ABC nội tiếp đường tròn tâm O. Gọi M là một điểm trên cung nhỏ BC (M khác B, C và AM không đi qua O). Giả sử P là một điểm thuộc đoạn thẳng AM sao cho đường tròn đường kính MP cắt cung nhỏ BC tại điểm N khác M.',
    ],
    [
      'd80:5 tiếp tuyến d tại A trên (O) + M trên d + AC⊥MB, BD⊥MA',
      'Cho đường tròn (O; R), từ một điểm A trên (O) kẻ tiếp tuyến d với (O). Trên đường thẳng d lấy điểm M bất kì (M khác A) kẻ cát tuyến MNP và gọi K là trung điểm của NP, kẻ tiếp tuyến MB (B là tiếp điểm). Kẻ AC vuông góc MB, BD vuông góc MA, gọi H là giao điểm của AC và BD, I là giao điểm của OM và AB.',
    ],
    [
      'd80:18 trên đường thẳng vuông góc với OB tại H (KHÔNG nuốt "vu")',
      'Cho đường tròn (O) đường kính AB. Trên đoạn thẳng OB lấy điểm H bất kì; trên đường thẳng vuông góc với OB tại H, lấy một điểm M ở ngoài đường tròn; MA và MB thứ tự cắt đường tròn (O) tại C và D.',
    ],
    [
      'd80:3 tiếp tuyến Ax,By (đường tròn vô danh) + tiếp tuyến thứ ba cắt → C,D',
      'Cho nửa đường tròn đường kính AB = 2R. Từ A và B kẻ hai tiếp tuyến Ax, By. Qua điểm M thuộc nửa đường tròn kẻ tiếp tuyến thứ ba cắt các tiếp tuyến Ax, By lần lượt ở C và D. Các đường thẳng AD và BC cắt nhau tại N.',
    ],
    [
      'd80:14 arbelos: 3 nửa đường tròn (O,I,K) + perp tại C cắt (O) + EA∩(I), EB∩(K)',
      'Cho điểm C thuộc đoạn thẳng AB sao cho AC = 10 cm, CB = 40 cm. Vẽ về một phía của AB các nửa đường tròn có đường kính theo thứ tự là AB, AC, CB và có tâm theo thứ tự là O, I, K. Đường vuông góc với AB tại C cắt nửa đường tròn (O) tại E. Gọi M, N theo thứ tự là giao điểm của EA, EB với các nửa đường tròn (I), (K).',
    ],
    [
      't02:VD13 đường cao AD, BE, CF (distributive) + d // EF',
      'Cho tam giác ABC không cân với các đường cao AD, BE, CF. Đường thẳng d đi qua D song song với EF, cắt các đường thẳng AB, AC tại M, N, các đường thẳng EF, BC cắt nhau tại P.',
    ],
    [
      't02:BT23 incircle D,E,F + trung điểm NP, PM, MN (distributive zip không "lần lượt")',
      'Cho đường tròn (I) nội tiếp tam giác ABC không cân, tiếp xúc các cạnh BC, CA, AB tại M, N, P. Gọi D, E, F là trung điểm của NP, PM, MN.',
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
