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
});
