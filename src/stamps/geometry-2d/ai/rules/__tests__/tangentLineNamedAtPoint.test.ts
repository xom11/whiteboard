import { tangentLineNamedAtPointRule } from '../tangentLineNamedAtPoint';
import { segmentClauses } from '../../deterministic/coverage';

function intents(problem: string) {
  return tangentLineNamedAtPointRule
    .match({ problem, clauses: segmentClauses(problem) })
    .flatMap((m) => m.intents as any[]);
}

describe('tangentLineNamedAtPointRule', () => {
  it('dạng gốc: "từ điểm A trên (O) kẻ tiếp tuyến d" → draw-line d tangentAt A circle O', () => {
    const all = intents('Từ điểm A trên (O) kẻ tiếp tuyến d với (O)');
    expect(all).toContainEqual({
      op: 'draw-line', name: 'd', kind: 'tangentAt', through: 'A', circle: 'O',
    });
  });

  it('"Vẽ tiếp tuyến d của đường tròn (O) tại B" (đường kính) → d tangentAt B circle O_c (httcd:205)', () => {
    const all = intents('Cho đường tròn (O) đường kính AB. Vẽ tiếp tuyến d của đường tròn (O) tại B.');
    expect(all).toContainEqual({
      op: 'draw-line', name: 'd', kind: 'tangentAt', through: 'B', circle: 'O_c',
    });
  });

  it('"Kẻ tiếp tuyến d của (O) tại B" không đường kính → circle O', () => {
    const all = intents('Cho đường tròn (O). Kẻ tiếp tuyến d của (O) tại B.');
    expect(all).toContainEqual({
      op: 'draw-line', name: 'd', kind: 'tangentAt', through: 'B', circle: 'O',
    });
  });

  it('"Qua A vẽ tiếp tuyến xy" → đường xy tangentAt A circle O (httcd:95)', () => {
    const all = intents('Cho đường tròn (O; R) và điểm A trên đường tròn. Qua A vẽ tiếp tuyến xy.');
    expect(all).toContainEqual({
      op: 'draw-line', name: 'xy', kind: 'tangentAt', through: 'A', circle: 'O',
    });
  });
});
