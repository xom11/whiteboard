import { segmentClauses } from '../../deterministic/coverage';
import { runRules } from '../registry';
import { normalizeProblemText } from '../../deterministic/normalizeText';

function points(problem: string) {
  const p = normalizeProblemText(problem);
  return runRules({ problem: p, clauses: segmentClauses(p) })
    .flatMap((m) => m.intents as any[])
    .filter((i) => i.op === 'add-point' && i.constraint?.kind === 'pointAtDistance')
    .map((i) => [i.name, i.constraint.from, i.constraint.through] as [string, string, string]);
}

describe('oppositeRayPoint rule', () => {
  it('single: "Trên tia đối của tia AB lấy điểm C" → C = pointAtDistance(from=B, through=A)', () => {
    const pts = points('Cho đoạn AB. Trên tia đối của tia AB lấy điểm C.');
    expect(pts).toContainEqual(['C', 'B', 'A']);
  });

  it('DISTRIBUTIVE (C82): "Lấy D, E thuộc tia đối của tia AB, AC" → zip 1-1', () => {
    // D trên tia đối AB (gốc A, vượt A so B) → from=B, through=A.
    // E trên tia đối AC → from=C, through=A.
    const pts = points('Cho tam giác ABC. Lấy D, E thuộc tia đối của tia AB, AC sao cho BD = AC và CE = AB.');
    expect(pts).toEqual(
      expect.arrayContaining([
        ['D', 'B', 'A'],
        ['E', 'C', 'A'],
      ]),
    );
    expect(pts.length).toBe(2);
  });

  it('DISTRIBUTIVE số tên ≠ số tia → KHÔNG đoán (escalate)', () => {
    // 2 tên, 1 tia → mismatch → bỏ qua distributive; single-form cũng không khớp.
    const pts = points('Lấy D, E thuộc tia đối của tia AB.');
    expect(pts).toEqual([]);
  });
});
