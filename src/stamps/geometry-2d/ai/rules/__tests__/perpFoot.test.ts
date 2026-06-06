import { perpFootRule } from '../perpFoot';
import { segmentClauses } from '../../deterministic/coverage';

function run(problem: string) {
  return perpFootRule.match({ problem, clauses: segmentClauses(problem) });
}

function firstPoint(problem: string) {
  const m = run(problem);
  expect(m.length).toBeGreaterThanOrEqual(1);
  return m[0].intents[0] as any;
}

describe('perpFootRule', () => {
  it('"hình chiếu vuông góc của A trên BC" → perpFoot from A onLine BC', () => {
    const intent = firstPoint('Gọi H là hình chiếu vuông góc của A trên BC');
    expect(intent.op).toBe('add-point');
    expect(intent.name).toBe('H');
    expect(intent.constraint.kind).toBe('perpFoot');
    expect(intent.constraint.from).toBe('A');
    expect(intent.constraint.onLine).toBe('BC');
  });

  it('"hình chiếu của A lên cạnh BC" (bỏ "vuông góc", có tiền tố cạnh)', () => {
    const intent = firstPoint('Gọi H là hình chiếu của A lên cạnh BC');
    expect(intent.constraint.from).toBe('A');
    expect(intent.constraint.onLine).toBe('BC');
  });

  it('"hình chiếu của A xuống đường thẳng BC"', () => {
    const intent = firstPoint('Lấy K là hình chiếu của A xuống đường thẳng BC');
    expect(intent.name).toBe('K');
    expect(intent.constraint.onLine).toBe('BC');
  });

  it('"chân đường vuông góc hạ từ A đến BC"', () => {
    const intent = firstPoint('Gọi H là chân đường vuông góc hạ từ A đến BC');
    expect(intent.constraint.kind).toBe('perpFoot');
    expect(intent.constraint.from).toBe('A');
    expect(intent.constraint.onLine).toBe('BC');
  });

  it('"chân đường vuông góc kẻ từ A xuống BC"', () => {
    const intent = firstPoint('Dựng H là chân đường vuông góc kẻ từ A xuống BC');
    expect(intent.constraint.from).toBe('A');
    expect(intent.constraint.onLine).toBe('BC');
  });

  it('"chân đường cao kẻ từ A xuống cạnh BC"', () => {
    const intent = firstPoint('Gọi H là chân đường cao kẻ từ A xuống cạnh BC');
    expect(intent.constraint.kind).toBe('perpFoot');
    expect(intent.constraint.onLine).toBe('BC');
  });

  it('onLine là tên đường 1 ký tự (giữ nguyên token)', () => {
    const intent = firstPoint('Gọi H là hình chiếu của A trên đường thẳng D');
    expect(intent.constraint.onLine).toBe('D');
  });

  it('claim đúng clause id để coverage tính phủ', () => {
    const problem = 'Cho tam giác ABC. Gọi H là hình chiếu vuông góc của A trên BC';
    const clauses = segmentClauses(problem);
    const m = perpFootRule.match({ problem, clauses });
    expect(m.length).toBe(1);
    // clause chứa "hình chiếu" là clause thứ 2 (id 1)
    const claimed = clauses.find((c) => c.text.includes('hình chiếu'))!;
    expect(m[0].clauseIds).toEqual([claimed.id]);
  });

  it('không trích được tên điểm → bỏ qua (escalate AI)', () => {
    // không có "X là" ngay trước cụm → bind tên cục bộ fail
    const m = run('hình chiếu vuông góc của A trên BC');
    expect(m.length).toBe(0);
  });

  // ── Bug fixes (adversarial) ────────────────────────────────────────────────

  it('bind tên foot CỤC BỘ, không lấy lời dẫn đầu clause', () => {
    // "Gọi N là điểm bất kỳ, H là hình chiếu của A trên BC": foot phải là H, KHÔNG phải N.
    const intent = firstPoint('Gọi N là điểm bất kỳ, H là hình chiếu của A trên BC');
    expect(intent.name).toBe('H');
    expect(intent.constraint.kind).toBe('perpFoot');
    expect(intent.constraint.from).toBe('A');
    expect(intent.constraint.onLine).toBe('BC');
  });

  it('"H, K lần lượt là hình chiếu của B trên AC và của C trên AB" → 2 foot', () => {
    const m = run('H, K lần lượt là hình chiếu của B trên AC và của C trên AB');
    const intents = m.flatMap((x) => x.intents) as any[];
    expect(intents.length).toBe(2);
    const byName = Object.fromEntries(intents.map((i) => [i.name, i]));
    expect(byName.H.constraint).toMatchObject({ kind: 'perpFoot', from: 'B', onLine: 'AC' });
    expect(byName.K.constraint).toMatchObject({ kind: 'perpFoot', from: 'C', onLine: 'AB' });
  });

  it('"H, K lần lượt là chân đường cao kẻ từ B đến AC và từ C đến AB" → 2 foot', () => {
    const m = run('H, K lần lượt là chân đường cao kẻ từ B đến AC và từ C đến AB');
    const intents = m.flatMap((x) => x.intents) as any[];
    expect(intents.length).toBe(2);
    const byName = Object.fromEntries(intents.map((i) => [i.name, i]));
    expect(byName.H.constraint).toMatchObject({ kind: 'perpFoot', from: 'B', onLine: 'AC' });
    expect(byName.K.constraint).toMatchObject({ kind: 'perpFoot', from: 'C', onLine: 'AB' });
  });

  it('"trung điểm của hình chiếu A trên BC" → không claim (đổi nghĩa, escalate)', () => {
    const m = run('Gọi M là trung điểm của hình chiếu A trên BC');
    expect(m.length).toBe(0);
  });

  it('"trung điểm hình chiếu …" (không "của") cũng skip', () => {
    const m = run('Gọi M là trung điểm hình chiếu A trên BC');
    expect(m.length).toBe(0);
  });

  // ── Mức 2: "Kẻ AH vuông góc BC tại H" / "Kẻ AH ⊥ BC" (không dùng "hình chiếu") ──

  it('"Kẻ AH vuông góc BC tại H" → perpFoot H from A onLine BC', () => {
    const intent = firstPoint('Kẻ AH vuông góc BC tại H');
    expect(intent.op).toBe('add-point');
    expect(intent.name).toBe('H');
    expect(intent.constraint).toEqual({ kind: 'perpFoot', from: 'A', onLine: 'BC' });
  });

  it('"Kẻ AH ⊥ BC tại H" (ký hiệu ⊥) → perpFoot H from A', () => {
    const intent = firstPoint('Kẻ AH ⊥ BC tại H');
    expect(intent.name).toBe('H');
    expect(intent.constraint).toEqual({ kind: 'perpFoot', from: 'A', onLine: 'BC' });
  });

  it('"Vẽ AH vuông góc với BC" (không "tại") → foot H từ cặp AH', () => {
    const intent = firstPoint('Vẽ AH vuông góc với BC');
    expect(intent.name).toBe('H');
    expect(intent.constraint).toEqual({ kind: 'perpFoot', from: 'A', onLine: 'BC' });
  });

  it('"Dựng AH vuông góc với cạnh BC tại H"', () => {
    const intent = firstPoint('Dựng AH vuông góc với cạnh BC tại H');
    expect(intent.constraint).toEqual({ kind: 'perpFoot', from: 'A', onLine: 'BC' });
  });

  it('CHỈ emit add-point (KHÔNG connect — connect.ts lo đoạn AH)', () => {
    const m = run('Kẻ AH ⊥ BC tại H');
    const intents = m.flatMap((x) => x.intents) as any[];
    expect(intents.every((i) => i.op === 'add-point')).toBe(true);
  });

  it('FAIL-SAFE: "tại K" ≠ chân H → xung đột → escalate', () => {
    expect(run('Kẻ AH vuông góc BC tại K')).toHaveLength(0);
  });

  it('FAIL-SAFE: chân trùng đỉnh onLine ("Kẻ AB ⊥ BC tại B") → escalate', () => {
    expect(run('Kẻ AB ⊥ BC tại B')).toHaveLength(0);
  });
});
