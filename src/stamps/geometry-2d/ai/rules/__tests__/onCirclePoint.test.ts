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

  it('"Lấy điểm C thuộc (O)" bare paren → C on circle', () => {
    const all = intents('Cho đường tròn (O) đường kính AB. Lấy điểm C thuộc (O)');
    expect(all).toContainEqual({
      op: 'add-point',
      name: 'C',
      constraint: { kind: 'onCircle', circle: 'O_c', theta: 1.2 },
    });
  });

  it('"lấy hai điểm C và D thuộc nửa đường tròn" → C, D on O_c với theta KHÁC nhau (Bài 9)', () => {
    const all = intents(
      'Cho nửa đường tròn (O; R) đường kính AB. Kẻ tiếp tuyến Bx và lấy hai điểm C và D thuộc nửa đường tròn.',
    );
    const c = all.find((i) => i.name === 'C');
    const d = all.find((i) => i.name === 'D');
    expect(c).toBeDefined();
    expect(d).toBeDefined();
    expect(c.constraint.kind).toBe('onCircle');
    expect(c.constraint.circle).toBe('O_c');
    expect(d.constraint.kind).toBe('onCircle');
    expect(d.constraint.circle).toBe('O_c');
    expect(c.constraint.theta).not.toBe(d.constraint.theta);
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

  it('"Các điểm E, F thuộc cung BC" (phân phối phẩy) → E,F onCircle (Câu 28)', () => {
    const all = intents('Cho tam giác ABC nội tiếp (O). Các điểm E, F thuộc cung BC không chứa A');
    const names = all.filter((i) => i.constraint?.kind === 'onCircle').map((i) => i.name).sort();
    expect(names).toEqual(['E', 'F']);
  });

  it('bare "(O)" (không tiền tố "đường tròn") vẫn resolve circle', () => {
    const all = intents('Cho tam giác ABC nội tiếp (O). Điểm M thuộc cung nhỏ BC');
    expect(all.find((i) => i.name === 'M' && i.constraint?.kind === 'onCircle')).toBeDefined();
  });

  it('"M, N là hai điểm thuộc cung nhỏ BC" (tên trước) → M,N onCircle (Câu 18)', () => {
    const all = intents('Cho tam giác ABC nội tiếp (O). M, N là hai điểm thuộc cung nhỏ BC');
    const names = all.filter((i) => i.constraint?.kind === 'onCircle').map((i) => i.name).sort();
    expect(names).toEqual(['M', 'N']);
  });
});
