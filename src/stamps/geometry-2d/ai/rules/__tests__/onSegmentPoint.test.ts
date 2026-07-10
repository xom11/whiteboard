import { onSegmentPointRule } from '../onSegmentPoint';
import { segmentClauses } from '../../deterministic/coverage';

function run(problem: string) {
  return onSegmentPointRule.match({ problem, clauses: segmentClauses(problem) });
}

function intents(problem: string) {
  return run(problem).flatMap((m) => m.intents as any[]);
}

describe('onSegmentPointRule', () => {
  it('"Trên cạnh AC lấy điểm M" → M onSegment AC', () => {
    expect(intents('Cho tam giác ABC. Trên cạnh AC lấy điểm M')).toContainEqual({
      op: 'add-point',
      name: 'M',
      constraint: { kind: 'onSegment', of: 'AC' },
    });
  });

  it('"điểm E thuộc cạnh BC" → E onSegment BC', () => {
    expect(intents('Cho hình vuông ABCD, điểm E thuộc cạnh BC')).toContainEqual({
      op: 'add-point',
      name: 'E',
      constraint: { kind: 'onSegment', of: 'BC' },
    });
  });

  it('"D nằm giữa A và B" → D onSegment AB', () => {
    expect(intents('Cho tam giác ABC và một điểm D nằm giữa A và B')).toContainEqual({
      op: 'add-point',
      name: 'D',
      constraint: { kind: 'onSegment', of: 'AB' },
    });
  });

  // httcd:67 "Gọi M là một điểm nằm giữa A và B"; vao10:219 "H là điểm nằm giữa O và B".
  it('"M là một điểm nằm giữa A và B" → M onSegment AB', () => {
    expect(intents('Cho đoạn AB. Gọi M là một điểm nằm giữa A và B')).toContainEqual({
      op: 'add-point',
      name: 'M',
      constraint: { kind: 'onSegment', of: 'AB' },
    });
  });

  it('"H là điểm nằm giữa O và B" → H onSegment OB', () => {
    expect(intents('Gọi H là điểm nằm giữa O và B')).toContainEqual({
      op: 'add-point',
      name: 'H',
      constraint: { kind: 'onSegment', of: 'OB' },
    });
  });

  // son123:9 "M là một điểm trên cạnh AD" (tên trước "là một điểm trên cạnh", có metric).
  it('"M là một điểm trên cạnh AD sao cho ∠ABM=30°" → M onSegment AD (pre-metric)', () => {
    expect(intents('Cho hình vuông ABCD. M là một điểm trên cạnh AD sao cho ABM = 30 độ')).toContainEqual({
      op: 'add-point',
      name: 'M',
      constraint: { kind: 'onSegment', of: 'AD' },
    });
  });

  // httcd:128 "điểm N thuộc tia AM" → N onSegment AM (tia 2 đầu mút HOA).
  it('"điểm N thuộc tia AM" → N onSegment AM', () => {
    expect(intents('Lấy điểm M thuộc cung BC và điểm N thuộc tia AM sao cho AN = BM')).toContainEqual({
      op: 'add-point',
      name: 'N',
      constraint: { kind: 'onSegment', of: 'AM' },
    });
  });

  it('"Trên bán kính OC lấy điểm B" → B onSegment OC', () => {
    expect(intents('Trên bán kính OC lấy điểm B tùy ý')).toContainEqual({
      op: 'add-point',
      name: 'B',
      constraint: { kind: 'onSegment', of: 'OC' },
    });
  });

  it('không dựng nếu tên điểm trùng đầu mút segment', () => {
    expect(intents('Trên cạnh AB lấy điểm A')).toEqual([]);
  });

  it('không nhận điểm thuộc đường tròn/cung', () => {
    expect(intents('Lấy điểm M thuộc nửa đường tròn (O)')).toEqual([]);
  });

  it('metric ratio "sao cho AD = 2DB" vẫn bỏ qua để escalate an toàn', () => {
    expect(intents('Trên cạnh AB lấy điểm D sao cho AD = 2DB')).toEqual([]);
  });
});

describe('onSegmentPoint — điểm di chuyển/di động trên cạnh', () => {
  it('Bài 79: "Điểm P di chuyển trên cạnh AC" → P onSegment AC', () => {
    const i = intents('Điểm P di chuyển trên cạnh AC')[0];
    expect(i.name).toBe('P');
    expect(i.constraint.kind).toBe('onSegment');
    expect(i.constraint.of).toBe('AC');
  });
  it('"P di động trên đoạn BC" → P onSegment BC', () => {
    expect(intents('P di động trên đoạn BC')[0].constraint.of).toBe('BC');
  });
});

describe('onSegmentPoint — "dây" + "là điểm thuộc"', () => {
  const run = (p: string) => onSegmentPointRule.match({ problem: p, clauses: segmentClauses(p) }).flatMap((m) => m.intents);
  it('"Gọi K là điểm thuộc dây AD" → K onSegment AD', () => {
    const i = run('Gọi K là điểm thuộc dây AD')[0] as any;
    expect(i.name).toBe('K');
    expect(i.constraint.kind).toBe('onSegment');
    expect(i.constraint.of).toBe("AD");
  });
});

