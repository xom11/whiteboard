import { segmentClauses } from '../../deterministic/coverage';
import { runRules } from '../registry';

function intents(problem: string) {
  return runRules({ problem, clauses: segmentClauses(problem) })
    .flatMap((m) => m.intents as any[]);
}

describe('incircle tangency rule', () => {
  it('"tiếp xúc với các cạnh BC, CA, AB tại các điểm D, E, G" -> tangencyPoint zip theo thứ tự', () => {
    const all = intents(
      'Cho tam giác ABC. Đường tròn (I) nội tiếp tam giác ABC tiếp xúc với các cạnh BC, CA, AB tại các điểm D, E, G.',
    );

    const tangencies = all.filter((i) => i.op === 'add-point' && i.constraint?.kind === 'tangencyPoint');
    expect(tangencies).toEqual([
      { op: 'add-point', name: 'D', constraint: { kind: 'tangencyPoint', circle: 'I', onLine: 'BC' } },
      { op: 'add-point', name: 'E', constraint: { kind: 'tangencyPoint', circle: 'I', onLine: 'CA' } },
      { op: 'add-point', name: 'G', constraint: { kind: 'tangencyPoint', circle: 'I', onLine: 'AB' } },
    ]);
  });

  it('Bài 57: "tiếp xúc với ba cạnh BC,CA và AB lần lượt tại ba điểm D,E và F" (từ đếm "ba")', () => {
    const tang = intents(
      'Đường tròn (I) nội tiếp tam giác ABC, tiếp xúc với ba cạnh BC,CA và AB lần lượt tại ba điểm D,E và F.',
    ).filter((i) => i.op === 'add-point' && i.constraint?.kind === 'tangencyPoint');
    expect(tang).toEqual([
      { op: 'add-point', name: 'D', constraint: { kind: 'tangencyPoint', circle: 'I', onLine: 'BC' } },
      { op: 'add-point', name: 'E', constraint: { kind: 'tangencyPoint', circle: 'I', onLine: 'CA' } },
      { op: 'add-point', name: 'F', constraint: { kind: 'tangencyPoint', circle: 'I', onLine: 'AB' } },
    ]);
  });

  it('Bài 11 reversed: "Cạnh AB, BC, CA tiếp xúc với đường tròn (O) tại D, E, F" → incircle O + tangency', () => {
    const all = intents(
      'Cho tam giác ABC. Cạnh AB, BC, CA tiếp xúc với đường tròn (O) tại các điểm D, E, F.',
    );
    // circle O = nội tiếp tam giác ABC
    expect(all).toContainEqual(
      expect.objectContaining({ op: 'draw-circle', name: 'O', spec: 'inscribedIn', triangle: ['A', 'B', 'C'] }),
    );
    const tangencies = all.filter((i) => i.op === 'add-point' && i.constraint?.kind === 'tangencyPoint');
    expect(tangencies).toEqual([
      { op: 'add-point', name: 'D', constraint: { kind: 'tangencyPoint', circle: 'O', onLine: 'AB' } },
      { op: 'add-point', name: 'E', constraint: { kind: 'tangencyPoint', circle: 'O', onLine: 'BC' } },
      { op: 'add-point', name: 'F', constraint: { kind: 'tangencyPoint', circle: 'O', onLine: 'CA' } },
    ]);
  });

  it('tên đường tròn ĐỨNG SAU "nội tiếp": "đường tròn nội tiếp (I) tiếp xúc AB, BC, CA tại D, E, F"', () => {
    const all = intents(
      'cho tam giác ABC, đường tròn nội tiếp (I) tiếp xúc AB, BC, CA tại D, E, F',
    );
    expect(all).toContainEqual(
      expect.objectContaining({ op: 'draw-circle', name: 'I', spec: 'inscribedIn', triangle: ['A', 'B', 'C'] }),
    );
    const tangencies = all.filter((i) => i.op === 'add-point' && i.constraint?.kind === 'tangencyPoint');
    expect(tangencies).toEqual([
      { op: 'add-point', name: 'D', constraint: { kind: 'tangencyPoint', circle: 'I', onLine: 'AB' } },
      { op: 'add-point', name: 'E', constraint: { kind: 'tangencyPoint', circle: 'I', onLine: 'BC' } },
      { op: 'add-point', name: 'F', constraint: { kind: 'tangencyPoint', circle: 'I', onLine: 'CA' } },
    ]);
  });

  it('tên đường tròn chữ TRẦN sau "nội tiếp": "đường tròn nội tiếp I tiếp xúc ..."', () => {
    const all = intents(
      'cho tam giác ABC, đường tròn nội tiếp I tiếp xúc AB, BC, CA tại D, E, F',
    );
    const tangencies = all.filter((i) => i.op === 'add-point' && i.constraint?.kind === 'tangencyPoint');
    expect(tangencies.map((i) => [i.name, i.constraint.circle, i.constraint.onLine])).toEqual([
      ['D', 'I', 'AB'],
      ['E', 'I', 'BC'],
      ['F', 'I', 'CA'],
    ]);
  });

  it('không vỡ khi OCR/người dùng xuống dòng giữa "các" và "cạnh"', () => {
    const all = intents(
      'Cho tam giác ABC. Đường tròn (I) nội tiếp tam giác ABC tiếp xúc với các\ncạnh BC, CA, AB tại các điểm D, E, G.',
    );

    const tangencies = all.filter((i) => i.op === 'add-point' && i.constraint?.kind === 'tangencyPoint');
    expect(tangencies.map((i) => [i.name, i.constraint.circle, i.constraint.onLine])).toEqual([
      ['D', 'I', 'BC'],
      ['E', 'I', 'CA'],
      ['G', 'I', 'AB'],
    ]);
  });

  // t02:BT11 — dạng ĐẢO, đường tròn BARE "(I)" (không chữ "đường tròn" trước).
  it('"Các cạnh AB, BC, CA tiếp xúc với (I) lần lượt tại F, D, E" (bare (I))', () => {
    const tg = intents('Cho tam giác ABC. Các cạnh AB, BC, CA tiếp xúc với (I) lần lượt tại F, D, E.')
      .filter((i) => i.op === 'add-point' && i.constraint?.kind === 'tangencyPoint');
    expect(tg.map((i) => [i.name, i.constraint.circle, i.constraint.onLine])).toEqual([
      ['F', 'I', 'AB'],
      ['D', 'I', 'BC'],
      ['E', 'I', 'CA'],
    ]);
  });

  // t02:BT16 — tiếp điểm đặt tên có PRIME (A', B', C'). normalizeText quy ′→'
  // trước khi rule chạy nên test dùng ASCII '.
  it("\"tiếp xúc với BC, CA, AB lần lượt tại A', B', C'\" (tên prime)", () => {
    const tg = intents("Cho đường tròn (I) nội tiếp tam giác ABC tiếp xúc với BC, CA, AB lần lượt tại A', B', C'.")
      .filter((i) => i.op === 'add-point' && i.constraint?.kind === 'tangencyPoint');
    expect(tg.map((i) => [i.name, i.constraint.onLine])).toEqual([
      ["A'", 'BC'],
      ["B'", 'CA'],
      ["C'", 'AB'],
    ]);
  });

  it('tên ĐẶT TRƯỚC: "Gọi M,N,P lần lượt là tiếp điểm của AB,AC,BC với (O)" (httcd:99)', () => {
    const all = intents(
      'Cho đường tròn (O) nội tiếp tam giác ABC. Gọi M, N, P lần lượt là tiếp điểm của AB, AC, BC với (O).',
    );
    const tg = all.filter((i) => i.op === 'add-point' && i.constraint?.kind === 'tangencyPoint');
    expect(tg).toEqual([
      { op: 'add-point', name: 'M', constraint: { kind: 'tangencyPoint', circle: 'O', onLine: 'AB' } },
      { op: 'add-point', name: 'N', constraint: { kind: 'tangencyPoint', circle: 'O', onLine: 'AC' } },
      { op: 'add-point', name: 'P', constraint: { kind: 'tangencyPoint', circle: 'O', onLine: 'BC' } },
    ]);
  });

  it('tên ĐẶT TRƯỚC + "đường tròn (I)": "D,E,F … tiếp điểm của BC,CA,AB với đường tròn (I)" (hinh9:102)', () => {
    const all = intents(
      'Cho tam giác ABC ngoại tiếp đường tròn (I). Gọi D,E,F lần lượt là tiếp điểm của BC,CA,AB với đường tròn (I).',
    );
    const tg = all.filter((i) => i.op === 'add-point' && i.constraint?.kind === 'tangencyPoint');
    expect(tg.map((i) => [i.name, i.constraint.onLine, i.constraint.circle])).toEqual([
      ['D', 'BC', 'I'],
      ['E', 'CA', 'I'],
      ['F', 'AB', 'I'],
    ]);
  });

  it('FORM XEN KẼ (C77): "(I) tiếp xúc AB tại N, BC tại P, AC tại H" → 3 tiếp điểm, KHÔNG inscribedIn', () => {
    const all = intents(
      'Cho tam giác ABC. Đường tròn (I) tiếp xúc AB tại N, BC tại P, AC tại H.',
    );
    const tg = all.filter((i) => i.op === 'add-point' && i.constraint?.kind === 'tangencyPoint');
    expect(tg.map((i) => [i.name, i.constraint.onLine, i.constraint.circle])).toEqual([
      ['N', 'AB', 'I'],
      ['P', 'BC', 'I'],
      ['H', 'AC', 'I'],
    ]);
    // KHÔNG emit inscribedIn (I) — (I) có thể là BÀNG tiếp (excircle), circle dựng nơi khác.
    expect(all.filter((i) => i.op === 'draw-circle' && i.spec === 'inscribedIn')).toEqual([]);
  });

  it('FORM ĐẢO TRẦN (C108): "BC tiếp xúc với (I) tại D" — 1 cạnh, không tiền tố "cạnh" → 1 tiếp điểm', () => {
    const all = intents(
      'Cho tam giác ABC ngoại tiếp (I). BC tiếp xúc với (I) tại D.',
    );
    const tg = all.filter((i) => i.op === 'add-point' && i.constraint?.kind === 'tangencyPoint');
    expect(tg.map((i) => [i.name, i.constraint.onLine, i.constraint.circle])).toEqual([
      ['D', 'BC', 'I'],
    ]);
  });
});
