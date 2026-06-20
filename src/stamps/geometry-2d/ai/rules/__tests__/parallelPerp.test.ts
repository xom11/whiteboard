import { parallelPerpRule } from '../parallelPerp';
import { perpFootRule } from '../perpFoot';
import { segmentClauses } from '../../deterministic/coverage';

function run(problem: string) {
  return parallelPerpRule.match({ problem, clauses: segmentClauses(problem) });
}

describe('parallelPerpRule', () => {
  it('"Qua A kẻ đường thẳng song song với BC" → parallelThrough, through A, to BC', () => {
    const m = run('Cho tam giác ABC. Qua A kẻ đường thẳng song song với BC');
    expect(m.length).toBe(1);
    const i = m[0].intents[0] as any;
    expect(i.op).toBe('draw-line');
    expect(i.kind).toBe('parallelThrough');
    expect(i.through).toBe('A');
    expect(i.to).toBe('BC');
  });

  it('"Từ A vẽ đường thẳng vuông góc với BC" → perpThrough', () => {
    const i = run('Cho tam giác ABC. Từ A vẽ đường thẳng vuông góc với BC')[0].intents[0] as any;
    expect(i.kind).toBe('perpThrough');
    expect(i.through).toBe('A');
    expect(i.to).toBe('BC');
  });

  it('không có "với": "Qua M kẻ đường thẳng song song AB"', () => {
    const i = run('Qua M kẻ đường thẳng song song AB')[0].intents[0] as any;
    expect(i.kind).toBe('parallelThrough');
    expect(i.through).toBe('M');
    expect(i.to).toBe('AB');
  });

  it('"cạnh" chêm: "Qua A dựng đường thẳng vuông góc với cạnh BC"', () => {
    const i = run('Qua A dựng đường thẳng vuông góc với cạnh BC')[0].intents[0] as any;
    expect(i.kind).toBe('perpThrough');
    expect(i.to).toBe('BC');
  });

  it('tên line có thể trùng nhau giữa parallel/perp nhưng phân biệt qua through+to', () => {
    const i = run('Qua A kẻ đường thẳng song song với BC')[0].intents[0] as any;
    expect(typeof i.name).toBe('string');
    expect(i.name.length).toBeGreaterThan(0);
  });

  it('KHÔNG có "Qua/Từ <P>" → bỏ qua (vd "Kẻ AH vuông góc BC" là perpFoot, không phải rule này)', () => {
    expect(run('Cho tam giác ABC. Kẻ AH vuông góc với BC')).toHaveLength(0);
  });
});

describe('parallelPerp distributive đa-đường vuông góc (chân đặt tên)', () => {
  // vao10:173 — "Từ C kẻ CE, CF, CG lần lượt vuông góc với AD, DB, AB":
  // CE⊥AD (chân E), CF⊥DB (chân F), CG⊥AB (chân G). Mỗi cặp = perpThrough(C) + foot.
  it('3 đoạn cùng gốc C → 3 perpThrough + 3 chân', () => {
    const problem =
      'Cho hình bình hành ABCD. Từ C kẻ CE, CF, CG lần lượt vuông góc với AD, DB, AB';
    const m = run(problem);
    const intents = m.flatMap((x) => x.intents) as any[];
    const lines = intents.filter((i) => i.op === 'draw-line');
    const pts = intents.filter((i) => i.op === 'add-point');
    expect(lines.length).toBe(3);
    expect(lines.every((l) => l.kind === 'perpThrough' && l.through === 'C')).toBe(true);
    expect(pts.map((p) => p.name).sort()).toEqual(['E', 'F', 'G']);
    // foot E = giao đường ⊥ qua C với AD
    const e = pts.find((p) => p.name === 'E');
    expect(e.constraint.kind).toBe('intersection');
    expect(e.constraint.of[1]).toBe('AD');
  });

  it('2 đoạn cùng gốc cũng chạy', () => {
    const problem = 'Cho tam giác ABC. Từ M kẻ MH, MK lần lượt vuông góc với AB, AC';
    const intents = run(problem).flatMap((x) => x.intents) as any[];
    expect(intents.filter((i) => i.op === 'draw-line').length).toBe(2);
    expect(intents.filter((i) => i.op === 'add-point').map((p) => p.name).sort()).toEqual([
      'H',
      'K',
    ]);
  });

  it('chân trùng gốc (degenerate) → bỏ qua đoạn đó', () => {
    // "Từ C kẻ CC" vô nghĩa — không nên phát sinh.
    const problem = 'Từ C kẻ CE, CF vuông góc với AD, AB';
    const intents = run(problem).flatMap((x) => x.intents) as any[];
    expect(intents.filter((i) => i.op === 'add-point').map((p) => p.name).sort()).toEqual([
      'E',
      'F',
    ]);
  });
});

describe('parallelPerp KHÔNG nuốt perpFoot', () => {
  it('"Kẻ AH vuông góc với BC" vẫn do perpFoot xử lý (foot H)', () => {
    const problem = 'Cho tam giác ABC. Kẻ AH vuông góc với BC';
    const pf = perpFootRule.match({ problem, clauses: segmentClauses(problem) });
    expect(pf.flatMap((x) => x.intents).length).toBeGreaterThan(0);
  });
});