describe('onSegmentPoint — Wave hinh9 (coordinated / là-điểm / bất-kì / đoạn-trước interjection)', () => {
  it('Bài 24: "Trên đoạn BH lấy điểm M và trên đoạn CH lấy điểm N sao cho ..." → M∈BH, N∈CH', () => {
    const i = intents('Cho tam giác ABC nhọn, trực tâm H. Trên đoạn BH lấy điểm M và trên đoạn CH lấy điểm N sao cho AMC = ANB = 90');
    expect(i).toContainEqual({ op: 'add-point', name: 'M', constraint: { kind: 'onSegment', of: 'BH' } });
    expect(i).toContainEqual({ op: 'add-point', name: 'N', constraint: { kind: 'onSegment', of: 'CH' } });
  });

  it('Bài 66: "X là một điểm nằm trên BC" → X onSegment BC', () => {
    const i = intents('Cho tam giác ABC. X là một điểm nằm trên BC sao cho đường thẳng đi qua X song song với AC là tiếp tuyến');
    expect(i).toContainEqual({ op: 'add-point', name: 'X', constraint: { kind: 'onSegment', of: 'BC' } });
  });

  it('Bài 46: "Lấy I là một điểm bất kì thuộc dây AB" → I onSegment AB', () => {
    const i = intents('Cho đường tròn (O) và dây AB. Lấy I là một điểm bất kì thuộc dây AB');
    expect(i).toContainEqual({ op: 'add-point', name: 'I', constraint: { kind: 'onSegment', of: 'AB' } });
  });

  it('Bài 108: "Trên các cạnh AB,AC của tam giác ABC lần lượt lấy các điểm K, L sao cho ..." → K∈AB, L∈AC', () => {
    const i = intents('Trên các cạnh AB,AC của tam giác ABC lần lượt lấy các điểm K, L sao cho BK = BE và CL = CE');
    expect(i).toContainEqual({ op: 'add-point', name: 'K', constraint: { kind: 'onSegment', of: 'AB' } });
    expect(i).toContainEqual({ op: 'add-point', name: 'L', constraint: { kind: 'onSegment', of: 'AC' } });
  });

  it('GIỮ NGUYÊN: đơn lẻ "Trên cạnh AB lấy điểm D sao cho AD=2DB" vẫn escalate ([])', () => {
    expect(intents('Trên cạnh AB lấy điểm D sao cho AD = 2DB')).toEqual([]);
  });

  // httcd:6 — distributive trên BÁN KÍNH: "Trên các bán kính OA, OB lần lượt lấy
  // các điểm M, N sao cho OM=ON".
  it('"Trên các bán kính OA, OB lần lượt lấy các điểm M, N" → M∈OA, N∈OB', () => {
    const i = intents('Trên các bán kính OA, OB lần lượt lấy các điểm M, N sao cho OM = ON');
    expect(i).toContainEqual({ op: 'add-point', name: 'M', constraint: { kind: 'onSegment', of: 'OA' } });
    expect(i).toContainEqual({ op: 'add-point', name: 'N', constraint: { kind: 'onSegment', of: 'OB' } });
  });

  // vao10:168 — 2 điểm trên TIA ĐẶT TÊN (Ax = tiếp tuyến): "Trên tia Ax lấy hai
  // điểm B và C". Ray Ax khai báo qua "tiếp tuyến Ax". CHẠY TRƯỚC metric-skip
  // ("sao cho AB=BC" — đặt free, metric tinh chỉnh).
  it('vao10:168: "Trên tia Ax lấy hai điểm B và C" (Ax = tiếp tuyến) → B,C onSegment Ax', () => {
    const i = intents('Cho (O) và tiếp tuyến Ax. Trên tia Ax lấy hai điểm B và C sao cho AB=BC');
    expect(i).toContainEqual({ op: 'add-point', name: 'B', constraint: { kind: 'onSegment', of: 'Ax' } });
    expect(i).toContainEqual({ op: 'add-point', name: 'C', constraint: { kind: 'onSegment', of: 'Ax' } });
  });

  it('"Trên tia Ax lấy hai điểm B, C" (sep phẩy) → B,C onSegment Ax', () => {
    const i = intents('Cho (O) và tiếp tuyến Ax. Trên tia Ax lấy hai điểm B, C');
    expect(i).toContainEqual({ op: 'add-point', name: 'B', constraint: { kind: 'onSegment', of: 'Ax' } });
    expect(i).toContainEqual({ op: 'add-point', name: 'C', constraint: { kind: 'onSegment', of: 'Ax' } });
  });

  // GUARD: ray KHÔNG khai báo trong đề → KHÔNG dựng (tránh nhầm token bịa).
  it('GUARD: "Trên tia Ax lấy hai điểm B và C" KHÔNG có "tiếp tuyến/tia Ax" khai báo → không claim', () => {
    const i = intents('Cho tam giác ABC. Trên tia Ax lấy hai điểm B và C');
    expect(i.find((x) => x.constraint?.of === 'Ax')).toBeUndefined();
  });

  // ─── Dạng tên-TRƯỚC "Lấy <pt> (bất kì)? trên <seg>" (giới từ "trên", KHÔNG
  // "thuộc"). Trước đây chỉ "Lấy điểm X thuộc BC" khớp; "Lấy J bất kì trên đoạn
  // BC" (C67) / "Lấy D bất kì trên BC" (C72) bị bỏ sót. ───
  it('C67: "Lấy J bất kì trên đoạn BC" → J onSegment BC', () => {
    const i = intents('Cho tam giác ABC. Lấy J bất kì trên đoạn BC, dựng hình bình hành');
    expect(i).toContainEqual({ op: 'add-point', name: 'J', constraint: { kind: 'onSegment', of: 'BC' } });
  });

  it('C72: "Lấy D bất kì trên BC" (không chữ "đoạn") → D onSegment BC', () => {
    const i = intents('Cho tam giác ABC nội tiếp (O). Lấy D bất kì trên BC');
    expect(i).toContainEqual({ op: 'add-point', name: 'D', constraint: { kind: 'onSegment', of: 'BC' } });
  });

  it('"Lấy điểm M trên cạnh AC" → M onSegment AC', () => {
    const i = intents('Cho tam giác ABC. Lấy điểm M trên cạnh AC');
    expect(i).toContainEqual({ op: 'add-point', name: 'M', constraint: { kind: 'onSegment', of: 'AC' } });
  });

  // GUARD: "Lấy M trên (O)/cung/nửa đường tròn" KHÔNG khớp ở đây (onCircle lo) —
  // ON_SUFFIX của onCircle neo circle; onSegment chỉ nhận cạnh/đoạn/tia/cặp HOA.
  it('GUARD: "Lấy điểm M trên cung BC" → KHÔNG claim onSegment', () => {
    const i = intents('Cho tam giác ABC nội tiếp (O). Lấy điểm M trên cung BC');
    expect(i.find((x) => x.constraint?.kind === 'onSegment')).toBeUndefined();
  });

  // GUARD: "Lấy M trên tia đối của tia AB" → oppositeRayPoint lo, KHÔNG onSegment.
  it('GUARD: "Lấy điểm M trên tia đối của tia AB" → KHÔNG claim onSegment', () => {
    const i = intents('Cho tam giác ABC. Lấy điểm M trên tia đối của tia AB');
    expect(i.find((x) => x.constraint?.kind === 'onSegment')).toBeUndefined();
  });

  // ─── Distributive tên-TRƯỚC "Lấy <p1>, <p2> (bất kì)? trên <s1> và <s2>" →
  // zip 1-1 (C100 "Lấy E, F bất kì trên AB và AC"). ───
  it('C100: "Lấy E, F bất kì trên AB và AC" → E∈AB, F∈AC', () => {
    const i = intents('Cho tam giác ABC nội tiếp (O). Lấy E, F bất kì trên AB và AC');
    expect(i).toContainEqual({ op: 'add-point', name: 'E', constraint: { kind: 'onSegment', of: 'AB' } });
    expect(i).toContainEqual({ op: 'add-point', name: 'F', constraint: { kind: 'onSegment', of: 'AC' } });
  });

  // ─── SEGS_THEN_POINTS: bỏ ràng buộc bắt buộc chữ "điểm" sau "lấy". "Trên AB, AC
  // lấy D, E" (C109) / "Trên ME, MO lấy C, D sao cho ..." (C51). ───
  it('C109: "Trên AB, AC lấy D, E sao cho AD = AE" → D∈AB, E∈AC', () => {
    const i = intents('Cho tam giác ABC nội tiếp (O). Trên AB, AC lấy D, E sao cho AD = AE');
    expect(i).toContainEqual({ op: 'add-point', name: 'D', constraint: { kind: 'onSegment', of: 'AB' } });
    expect(i).toContainEqual({ op: 'add-point', name: 'E', constraint: { kind: 'onSegment', of: 'AC' } });
  });

  it('C51: "Trên ME, MO lấy C, D sao cho ..." → C∈ME, D∈MO', () => {
    const i = intents('Cho (O), điểm M ngoài. Trên ME, MO lấy C, D sao cho MB = MD = MC');
    expect(i).toContainEqual({ op: 'add-point', name: 'C', constraint: { kind: 'onSegment', of: 'ME' } });
    expect(i).toContainEqual({ op: 'add-point', name: 'D', constraint: { kind: 'onSegment', of: 'MO' } });
  });

  // ─── Đoạn-TRƯỚC nêu TRẦN bằng cặp đỉnh đơn (KHÔNG chữ "cạnh/đoạn"): "Trên AS
  // lấy điểm E khác A sao cho TA=TE" (julielltv:24). ───
  it('julielltv:24: "Trên AS lấy điểm E khác A sao cho TA=TE" → E onSegment AS', () => {
    const i = intents('Cho tam giác ABC. Trên AS lấy điểm E khác A sao cho TA=TE');
    expect(i).toContainEqual({ op: 'add-point', name: 'E', constraint: { kind: 'onSegment', of: 'AS' } });
  });
});
