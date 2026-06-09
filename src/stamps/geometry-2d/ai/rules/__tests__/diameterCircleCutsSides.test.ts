import { diameterCircleCutsSidesRule } from '../diameterCircleCutsSides';
import { segmentClauses } from '../../deterministic/coverage';

function intents(problem: string) {
  return diameterCircleCutsSidesRule
    .match({ problem, clauses: segmentClauses(problem) })
    .flatMap((m) => m.intents as any[]);
}

describe('diameterCircleCutsSidesRule', () => {
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
});
