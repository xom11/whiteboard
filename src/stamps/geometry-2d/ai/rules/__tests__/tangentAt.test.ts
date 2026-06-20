import { tangentAtRule } from '../tangentAt';
import { segmentClauses } from '../../deterministic/coverage';

function intents(problem: string) {
  return tangentAtRule
    .match({ problem, clauses: segmentClauses(problem) })
    .flatMap((m) => m.intents as any[]);
}

describe('tangentAtRule', () => {
  it('distributed tangents at M intersect tangents at A/B at C/D', () => {
    const all = intents(
      'Cho nửa đường tròn (O) đường kính AB. Tiếp tuyến tại M cắt tiếp tuyến tại A và B của đường tròn (O) lần lượt tại C và D',
    );
    expect(all).toEqual([
      { op: 'draw-line', name: 'tM', kind: 'tangentAt', through: 'M', circle: 'O_c' },
      { op: 'draw-line', name: 'tA', kind: 'tangentAt', through: 'A', circle: 'O_c' },
      { op: 'draw-line', name: 'tB', kind: 'tangentAt', through: 'B', circle: 'O_c' },
      { op: 'add-point', name: 'C', constraint: { kind: 'intersection', of: ['tM', 'tA'] } },
      { op: 'add-point', name: 'D', constraint: { kind: 'intersection', of: ['tM', 'tB'] } },
    ]);
  });

  it('single tangent at B of circle (O)', () => {
    const all = intents('Cho đường tròn (O) đường kính AB. Tiếp tuyến tại B của đường tròn (O)');
    expect(all).toContainEqual({
      op: 'draw-line',
      name: 'tB',
      kind: 'tangentAt',
      through: 'B',
      circle: 'O_c',
    });
  });

  it('không có circle rõ ràng → không claim', () => {
    expect(intents('Tiếp tuyến tại B cắt AB tại C')).toEqual([]);
  });
});

describe('tangentAt — hai tiếp tuyến cắt nhau', () => {
  it('"Tiếp tuyến tại B, C của (O) cắt nhau tại T" → tB,tC,T=tB∩tC', () => {
    const m = tangentAtRule.match({
      problem: 'Cho (O). Tiếp tuyến tại B, C của (O) cắt nhau tại T',
      clauses: segmentClauses('Cho (O). Tiếp tuyến tại B, C của (O) cắt nhau tại T'),
    });
    const intents = m.flatMap((x) => x.intents) as any[];
    expect(intents.filter((i) => i.op === 'draw-line').map((i) => i.through).sort()).toEqual(['B', 'C']);
    const t = intents.find((i) => i.op === 'add-point');
    expect(t.name).toBe('T');
    expect(t.constraint).toEqual({ kind: 'intersection', of: ['tB', 'tC'] });
  });

  // vao10:122 — "với (O)" xen giữa + separator "và": "Các tiếp tuyến với (O) tại
  // B và C cắt nhau tại D".
  it('"Các tiếp tuyến với (O) tại B và C cắt nhau tại D" → D=tB∩tC', () => {
    const all = intents('Cho tam giác ABC nội tiếp (O). Các tiếp tuyến với (O) tại B và C cắt nhau tại D.');
    expect(all.filter((i) => i.op === 'draw-line').map((i) => i.through).sort()).toEqual(['B', 'C']);
    const d = all.find((i) => i.op === 'add-point' && i.name === 'D');
    expect(d.constraint).toEqual({ kind: 'intersection', of: ['tB', 'tC'] });
  });

  it('"Hai tiếp tuyến qua B và C của (O) cắt nhau tại E" → tB,tC,E (vao10:228)', () => {
    const all = intents('Cho đường tròn (O), dây BC. Hai tiếp tuyến qua B và C của (O) cắt nhau tại E.');
    expect(all).toContainEqual({ op: 'draw-line', name: 'tB', kind: 'tangentAt', through: 'B', circle: 'O' });
    expect(all).toContainEqual({ op: 'draw-line', name: 'tC', kind: 'tangentAt', through: 'C', circle: 'O' });
    const e = all.find((i) => i.op === 'add-point' && i.name === 'E');
    expect(e.constraint).toEqual({ kind: 'intersection', of: ['tB', 'tC'] });
  });
});
