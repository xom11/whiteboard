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

  it('2 trung điểm trong CÙNG 1 clause ("... và ...") → 2 add-point', () => {
    // Bug cũ: chỉ bắt M, drop N. GLOBAL match phải emit cả hai.
    const m = run('Gọi M là trung điểm BC và N là trung điểm AC');
    expect(m.length).toBe(2);
    const byName: Record<string, any> = {};
    for (const match of m) {
      const it = match.intents[0] as any;
      byName[it.name] = it;
    }
    expect(byName.M.constraint).toEqual({ kind: 'midpoint', of: 'BC' });
    expect(byName.N.constraint).toEqual({ kind: 'midpoint', of: 'AC' });
  });

  it('tên bind CỤC BỘ, không lấy intro "Lấy điểm D" làm tên', () => {
    // Bug cũ: extractPointName quét cả clause → gán nhầm 'D'. Phải là 'M'.
    const m = run('Lấy điểm D, gọi M là trung điểm BC');
    expect(m.length).toBe(1);
    const it = m[0].intents[0] as any;
    expect(it.name).toBe('M');
    expect(it.constraint).toEqual({ kind: 'midpoint', of: 'BC' });
  });

  it('2 trung điểm dạng-sau trong CÙNG clause → 2 add-point', () => {
    const m = run('Lấy trung điểm I của AB và trung điểm J của BC');
    expect(m.length).toBe(2);
    const byName: Record<string, any> = {};
    for (const match of m) {
      const it = match.intents[0] as any;
      byName[it.name] = it;
    }
    expect(byName.I.constraint.of).toBe('AB');
    expect(byName.J.constraint.of).toBe('BC');
  });

  it('match thiếu tên cục bộ → bỏ qua match đó (không bịa)', () => {
    // "trung điểm của đoạn thẳng" — không có cặp đỉnh HOA → không claim.
    expect(run('Lấy điểm D, tìm trung điểm của đoạn thẳng')).toHaveLength(0);
  });

  // ── Mức 2: "cạnh huyền" / "đoạn thẳng" chen giữa side-keyword và cặp đỉnh ──

  it('"trung điểm cạnh huyền BC" (dạng trước) → of BC', () => {
    const intent = only('Gọi M là trung điểm cạnh huyền BC').intents[0] as any;
    expect(intent.name).toBe('M');
    expect(intent.constraint).toEqual({ kind: 'midpoint', of: 'BC' });
  });

  it('"M là trung điểm cạnh huyền BC" (không "Gọi") → of BC', () => {
    const intent = only('M là trung điểm cạnh huyền BC').intents[0] as any;
    expect(intent.name).toBe('M');
    expect(intent.constraint.of).toBe('BC');
  });

  it('"trung điểm đoạn thẳng AC" (dạng trước) → of AC', () => {
    const intent = only('N là trung điểm đoạn thẳng AC').intents[0] as any;
    expect(intent.name).toBe('N');
    expect(intent.constraint).toEqual({ kind: 'midpoint', of: 'AC' });
  });

  it('"Dựng điểm H là trung điểm đoạn thẳng EF" → of EF', () => {
    const intent = only('Dựng điểm H là trung điểm đoạn thẳng EF').intents[0] as any;
    expect(intent.name).toBe('H');
    expect(intent.constraint).toEqual({ kind: 'midpoint', of: 'EF' });
  });

  it('"trung điểm I của cạnh huyền AB" (dạng SAU) → I, of AB', () => {
    const intent = only('Lấy trung điểm I của cạnh huyền AB').intents[0] as any;
    expect(intent.name).toBe('I');
    expect(intent.constraint).toEqual({ kind: 'midpoint', of: 'AB' });
  });

  it('"trung điểm I của đoạn thẳng BC" (dạng SAU) → I, of BC', () => {
    const intent = only('Gọi trung điểm I của đoạn thẳng BC').intents[0] as any;
    expect(intent.name).toBe('I');
    expect(intent.constraint.of).toBe('BC');
  });

  it('FAIL-SAFE: "cạnh thẳng" (sai cặp huyền/thẳng) → không claim', () => {
    expect(run('M là trung điểm cạnh thẳng BC')).toHaveLength(0);
  });

  it('FAIL-SAFE: "đoạn huyền" (sai cặp) → không claim', () => {
    expect(run('M là trung điểm đoạn huyền AC')).toHaveLength(0);
  });

  // === EN phrasing (issue #46 group B) ===
  describe('EN', () => {
    it('"M is the midpoint of BC" → M, of BC', () => {
      const intent = only('M is the midpoint of BC').intents[0] as any;
      expect(intent.op).toBe('add-point');
      expect(intent.name).toBe('M');
      expect(intent.constraint).toEqual({ kind: 'midpoint', of: 'BC' });
    });

    it('"M is the midpoint of segment BC" → M, of BC', () => {
      const intent = only('M is the midpoint of segment BC').intents[0] as any;
      expect(intent.name).toBe('M');
      expect(intent.constraint).toEqual({ kind: 'midpoint', of: 'BC' });
    });

    it('"M is the midpoint of side BC" → M, of BC', () => {
      const intent = only('M is the midpoint of side BC').intents[0] as any;
      expect(intent.name).toBe('M');
      expect(intent.constraint).toEqual({ kind: 'midpoint', of: 'BC' });
    });

    it('"Let M be the midpoint of BC" → M, of BC', () => {
      const intent = only('Let M be the midpoint of BC').intents[0] as any;
      expect(intent.name).toBe('M');
      expect(intent.constraint).toEqual({ kind: 'midpoint', of: 'BC' });
    });

    it('"midpoint M of BC" (name after) → M, of BC', () => {
      const intent = only('Let the midpoint M of BC be drawn').intents[0] as any;
      expect(intent.name).toBe('M');
      expect(intent.constraint).toEqual({ kind: 'midpoint', of: 'BC' });
    });

    it('"midpoint I of segment AB" (name after, with segment) → I, of AB', () => {
      const intent = only('Mark the midpoint I of segment AB').intents[0] as any;
      expect(intent.name).toBe('I');
      expect(intent.constraint).toEqual({ kind: 'midpoint', of: 'AB' });
    });

    it('two EN midpoints same clause → 2 add-point', () => {
      const m = run('M is the midpoint of BC and N is the midpoint of AC');
      expect(m.length).toBe(2);
      const byName: Record<string, any> = {};
      for (const match of m) {
        const it = match.intents[0] as any;
        byName[it.name] = it;
      }
      expect(byName.M.constraint).toEqual({ kind: 'midpoint', of: 'BC' });
      expect(byName.N.constraint).toEqual({ kind: 'midpoint', of: 'AC' });
    });

    it('no point name ("the midpoint of BC") → skip (escalate-safe)', () => {
      expect(run('Draw the midpoint of BC')).toHaveLength(0);
    });

    it('end-anchored: "midpoint of BCD" (3 letters) → no clean pair → skip', () => {
      // "BCD" is not a valid 2-vertex pair end-anchored by (?![A-Za-z]).
      expect(run('M is the midpoint of BCD')).toHaveLength(0);
    });
  });
});

