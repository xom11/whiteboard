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

describe('parallelPerp KHÔNG nuốt perpFoot', () => {
  it('"Kẻ AH vuông góc với BC" vẫn do perpFoot xử lý (foot H)', () => {
    const problem = 'Cho tam giác ABC. Kẻ AH vuông góc với BC';
    const pf = perpFootRule.match({ problem, clauses: segmentClauses(problem) });
    expect(pf.flatMap((x) => x.intents).length).toBeGreaterThan(0);
  });
});
