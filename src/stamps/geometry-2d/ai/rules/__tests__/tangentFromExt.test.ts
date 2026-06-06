import { tangentFromExtRule } from '../tangentFromExt';
import { segmentClauses } from '../../deterministic/coverage';

function run(problem: string) {
  return tangentFromExtRule.match({ problem, clauses: segmentClauses(problem) });
}

function only(problem: string) {
  const m = run(problem);
  expect(m.length).toBe(1);
  return m[0];
}

describe('tangentFromExtRule', () => {
  it('"Kẻ hai tiếp tuyến từ A đến (O)" → tangentFromExt both', () => {
    const match = only('Cho đường tròn (O) và điểm A nằm ngoài. Kẻ hai tiếp tuyến từ A đến (O)');
    const intent = match.intents[0] as any;
    expect(intent.op).toBe('draw-line');
    expect(intent.kind).toBe('tangentFromExt');
    expect(intent.from).toBe('A');
    expect(intent.circle).toBe('O');
    expect(intent.which).toBe('both');
    // claim đúng clause chứa lệnh kẻ tiếp tuyến (id 1), không phải clause "Cho ...".
    expect(match.clauseIds).toEqual([1]);
  });

  it('"Vẽ tiếp tuyến từ điểm A tới đường tròn O" (không ngoặc) → from A circle O', () => {
    const intent = only('Vẽ tiếp tuyến từ điểm A tới đường tròn O').intents[0] as any;
    expect(intent.kind).toBe('tangentFromExt');
    expect(intent.from).toBe('A');
    expect(intent.circle).toBe('O');
    expect(intent.which).toBe('both');
  });

  it('"Kẻ tiếp tuyến từ A với đường tròn O" (giới từ "với", 1 nhánh) → both', () => {
    const intent = only('Kẻ tiếp tuyến từ A với đường tròn O').intents[0] as any;
    expect(intent.from).toBe('A');
    expect(intent.circle).toBe('O');
    expect(intent.which).toBe('both');
  });

  it('biến thể đảo "Từ A vẽ tiếp tuyến với (O)" → from A circle O', () => {
    const intent = only('Từ A vẽ tiếp tuyến với (O)').intents[0] as any;
    expect(intent.kind).toBe('tangentFromExt');
    expect(intent.from).toBe('A');
    expect(intent.circle).toBe('O');
  });

  it('biến thể đảo dài "Từ điểm A nằm ngoài đường tròn (O), kẻ hai tiếp tuyến đến (O)"', () => {
    const intent = only('Từ điểm A nằm ngoài đường tròn (O), kẻ hai tiếp tuyến đến (O)').intents[0] as any;
    expect(intent.from).toBe('A');
    expect(intent.circle).toBe('O');
    expect(intent.which).toBe('both');
  });

  it('điểm + tâm chữ khác "Vẽ hai tiếp tuyến từ P đến (I)" → from P circle I', () => {
    const intent = only('Vẽ hai tiếp tuyến từ P đến (I)').intents[0] as any;
    expect(intent.from).toBe('P');
    expect(intent.circle).toBe('I');
  });

  it('"tiếp tuyến TẠI A của (O)" KHÔNG match (đó là tangentAt, không phải từ điểm ngoài)', () => {
    expect(run('Vẽ tiếp tuyến tại A của (O)')).toEqual([]);
  });

  it('không có "tiếp tuyến" → không match', () => {
    expect(run('Cho tam giác ABC nội tiếp đường tròn (O)')).toEqual([]);
  });
});
