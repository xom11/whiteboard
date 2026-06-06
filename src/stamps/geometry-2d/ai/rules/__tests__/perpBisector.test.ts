import { perpBisectorRule } from '../perpBisector';
import { segmentClauses } from '../../deterministic/coverage';

function run(problem: string) {
  return perpBisectorRule.match({ problem, clauses: segmentClauses(problem) });
}

function first(problem: string) {
  const m = run(problem);
  expect(m.length).toBe(1);
  return m[0].intents[0] as any;
}

describe('perpBisectorRule', () => {
  it('"đường trung trực của BC" → connect B C perpBisector', () => {
    const m = run('Vẽ đường trung trực của BC');
    expect(m.length).toBe(1);
    const intent = m[0].intents[0] as any;
    expect(intent.op).toBe('connect');
    expect(intent.from).toBe('B');
    expect(intent.to).toBe('C');
    expect(intent.style).toBe('perpBisector');
    expect(m[0].clauseIds.length).toBe(1);
  });

  it('"trung trực AB" (không "đường", không "của") → connect A B', () => {
    const intent = first('Kẻ trung trực AB');
    expect(intent.from).toBe('A');
    expect(intent.to).toBe('B');
    expect(intent.style).toBe('perpBisector');
  });

  it('"d là đường trung trực BC" → connect B C (tên d bỏ qua)', () => {
    const intent = first('Gọi d là đường trung trực BC');
    expect(intent.from).toBe('B');
    expect(intent.to).toBe('C');
    expect(intent.style).toBe('perpBisector');
  });

  it('"đường trung trực của đoạn thẳng MN" → connect M N', () => {
    const intent = first('Dựng đường trung trực của đoạn thẳng MN');
    expect(intent.from).toBe('M');
    expect(intent.to).toBe('N');
    expect(intent.style).toBe('perpBisector');
  });

  it('"trung trực của cạnh AC" → connect A C', () => {
    const intent = first('Vẽ trung trực của cạnh AC');
    expect(intent.from).toBe('A');
    expect(intent.to).toBe('C');
  });

  it('"trung trực đoạn BD" → connect B D', () => {
    const intent = first('Kẻ trung trực đoạn BD');
    expect(intent.from).toBe('B');
    expect(intent.to).toBe('D');
  });

  it('không có cặp đỉnh → bỏ qua (escalate), không emit intent', () => {
    const m = run('Vẽ đường trung trực của tam giác');
    expect(m.length).toBe(0);
  });

  it('đề không có "trung trực" → không match', () => {
    const m = run('Cho tam giác ABC');
    expect(m.length).toBe(0);
  });

  it('claim đúng clause id chứa cụm trung trực', () => {
    const problem = 'Cho tam giác ABC, vẽ đường trung trực của BC';
    const clauses = segmentClauses(problem);
    const m = perpBisectorRule.match({ problem, clauses });
    expect(m.length).toBe(1);
    const claimed = m[0].clauseIds[0];
    const claimedText = clauses.find((c) => c.id === claimed)!.text;
    expect(claimedText).toMatch(/trung\s*trực/u);
  });
});
