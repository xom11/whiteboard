import { pointOnTangentAtRule } from '../pointOnTangentAt';
import { segmentClauses } from '../../deterministic/coverage';

function intents(problem: string) {
  const clauses = segmentClauses(problem);
  return pointOnTangentAtRule.match({ problem, clauses }).flatMap((m) => m.intents as any[]);
}

describe('pointOnTangentAtRule', () => {
  // vao10:17 — tiếp tuyến TẠI điểm A (không phải tia đặt tên) + lấy điểm trên đó.
  it('"Trên tiếp tuyến của đường tròn (O) tại A lấy điểm M" → tA + M onSegment tA', () => {
    const problem =
      'Cho đường tròn tâm O đường kính AB. Trên tiếp tuyến của đường tròn (O) tại A lấy điểm M ( M khác A ).';
    const out = intents(problem);
    expect(out).toContainEqual({ op: 'draw-line', name: 'tA', kind: 'tangentAt', through: 'A', circle: 'O_c' });
    expect(out).toContainEqual({ op: 'add-point', name: 'M', constraint: { kind: 'onSegment', of: 'tA' } });
  });

  it('"Trên tiếp tuyến tại C của (O) lấy một điểm P" (không "đường kính") → circle O', () => {
    const problem = 'Cho đường tròn (O) và điểm C trên (O). Trên tiếp tuyến tại C của (O) lấy một điểm P.';
    const out = intents(problem);
    expect(out).toContainEqual({ op: 'draw-line', name: 'tC', kind: 'tangentAt', through: 'C', circle: 'O' });
    expect(out).toContainEqual({ op: 'add-point', name: 'P', constraint: { kind: 'onSegment', of: 'tC' } });
  });

  it('không match khi không có "lấy điểm" trên tiếp tuyến', () => {
    expect(intents('Cho (O). Tiếp tuyến tại A cắt BC tại D.')).toEqual([]);
  });

  it('không match khi không xác định được đường tròn', () => {
    expect(intents('Cho tam giác ABC. Trên tiếp tuyến tại A lấy điểm M.')).toEqual([]);
  });
});
