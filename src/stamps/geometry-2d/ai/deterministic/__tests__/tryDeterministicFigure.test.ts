import { tryDeterministicFigure } from '../tryDeterministicFigure';

// Các đề dễ→trung bình: PHẢI dựng deterministic (qua hết 4 lớp gate), không cần AI.
const RENDERABLE: string[] = [
  'Cho tam giác ABC. Gọi M là trung điểm BC',
  'Cho tam giác ABC. Gọi G là trọng tâm tam giác ABC',
  'Cho tam giác ABC. Kẻ đường cao AH',
  'Cho tam giác ABC. Gọi H là hình chiếu của A trên BC',
  'Cho hình vuông ABCD',
  'Cho hình chữ nhật ABCD',
  'Cho tam giác ABC vuông tại A. Gọi M là trung điểm BC',
  'Cho tam giác ABC cân tại A. Kẻ trung tuyến AM',
  'Cho đường tròn tâm O bán kính 3',
  'Cho đường tròn (O; 3)',
  'Cho tam giác ABC. Vẽ đường tròn ngoại tiếp tam giác ABC',
  'Cho tam giác ABC. Vẽ đường tròn nội tiếp tam giác ABC',
  'Cho tam giác ABC. Đường tròn (I) nội tiếp tam giác ABC tiếp xúc với các cạnh BC, CA, AB tại các điểm D, E, G.',
  'Cho tam giác nhọn, không cân ABC có các đường cao BE, CF (với E ∈ AC, F ∈ AB). Đường tròn đường kính BE và đường tròn đường kính CF cắt nhau tại các điểm X, Y.',
  'Cho tam giác nhọn, không cân ABC có các đường cao BE, CF (với E ∈ AC, F ∈ AB). Đường tròn đường kính BE và đường tròn đường kính CF cắt nhau tại các điểm X, Y . Đoạn thẳng BE cắt đường tròn đường kính CF tại điểm N . Đoạn thẳng CF cắt đường tròn đường kính BE tại điểm P . Các đường thẳng XY và EF cắt nhau tại M .',
  'Cho tứ giác lồi ABCD. Gọi E, F lần lượt là giao điểm của AB và CD, của AD và BC. Gọi M, N, L lần lượt là trung điểm của AC, EF và BD.',
  'Cho tam giác ABC. Gọi H là trực tâm của tam giác ABC',
  // excenter (port 2026-06-09): "tâm bàng tiếp góc A" → excenter J, dựng deterministic.
  'Cho tam giác ABC, J là tâm bàng tiếp góc A',
  // perpBisector ∩ line (port 2026-06-09): trung trực BC cắt AB tại D → D = giao
  // (perpBisector BC, AB), dựng deterministic.
  'Cho tam giác ABC. Đường trung trực của BC cắt AB tại D',
  // diameter-circle-cuts-sides (2026-06-09): đường tròn đường kính BC cắt AB, AC
  // tại M, N → secondIntersection loại đỉnh chung B/C (M,N = chân đường cao).
  'Cho tam giác ABC nhọn, không cân (AB < AC), đường tròn đường kính BC cắt AB, AC tại M và N. Gọi O là trung điểm của BC.',
];

// Các đề trung-bình-khó cần điểm phái sinh chưa có rule → PHẢI escalate (an toàn),
// KHÔNG được dùng hình thiếu điểm.
const ESCALATE: { problem: string; reason: string }[] = [
  { problem: 'Cho tam giác ABC. Trên cạnh AB lấy điểm D sao cho AD = 2DB', reason: 'named-missing' },
  { problem: 'Chứng minh định lý Pytago', reason: 'no-match' },
  // Guard NAMED_LA: "X là <construct chưa có rule>" cùng clause với tam giác đã
  // claim → coverage complete nhưng điểm P thiếu → PHẢI named-missing (escalate),
  // KHÔNG silent-incomplete. (Trước fix `là\b`, guard chết → render tam giác thiếu P.)
  // Dùng "điểm Fermat" (chưa có rule) để test ổn định khi thêm rule khác.
  { problem: 'Cho tam giác ABC, P là điểm Fermat của tam giác.', reason: 'named-missing' },
];

describe('tryDeterministicFigure — render deterministic (không cần AI)', () => {
  it.each(RENDERABLE)('dựng được: %s', (problem) => {
    const r = tryDeterministicFigure(problem);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.figure.transpile.ok).toBe(true);
      expect(r.figure.verify.ok).toBe(true);
      expect(r.figure.intents.length).toBeGreaterThan(0);
    }
  });
});

