import { chordRule } from '../chord';
import { segmentClauses } from '../../deterministic/coverage';
import { normalizeProblemText } from '../../deterministic/normalizeText';

function ints(problem: string): any[] {
  return chordRule.match({ problem, clauses: segmentClauses(problem) }).flatMap((m) => m.intents);
}

// Harness dùng normalize + lọc clause hasGeometry (giống pipeline thật).
function ctxOf(text: string) {
  const problem = normalizeProblemText(text);
  const clauses = segmentClauses(problem).filter((c) => c.hasGeometry);
  return { problem, clauses };
}

// OCR bẩn: tên đường tròn dính ký tự regex-meta "(" → findCircleClauseId KHÔNG
// được throw (escape tên trước RegExp).
it('không throw khi tên đường tròn chứa ký tự regex-meta (OCR bẩn)', () => {
  expect(() => ints('Cho đường tròn (O*) dây AB. Dây CD vuông góc.')).not.toThrow();
  expect(() => ints('Tứ giác nội tiếp đường tròn ( dây MN.')).not.toThrow();
});

function summary(problem: string) {
  const all = ints(problem);
  return {
    circle: all.find((i) => i.op === 'draw-circle'),
    onCircle: all.filter((i) => i.op === 'add-point' && i.constraint.kind === 'onCircle'),
    connects: all.filter((i) => i.op === 'connect'),
  };
}

