import { segmentClauses } from '../../deterministic/coverage';
import { normalizeProblemText } from '../../deterministic/normalizeText';
import { lineThroughCutsTwoLinesRule } from '../lineThroughCutsTwoLines';

function ctxOf(text: string) {
  const problem = normalizeProblemText(text);
  const clauses = segmentClauses(problem).filter((c) => c.hasGeometry);
  return { problem, clauses };
}

function intents(text: string) {
  return lineThroughCutsTwoLinesRule.match(ctxOf(text)).flatMap((m) => m.intents as any[]);
}

describe('lineThroughCutsTwoLinesRule', () => {
  // hinh9 #76
  const PROBLEM = 'Cho tam giác ABC, H là trực tâm. Một đường thẳng bất kì qua H cắt AC,AB lần lượt tại E,F.';

  it('emits E onSegment AC (the first line L1)', () => {
    expect(intents(PROBLEM)).toContainEqual({
      op: 'add-point',
      name: 'E',
      constraint: { kind: 'onSegment', of: 'AC' },
    });
  });

  it('emits F = intersection(HE, AB) (line through H ∩ L2)', () => {
    const f = intents(PROBLEM).find((i) => i.op === 'add-point' && i.name === 'F');
    expect(f).toBeTruthy();
    expect(f.constraint.kind).toBe('intersection');
    expect(f.constraint.of).toEqual(['HE', 'AB']);
  });

  it('emits E BEFORE F in intents[] (F ref needs E first)', () => {
    const all = intents(PROBLEM);
    const iE = all.findIndex((i) => i.op === 'add-point' && i.name === 'E');
    const iF = all.findIndex((i) => i.op === 'add-point' && i.name === 'F');
    expect(iE).toBeGreaterThanOrEqual(0);
    expect(iF).toBeGreaterThan(iE);
  });

  it('matches "tùy ý" wording too', () => {
    const i = intents('Cho tam giác ABC. Một đường thẳng tùy ý qua H cắt AC, AB tại E, F.');
    expect(i.some((x) => x.name === 'E' && x.constraint?.of === 'AC')).toBe(true);
    expect(i.some((x) => x.name === 'F' && x.constraint?.kind === 'intersection')).toBe(true);
  });

  // NEGATIVE: ⊥/∥ direction belongs to perpThroughCutsLines/parallelPerp, not us.
  it('does NOT claim a perpendicular line (no "bất kì/tùy ý")', () => {
    expect(intents('Qua H kẻ đường thẳng vuông góc với BC cắt AB tại E')).toEqual([]);
  });
});
