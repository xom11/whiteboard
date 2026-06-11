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
  // vao10: verb "Hạ" dẫn dạng vẽ trực tiếp ("Hạ BK ⊥ AM tại K").
  it('"Hạ BK ⊥ AM tại K" → K = perpFoot(B, AM)', () => {
    const intents = run('Cho tam giác ABM. Hạ BK ⊥ AM tại K').flatMap((x) => x.intents) as any[];
    const k = intents.find((i) => i.op === 'add-point' && i.name === 'K');
    expect(k).toBeDefined();
    expect(k.constraint).toMatchObject({ kind: 'perpFoot', from: 'B', onLine: 'AM' });
  });


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

  it('"I, K lần lượt là hình chiếu của H trên AC và BC" → shared-from H, 2 line "và"', () => {
    const m = run('Gọi I, K lần lượt là hình chiếu của H trên AC và BC');
    const intents = m.flatMap((x) => x.intents).filter((i: any) => i.op === 'add-point') as any[];
    const byName = Object.fromEntries(intents.map((i) => [i.name, i]));
    expect(byName.I.constraint).toMatchObject({ kind: 'perpFoot', from: 'H', onLine: 'AC' });
    expect(byName.K.constraint).toMatchObject({ kind: 'perpFoot', from: 'H', onLine: 'BC' });
  });

  it('"từ M kẻ MP, MQ vuông góc với các cạnh AB, AC" → P,Q foot từ M', () => {
    const m = run('từ M kẻ MP, MQ vuông góc với các cạnh AB, AC');
    const intents = m.flatMap((x) => x.intents) as any[];
    const byName = Object.fromEntries(
      intents.filter((i) => i.op === 'add-point').map((i) => [i.name, i]),
    );
    expect(byName.P.constraint).toEqual({ kind: 'perpFoot', from: 'M', onLine: 'AB' });
    expect(byName.Q.constraint).toEqual({ kind: 'perpFoot', from: 'M', onLine: 'AC' });
    expect(intents).toContainEqual({ op: 'connect', from: 'M', to: 'P', style: 'segment' });
    expect(intents).toContainEqual({ op: 'connect', from: 'M', to: 'Q', style: 'segment' });
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

// ── EN (issue #46 group B) ────────────────────────────────────────────────────
// Additive EN support: projection / foot-of-perpendicular(altitude) / draw form.
// VN behaviour must stay byte-identical (mirror style of angleBisectorAngle EN).
describe('perpFoot EN (issue #46 group B)', () => {
  it('projection: "Let H be the projection of A onto BC" → perpFoot H, no connect', () => {
    const m = run('Let H be the projection of A onto BC');
    const intents = m.flatMap((x) => x.intents) as any[];
    expect(intents).toHaveLength(1);
    const i = intents[0];
    expect(i.op).toBe('add-point');
    expect(i.name).toBe('H');
    expect(i.constraint).toEqual({ kind: 'perpFoot', from: 'A', onLine: 'BC' });
    expect(intents.every((x) => x.op === 'add-point')).toBe(true); // no connect
  });

  it('orthogonal projection + "K is the …" name-before via "is" + "side" prefix', () => {
    const m = run('K is the orthogonal projection of A on side BC');
    const intents = m.flatMap((x) => x.intents) as any[];
    expect(intents).toHaveLength(1);
    expect(intents[0].name).toBe('K');
    expect(intents[0].constraint).toEqual({ kind: 'perpFoot', from: 'A', onLine: 'BC' });
  });

  it('projection with "to": "Let H be the projection of A to BC"', () => {
    const i = run('Let H be the projection of A to BC')[0].intents[0] as any;
    expect(i.name).toBe('H');
    expect(i.constraint).toEqual({ kind: 'perpFoot', from: 'A', onLine: 'BC' });
  });

  it('foot of the perpendicular: "Let H be the foot of the perpendicular from A to BC"', () => {
    const m = run('Let H be the foot of the perpendicular from A to BC');
    const intents = m.flatMap((x) => x.intents) as any[];
    expect(intents).toHaveLength(1);
    expect(intents[0].name).toBe('H');
    expect(intents[0].constraint).toEqual({ kind: 'perpFoot', from: 'A', onLine: 'BC' });
    expect(intents.every((x) => x.op === 'add-point')).toBe(true);
  });

  it('foot of the altitude: "Let H be the foot of the altitude from A to BC"', () => {
    const i = run('Let H be the foot of the altitude from A to BC')[0].intents[0] as any;
    expect(i.name).toBe('H');
    expect(i.constraint).toEqual({ kind: 'perpFoot', from: 'A', onLine: 'BC' });
  });

  it('foot of altitude with "onto": "H is the foot of the altitude from A onto BC"', () => {
    const i = run('H is the foot of the altitude from A onto BC')[0].intents[0] as any;
    expect(i.name).toBe('H');
    expect(i.constraint).toEqual({ kind: 'perpFoot', from: 'A', onLine: 'BC' });
  });

  it('draw form "Draw AH perpendicular to BC at H" → perpFoot H + connect A-H', () => {
    const m = run('Draw AH perpendicular to BC at H');
    const intents = m.flatMap((x) => x.intents) as any[];
    const pt = intents.find((i) => i.op === 'add-point');
    const conn = intents.find((i) => i.op === 'connect');
    expect(pt).toBeDefined();
    expect(pt.name).toBe('H');
    expect(pt.constraint).toEqual({ kind: 'perpFoot', from: 'A', onLine: 'BC' });
    expect(conn).toBeDefined();
    expect(conn).toEqual({ op: 'connect', from: 'A', to: 'H', style: 'segment' });
    // ordering: add-point BEFORE connect (H must exist before connect references it)
    expect(intents.indexOf(pt)).toBeLessThan(intents.indexOf(conn));
  });

  it('draw form without "at": "Construct AH perpendicular to BC" → H + connect', () => {
    const m = run('Construct AH perpendicular to BC');
    const intents = m.flatMap((x) => x.intents) as any[];
    const pt = intents.find((i) => i.op === 'add-point');
    const conn = intents.find((i) => i.op === 'connect');
    expect(pt.name).toBe('H');
    expect(pt.constraint).toEqual({ kind: 'perpFoot', from: 'A', onLine: 'BC' });
    expect(conn).toEqual({ op: 'connect', from: 'A', to: 'H', style: 'segment' });
  });

  it('draw form "Drop AH perpendicular to side BC" (verb Drop + side prefix)', () => {
    const m = run('Drop AH perpendicular to side BC');
    const intents = m.flatMap((x) => x.intents) as any[];
    const pt = intents.find((i) => i.op === 'add-point');
    const conn = intents.find((i) => i.op === 'connect');
    expect(pt.constraint).toEqual({ kind: 'perpFoot', from: 'A', onLine: 'BC' });
    expect(conn).toEqual({ op: 'connect', from: 'A', to: 'H', style: 'segment' });
  });

  // ── FAIL-SAFE (escalate, never silent-wrong) ────────────────────────────────
  it('FAIL-SAFE: no "X be/is the" name binding → 0 match', () => {
    expect(run('The foot of the perpendicular from A to BC')).toHaveLength(0);
  });

  it('FAIL-SAFE: projection with no name-before → 0 match', () => {
    expect(run('the projection of A onto BC')).toHaveLength(0);
  });

  it('FAIL-SAFE draw conflict: "Draw AH perpendicular to BC at K" (K≠H) → 0 match', () => {
    expect(run('Draw AH perpendicular to BC at K')).toHaveLength(0);
  });

  it('FAIL-SAFE draw degenerate: foot in onLine "Draw AB perpendicular to BC" → 0 match', () => {
    expect(run('Draw AB perpendicular to BC')).toHaveLength(0);
  });

  // ── CROSS-RULE guard ────────────────────────────────────────────────────────
  it('CROSS-RULE: "Draw the perpendicular bisector of BC" → 0 match (perpBisector territory)', () => {
    expect(run('Draw the perpendicular bisector of BC')).toHaveLength(0);
  });

  // ── VN regression (unchanged) ───────────────────────────────────────────────
  it('VN regression: "Gọi H là hình chiếu của A trên BC" still perpFoot, no connect', () => {
    const m = run('Gọi H là hình chiếu của A trên BC');
    const intents = m.flatMap((x) => x.intents) as any[];
    expect(intents).toHaveLength(1);
    expect(intents[0].constraint).toEqual({ kind: 'perpFoot', from: 'A', onLine: 'BC' });
    expect(intents.every((x) => x.op === 'add-point')).toBe(true);
  });

  it('VN regression: draw form "Kẻ AH ⊥ BC tại H" stays add-point only (no self-connect)', () => {
    const m = run('Kẻ AH ⊥ BC tại H');
    const intents = m.flatMap((x) => x.intents) as any[];
    expect(intents.every((i) => i.op === 'add-point')).toBe(true);
  });
});

describe('perpFootRule — distributive shared-from "X,Y,Z lần lượt là hình chiếu của D trên BC,CA,AB"', () => {
  /** map name → onLine cho mọi perpFoot từ `from` cho trước. */
  function feet(problem: string) {
    const intents = run(problem).flatMap((x) => x.intents) as any[];
    return intents
      .filter((i) => i.op === 'add-point' && i.constraint.kind === 'perpFoot')
      .map((i) => ({ name: i.name, from: i.constraint.from, onLine: i.constraint.onLine }));
  }

  it('3 chân: X=foot(D,BC), Y=foot(D,CA), Z=foot(D,AB)', () => {
    const f = feet('Gọi X, Y, Z lần lượt là hình chiếu của D trên BC, CA, AB');
    expect(f).toEqual([
      { name: 'X', from: 'D', onLine: 'BC' },
      { name: 'Y', from: 'D', onLine: 'CA' },
      { name: 'Z', from: 'D', onLine: 'AB' },
    ]);
  });

  it('vẽ kèm đoạn vuông góc D→X, D→Y, D→Z (thể hiện hình chiếu)', () => {
    const intents = run('Gọi X, Y, Z lần lượt là hình chiếu của D trên BC, CA, AB').flatMap(
      (x) => x.intents,
    ) as any[];
    const segs = intents
      .filter((i) => i.op === 'connect' && i.style === 'segment')
      .map((i) => [i.from, i.to].join(''));
    expect(segs).toEqual(['DX', 'DY', 'DZ']);
    // mỗi đoạn nối phải đứng NGAY SAU add-point chân tương ứng (chân tồn tại trước).
    const order = intents.map((i) => `${i.op}:${i.name ?? (i.from ?? '') + (i.to ?? '')}`);
    expect(order.indexOf('add-point:X')).toBeLessThan(order.indexOf('connect:DX'));
  });

  it('biến thể "hình chiếu" không "vuông góc"', () => {
    const f = feet('X, Y lần lượt là hình chiếu của P trên AB, AC');
    expect(f).toEqual([
      { name: 'X', from: 'P', onLine: 'AB' },
      { name: 'Y', from: 'P', onLine: 'AC' },
    ]);
  });

  it('biến thể "chân đường vuông góc (hạ) từ D đến/xuống"', () => {
    const f = feet('Gọi X, Y, Z lần lượt là chân đường vuông góc hạ từ D đến BC, CA, AB');
    expect(f.map((x) => x.name + ':' + x.onLine)).toEqual(['X:BC', 'Y:CA', 'Z:AB']);
    expect(f.every((x) => x.from === 'D')).toBe(true);
  });

  it('zip lệch (2 tên, 3 cạnh) → bỏ qua (escalate, không đoán)', () => {
    expect(feet('X, Y lần lượt là hình chiếu của D trên BC, CA, AB')).toHaveLength(0);
  });

  it('regression: LANLUOT 2-chân "của B trên AC và của C trên AB" vẫn chạy', () => {
    const f = feet('H, K lần lượt là hình chiếu của B trên AC và của C trên AB');
    expect(f).toEqual([
      { name: 'H', from: 'B', onLine: 'AC' },
      { name: 'K', from: 'C', onLine: 'AB' },
    ]);
  });
});

describe('perpFootRule — bundled altitudes from exam statements', () => {
  function all(problem: string) {
    return run(problem).flatMap((x) => x.intents) as any[];
  }

  it('"hai đường cao BE, CF cắt nhau tại H" → E/F feet + H orthocenter', () => {
    const intents = all('Cho tam giác ABC, hai đường cao BE, CF cắt nhau tại H');
    expect(intents).toEqual([
      { op: 'add-point', name: 'E', constraint: { kind: 'perpFoot', from: 'B', onLine: 'AC' } },
      { op: 'connect', from: 'B', to: 'E', style: 'segment' },
      { op: 'add-point', name: 'F', constraint: { kind: 'perpFoot', from: 'C', onLine: 'AB' } },
      { op: 'connect', from: 'C', to: 'F', style: 'segment' },
      { op: 'add-point', name: 'H', constraint: { kind: 'orthocenter', of: ['A', 'B', 'C'] } },
    ]);
  });

  it('"Hai đường cao BD và CE cắt nhau tại H" (separator "và") → D/E feet + H', () => {
    const intents = all('Cho tam giác ABC nhọn. Hai đường cao BD và CE cắt nhau tại H');
    expect(intents).toEqual([
      { op: 'add-point', name: 'D', constraint: { kind: 'perpFoot', from: 'B', onLine: 'AC' } },
      { op: 'connect', from: 'B', to: 'D', style: 'segment' },
      { op: 'add-point', name: 'E', constraint: { kind: 'perpFoot', from: 'C', onLine: 'AB' } },
      { op: 'connect', from: 'C', to: 'E', style: 'segment' },
      { op: 'add-point', name: 'H', constraint: { kind: 'orthocenter', of: ['A', 'B', 'C'] } },
    ]);
  });

  it('"Các đường cao AD, BE, CF ... cắt nhau tại H" → 3 feet + orthocenter', () => {
    const intents = all(
      'Cho tam giác ABC. Các đường cao AD, BE, CF của tam giác ABC cắt nhau tại H',
    );
    const feet = intents.filter((i) => i.op === 'add-point' && i.constraint.kind === 'perpFoot');
    expect(feet.map((i) => `${i.name}:${i.constraint.from}->${i.constraint.onLine}`)).toEqual([
      'D:A->BC',
      'E:B->AC',
      'F:C->AB',
    ]);
    expect(intents).toContainEqual({
      op: 'add-point',
      name: 'H',
      constraint: { kind: 'orthocenter', of: ['A', 'B', 'C'] },
    });
  });

  it('Bài 1: thêm vế "và cắt đường tròn..." vẫn dựng 3 feet + orthocenter', () => {
    const intents = all(
      'Cho tam giác ABC có ba góc nhọn nội tiếp đường tròn (O). Các đường cao AD, BE, CF cắt nhau tại H và cắt đường tròn (O) lần lượt tại M, N, P',
    );
    const feet = intents.filter((i) => i.op === 'add-point' && i.constraint.kind === 'perpFoot');
    expect(feet.map((i) => `${i.name}:${i.constraint.from}->${i.constraint.onLine}`)).toEqual([
      'D:A->BC',
      'E:B->AC',
      'F:C->AB',
    ]);
    expect(intents).toContainEqual({
      op: 'add-point',
      name: 'H',
      constraint: { kind: 'orthocenter', of: ['A', 'B', 'C'] },
    });
  });

  it('không đoán nếu tên đường cao không thuộc tam giác đã nêu', () => {
    expect(all('Cho tam giác ABC, đường cao PQ cắt nhau tại H')).toHaveLength(0);
  });
});

describe('perpFootRule — biến thể "điểm" + "các đường thẳng"', () => {
  const feet = (p: string) =>
    run(p).flatMap((m) => m.intents)
      .filter((i: any) => i.op === 'add-point')
      .map((i: any) => `${i.name}:${i.constraint.from}->${i.constraint.onLine}`);

  it('Câu 18: "P là hình chiếu của điểm C trên AN và Q là hình chiếu của điểm M trên AB"', () => {
    expect(feet('P là hình chiếu vuông góc của điểm C trên AN và Q là hình chiếu vuông góc của điểm M trên AB'))
      .toEqual(['P:C->AN', 'Q:M->AB']);
  });

  it('Câu 12: "E, F lần lượt là hình chiếu của D trên các đường thẳng BH, CH"', () => {
    expect(feet('E, F lần lượt là hình chiếu của D trên các đường thẳng BH, CH'))
      .toEqual(['E:D->BH', 'F:D->CH']);
  });
});

describe('perpFoot — "BE, CF là hai đường cao" (token trước, không cần H)', () => {
  it('suy chân E,F trên cạnh đối từ tam giác', () => {
    const feet = run('Cho tam giác nhọn ABC. BE, CF là hai đường cao')
      .flatMap((m) => m.intents)
      .filter((i: any) => i.op === 'add-point')
      .map((i: any) => `${i.name}:${i.constraint.from}->${i.constraint.onLine}`)
      .sort();
    expect(feet).toEqual(['E:B->AC', 'F:C->AB']);
  });
});

describe('perpFoot — "Kẻ/Vẽ XY,XZ ⊥ L1,L2" distributive (cùng chữ đầu)', () => {
  const feet = (p: string) =>
    run(p).flatMap((m) => m.intents)
      .filter((i: any) => i.op === 'add-point')
      .map((i: any) => `${i.name}:${i.constraint.from}->${i.constraint.onLine}`)
      .sort();

  it('Bài 4: "Kẻ HE,HF lần lượt vuông góc với AB,AC" → E,F chân từ H', () => {
    expect(feet('Cho tam giác ABC vuông tại A, đường cao AH. Kẻ HE,HF lần lượt vuông góc với AB,AC.'))
      .toEqual(expect.arrayContaining(['E:H->AB', 'F:H->AC']));
  });

  it('Bài 35: "Vẽ ME,MF lần lượt vuông góc AC,AB tại E,F"', () => {
    expect(feet('Điểm M thuộc cung nhỏ BC. Vẽ ME,MF lần lượt vuông góc AC,AB tại E,F.'))
      .toEqual(expect.arrayContaining(['E:M->AC', 'F:M->AB']));
  });
});

describe('perpFoot — "X và Y lần lượt là chân đường vuông góc kẻ từ D xuống L1 và L2"', () => {
  const feet = (p: string) =>
    run(p).flatMap((m) => m.intents)
      .filter((i: any) => i.op === 'add-point')
      .map((i: any) => `${i.name}:${i.constraint.from}->${i.constraint.onLine}`)
      .sort();

  it('Bài 74: tên nối "và" + "kẻ từ điểm D xuống các đường thẳng AB và AC"', () => {
    expect(feet('Gọi các điểm E và F lần lượt là chân đường vuông góc kẻ từ điểm D xuống các đường thẳng AB và AC.'))
      .toEqual(['E:D->AB', 'F:D->AC']);
  });

  it('Bài 111: "D,E,F lần lượt là hình chiếu vuông góc của I trên BC,CN,NB"', () => {
    expect(feet('Gọi D,E,F lần lượt là hình chiếu vuông góc của điểm I trên các đường thẳng BC,CN và NB.'))
      .toEqual(['D:I->BC', 'E:I->CN', 'F:I->NB']);
  });
});
