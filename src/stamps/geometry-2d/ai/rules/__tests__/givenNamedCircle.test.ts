import { givenNamedCircleRule } from '../givenNamedCircle';
import { segmentClauses } from '../../deterministic/coverage';
import { SYMBOLIC_RADIUS } from '../circleRadius';

function intents(problem: string) {
  const clauses = segmentClauses(problem);
  return givenNamedCircleRule
    .match({ problem, clauses })
    .flatMap((m) => m.intents as any[]);
}

const CIRCLE_O = {
  op: 'draw-circle',
  name: 'O',
  spec: 'centerRadius',
  center: 'O',
  radius: SYMBOLIC_RADIUS,
};

describe('givenNamedCircleRule', () => {
  // --- Hành vi cũ: có điểm TRÊN đường tròn ----------------------------------
  it('dựng (O) khi có điểm trên đường tròn ("trên (O)")', () => {
    const problem =
      'Cho đường tròn (O) và hai điểm B, C cố định trên đường tròn. Lấy A trên (O).';
    expect(intents(problem)).toContainEqual(CIRCLE_O);
  });

  // --- Hành vi MỚI: (O) trần được tham chiếu bởi TIẾP TUYẾN -----------------
  it('dựng (O) trần khi được tham chiếu bởi tiếp tuyến (vao10:168)', () => {
    const problem =
      'Cho (O) và tiếp tuyến Ax. Trên Ax lấy hai điểm B và C sao cho AB=BC. Kẻ cát tuyến BEF với đường tròn.';
    expect(intents(problem)).toContainEqual(CIRCLE_O);
  });

  it('dựng (O) trần khi được tham chiếu bởi cát tuyến', () => {
    const problem = 'Cho đường tròn (O). Kẻ cát tuyến ABC tới đường tròn.';
    expect(intents(problem)).toContainEqual(CIRCLE_O);
  });

  // --- GUARD: KHÔNG dựng khi (O) đã được rule khác sở hữu ------------------
  it('KHÔNG dựng khi (O) có bán kính số/chữ "(O; R)" (circleRadius sở hữu)', () => {
    const problem = 'Cho đường tròn (O; R) và tiếp tuyến Ax.';
    expect(intents(problem)).toEqual([]);
  });

  it('KHÔNG dựng khi (O) là đường tròn đường kính (circleDiameter sở hữu)', () => {
    const problem = 'Cho đường tròn (O) đường kính AB. Kẻ tiếp tuyến Ax.';
    expect(intents(problem)).toEqual([]);
  });

  it('KHÔNG dựng khi (O) ngoại tiếp tam giác (circleTriangle sở hữu)', () => {
    const problem =
      'Cho tam giác ABC nội tiếp đường tròn (O). Kẻ tiếp tuyến Ax với (O).';
    expect(intents(problem)).toEqual([]);
  });

  it('KHÔNG dựng khi không có "đường tròn (O)" và không tham chiếu', () => {
    // "(O)" chỉ là chú thích (giao điểm), không phải đường tròn nền.
    const problem = 'Cho tam giác ABC. Gọi O là tâm. Kẻ AH.';
    expect(intents(problem)).toEqual([]);
  });
});
