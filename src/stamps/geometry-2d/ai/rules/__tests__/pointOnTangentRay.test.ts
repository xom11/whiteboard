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

  // vao10:235 — dạng ĐẢO "Trên tia Bx lấy điểm M" (Bx do tangentRay dựng trước).
  it('"Vẽ tiếp tuyến Bx ... Trên tia Bx lấy điểm M" → M onSegment Bx', () => {
    const problem = 'Cho (O) đường kính AB. Vẽ tiếp tuyến Bx với đường tròn (O). Trên tia Bx lấy điểm M.';
    expect(intents(problem)).toContainEqual({
      op: 'add-point',
      name: 'M',
      constraint: { kind: 'onSegment', of: 'Bx' },
    });
  });

  // vao10:19 — "Từ điểm M trên Ax kẻ tiếp tuyến thứ hai".
  it('"tiếp tuyến Ax ... điểm M trên Ax" → M onSegment Ax', () => {
    const problem = 'Cho nửa đường tròn (O) đường kính AB và tiếp tuyến Ax. Từ điểm M trên Ax kẻ tiếp tuyến thứ hai MC.';
    expect(intents(problem)).toContainEqual({
      op: 'add-point',
      name: 'M',
      constraint: { kind: 'onSegment', of: 'Ax' },
    });
  });

  it('không match "Trên tia Bx lấy điểm M" nếu Bx KHÔNG phải tiếp tuyến đặt tên', () => {
    expect(intents('Cho tam giác ABC. Trên tia Bx lấy điểm M.')).toEqual([]);
  });

  it('không match nếu không có tiếp tuyến đặt tên trước đó', () => {
    expect(intents('Cho tam giác ABC, lấy trên tiếp tuyến đó một điểm P.')).toEqual([]);
  });
});
