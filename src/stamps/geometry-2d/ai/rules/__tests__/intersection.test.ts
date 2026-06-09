import { intersectionRule } from '../intersection';
import { segmentClauses } from '../../deterministic/coverage';

function run(problem: string) {
  return intersectionRule.match({ problem, clauses: segmentClauses(problem) });
}

function only(problem: string) {
  const m = run(problem);
  expect(m.length).toBe(1);
  return m[0].intents[0] as any;
}

describe('intersectionRule', () => {
  it('"D là giao điểm của AB và CE" → intersection D of=[AB,CE]', () => {
    const i = only('Cho tam giác ABC. Lấy E trên BC. Gọi D là giao điểm của AB và CE.');
    expect(i.op).toBe('add-point');
    expect(i.name).toBe('D');
    expect(i.constraint.kind).toBe('intersection');
    expect(i.constraint.of).toEqual(['AB', 'CE']);
  });

  it('connector "với": "giao điểm của AC với BD"', () => {
    const i = only('Tứ giác ABCD. Gọi I là giao điểm của AC với BD.');
    expect(i.name).toBe('I');
    expect(i.constraint.of).toEqual(['AC', 'BD']);
  });

  it('"AM cắt CN tại K" (tên SAU) → intersection K of=[AM,CN]', () => {
    const i = only('Cho tam giác ABC. AM cắt CN tại K.');
    expect(i.name).toBe('K');
    expect(i.constraint.of).toEqual(['AM', 'CN']);
  });

  it('"AC và BD cắt nhau tại O" → intersection O of=[AC,BD]', () => {
    const i = only('Tứ giác ABCD có hai đường chéo AC và BD cắt nhau tại O.');
    expect(i.name).toBe('O');
    expect(i.constraint.of).toEqual(['AC', 'BD']);
  });

  it('"E, F lần lượt là giao điểm của AB và CD, của AD và BC" → 2 intersection', () => {
    const m = run('Cho tứ giác ABCD. Gọi E, F lần lượt là giao điểm của AB và CD, của AD và BC.');
    expect(m.length).toBe(2);
    const byName: Record<string, any> = {};
    for (const match of m) {
      const it = match.intents[0] as any;
      byName[it.name] = it;
    }
    expect(byName.E.constraint.of).toEqual(['AB', 'CD']);
    expect(byName.F.constraint.of).toEqual(['AD', 'BC']);
  });

  it('tiền tố "đường thẳng": "đường thẳng AB cắt đường thẳng CD tại E"', () => {
    const i = only('Đường thẳng AB cắt đường thẳng CD tại E.');
    expect(i.constraint.of).toEqual(['AB', 'CD']);
  });

  it('degenerate: refs chia sẻ đỉnh ("AB cắt AC tại D") → bỏ qua', () => {
    expect(run('Cho tam giác ABC. AB cắt AC tại D.').length).toBe(0);
  });

  it('vòng: tên nằm trong ref ("D là giao điểm của AD và BC") → bỏ qua', () => {
    expect(run('Cho tam giác ABC. Gọi D là giao điểm của AD và BC.').length).toBe(0);
  });

  it('giao 2 đường tròn "(O) và (O\')" (không phải cặp đỉnh) → không match (để rule khác)', () => {
    expect(run("Cho hai đường tròn (O) và (O'). Gọi M là giao điểm của (O) và (O').").length).toBe(0);
  });

  it('không có "X là" trước "giao điểm" → bỏ qua (không bịa tên)', () => {
    expect(run('Cho tam giác ABC. Xét giao điểm của AB và CD.').length).toBe(0);
  });

  it('"đôi một cắt nhau" (diameterCirclePairwise) KHÔNG bị match nhầm', () => {
    // "AB, AC đôi một cắt nhau" — comma (không "và") + "đôi một" chen vào.
    expect(
      run('Đường tròn đường kính AB, AC đôi một cắt nhau tại M, N.').length,
    ).toBe(0);
  });
});
