import { circleCenterRadiusSegmentRule } from '../circleCenterRadiusSegment';
import { segmentClauses } from '../../deterministic/coverage';

function intents(problem: string) {
  return circleCenterRadiusSegmentRule
    .match({ problem, clauses: segmentClauses(problem) })
    .flatMap((m) => m.intents as any[]);
}

describe('circleCenterRadiusSegmentRule', () => {
  it('"Vẽ đường tròn tâm A bán kính AH" → centerThrough A qua H', () => {
    const all = intents('Vẽ đường tròn tâm A bán kính AH.');
    expect(all).toContainEqual({
      op: 'draw-circle',
      name: 'A',
      spec: 'centerThrough',
      center: 'A',
      through: 'H',
    });
  });

  it('"HD là đường kính của đường tròn (A" → D đối tâm H qua A (reflectPoint)', () => {
    const all = intents('Gọi HD là đường kính của đường tròn (A; AH).');
    expect(all).toContainEqual({
      op: 'add-point',
      name: 'D',
      constraint: { kind: 'reflectPoint', of: 'H', through: 'A' },
    });
  });

  it('"Tiếp tuyến của đường tròn tại D cắt CA ở E" → tangent + intersection', () => {
    const all = intents(
      'Vẽ đường tròn tâm A bán kính AH. Tiếp tuyến của đường tròn tại D cắt CA ở E.',
    );
    expect(all).toContainEqual({
      op: 'draw-line',
      name: 'tD',
      kind: 'tangentAt',
      through: 'D',
      circle: 'A',
    });
    expect(all).toContainEqual({
      op: 'add-point',
      name: 'E',
      constraint: { kind: 'intersection', of: ['tD', 'CA'] },
    });
  });

  it('toàn bài 6: cả 3 construct được emit', () => {
    const all = intents(
      'Vẽ đường tròn tâm A bán kính AH. Gọi HD là đường kính của đường tròn (A; AH). Tiếp tuyến của đường tròn tại D cắt CA ở E.',
    );
    const kinds = all.map((i) =>
      i.op === 'draw-circle' ? 'circle' : i.op === 'draw-line' ? 'tangent' : i.constraint.kind,
    );
    expect(kinds).toEqual(
      expect.arrayContaining(['circle', 'reflectPoint', 'tangent', 'intersection']),
    );
  });

  it('fail-safe: bán kính SỐ không khớp (circleRadius sở hữu)', () => {
    expect(intents('Vẽ đường tròn tâm A bán kính 3.')).toEqual([]);
  });
});
