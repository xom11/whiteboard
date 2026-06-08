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

describe('tangentFromExt EN (issue #46 group B)', () => {
  it('"Draw the two tangents from A to (O)." → tangentFromExt both', () => {
    const intent = only('Draw the two tangents from A to (O).').intents[0] as any;
    expect(intent.op).toBe('draw-line');
    expect(intent.kind).toBe('tangentFromExt');
    expect(intent.from).toBe('A');
    expect(intent.circle).toBe('O');
    expect(intent.which).toBe('both');
  });

  it('"Draw two tangent lines from A to circle O." (circle words) → from A circle O', () => {
    const intent = only('Draw two tangent lines from A to circle O.').intents[0] as any;
    expect(intent.kind).toBe('tangentFromExt');
    expect(intent.from).toBe('A');
    expect(intent.circle).toBe('O');
    expect(intent.which).toBe('both');
  });

  it('"Construct the tangents from A to the circle (O)." → from A circle O', () => {
    const intent = only('Construct the tangents from A to the circle (O).').intents[0] as any;
    expect(intent.kind).toBe('tangentFromExt');
    expect(intent.from).toBe('A');
    expect(intent.circle).toBe('O');
    expect(intent.which).toBe('both');
  });

  it('biến thể đảo "From A, draw the tangents to (O)." → from A circle O', () => {
    const intent = only('From A, draw the tangents to (O).').intents[0] as any;
    expect(intent.kind).toBe('tangentFromExt');
    expect(intent.from).toBe('A');
    expect(intent.circle).toBe('O');
    expect(intent.which).toBe('both');
  });

  it('điểm + tâm chữ khác "Draw the tangents from P to (I)." → from P circle I', () => {
    const intent = only('Draw the tangents from P to (I).').intents[0] as any;
    expect(intent.from).toBe('P');
    expect(intent.circle).toBe('I');
  });

  it('FAIL-SAFE: "Draw the tangent to (O) at A." (at = tangentAt, không phải từ điểm ngoài) → []', () => {
    expect(run('Draw the tangent to (O) at A.')).toEqual([]);
  });

  it('FAIL-SAFE: "The length of the tangent from A to (O) is 5." (không draw/construct) → []', () => {
    expect(run('The length of the tangent from A to (O) is 5.')).toEqual([]);
  });

  it('FAIL-SAFE: "Draw the tangents from A to BC." (BC không phải đường tròn) → []', () => {
    expect(run('Draw the tangents from A to BC.')).toEqual([]);
  });
});

