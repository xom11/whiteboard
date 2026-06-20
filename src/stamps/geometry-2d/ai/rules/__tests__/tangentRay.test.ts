import { tangentRayRule } from '../tangentRay';
import { segmentClauses } from '../../deterministic/coverage';

function intents(problem: string) {
  const clauses = segmentClauses(problem);
  return tangentRayRule.match({ problem, clauses }).flatMap((m) => m.intents as any[]);
}

describe('tangentRayRule', () => {
  it('"Kẻ tiếp tuyến Ax" của (O;R) đường kính AB → tangentAt qua A, named Ax', () => {
    const problem =
      'Cho đường tròn (O; R) đường kính AB. Kẻ tiếp tuyến Ax và lấy trên tiếp tuyến đó một điểm P.';
    expect(intents(problem)).toContainEqual({
      op: 'draw-line',
      name: 'Ax',
      kind: 'tangentAt',
      through: 'A',
      circle: 'O',
    });
  });

  it('"Kẻ tiếp tuyến Bx" → tangentAt qua B, named Bx', () => {
    const problem = 'Cho nửa đường tròn (O; R) đường kính AB. Kẻ tiếp tuyến Bx.';
    expect(intents(problem)).toContainEqual({
      op: 'draw-line',
      name: 'Bx',
      kind: 'tangentAt',
      through: 'B',
      circle: 'O',
    });
  });

  it('"Từ A và B kẻ hai tiếp tuyến Ax, By" → 2 tangentAt', () => {
    const problem = 'Cho đường tròn (O) đường kính AB. Từ A và B kẻ hai tiếp tuyến Ax, By.';
    const out = intents(problem);
    expect(out).toContainEqual({ op: 'draw-line', name: 'Ax', kind: 'tangentAt', through: 'A', circle: 'O' });
    expect(out).toContainEqual({ op: 'draw-line', name: 'By', kind: 'tangentAt', through: 'B', circle: 'O' });
  });

  it('không match khi đầu mút tia không phải đầu mút đường kính', () => {
    // Cx — C không phải A/B đầu mút đường kính AB → bỏ qua (escalate-safe)
    const problem = 'Cho đường tròn (O) đường kính AB. Kẻ tiếp tuyến Cx.';
    expect(intents(problem)).toEqual([]);
  });

  it('không match khi không có đường tròn đường kính (tiếp điểm là đỉnh hình cho-sẵn)', () => {
    expect(intents('Cho tam giác ABC. Kẻ tiếp tuyến Ax.')).toEqual([]);
  });

  it('tiếp tuyến Ax với A là TIẾP ĐIỂM TỰ DO trên (O) trần → A onCircle + tia (vao10:168)', () => {
    const problem = 'Cho (O) và tiếp tuyến Ax. Trên Ax lấy hai điểm B và C sao cho AB=BC.';
    const out = intents(problem);
    expect(out).toContainEqual({
      op: 'add-point',
      name: 'A',
      constraint: { kind: 'onCircle', circle: 'O', theta: 0.7 },
    });
    expect(out).toContainEqual({
      op: 'draw-line',
      name: 'Ax',
      kind: 'tangentAt',
      through: 'A',
      circle: 'O',
    });
  });

  it('"Dựng hình bình hành AECD" KHÔNG loại tiếp điểm A (dựng, không cho-sẵn)', () => {
    // A là tiếp điểm tự do dù xuất hiện làm đỉnh hình bình hành được DỰNG sau.
    const problem = 'Cho (O) và tiếp tuyến Ax. Dựng hình bình hành AECD.';
    expect(intents(problem)).toContainEqual({
      op: 'add-point',
      name: 'A',
      constraint: { kind: 'onCircle', circle: 'O', theta: 0.7 },
    });
  });

  it('không match free-tangent khi không có đường tròn trần', () => {
    expect(intents('Cho điểm A và tiếp tuyến Ax.')).toEqual([]);
  });
});
