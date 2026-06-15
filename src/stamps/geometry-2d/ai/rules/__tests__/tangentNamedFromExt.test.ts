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

  // httcd:59 — điểm ngoài qua METRIC (không chữ "ngoài"): "(O;3cm) và điểm A có
  // OA=6cm" → 6 > 3 ⇒ A ngoài (O).
  it('"Cho đường tròn (O ; 3cm) và điểm A có OA = 6 cm" → circle O + external A (metric)', () => {
    const all = run(circleExternalPointRule, 'Cho đường tròn (O ; 3cm) và điểm A có OA = 6 cm');
    expect(all).toContainEqual({ op: 'add-point', name: 'A', constraint: { kind: 'externalToCircle', circle: 'O' } });
  });

  it('KHÔNG external khi OA < R (điểm trong)', () => {
    const all = run(circleExternalPointRule, 'Cho đường tròn (O ; 5cm) và điểm A có OA = 2 cm');
    expect(all.find((i: any) => i.name === 'A' && i.constraint?.kind === 'externalToCircle')).toBeUndefined();
  });
});

describe('tangentNamedFromExtRule (vao10 variants)', () => {
  it('"Qua A kẻ hai tiếp tuyến AP và AQ của đường tròn (O)" — separator "và"', () => {
    const all = run(
      tangentNamedFromExtRule,
      'Cho đường tròn (O) và điểm A. Qua A kẻ hai tiếp tuyến AP và AQ của đường tròn (O)',
    );
    expect(all).toContainEqual({
      op: 'add-point',
      name: 'P',
      constraint: { kind: 'tangentPoint', from: 'A', circle: 'O', which: 0 },
    });
    expect(all).toContainEqual({
      op: 'add-point',
      name: 'Q',
      constraint: { kind: 'tangentPoint', from: 'A', circle: 'O', which: 1 },
    });
  });

  it('"Qua M kẻ 2 tiếp tuyến ME, MF tới đường tròn (O)" — số từ "2"', () => {
    const all = run(tangentNamedFromExtRule, 'Qua M kẻ 2 tiếp tuyến ME, MF tới đường tròn (O)');
    expect(all.filter((i) => i.constraint?.kind === 'tangentPoint')).toHaveLength(2);
  });

  it('"Các tiếp tuyến với đường tròn kẻ từ A tiếp xúc với đường tròn tại B,C"', () => {
    const all = run(
      tangentNamedFromExtRule,
      'Cho đường tròn (O) và một điểm A nằm ngoài đường tròn. Các tiếp tuyến với đường tròn kẻ từ A tiếp xúc với đường tròn tại B,C',
    );
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

  it('claim appositive "với P và Q là hai tiếp điểm" (không intent mới)', () => {
    const p = 'Qua A kẻ hai tiếp tuyến AP và AQ của đường tròn (O), với P và Q là hai tiếp điểm';
    const cls = segmentClauses(p);
    const ms = tangentNamedFromExtRule.match({ problem: p, clauses: cls });
    const claimed = new Set(ms.flatMap((m) => m.clauseIds));
    const appos = cls.find((c) => /tiếp điểm/.test(c.text))!;
    expect(claimed.has(appos.id)).toBe(true);
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

  // vao10:17 — "Từ M vẽ tiếp tuyến thứ hai MC với (O)" (qualifier "thứ hai" giữa
  // "tiếp tuyến" và cặp đỉnh). M ngoài, C tiếp điểm.
  it('"Từ M vẽ tiếp tuyến thứ hai MC với (O)" → C tangentPoint from M', () => {
    const all = run(tangentNamedFromExtRule, 'Cho đường tròn (O). Từ M vẽ tiếp tuyến thứ hai MC với (O).');
    const c = all.find((i: any) => i.op === 'add-point' && i.name === 'C');
    expect(c).toBeDefined();
    expect(c.constraint.kind).toBe('tangentPoint');
    expect(c.constraint.from).toBe('M');
  });
});
