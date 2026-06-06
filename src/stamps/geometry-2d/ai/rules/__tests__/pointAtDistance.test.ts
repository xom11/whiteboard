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

  // ── Mức 2: điểm mới có dấu phẩy/prime (C', C′) trong DIST_CLAUSE ──

  it("điểm C' (ASCII apostrophe) trong cụm BC' = R → render", () => {
    const m = run("Trên tia đối của tia BA lấy điểm C' sao cho BC' = R.");
    expect(m.length).toBe(1);
    const i = constraint(m);
    expect(i.name).toBe('C');
    expect(i.constraint.from).toBe('A');
    expect(i.constraint.through).toBe('B');
    expect(i.constraint.distance.kind).toBe('circleRadius');
  });

  it('điểm C′ (unicode prime ′) + dấu phẩy → render', () => {
    const m = run('Trên tia đối của tia BA, lấy điểm C′ sao cho BC′ = R.');
    expect(m.length).toBe(1);
    const i = constraint(m);
    expect(i.name).toBe('C');
    expect(i.constraint.through).toBe('B');
  });

  it("Kéo dài + điểm C', distance literal → render", () => {
    const m = run("Kéo dài AB, lấy C' sao cho BC' = 2.");
    const i = constraint(m);
    expect(i.name).toBe('C');
    expect(i.constraint.from).toBe('A');
    expect(i.constraint.through).toBe('B');
    expect(i.constraint.distance).toEqual({ kind: 'literal', value: 2 });
  });

  it('Kéo dài đoạn + prime + phẩy thập phân → literal 2.5', () => {
    const m = run('Kéo dài đoạn AB về phía B, lấy điểm C′ sao cho BC′ = 2,5.');
    const i = constraint(m);
    expect(i.name).toBe('C');
    expect(i.constraint.distance).toEqual({ kind: 'literal', value: 2.5 });
  });
});
