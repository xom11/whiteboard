import { onCirclePointRule } from '../onCirclePoint';
import { segmentClauses } from '../../deterministic/coverage';

function intents(problem: string) {
  return onCirclePointRule
    .match({ problem, clauses: segmentClauses(problem) })
    .flatMap((m) => m.intents as any[]);
}

describe('onCirclePointRule', () => {
  it('"Điểm M nằm trên nửa đường tròn" after diameter circle → M on O_c', () => {
    const all = intents('Cho nửa đường tròn (O) đường kính AB. Điểm M nằm trên nửa đường tròn');
    expect(all).toContainEqual({
      op: 'add-point',
      name: 'M',
      constraint: { kind: 'onCircle', circle: 'O_c', theta: 1.2 },
    });
  });

  it('"Lấy điểm F thuộc cung AC nhỏ" → F on O_c when diameter circle is unique', () => {
    const all = intents('Cho (O;R) đường kính AB. Lấy điểm F thuộc cung AC nhỏ');
    expect(all).toContainEqual({
      op: 'add-point',
      name: 'F',
      constraint: { kind: 'onCircle', circle: 'O_c', theta: 1.2 },
    });
  });

  it('không có circle rõ ràng → không claim', () => {
    expect(intents('Lấy điểm F thuộc cung AC nhỏ')).toEqual([]);
  });
});
