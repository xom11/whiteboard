import { rightAngleViewingRule } from '../rightAngleViewing';
import { segmentClauses } from '../../deterministic/coverage';
import type { RuleContext } from '../_types';

function ctxOf(problem: string): RuleContext {
  return { problem, clauses: segmentClauses(problem) };
}

function firstAddPoint(problem: string) {
  const matches = rightAngleViewingRule.match(ctxOf(problem));
  expect(matches.length).toBeGreaterThan(0);
  const intent = matches[0].intents.find((i) => i.op === 'add-point');
  expect(intent).toBeDefined();
  return intent as Extract<typeof intent, { op: 'add-point' }> & {
    name: string;
    constraint: Record<string, unknown>;
  };
}

describe('rightAngleViewingRule', () => {
  it('"M trên CK sao cho góc AMB = 90 độ" → add-point M rightAngleViewing', () => {
    const m = firstAddPoint(
      'Cho tam giác nhọn ABC, đường cao CK. Gọi M là một điểm trên CK sao cho góc AMB = 90 độ.',
    );
    expect(m.name).toBe('M');
    expect(m.constraint).toEqual({ kind: 'rightAngleViewing', a: 'A', b: 'B', onLine: 'CK' });
  });

  it('phrasing "∠AMB = 90°"', () => {
    const m = firstAddPoint('M thuộc đường thẳng CK sao cho ∠AMB = 90°.');
    expect(m.constraint).toEqual({ kind: 'rightAngleViewing', a: 'A', b: 'B', onLine: 'CK' });
  });

  it('phrasing "góc AMB vuông"', () => {
    const m = firstAddPoint('M nằm trên CK sao cho góc AMB vuông.');
    expect(m.constraint).toEqual({ kind: 'rightAngleViewing', a: 'A', b: 'B', onLine: 'CK' });
  });

  it('phrasing "MA ⊥ MB" (vertex = chữ chung)', () => {
    const m = firstAddPoint('M nằm trên CK sao cho MA ⊥ MB.');
    expect(m.name).toBe('M');
    expect(m.constraint).toEqual({ kind: 'rightAngleViewing', a: 'A', b: 'B', onLine: 'CK' });
  });

  it('không match khi vertex KHÔNG có mệnh đề trên-đường ("góc AMB = 90" trơ)', () => {
    expect(rightAngleViewingRule.match(ctxOf('Biết góc AMB = 90 độ.'))).toEqual([]);
  });

  it('không match "M thuộc đường tròn (O)" (tròn ≠ đường thẳng — không nuốt "tr")', () => {
    expect(
      rightAngleViewingRule.match(
        ctxOf('M thuộc đường tròn (O) sao cho góc AMB = 90 độ.'),
      ),
    ).toEqual([]);
  });

  it('không match perp KHÔNG chung đỉnh ("AH ⊥ BC" là perpFoot, không phải góc nhìn)', () => {
    expect(rightAngleViewingRule.match(ctxOf('Kẻ AH ⊥ BC. H trên BC.'))).toEqual([]);
  });
});
