import { pointAtDistanceRule } from '../pointAtDistance';
import { segmentClauses } from '../../deterministic/coverage';

function run(problem: string) {
  return pointAtDistanceRule.match({ problem, clauses: segmentClauses(problem) });
}

/** Lấy constraint của intent add-point đầu tiên. */
function constraint(m: ReturnType<typeof run>) {
  const intent = m[0].intents[0] as any;
  expect(intent.op).toBe('add-point');
  return intent;
}

describe('pointAtDistanceRule', () => {
  it('"kéo dài AB về phía B, lấy C sao cho BC = R" → from=A, through=B, circleRadius', () => {
    const m = run(
      'Cho đường tròn (O; R) và dây AB. Kéo dài AB về phía B, lấy điểm C sao cho BC = R.',
    );
    expect(m.length).toBe(1);
    const i = constraint(m);
    expect(i.name).toBe('C');
    expect(i.constraint.kind).toBe('pointAtDistance');
    expect(i.constraint.from).toBe('A');
    expect(i.constraint.through).toBe('B');
    expect(i.constraint.distance).toEqual({ kind: 'circleRadius', circle: 'O' });
    expect(m[0].clauseIds.length).toBe(1);
  });

  it('"trên tia đối của tia BA, lấy C sao cho BC = R" → from=A, through=B', () => {
    const m = run('Trên tia đối của tia BA, lấy C sao cho BC = R.');
    expect(m.length).toBe(1);
    const i = constraint(m);
    // tia đối của tia BA: gốc B, hướng cũ A ⇒ kéo dài về phía B ⇒ from=A, through=B.
    expect(i.constraint.from).toBe('A');
    expect(i.constraint.through).toBe('B');
    expect(i.constraint.distance.kind).toBe('circleRadius');
  });

  it('"BC = AB" → distance segmentLength {p1:A, p2:B}', () => {
    const m = run('Kéo dài AB lấy C sao cho BC = AB.');
    const i = constraint(m);
    expect(i.constraint.distance).toEqual({ kind: 'segmentLength', p1: 'A', p2: 'B' });
  });

  it('"BC = OA" → segmentLength {p1:O, p2:A} (đoạn bất kỳ, không cần segment có sẵn)', () => {
    const m = run('Trên tia đối của tia BA lấy điểm C sao cho BC = OA.');
    const i = constraint(m);
    expect(i.constraint.distance).toEqual({ kind: 'segmentLength', p1: 'O', p2: 'A' });
  });

  it('"BC = 3" → literal value 3', () => {
    const m = run('Trên tia đối của tia BA lấy điểm C sao cho BC = 3.');
    const i = constraint(m);
    expect(i.constraint.distance).toEqual({ kind: 'literal', value: 3 });
  });

  it('"NP = 2,5" (phẩy thập phân) → literal value 2.5, không cắt ở dấu phẩy', () => {
    const m = run('Kéo dài đoạn MN về phía N, lấy P sao cho NP = 2,5.');
    const i = constraint(m);
    expect(i.name).toBe('P');
    expect(i.constraint.from).toBe('M');
    expect(i.constraint.through).toBe('N');
    expect(i.constraint.distance).toEqual({ kind: 'literal', value: 2.5 });
  });

  it('"= bán kính (O)" → circleRadius lấy đúng tên trong ngoặc', () => {
    const m = run('Trên tia đối của tia BA lấy C sao cho BC = bán kính (O).');
    const i = constraint(m);
    expect(i.constraint.distance).toEqual({ kind: 'circleRadius', circle: 'O' });
  });

  it('"= bán kính" không kèm tên → suy circle từ đề ("đường tròn tâm O")', () => {
    const m = run(
      'Cho đường tròn tâm O bán kính R, dây AB. Trên tia đối của tia BA lấy điểm C sao cho BC = bán kính.',
    );
    const i = constraint(m);
    expect(i.constraint.distance).toEqual({ kind: 'circleRadius', circle: 'O' });
  });

  // --- Bỏ qua (escalate AI) khi không parse đủ -------------------------------

  it('thiếu tên điểm mới → bỏ qua', () => {
    expect(run('Kéo dài AB sao cho BC = R.')).toEqual([]);
  });

  it('thiếu khoảng cách ("= …") → bỏ qua', () => {
    expect(run('Kéo dài AB lấy C.')).toEqual([]);
  });

  it('mốc đo không khớp through ("BC" vs cụm "DE = R") → bỏ qua', () => {
    expect(run('Kéo dài AB lấy C sao cho DE = R.')).toEqual([]);
  });

  it('không có từ khoá kéo dài / tia đối → bỏ qua', () => {
    expect(run('Cho tam giác ABC.')).toEqual([]);
  });

  // ── Issue #46 nhóm A: prime "C′" GIỮ NGUYÊN (tên riêng đa-ký-tự) ──────────
  // Trước fix: prime bị STRIP → "C" → trùng đỉnh C → addPoint dedup drop →
  // escalate. Sau fix: prime được giữ + normalize ′(U+2032)→'(U+0027) ⇒ "C'"
  // là tên RIÊNG, khác đỉnh "C". Mốc đo cũng so khớp theo tên đã normalize.

  it("điểm C' (ASCII apostrophe) trong cụm BC' = R → name GIỮ prime \"C'\"", () => {
    const m = run("Trên tia đối của tia BA lấy điểm C' sao cho BC' = R.");
    expect(m.length).toBe(1);
    const i = constraint(m);
    expect(i.name).toBe("C'");
    expect(i.constraint.from).toBe('A');
    expect(i.constraint.through).toBe('B');
    expect(i.constraint.distance.kind).toBe('circleRadius');
  });

  it("điểm C′ (unicode prime ′) + dấu phẩy → name normalize về \"C'\"", () => {
    const m = run('Trên tia đối của tia BA, lấy điểm C′ sao cho BC′ = R.');
    expect(m.length).toBe(1);
    const i = constraint(m);
    expect(i.name).toBe("C'");
    expect(i.constraint.through).toBe('B');
  });

  it("Kéo dài + điểm C', distance literal → name \"C'\"", () => {
    const m = run("Kéo dài AB, lấy C' sao cho BC' = 2.");
    const i = constraint(m);
    expect(i.name).toBe("C'");
    expect(i.constraint.from).toBe('A');
    expect(i.constraint.through).toBe('B');
    expect(i.constraint.distance).toEqual({ kind: 'literal', value: 2 });
  });

  it('Kéo dài đoạn + prime + phẩy thập phân → name "C\'" + literal 2.5', () => {
    const m = run('Kéo dài đoạn AB về phía B, lấy điểm C′ sao cho BC′ = 2,5.');
    const i = constraint(m);
    expect(i.name).toBe("C'");
    expect(i.constraint.distance).toEqual({ kind: 'literal', value: 2.5 });
  });

  it("mốc đo prime PHẢI khớp tên điểm mới: \"lấy C′ … BD′\" (lệch) → bỏ qua", () => {
    // through = B (single), nhưng cụm "BD′" có newPt "D'" ≠ name "C'" → skip.
    expect(run("Trên tia đối của tia BA lấy điểm C′ sao cho BD′ = R.")).toEqual([]);
  });

  it("điểm mới prime KHÔNG đổi hành vi điểm thường (D không prime vẫn 'D')", () => {
    const m = run('Trên tia đối của tia BA lấy điểm D sao cho BD = R.');
    const i = constraint(m);
    expect(i.name).toBe('D');
  });

  // ── Issue #46 nhóm C: hệ số/bội/offset (scale·base + offset) ──────────────

  it('"BD = 2R" → circleRadius scale 2', () => {
    const m = run('Cho tam giác ABC nội tiếp đường tròn (O; R). Kéo dài AB về phía B lấy điểm D sao cho BD = 2R.');
    expect(m.length).toBe(1);
    const i = constraint(m);
    expect(i.name).toBe('D');
    expect(i.constraint.from).toBe('A');
    expect(i.constraint.through).toBe('B');
    expect(i.constraint.distance).toEqual({ kind: 'circleRadius', circle: 'O', scale: 2 });
  });

  it('"BD = 2·R" (dấu nhân ·) → circleRadius scale 2', () => {
    const m = run('Cho đường tròn (O; R). Kéo dài AB về phía B lấy điểm D sao cho BD = 2·R.');
    const i = constraint(m);
    expect(i.constraint.distance).toEqual({ kind: 'circleRadius', circle: 'O', scale: 2 });
  });

  // DEFER (pre-existing, không hỗ trợ): "2.R" dùng dấu CHẤM làm dấu nhân — bị
  // segmentClauses cắt clause tại '.' (ranh giới câu) → "BD = 2" tách khỏi "R".
  // Không sửa shared infra cho edge-case này. Dùng "2·R" / "2R" (không nhập
  // nhằng) thay thế — cả hai sống sót segmentation, parse scale 2 đúng.

  it('"BD = 2 AB" → segmentLength scale 2 {p1:A, p2:B}', () => {
    const m = run('Cho tam giác ABC. Kéo dài AB về phía B lấy điểm D sao cho BD = 2 AB.');
    expect(m.length).toBe(1);
    const i = constraint(m);
    expect(i.name).toBe('D');
    expect(i.constraint.distance).toEqual({ kind: 'segmentLength', p1: 'A', p2: 'B', scale: 2 });
  });

  it('"BD = 2·AB" / "BD = 2AB" → segmentLength scale 2', () => {
    const dot = constraint(run('Cho tam giác ABC. Kéo dài AB về phía B lấy điểm D sao cho BD = 2·AB.'));
    expect(dot.constraint.distance).toEqual({ kind: 'segmentLength', p1: 'A', p2: 'B', scale: 2 });
    const glued = constraint(run('Cho tam giác ABC. Kéo dài AB về phía B lấy điểm D sao cho BD = 2AB.'));
    expect(glued.constraint.distance).toEqual({ kind: 'segmentLength', p1: 'A', p2: 'B', scale: 2 });
  });

  it('"BC = R + 1" → circleRadius offset 1', () => {
    const m = run('Cho đường tròn (O; R). Trên tia đối của tia BA lấy C sao cho BC = R + 1.');
    const i = constraint(m);
    expect(i.constraint.distance).toEqual({ kind: 'circleRadius', circle: 'O', offset: 1 });
  });

  it('"BC = R - 1" → circleRadius offset -1', () => {
    const m = run('Cho đường tròn (O; R). Trên tia đối của tia BA lấy C sao cho BC = R - 1.');
    const i = constraint(m);
    expect(i.constraint.distance).toEqual({ kind: 'circleRadius', circle: 'O', offset: -1 });
  });

  it('"BD = 2R + 1" → circleRadius scale 2 offset 1', () => {
    const m = run('Cho đường tròn (O; R). Kéo dài AB về phía B lấy điểm D sao cho BD = 2R + 1.');
    const i = constraint(m);
    expect(i.constraint.distance).toEqual({ kind: 'circleRadius', circle: 'O', scale: 2, offset: 1 });
  });

  it('"BD = 3 AB" (hệ số đoạn lớn) → segmentLength scale 3', () => {
    const m = run('Cho tam giác ABC. Kéo dài AB về phía B lấy điểm D sao cho BD = 3 AB.');
    const i = constraint(m);
    expect(i.constraint.distance).toEqual({ kind: 'segmentLength', p1: 'A', p2: 'B', scale: 3 });
  });

  // GIỮ NGUYÊN hành vi cũ (scale/offset absent) — additive guard.
  it('"BC = R" KHÔNG có scale/offset (giữ form cũ)', () => {
    const m = run('Cho đường tròn (O; R) và dây AB. Kéo dài AB về phía B, lấy điểm C sao cho BC = R.');
    const i = constraint(m);
    expect(i.constraint.distance).toEqual({ kind: 'circleRadius', circle: 'O' });
  });

  it('"BC = AB" KHÔNG có scale/offset (giữ form cũ)', () => {
    const m = run('Kéo dài AB lấy C sao cho BC = AB.');
    const i = constraint(m);
    expect(i.constraint.distance).toEqual({ kind: 'segmentLength', p1: 'A', p2: 'B' });
  });

  it('"BC = 3" literal KHÔNG có scale/offset (giữ form cũ)', () => {
    const m = run('Trên tia đối của tia BA lấy điểm C sao cho BC = 3.');
    const i = constraint(m);
    expect(i.constraint.distance).toEqual({ kind: 'literal', value: 3 });
  });

  // Escalate-safe: mơ hồ / tích 2 đại lượng / âm.
  it('"BC = R·AB" (tích 2 đại lượng) → bỏ qua escalate', () => {
    expect(run('Cho đường tròn (O; R). Trên tia đối của tia BA lấy C sao cho BC = R·AB.')).toEqual([]);
  });

  it('"BC = -3" (âm) → bỏ qua escalate', () => {
    expect(run('Trên tia đối của tia BA lấy C sao cho BC = -3.')).toEqual([]);
  });

  it('"BC = AB/2" (chia) → bỏ qua escalate', () => {
    expect(run('Trên tia đối của tia BA lấy C sao cho BC = AB/2.')).toEqual([]);
  });

  it('"BC = R - 5" làm d ≤ 0 với base nhỏ vẫn parse offset (render guard riêng)', () => {
    // Offset âm hợp lệ về cú pháp (R-5); d hiệu dụng phụ thuộc R runtime.
    // Rule chỉ chốt offset; guard d>0 ở render. Ở đây chỉ verify parse offset -5.
    const m = run('Cho đường tròn (O; R). Trên tia đối của tia BA lấy C sao cho BC = R - 5.');
    const i = constraint(m);
    expect(i.constraint.distance).toEqual({ kind: 'circleRadius', circle: 'O', offset: -5 });
  });
});