describe('tangentFromExt NAMED tangent points (issue #46)', () => {
  // Lấy match named: có đúng 3 intent (draw-line + 2 add-point tiếp điểm).
  function namedMatch(problem: string) {
    const m = run(problem);
    const named = m.filter((x) => x.intents.length === 3);
    expect(named.length).toBe(1);
    return named[0];
  }

  it('VN explicit-from: "Vẽ hai tiếp tuyến AB, AC từ A đến (O)" → 3 intent', () => {
    const match = namedMatch(
      'Cho đường tròn (O; 3). Lấy điểm A nằm ngoài (O). Vẽ hai tiếp tuyến AB, AC từ A đến (O).',
    );
    expect(match.intents.length).toBe(3);
    const line = match.intents[0] as any;
    expect(line.op).toBe('draw-line');
    expect(line.kind).toBe('tangentFromExt');
    expect(line.from).toBe('A');
    expect(line.circle).toBe('O');
    expect(line.which).toBe('both');
    const b = match.intents[1] as any;
    expect(b.op).toBe('add-point');
    expect(b.name).toBe('B');
    expect(b.constraint).toEqual({ kind: 'tangentPoint', from: 'A', circle: 'O', which: 0 });
    const cPt = match.intents[2] as any;
    expect(cPt.op).toBe('add-point');
    expect(cPt.name).toBe('C');
    expect(cPt.constraint).toEqual({ kind: 'tangentPoint', from: 'A', circle: 'O', which: 1 });
  });

  it('VN implicit-from "và" + parenthetical: "Kẻ hai tiếp tuyến AB và AC tới (O) (B, C là các tiếp điểm)" → 3 intent', () => {
    const match = namedMatch(
      'Cho đường tròn (O). Lấy điểm A nằm ngoài (O). Kẻ hai tiếp tuyến AB và AC tới (O) (B, C là các tiếp điểm).',
    );
    expect(match.intents.length).toBe(3);
    expect((match.intents[0] as any).from).toBe('A');
    expect((match.intents[1] as any).name).toBe('B');
    expect((match.intents[2] as any).name).toBe('C');
    expect((match.intents[1] as any).constraint).toEqual({
      kind: 'tangentPoint',
      from: 'A',
      circle: 'O',
      which: 0,
    });
    expect((match.intents[2] as any).constraint).toEqual({
      kind: 'tangentPoint',
      from: 'A',
      circle: 'O',
      which: 1,
    });
  });

  it('EN explicit-from: "Draw two tangents AB, AC from A to (O)" → 3 intent', () => {
    const match = namedMatch(
      'Given circle (O; 3). Take a point A outside (O). Draw two tangents AB, AC from A to (O).',
    );
    expect(match.intents.length).toBe(3);
    expect((match.intents[0] as any).from).toBe('A');
    expect((match.intents[1] as any).name).toBe('B');
    expect((match.intents[1] as any).constraint.which).toBe(0);
    expect((match.intents[2] as any).name).toBe('C');
    expect((match.intents[2] as any).constraint.which).toBe(1);
  });

  it('EN implicit-from "and": "Draw two tangents AB and AC to (O)" → 3 intent', () => {
    const match = namedMatch(
      'Given circle (O). Take a point A outside the circle. Draw two tangents AB and AC to (O).',
    );
    expect(match.intents.length).toBe(3);
    expect((match.intents[0] as any).from).toBe('A');
    expect((match.intents[1] as any).name).toBe('B');
    expect((match.intents[2] as any).name).toBe('C');
  });

  it('different center letter: "Vẽ hai tiếp tuyến PM, PN từ P đến (I)" → from P, M/N, circle I', () => {
    const match = namedMatch('Lấy điểm P nằm ngoài (I). Vẽ hai tiếp tuyến PM, PN từ P đến (I).');
    expect(match.intents.length).toBe(3);
    const line = match.intents[0] as any;
    expect(line.from).toBe('P');
    expect(line.circle).toBe('I');
    const m = match.intents[1] as any;
    expect(m.name).toBe('M');
    expect(m.constraint).toEqual({ kind: 'tangentPoint', from: 'P', circle: 'I', which: 0 });
    const n = match.intents[2] as any;
    expect(n.name).toBe('N');
    expect(n.constraint).toEqual({ kind: 'tangentPoint', from: 'P', circle: 'I', which: 1 });
  });

  it('FAIL-SAFE: "Vẽ hai tiếp tuyến AB, CD đến (O)" (điểm ngoài khác nhau) → KHÔNG named', () => {
    const m = run('Vẽ hai tiếp tuyến AB, CD đến (O)');
    // named branch không fire (A !== C); unnamed cũng không match → không có match 3 intent.
    expect(m.filter((x) => x.intents.length === 3).length).toBe(0);
  });

  it('REGRESSION: unnamed "Kẻ hai tiếp tuyến từ A đến (O)" vẫn 1 match / 1 intent (named không fire)', () => {
    const match = only('Cho đường tròn (O) và điểm A nằm ngoài. Kẻ hai tiếp tuyến từ A đến (O)');
    expect(match.intents.length).toBe(1);
    const intent = match.intents[0] as any;
    expect(intent.op).toBe('draw-line');
    expect(intent.kind).toBe('tangentFromExt');
    expect(intent.from).toBe('A');
    expect(intent.circle).toBe('O');
  });
});
