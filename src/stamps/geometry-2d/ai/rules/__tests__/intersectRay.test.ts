import { intersectRayRule } from '../intersectRay';
import { segmentClauses } from '../../deterministic/coverage';

function intents(problem: string) {
  const clauses = segmentClauses(problem);
  return intersectRayRule.match({ problem, clauses }).flatMap((m) => m.intents as any[]);
}

describe('intersectRayRule', () => {
  it('"Các tia AC và AD cắt Bx lần lượt ở E, F" → E=AC∩Bx, F=AD∩Bx (Bài 9)', () => {
    const problem =
      'Cho nửa đường tròn (O) đường kính AB. Kẻ tiếp tuyến Bx. Các tia AC và AD cắt Bx lần lượt ở E, F.';
    const out = intents(problem);
    expect(out).toContainEqual({
      op: 'add-point',
      name: 'E',
      constraint: { kind: 'intersection', of: ['AC', 'Bx'] },
    });
    expect(out).toContainEqual({
      op: 'add-point',
      name: 'F',
      constraint: { kind: 'intersection', of: ['AD', 'Bx'] },
    });
  });

  it('"tia AC và AD cắt Bx lần lượt tại E và F" (biến thể "tại … và") → 2 giao điểm', () => {
    const problem = 'Kẻ tiếp tuyến Bx. Tia AC và AD cắt Bx lần lượt tại E và F.';
    const out = intents(problem);
    expect(out).toContainEqual({ op: 'add-point', name: 'E', constraint: { kind: 'intersection', of: ['AC', 'Bx'] } });
    expect(out).toContainEqual({ op: 'add-point', name: 'F', constraint: { kind: 'intersection', of: ['AD', 'Bx'] } });
  });

  it('không match khi ref không phải token tia (Bx) mà là cặp đỉnh', () => {
    // "cắt CD" — CD là cặp đỉnh, generic intersection rule lo việc này, không phải rule tia
    expect(intents('Tia AC và AD cắt CD lần lượt ở E, F.')).toEqual([]);
  });
});
