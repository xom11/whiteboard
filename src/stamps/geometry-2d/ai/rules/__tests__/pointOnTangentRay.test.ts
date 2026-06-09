import { pointOnTangentRayRule } from '../pointOnTangentRay';
import { segmentClauses } from '../../deterministic/coverage';

function intents(problem: string) {
  const clauses = segmentClauses(problem);
  return pointOnTangentRayRule.match({ problem, clauses }).flatMap((m) => m.intents as any[]);
}

describe('pointOnTangentRayRule', () => {
  it('"Kẻ tiếp tuyến Ax và lấy trên tiếp tuyến đó một điểm P" → P onSegment Ax', () => {
    const problem =
      'Cho đường tròn (O; R) đường kính AB. Kẻ tiếp tuyến Ax và lấy trên tiếp tuyến đó một điểm P sao cho AP > R.';
    expect(intents(problem)).toContainEqual({
      op: 'add-point',
      name: 'P',
      constraint: { kind: 'onSegment', of: 'Ax' },
    });
  });

  it('"lấy trên Ax một điểm P" (gọi thẳng tên tia) → P onSegment Ax', () => {
    const problem = 'Cho đường tròn (O) đường kính AB. Kẻ tiếp tuyến Ax, lấy trên Ax một điểm P.';
    expect(intents(problem)).toContainEqual({
      op: 'add-point',
      name: 'P',
      constraint: { kind: 'onSegment', of: 'Ax' },
    });
  });

  it('không match nếu không có tiếp tuyến đặt tên trước đó', () => {
    expect(intents('Cho tam giác ABC, lấy trên tiếp tuyến đó một điểm P.')).toEqual([]);
  });
});