describe('tryDeterministicFigure — đường tròn nội tiếp tiếp xúc ba cạnh', () => {
  it('dựng incircle (I) và các tiếp điểm D, E, G trên BC, CA, AB', () => {
    const r = tryDeterministicFigure(
      'Cho tam giác ABC. Đường tròn (I) nội tiếp tam giác ABC tiếp xúc với các cạnh BC, CA, AB tại các điểm D, E, G.',
    );

    expect(r.ok).toBe(true);
    if (!r.ok) return;

    expect(r.figure.dsl.shapes).toContainEqual({
      name: 'I',
      kind: 'incircle',
      vertices: ['A', 'B', 'C'],
    });
    expect(r.figure.dsl.points).toContainEqual({
      name: 'D',
      kind: 'tangencyPoint',
      circle: 'I',
      onLine: 'BC',
    });
    expect(r.figure.dsl.points).toContainEqual({
      name: 'E',
      kind: 'tangencyPoint',
      circle: 'I',
      onLine: 'CA',
    });
    expect(r.figure.dsl.points).toContainEqual({
      name: 'G',
      kind: 'tangencyPoint',
      circle: 'I',
      onLine: 'AB',
    });
  });

  it('dựng được khi đề xuống dòng giữa "các" và "cạnh"', () => {
    const r = tryDeterministicFigure(
      'Cho tam giác ABC. Đường tròn (I) nội tiếp tam giác ABC tiếp xúc với các\ncạnh BC, CA, AB tại các điểm D, E, G.',
    );

    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.figure.dsl.points).toContainEqual({
      name: 'D',
      kind: 'tangencyPoint',
      circle: 'I',
      onLine: 'BC',
    });
  });
});

describe('tryDeterministicFigure — hai đường tròn đường kính hai đường cao cắt nhau', () => {
  it('dựng được BE, CF; hai đường tròn đường kính BE, CF; giao điểm X, Y', () => {
    const r = tryDeterministicFigure(
      'Cho tam giác nhọn, không cân ABC có các đường cao BE, CF (với E ∈ AC, F ∈ AB). Đường tròn đường kính BE và đường tròn đường kính CF cắt nhau tại các điểm X, Y.',
    );

    expect(r.ok).toBe(true);
    if (!r.ok) return;

    expect(r.figure.dsl.points).toContainEqual({
      name: 'E',
      kind: 'perpFoot',
      from: 'B',
      onLine: 'AC',
    });
    expect(r.figure.dsl.points).toContainEqual({
      name: 'F',
      kind: 'perpFoot',
      from: 'C',
      onLine: 'AB',
    });
    expect(r.figure.dsl.shapes).toContainEqual({
      name: 'kBE',
      kind: 'circleDiameter',
      p1: 'B',
      p2: 'E',
    });
    expect(r.figure.dsl.shapes).toContainEqual({
      name: 'kCF',
      kind: 'circleDiameter',
      p1: 'C',
      p2: 'F',
    });
    expect(r.figure.dsl.points).toContainEqual({
      name: 'X',
      kind: 'circleIntersection',
      c1: 'kBE',
      c2: 'kCF',
      which: 0,
    });
    expect(r.figure.dsl.points).toContainEqual({
      name: 'Y',
      kind: 'circleIntersection',
      c1: 'kBE',
      c2: 'kCF',
      which: 1,
    });
  });

  it('dựng thêm N, P, M cho đề mở rộng', () => {
    const r = tryDeterministicFigure(
      'Cho tam giác nhọn, không cân ABC có các đường cao BE, CF (với E ∈ AC, F ∈ AB). Đường tròn đường kính BE và đường tròn đường kính CF cắt nhau tại các điểm X, Y . Đoạn thẳng BE cắt đường tròn đường kính CF tại điểm N . Đoạn thẳng CF cắt đường tròn đường kính BE tại điểm P . Các đường thẳng XY và EF cắt nhau tại M .',
    );

    expect(r.ok).toBe(true);
    if (!r.ok) return;

    expect(r.figure.dsl.points).toContainEqual({
      name: 'N',
      kind: 'intersection',
      ref1: 'BE',
      ref2: 'kCF',
      branch: 0,
    });
    expect(r.figure.dsl.points).toContainEqual({
      name: 'P',
      kind: 'intersection',
      ref1: 'CF',
      ref2: 'kBE',
      branch: 0,
    });
    expect(r.figure.dsl.points).toContainEqual({
      name: 'M',
      kind: 'intersection',
      ref1: 'XY',
      ref2: 'EF',
    });
  });
});

