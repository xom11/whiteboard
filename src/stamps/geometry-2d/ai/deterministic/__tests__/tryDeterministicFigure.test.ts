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
  'Cho tam giác ABC. Gọi H là trực tâm của tam giác ABC',
];

// Các đề trung-bình-khó cần điểm phái sinh chưa có rule → PHẢI escalate (an toàn),
// KHÔNG được dùng hình thiếu điểm.
const ESCALATE: { problem: string; reason: string }[] = [
  { problem: 'Cho tam giác ABC. Đường trung trực của BC cắt AB tại D', reason: 'named-missing' },
  { problem: 'Cho tam giác ABC. Trên cạnh AB lấy điểm D sao cho AD = 2DB', reason: 'named-missing' },
  { problem: 'Chứng minh định lý Pytago', reason: 'no-match' },
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

  it('ESCALATE-SAFE: đặt TÊN tiếp điểm "Vẽ hai tiếp tuyến AB, AC từ A đến (O)" → ok:false (named-missing B,C — DEFER)', () => {
    const r = tryDeterministicFigure(
      'Cho đường tròn (O;3). Lấy điểm A nằm ngoài (O). Vẽ hai tiếp tuyến AB, AC từ A đến (O).',
    );
    expect(r.ok).toBe(false);
  });
});

describe('tryDeterministicFigure — escalate an toàn', () => {
  it.each(ESCALATE)('escalate ($reason): $problem', ({ problem, reason }) => {
    const r = tryDeterministicFigure(problem);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe(reason);
  });
});
