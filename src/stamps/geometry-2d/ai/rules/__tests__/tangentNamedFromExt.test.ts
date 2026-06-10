import { tangentNamedFromExtRule } from '../tangentNamedFromExt';
import { circleExternalPointRule } from '../circleExternalPoint';
import { segmentClauses } from '../../deterministic/coverage';

function run(rule: typeof tangentNamedFromExtRule, problem: string) {
  return rule.match({ problem, clauses: segmentClauses(problem) }).flatMap((m) => m.intents as any[]);
}

describe('circleExternalPointRule', () => {
  it('"Cho đường tròn (O) và điểm A nằm ngoài đường tròn" → circle O + external A', () => {
    const all = run(circleExternalPointRule, 'Cho đường tròn (O) và điểm A nằm ngoài đường tròn');
    expect(all).toContainEqual(
      expect.objectContaining({ op: 'draw-circle', name: 'O', spec: 'centerRadius' }),
    );
    expect(all).toContainEqual({
      op: 'add-point',
      name: 'A',
      constraint: { kind: 'externalToCircle', circle: 'O' },
    });
    // circle PHẢI emit trước external point (build-order dependency).
    expect(all[0].op).toBe('draw-circle');
  });
});

describe('tangentNamedFromExtRule', () => {
  it('"Kẻ các tiếp tuyến AB, AC" → tangentPoint B(0), C(1) từ A + 2 đoạn', () => {
    const all = run(tangentNamedFromExtRule, 'Cho đường tròn (O). Kẻ các tiếp tuyến AB, AC với đường tròn');
    expect(all).toContainEqual({
      op: 'add-point',
      name: 'B',
      constraint: { kind: 'tangentPoint', from: 'A', circle: 'O', which: 0 },
    });
    expect(all).toContainEqual({
      op: 'add-point',
      name: 'C',
      constraint: { kind: 'tangentPoint', from: 'A', circle: 'O', which: 1 },
    });
  });

  it('"Kẻ tiếp tuyến CD" single → tangentPoint D(0) từ C', () => {
    const all = run(tangentNamedFromExtRule, 'Cho đường tròn (O). Kẻ tiếp tuyến CD với đường tròn');
    expect(all).toContainEqual({
      op: 'add-point',
      name: 'D',
      constraint: { kind: 'tangentPoint', from: 'C', circle: 'O', which: 0 },
    });
  });

  it('hai tiếp tuyến đơn cùng điểm ngoài A → B(0), E(1)', () => {
    const all = run(
      tangentNamedFromExtRule,
      'Cho đường tròn (O). Kẻ tiếp tuyến AB và cát tuyến ACD. Kẻ tiếp tuyến AE với (O)',
    );
    const tps = all.filter((i) => i.constraint?.kind === 'tangentPoint');
    expect(tps.map((i) => `${i.name}:${i.constraint.which}`)).toEqual(['B:0', 'E:1']);
  });

  it('"tiếp tuyến tại A" (tangentAt) KHÔNG khớp', () => {
    const all = run(tangentNamedFromExtRule, 'Cho đường tròn (O). Kẻ tiếp tuyến tại A của (O)');
    expect(all).toHaveLength(0);
  });
});