describe('tryDeterministicFigure — tứ giác với giao điểm và trung điểm phân phối', () => {
  it('dựng được E, F là hai giao điểm; M, N, L là ba trung điểm', () => {
    const r = tryDeterministicFigure(
      'Cho tứ giác lồi ABCD. Gọi E, F lần lượt là giao điểm của AB và CD, của AD và BC. Gọi M, N, L lần lượt là trung điểm của AC, EF và BD.',
    );

    expect(r.ok).toBe(true);
    if (!r.ok) return;

    expect(r.figure.dsl.points).toContainEqual({
      name: 'E',
      kind: 'intersection',
      ref1: 'AB',
      ref2: 'CD',
    });
    expect(r.figure.dsl.points).toContainEqual({
      name: 'F',
      kind: 'intersection',
      ref1: 'AD',
      ref2: 'BC',
    });
    expect(r.figure.dsl.points).toContainEqual({
      name: 'M',
      kind: 'midpoint',
      p1: 'A',
      p2: 'C',
    });
    expect(r.figure.dsl.points).toContainEqual({
      name: 'N',
      kind: 'midpoint',
      p1: 'E',
      p2: 'F',
    });
    expect(r.figure.dsl.points).toContainEqual({
      name: 'L',
      kind: 'midpoint',
      p1: 'B',
      p2: 'D',
    });
  });
});

describe('tryDeterministicFigure — điểm ngoài đường tròn + tiếp tuyến từ điểm ngoài', () => {
  // Helper: lấy point A free và assert nằm ngoài circle tâm O bán kính r.
  function assertExternalTangent(problem: string, r: number) {
    const res = tryDeterministicFigure(problem);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const dsl = res.figure.dsl;
    // A là free point.
    const a = dsl.points.find((p) => p.name === 'A');
    expect(a).toBeDefined();
    expect(a!.kind).toBe('free');
    // Tâm O free (đường tròn (O) → resolveCircleNames inject center O).
    const o = dsl.points.find((p) => p.name === 'O');
    expect(o).toBeDefined();
    if (a && a.kind === 'free' && o && o.kind === 'free') {
      const dist = Math.hypot(a.x - o.x, a.y - o.y);
      expect(dist).toBeGreaterThan(r);
    }
    // 2 tiếp tuyến từ A (branch 0 và 1).
    const tangents = dsl.shapes.filter((sh) => sh.kind === 'tangent');
    expect(tangents.length).toBe(2);
    for (const t of tangents) {
      if (t.kind === 'tangent') expect(t.throughPoint).toBe('A');
    }
    const branches = tangents
      .map((t) => (t.kind === 'tangent' ? t.branch : undefined))
      .sort();
    expect(branches).toEqual([0, 1]);
  }

  it('"Cho đường tròn (O;3). Lấy điểm A nằm ngoài (O). Vẽ hai tiếp tuyến từ A đến (O)." → ok + A ngoài + 2 tiếp tuyến', () => {
    assertExternalTangent(
      'Cho đường tròn (O;3). Lấy điểm A nằm ngoài (O). Vẽ hai tiếp tuyến từ A đến (O).',
      3,
    );
  });

  it('"Cho đường tròn (O;3). Lấy điểm A ở ngoài đường tròn (O). Từ A kẻ hai tiếp tuyến đến (O)." → ok tương tự', () => {
    assertExternalTangent(
      'Cho đường tròn (O;3). Lấy điểm A ở ngoài đường tròn (O). Từ A kẻ hai tiếp tuyến đến (O).',
      3,
    );
  });

  it('RENDER (issue #46 named-tangent-point): đặt TÊN tiếp điểm "Vẽ hai tiếp tuyến AB, AC từ A đến (O)" → B,C tangentPointExt', () => {
    const r = tryDeterministicFigure(
      'Cho đường tròn (O;3). Lấy điểm A nằm ngoài (O). Vẽ hai tiếp tuyến AB, AC từ A đến (O).',
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const dsl = r.figure.dsl;
    // B, C là tiếp điểm dựng qua tangentPointExt (from A, 2 nhánh which 0/1).
    const b = dsl.points.find((p) => p.name === 'B');
    const c = dsl.points.find((p) => p.name === 'C');
    expect(b?.kind).toBe('tangentPointExt');
    expect(c?.kind).toBe('tangentPointExt');
    if (b?.kind === 'tangentPointExt') expect(b.from).toBe('A');
    if (c?.kind === 'tangentPointExt') expect(c.from).toBe('A');
    const whichValues = [b, c]
      .map((p) => (p?.kind === 'tangentPointExt' ? p.which : undefined))
      .sort();
    expect(whichValues).toEqual([0, 1]);
    // Vẫn giữ 2 tiếp tuyến từ A (branch 0 và 1).
    const tangents = dsl.shapes.filter((sh) => sh.kind === 'tangent');
    expect(tangents.length).toBe(2);
  });
});

describe('tryDeterministicFigure — escalate an toàn', () => {
  it.each(ESCALATE)('escalate ($reason): $problem', ({ problem, reason }) => {
    const r = tryDeterministicFigure(problem);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe(reason);
  });
});
