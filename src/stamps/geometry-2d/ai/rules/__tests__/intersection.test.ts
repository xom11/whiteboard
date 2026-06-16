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
  // vao10: "kéo dài" xen giữa + locative "ở".
  it('"BE kéo dài cắt AD ở M" → M = giao(BE, AD)', () => {
    const i = only('BE kéo dài cắt AD ở M');
    expect(i.name).toBe('M');
    expect(i.constraint).toMatchObject({ kind: 'intersection' });
  });

  it('"AE và BC kéo dài cắt nhau tại D"', () => {
    const i = only('AE và BC kéo dài cắt nhau tại D');
    expect(i.name).toBe('D');
    expect(i.constraint).toMatchObject({ kind: 'intersection' });
  });

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

  describe('distributive 1 đường ∩ 2 đường + 2 đường ∩ 1 đường', () => {
    const pairs = (p: string) =>
      run(p).flatMap((m) => m.intents).map((i: any) => `${i.name}:${i.constraint.of.join('∩')}`);

    it('"MA cắt DB, DC theo thứ tự tại X, Z" → X=MA∩DB, Z=MA∩DC', () => {
      expect(pairs('MA cắt DB, DC theo thứ tự tại X, Z')).toEqual(['X:MA∩DB', 'Z:MA∩DC']);
    });

    it('"TC, TB lần lượt cắt EF tại P, Q" → P=TC∩EF, Q=TB∩EF', () => {
      expect(pairs('TC, TB lần lượt cắt EF tại P, Q')).toEqual(['P:TC∩EF', 'Q:TB∩EF']);
    });

    // httcd:156 — 2 cạnh nối "và" + điểm lặp "tại": "BE cắt AD và AC lần lượt tại I và tại K".
    it('"BE cắt AD và AC lần lượt tại I và tại K" → I=BE∩AD, K=BE∩AC', () => {
      expect(pairs('Nối BE cắt AD và AC lần lượt tại I và tại K')).toEqual(['I:BE∩AD', 'K:BE∩AC']);
    });
  });
});

describe('intersection — "cắt nhau" comma + "đôi một" guard', () => {
  const names = (p: string) => intersectionRule.match({ problem: p, clauses: segmentClauses(p) })
    .flatMap((m) => m.intents).map((i: any) => i.name).sort();
  it('"AB, CD cắt nhau tại E" (phẩy) → E', () => {
    expect(names('AB, CD cắt nhau tại E')).toEqual(['E']);
  });
  it('"đôi một cắt nhau" vẫn KHÔNG match', () => {
    expect(names('Đường tròn đường kính AB, AC đôi một cắt nhau tại M, N')).toEqual([]);
  });
});

describe('intersection — "giao điểm của X và Y là Z" (tên sau)', () => {
  it('"Gọi giao điểm của CE và AB là M" → M', () => {
    const m = intersectionRule.match({ problem: 'Gọi giao điểm của CE và AB là M', clauses: segmentClauses('Gọi giao điểm của CE và AB là M') });
    const i = m.flatMap((x) => x.intents)[0] as any;
    expect(i.name).toBe('M');
    expect(i.constraint).toEqual({ kind: 'intersection', of: ['CE', 'AB'] });
  });
});
