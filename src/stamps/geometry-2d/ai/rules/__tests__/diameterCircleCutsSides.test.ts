import { diameterCircleCutsSidesRule } from '../diameterCircleCutsSides';
import { segmentClauses } from '../../deterministic/coverage';

function intents(problem: string) {
  return diameterCircleCutsSidesRule
    .match({ problem, clauses: segmentClauses(problem) })
    .flatMap((m) => m.intents as any[]);
}

describe('diameterCircleCutsSidesRule', () => {
  // httcd:111 — dạng XEN KẼ "cắt AB ở N và cắt AC ở M" (lặp "cắt … ở").
  it('"Đường tròn đường kính BC cắt AB ở N và cắt AC ở M" → N=2nd(AB), M=2nd(AC)', () => {
    const all = intents('Cho tam giác ABC nhọn. Đường tròn đường kính BC cắt AB ở N và cắt AC ở M.');
    expect(all).toContainEqual({ op: 'add-point', name: 'N', constraint: { kind: 'secondIntersection', line: 'AB', circle: 'kBC', other: 'B' } });
    expect(all).toContainEqual({ op: 'add-point', name: 'M', constraint: { kind: 'secondIntersection', line: 'AC', circle: 'kBC', other: 'C' } });
  });

  it('đường tròn đường kính BC cắt AB, AC tại M và N → circle + 2 giao điểm thứ hai', () => {
    const problem =
      'Cho tam giác ABC nhọn, không cân (AB < AC), đường tròn đường kính BC cắt AB, AC tại M và N. Gọi O là trung điểm của BC.';
    const all = intents(problem);

    expect(all).toContainEqual({
      op: 'draw-circle',
      name: 'kBC',
      spec: 'diameter',
      endpoints: ['B', 'C'],
    });
    // M = giao thứ hai của AB ∩ (đường kính BC), loại đỉnh chung B.
    expect(all).toContainEqual({
      op: 'add-point',
      name: 'M',
      constraint: { kind: 'secondIntersection', line: 'AB', circle: 'kBC', other: 'B' },
    });
    // N = giao thứ hai của AC ∩ (đường kính BC), loại đỉnh chung C.
    expect(all).toContainEqual({
      op: 'add-point',
      name: 'N',
      constraint: { kind: 'secondIntersection', line: 'AC', circle: 'kBC', other: 'C' },
    });
    // KHÔNG tự dựng tam giác/trung điểm (rule khác lo).
    expect(all.some((i) => i.op === 'draw-shape')).toBe(false);
  });

  it('biến thể "lần lượt" + danh sách dùng "và" giữa cạnh', () => {
    const all = intents(
      'Cho tam giác ABC. Đường tròn đường kính BC cắt AB và AC lần lượt tại M, N.',
    );
    expect(all).toContainEqual({
      op: 'add-point',
      name: 'M',
      constraint: { kind: 'secondIntersection', line: 'AB', circle: 'kBC', other: 'B' },
    });
    expect(all).toContainEqual({
      op: 'add-point',
      name: 'N',
      constraint: { kind: 'secondIntersection', line: 'AC', circle: 'kBC', other: 'C' },
    });
  });

  // vao10:81 — dấu phẩy giữa "đường kính AH" và "cắt": "đường kính AH, cắt AB, AC …".
  it('phẩy xen giữa: "đường tròn tâm O đường kính AH, cắt AB, AC lần lượt tại M và N"', () => {
    const all = intents(
      'Cho tam giác ABC vuông tại A, đường cao AH. Vẽ đường tròn tâm O đường kính AH, cắt AB, AC lần lượt tại M và N.',
    );
    expect(all).toContainEqual({ op: 'add-point', name: 'M', constraint: { kind: 'secondIntersection', line: 'AB', circle: 'kAH', other: 'A' } });
    expect(all).toContainEqual({ op: 'add-point', name: 'N', constraint: { kind: 'secondIntersection', line: 'AC', circle: 'kAH', other: 'A' } });
  });

  // httcd:2 — đại từ "nó" + "theo thứ tự" + "ở": "(O) đường kính BC, nó cắt các cạnh AB, AC theo thứ tự ở D và E".
  it('"nó" + "theo thứ tự" + "ở": "(O) đường kính BC, nó cắt các cạnh AB, AC theo thứ tự ở D và E"', () => {
    const all = intents(
      'Cho tam giác ABC có 3 góc nhọn. Vẽ (O) đường kính BC, nó cắt các cạnh AB, AC theo thứ tự ở D và E.',
    );
    expect(all).toContainEqual({ op: 'add-point', name: 'D', constraint: { kind: 'secondIntersection', line: 'AB', circle: 'kBC', other: 'B' } });
    expect(all).toContainEqual({ op: 'add-point', name: 'E', constraint: { kind: 'secondIntersection', line: 'AC', circle: 'kBC', other: 'C' } });
  });

  it('một cạnh một điểm: "cắt AB tại M"', () => {
    const all = intents('Cho tam giác ABC. Đường tròn đường kính BC cắt cạnh AB tại M.');
    expect(all).toContainEqual({
      op: 'draw-circle',
      name: 'kBC',
      spec: 'diameter',
      endpoints: ['B', 'C'],
    });
    expect(all).toContainEqual({
      op: 'add-point',
      name: 'M',
      constraint: { kind: 'secondIntersection', line: 'AB', circle: 'kBC', other: 'B' },
    });
    expect(all.filter((i) => i.op === 'add-point')).toHaveLength(1);
  });

  it('claim clause chứa construct cho coverage gate', () => {
    const problem = 'Cho tam giác ABC. Đường tròn đường kính BC cắt AB, AC tại M, N.';
    const clauses = segmentClauses(problem);
    const matches = diameterCircleCutsSidesRule.match({ problem, clauses });
    expect(matches).toHaveLength(1);
    // Clause chứa "đường tròn đường kính".
    const claimed = clauses.find((c) => matches[0].clauseIds.includes(c.id));
    expect(claimed?.text).toMatch(/[Đđ]ường\s*tròn\s+đường\s*kính/u);
  });

  it('fail-safe: số cạnh ≠ số điểm → bỏ qua (escalate)', () => {
    expect(intents('Đường tròn đường kính BC cắt AB, AC tại M.')).toEqual([]);
  });

  it('fail-safe: cạnh KHÔNG chia sẻ đỉnh với đường kính → bỏ qua', () => {
    // AD không chung đỉnh nào với BC → không xác định điểm chung → escalate.
    expect(intents('Đường tròn đường kính BC cắt AD tại M.')).toEqual([]);
  });

  it('fail-safe: cạnh trùng đường kính (chia sẻ 2 đỉnh) → bỏ qua', () => {
    expect(intents('Đường tròn đường kính BC cắt BC tại M.')).toEqual([]);
  });

  it('"nửa đường tròn" prefix → vẫn nhận', () => {
    const all = intents('Cho tam giác ABC. Nửa đường tròn đường kính BC cắt AB tại M.');
    expect(all).toContainEqual({ op: 'draw-circle', name: 'kBC', spec: 'diameter', endpoints: ['B', 'C'] });
    expect(all).toContainEqual({
      op: 'add-point', name: 'M',
      constraint: { kind: 'secondIntersection', line: 'AB', circle: 'kBC', other: 'B' },
    });
  });

  it('Bài 13: hai nửa đường tròn trong cùng câu → 2 circle + 2 giao', () => {
    const all = intents(
      'Vẽ nửa đường tròn đường kính BH cắt AB tại E, Nửa đường tròn đường kính HC cắt AC tại F.',
    );
    expect(all).toContainEqual({ op: 'draw-circle', name: 'kBH', spec: 'diameter', endpoints: ['B', 'H'] });
    expect(all).toContainEqual({ op: 'draw-circle', name: 'kHC', spec: 'diameter', endpoints: ['H', 'C'] });
    expect(all).toContainEqual({
      op: 'add-point', name: 'E',
      constraint: { kind: 'secondIntersection', line: 'AB', circle: 'kBH', other: 'B' },
    });
    expect(all).toContainEqual({
      op: 'add-point', name: 'F',
      constraint: { kind: 'secondIntersection', line: 'AC', circle: 'kHC', other: 'C' },
    });
  });
});
