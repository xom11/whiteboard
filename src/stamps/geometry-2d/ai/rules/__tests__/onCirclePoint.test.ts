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

  it('Bài 21: "Trên đường tròn (I) lấy điểm P bất kỳ" → P trên CHÍNH (I), không phải (O) toàn đề', () => {
    // Đề có (O) đường kính AB TRƯỚC, nhưng P phải thuộc (I). Emit center thô "I"
    // (resolveCircleNames map sang I_c nếu I là điểm). KHÔNG được lấy circle (O).
    const all = intents(
      'Cho đường tròn (O) đường kính AB. Vẽ đường tròn tâm I đi qua A. Trên đường tròn (I) lấy điểm P bất kỳ.',
    );
    expect(all).toContainEqual(
      expect.objectContaining({ op: 'add-point', name: 'P', constraint: expect.objectContaining({ kind: 'onCircle', circle: 'I' }) }),
    );
    // KHÔNG có intent đặt P trên O_c.
    expect(all.find((i) => i.name === 'P' && i.constraint.circle === 'O_c')).toBeUndefined();
  });
});