describe('midpointRule — distributive "lần lượt"', () => {
  function intentsOf(problem: string) {
    return run(problem)
      .flatMap((m) => m.intents)
      .map((i: any) => ({ name: i.name, of: i.constraint.of, kind: i.constraint.kind }));
  }

  it('"M, N lần lượt là trung điểm AB, AC" → M=mid(AB), N=mid(AC)', () => {
    const out = intentsOf('Cho tam giác ABC. Gọi M, N lần lượt là trung điểm AB, AC');
    expect(out).toEqual([
      { name: 'M', of: 'AB', kind: 'midpoint' },
      { name: 'N', of: 'AC', kind: 'midpoint' },
    ]);
  });

  it('3 phần tử: "M, N, P lần lượt là trung điểm AB, BC, CA"', () => {
    const out = intentsOf('Gọi M, N, P lần lượt là trung điểm AB, BC, CA');
    expect(out.map((x) => `${x.name}=${x.of}`)).toEqual(['M=AB', 'N=BC', 'P=CA']);
  });

  it('"các cạnh" chêm: "M, N lần lượt là trung điểm các cạnh AB, AC"', () => {
    const out = intentsOf('Gọi M, N lần lượt là trung điểm các cạnh AB, AC');
    expect(out.map((x) => `${x.name}=${x.of}`)).toEqual(['M=AB', 'N=AC']);
  });

  it('lệch số (2 tên, 1 cặp) → bỏ qua (escalate, không đoán)', () => {
    expect(run('Gọi M, N lần lượt là trung điểm AB')).toHaveLength(0);
  });
});