describe('chordRule', () => {
  it('"Cho đường tròn (O), dây AB" → circle O (centerRadius) + onCircle A,B + connect AB', () => {
    const { circle, onCircle, connects } = summary('Cho đường tròn (O), dây AB.');
    expect(circle.name).toBe('O');
    expect(circle.spec).toBe('centerRadius');
    expect(circle.radius).toBeGreaterThan(0);
    expect(onCircle.map((i) => i.name).sort()).toEqual(['A', 'B']);
    expect(onCircle.every((i) => i.constraint.circle === 'O')).toBe(true);
    // 2 điểm trên đường tròn phải khác góc theta (≠ nhau).
    expect(onCircle[0].constraint.theta).not.toBe(onCircle[1].constraint.theta);
    expect(connects.length).toBe(1);
    expect([connects[0].from, connects[0].to].sort()).toEqual(['A', 'B']);
  });

  it('"đường tròn tâm O" + "dây cung MN" (2 clause) → circle O + onCircle M,N + connect MN', () => {
    const { circle, onCircle, connects } = summary('Cho đường tròn tâm O. Dây cung MN.');
    expect(circle.name).toBe('O');
    expect(onCircle.map((i) => i.name).sort()).toEqual(['M', 'N']);
    expect([connects[0].from, connects[0].to].sort()).toEqual(['M', 'N']);
  });

  it('reverse "AB là dây của đường tròn (O)" → onCircle A,B + connect', () => {
    const { onCircle, connects } = summary('Cho đường tròn (O). AB là dây của (O).');
    expect(onCircle.map((i) => i.name).sort()).toEqual(['A', 'B']);
    expect(connects.length).toBe(1);
  });

  it('"dây cung AB của (O)" (forward + của) → onCircle A,B', () => {
    const { onCircle } = summary('Cho đường tròn (O). Vẽ dây cung AB của (O).');
    expect(onCircle.map((i) => i.name).sort()).toEqual(['A', 'B']);
  });

  it('claim cả clause khai báo đường tròn (coverage)', () => {
    const problem = 'Cho đường tròn (O). Dây cung MN.';
    const clauses = segmentClauses(problem);
    const matches = chordRule.match({ problem, clauses });
    const claimed = new Set<number>();
    for (const m of matches) for (const id of m.clauseIds) claimed.add(id);
    // Cả clause "Cho đường tròn (O)" (id 0) lẫn clause chord (id 1) đều được claim.
    expect(claimed.has(0)).toBe(true);
    expect(claimed.has(1)).toBe(true);
  });

  it('không có đường tròn → escalate (không match)', () => {
    expect(chordRule.match({ problem: 'Vẽ dây AB.', clauses: segmentClauses('Vẽ dây AB.') }).length).toBe(0);
  });

  it('degenerate: đầu mút dây trùng tâm ("dây AO") → bỏ qua', () => {
    const { onCircle } = summary('Cho đường tròn (O), dây AO.');
    expect(onCircle.length).toBe(0);
  });

  it('guard: dây cung vuông góc ("dây cung DE vuông góc với AB") → KHÔNG dựng circle/chord rời', () => {
    // perpChordThroughPoint sở hữu dạng này (D,E là giao của đường ⊥ với (O) sẵn có).
    // chord không được dựng đường tròn lạ + 2 glider onCircle.
    const all = ints(
      'Cho đường tròn (O) đường kính AC. Qua M kẻ dây cung DE vuông góc với AB.',
    );
    expect(all.filter((i) => i.op === 'add-point' && i.constraint.kind === 'onCircle')).toEqual([]);
    // không emit circle "O" centerRadius rời (đã có (O) đường kính do circleDiameter dựng).
    expect(all.filter((i) => i.op === 'draw-circle')).toEqual([]);
  });

  it('guard không ảnh hưởng dây thường ở clause khác', () => {
    // Clause "dây MN" KHÔNG có "vuông góc" → vẫn dựng bình thường.
    const { onCircle } = summary('Cho đường tròn (O). Dây MN. Qua P kẻ dây cung DE vuông góc với AB.');
    expect(onCircle.map((i) => i.name).sort()).toEqual(['M', 'N']);
  });

  it('"hai dây CD,EF cùng đi qua I" → cả 4 đầu mút C,D,E,F là onCircle (cùng A,B của dây AB)', () => {
    const { problem, clauses } = ctxOf(
      'Cho đường tròn (O) và dây AB. Lấy I là một điểm bất kì thuộc dây AB, vẽ hai dây CD,EF cùng đi qua I.',
    );
    const all = chordRule.match({ problem, clauses }).flatMap((m) => m.intents);
    const onCircleNames = all
      .filter((i) => i.op === 'add-point' && i.constraint.kind === 'onCircle')
      .map((i) => i.name)
      .sort();
    // A,B (dây AB) + C,D,E,F (hai dây CD,EF) — tất cả glider trên (O).
    expect(onCircleNames).toEqual(['A', 'B', 'C', 'D', 'E', 'F']);
    // Mọi glider tham chiếu cùng đường tròn O.
    const gliders = all.filter((i) => i.op === 'add-point' && i.constraint.kind === 'onCircle');
    expect(gliders.every((i) => i.constraint.circle === 'O')).toBe(true);
    // Theta phân biệt cho từng đầu mút → không trùng điểm.
    const thetas = gliders.map((i) => i.constraint.theta);
    expect(new Set(thetas).size).toBe(thetas.length);
    // 3 đoạn nối: AB, CD, EF.
    const connects = all.filter((i) => i.op === 'connect');
    expect(connects.length).toBe(3);
    const connPairs = connects.map((c) => [c.from, c.to].sort().join('')).sort();
    expect(connPairs).toEqual(['AB', 'CD', 'EF']);
  });

  // httcd:7/70 — "các dây CD và EF" (các + "và"): cả 4 đầu mút onCircle.
  it('"vẽ các dây CD và EF song song" → C,D,E,F onCircle', () => {
    const { problem, clauses } = ctxOf(
      'Cho đường tròn (O;R) đường kính AB. Qua M, N lần lượt vẽ các dây CD và EF song song với nhau.',
    );
    const names = chordRule
      .match({ problem, clauses })
      .flatMap((m) => m.intents)
      .filter((i: any) => i.op === 'add-point' && i.constraint.kind === 'onCircle')
      .map((i: any) => i.name)
      .sort();
    expect(names).toEqual(['C', 'D', 'E', 'F']);
  });

  // httcd:65/68 — "hai dây AB và CD vuông góc với nhau" (2 dây ⊥ NHAU, KHÔNG phải
  // perpChordThroughPoint): CHORD_TWO vẫn dựng 4 đầu mút.
  it('"Vẽ hai dây AB và CD vuông góc với nhau" → A,B,C,D onCircle', () => {
    const { problem, clauses } = ctxOf('Cho đường tròn (O;R). Vẽ hai dây AB và CD vuông góc với nhau.');
    const names = chordRule
      .match({ problem, clauses })
      .flatMap((m) => m.intents)
      .filter((i: any) => i.op === 'add-point' && i.constraint.kind === 'onCircle')
      .map((i: any) => i.name)
      .sort();
    expect(names).toEqual(['A', 'B', 'C', 'D']);
  });

  it('không có "dây" → không match (prefilter)', () => {
    expect(
      chordRule.match({
        problem: 'Cho đường tròn (O) và điểm A.',
        clauses: segmentClauses('Cho đường tròn (O) và điểm A.'),
      }).length,
    ).toBe(0);
  });
});