describe('pointAtDistanceRule — EN (issue #46 group B)', () => {
  it('"On ray BA extended beyond A, take D such that AD = AB." → from=B, through=A, segmentLength', () => {
    const m = run('On ray BA extended beyond A, take D such that AD = AB.');
    expect(m.length).toBe(1);
    const i = constraint(m);
    expect(i.name).toBe('D');
    expect(i.constraint.kind).toBe('pointAtDistance');
    // ray BA extended beyond A: from=B(1st), through=A(2nd) — extend past far end A.
    expect(i.constraint.from).toBe('B');
    expect(i.constraint.through).toBe('A');
    expect(i.constraint.distance).toEqual({ kind: 'segmentLength', p1: 'A', p2: 'B' });
    expect(m[0].clauseIds.length).toBe(1);
  });

  it('"On ray AB extended beyond B, take D such that BD = 5." → from=A, through=B, literal 5', () => {
    const m = run('On ray AB extended beyond B, take D such that BD = 5.');
    expect(m.length).toBe(1);
    const i = constraint(m);
    expect(i.name).toBe('D');
    expect(i.constraint.from).toBe('A');
    expect(i.constraint.through).toBe('B');
    expect(i.constraint.distance).toEqual({ kind: 'literal', value: 5 });
  });

  it('"Extend AB beyond B to D such that BD = AB." → from=A, through=B, segmentLength, name=D', () => {
    const m = run('Extend AB beyond B to D such that BD = AB.');
    expect(m.length).toBe(1);
    const i = constraint(m);
    expect(i.name).toBe('D');
    expect(i.constraint.from).toBe('A');
    expect(i.constraint.through).toBe('B');
    expect(i.constraint.distance).toEqual({ kind: 'segmentLength', p1: 'A', p2: 'B' });
  });

  it('"On the opposite ray of ray BA, take D such that BD = AB." → from=A, through=B (mirror tia đối)', () => {
    const m = run('On the opposite ray of ray BA, take D such that BD = AB.');
    expect(m.length).toBe(1);
    const i = constraint(m);
    expect(i.name).toBe('D');
    // opposite ray of ray BA: from=A(2nd), through=B(1st).
    expect(i.constraint.from).toBe('A');
    expect(i.constraint.through).toBe('B');
    expect(i.constraint.distance).toEqual({ kind: 'segmentLength', p1: 'A', p2: 'B' });
  });

  it('"Circle (O; 3). On ray AB extended beyond B, take D such that BD = R." → circleRadius {circle:O}', () => {
    const m = run('Circle (O; 3). On ray AB extended beyond B, take D such that BD = R.');
    expect(m.length).toBe(1);
    const i = constraint(m);
    expect(i.name).toBe('D');
    expect(i.constraint.from).toBe('A');
    expect(i.constraint.through).toBe('B');
    expect(i.constraint.distance).toEqual({ kind: 'circleRadius', circle: 'O' });
  });

  // --- Escalate-safe (rule emits nothing → pipeline escalates) ---------------

  it('thiếu khoảng cách "On ray BA extended beyond A, take D." → []', () => {
    expect(run('On ray BA extended beyond A, take D.')).toEqual([]);
  });

  it('hướng lệch "beyond C" ≠ ray 2nd letter A → RAY_EXTENDED validation fails → []', () => {
    expect(run('On ray BA extended beyond C, take D such that CD = 5.')).toEqual([]);
  });

  // --- VN regression guard (VN path unchanged) -------------------------------

  it('VN regression: "Kéo dài AB lấy C sao cho BC = AB." vẫn from=A, through=B, segmentLength', () => {
    const m = run('Kéo dài AB lấy C sao cho BC = AB.');
    expect(m.length).toBe(1);
    const i = constraint(m);
    expect(i.name).toBe('C');
    expect(i.constraint.from).toBe('A');
    expect(i.constraint.through).toBe('B');
    expect(i.constraint.distance).toEqual({ kind: 'segmentLength', p1: 'A', p2: 'B' });
  });
});
