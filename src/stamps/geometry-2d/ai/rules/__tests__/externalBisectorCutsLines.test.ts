import { externalBisectorCutsLinesRule } from '../externalBisectorCutsLines';
import { segmentClauses } from '../../deterministic/coverage';

const run = (p: string) => externalBisectorCutsLinesRule.match({ problem: p, clauses: segmentClauses(p) });

describe('externalBisectorCutsLinesRule', () => {
  it('"phân giác ngoài của góc BHC cắt AB, AC lần lượt tại M, N"', () => {
    const it = run('Đường thẳng chứa phân giác ngoài của góc BHC cắt AB, AC lần lượt tại các điểm M, N').flatMap((m) => m.intents) as any[];
    expect(it.find((i) => i.kind === 'angleBisector')).toMatchObject({ p1: 'B', vertex: 'H', p2: 'C' });
    expect(it.find((i) => i.kind === 'perpThrough')).toMatchObject({ through: 'H', to: 'bisInH' });
    expect(it.find((i) => i.name === 'M').constraint).toEqual({ kind: 'intersection', of: ['bisOutH', 'AB'] });
    expect(it.find((i) => i.name === 'N').constraint).toEqual({ kind: 'intersection', of: ['bisOutH', 'AC'] });
  });
});
