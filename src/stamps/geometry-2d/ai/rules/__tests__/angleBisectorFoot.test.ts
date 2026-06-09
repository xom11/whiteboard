import { angleBisectorFootRule } from '../angleBisectorFoot';
import { segmentClauses } from '../../deterministic/coverage';

function run(problem: string) {
  return angleBisectorFootRule.match({ problem, clauses: segmentClauses(problem) });
}

function only(problem: string) {
  const m = run(problem);
  expect(m.length).toBe(1);
  return m[0].intents[0] as any;
}

describe('angleBisectorFootRule', () => {
  it('"D là chân đường phân giác từ A" (suy cạnh đối BC) → angleBisectorFoot D from=A onLine=BC', () => {
    const i = only('Cho tam giác ABC. Gọi D là chân đường phân giác từ A.');
    expect(i.op).toBe('add-point');
    expect(i.name).toBe('D');
    expect(i.constraint.kind).toBe('angleBisectorFoot');
    expect(i.constraint.from).toBe('A');
    expect(i.constraint.onLine).toBe('BC');
  });

  it('"chân đường phân giác trong kẻ từ A đến BC" (nêu rõ cạnh) → from=A onLine=BC', () => {
    const i = only('Cho tam giác ABC. Gọi D là chân đường phân giác trong kẻ từ A đến BC.');
    expect(i.constraint.kind).toBe('angleBisectorFoot');
    expect(i.constraint.from).toBe('A');
    expect(i.constraint.onLine).toBe('BC');
  });

  it('"D là chân phân giác góc A" → from=A onLine=BC', () => {
    const i = only('Cho tam giác ABC, D là chân phân giác góc A.');
    expect(i.constraint.kind).toBe('angleBisectorFoot');
    expect(i.constraint.from).toBe('A');
    expect(i.constraint.onLine).toBe('BC');
  });

  it('đỉnh khác (góc B) → onLine = AC (cạnh đối B)', () => {
    const i = only('Cho tam giác ABC. Gọi E là chân đường phân giác từ B.');
    expect(i.name).toBe('E');
    expect(i.constraint.from).toBe('B');
    expect(i.constraint.onLine).toBe('AC');
  });

  it('"phân giác ngoài từ A" → externalAngleBisectorFoot', () => {
    const i = only('Cho tam giác ABC. Gọi D là chân đường phân giác ngoài từ A.');
    expect(i.constraint.kind).toBe('externalAngleBisectorFoot');
    expect(i.constraint.from).toBe('A');
    expect(i.constraint.onLine).toBe('BC');
  });

  it('nêu rõ cạnh nhưng không có tam giác (từ A đến BC) → vẫn dựng được', () => {
    const i = only('Lấy D là chân đường phân giác từ A đến BC.');
    expect(i.constraint.from).toBe('A');
    expect(i.constraint.onLine).toBe('BC');
  });

  it('không có cạnh nêu rõ + không có tam giác → escalate (không match)', () => {
    expect(run('Gọi D là chân đường phân giác từ A.').length).toBe(0);
  });

  it('đỉnh ngoài tam giác (không suy được cạnh đối) → escalate', () => {
    expect(run('Cho tam giác ABC. Gọi D là chân đường phân giác từ E.').length).toBe(0);
  });

  it('không trích được tên chân ("X là") → bỏ qua', () => {
    expect(run('Cho tam giác ABC. Vẽ chân đường phân giác từ A.').length).toBe(0);
  });

  it('"phân giác AD" (cevian, không có "chân") → rule này không match', () => {
    expect(run('Cho tam giác ABC. Vẽ phân giác AD.').length).toBe(0);
  });

  it('"Vẽ phân giác góc A" (không "chân", không tên) → rule này không match', () => {
    expect(run('Cho tam giác ABC. Vẽ tia phân giác của góc A.').length).toBe(0);
  });
});
