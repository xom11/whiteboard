import { midpointRule } from '../midpoint';
import { segmentClauses } from '../../deterministic/coverage';

function run(problem: string) {
  return midpointRule.match({ problem, clauses: segmentClauses(problem) });
}

function only(problem: string) {
  const m = run(problem);
  expect(m.length).toBe(1);
  return m[0];
}

describe('midpointRule', () => {
  it('"Gọi M là trung điểm BC" → add-point M midpoint of BC', () => {
    const match = only('Gọi M là trung điểm BC');
    const intent = match.intents[0] as any;
    expect(intent.op).toBe('add-point');
    expect(intent.name).toBe('M');
    expect(intent.constraint.kind).toBe('midpoint');
    expect(intent.constraint.of).toBe('BC');
    expect(match.ruleId).toBe('midpoint');
    expect(match.clauseIds).toContain(0);
  });

  it('"M là trung điểm của BC" (có "của") → of BC', () => {
    const intent = only('M là trung điểm của BC').intents[0] as any;
    expect(intent.name).toBe('M');
    expect(intent.constraint).toEqual({ kind: 'midpoint', of: 'BC' });
  });

  it('"trung điểm I của cạnh AB" (tên ĐỨNG SAU) → I, of AB', () => {
    const intent = only('Lấy trung điểm I của cạnh AB').intents[0] as any;
    expect(intent.name).toBe('I');
    expect(intent.constraint).toEqual({ kind: 'midpoint', of: 'AB' });
  });

  it('"trung điểm I của AB" (không có "cạnh") → I, of AB', () => {
    const intent = only('Gọi trung điểm I của AB').intents[0] as any;
    expect(intent.name).toBe('I');
    expect(intent.constraint.of).toBe('AB');
  });

  it('"M trung điểm cạnh BC" (không có "là") → M, of BC', () => {
    const intent = only('M trung điểm cạnh BC').intents[0] as any;
    expect(intent.name).toBe('M');
    expect(intent.constraint).toEqual({ kind: 'midpoint', of: 'BC' });
  });

  it('"Gọi điểm N là trung điểm đoạn AC" → N, of AC', () => {
    const intent = only('Gọi điểm N là trung điểm đoạn AC').intents[0] as any;
    expect(intent.name).toBe('N');
    expect(intent.constraint).toEqual({ kind: 'midpoint', of: 'AC' });
  });

  it('KHÔNG khớp "trung trực" (rule khác)', () => {
    expect(run('Vẽ đường trung trực của BC')).toHaveLength(0);
  });

  it('không trích được cặp đỉnh → bỏ qua (escalate)', () => {
    // "trung điểm" nhưng thiếu cặp 2 đỉnh HOA liền nhau.
    expect(run('Tìm trung điểm của đoạn thẳng')).toHaveLength(0);
  });

  it('nhiều clause → mỗi clause một match độc lập', () => {
    const m = run('Gọi M là trung điểm BC. Gọi N là trung điểm AC');
    expect(m.length).toBe(2);
    expect((m[0].intents[0] as any).name).toBe('M');
    expect((m[1].intents[0] as any).name).toBe('N');
    expect((m[1].intents[0] as any).constraint.of).toBe('AC');
  });
});
