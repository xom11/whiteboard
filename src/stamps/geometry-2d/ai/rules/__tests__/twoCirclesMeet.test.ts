import { twoCirclesMeetRule } from '../twoCirclesMeet';
import { segmentClauses } from '../../deterministic/coverage';
import { tryDeterministicFigure } from '../../deterministic/tryDeterministicFigure';

function intents(problem: string) {
  return twoCirclesMeetRule
    .match({ problem, clauses: segmentClauses(problem) })
    .flatMap((m) => m.intents as any[]);
}

describe('twoCirclesMeetRule', () => {
  it('"Cho hai đường tròn (O) và (O′) cắt nhau tại hai điểm A, B" → 2 circleCR + A,B circleIntersection', () => {
    const all = intents('Cho hai đường tròn (O) và (O′) cắt nhau tại hai điểm A, B.');
    expect(all).toContainEqual({ op: 'draw-circle', name: 'O', spec: 'centerRadius', center: 'O', radius: expect.any(Number) });
    expect(all).toContainEqual({ op: 'draw-circle', name: "O'", spec: 'centerRadius', center: "O'", radius: expect.any(Number) });
    const a = all.find((i) => i.name === 'A');
    const b = all.find((i) => i.name === 'B');
    expect(a.constraint).toEqual({ kind: 'circleIntersection', c1: 'O', c2: "O'", which: 0 });
    expect(b.constraint).toEqual({ kind: 'circleIntersection', c1: 'O', c2: "O'", which: 1 });
  });

  it('biến thể "(O;R) và (O′;R′) cắt nhau tại A và B"', () => {
    const all = intents('Cho hai đường tròn (O;R) và (O′;R′) cắt nhau tại A và B.');
    expect(all.find((i) => i.name === 'A')?.constraint.kind).toBe('circleIntersection');
    expect(all.find((i) => i.name === 'B')?.constraint.kind).toBe('circleIntersection');
  });

  // httcd:84 — bán kính số + đơn vị "(O; 5cm)".
  it('biến thể "(O; 5cm) và (O′; 5cm) cắt nhau tại A và B"', () => {
    const all = intents('Cho hai đường tròn (O; 5cm) và (O′; 5cm) cắt nhau tại A và B.');
    expect(all.find((i) => i.name === 'A')?.constraint.kind).toBe('circleIntersection');
    expect(all.find((i) => i.name === 'B')?.constraint.kind).toBe('circleIntersection');
  });

  it('end-to-end: hình hợp lệ, A và B có toạ độ hữu hạn', () => {
    const r = tryDeterministicFigure('Cho hai đường tròn (O) và (O′) cắt nhau tại hai điểm A, B.');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const names = (r as any).figure.dsl.points.map((p: any) => p.name);
    expect(names).toEqual(expect.arrayContaining(['A', 'B']));
  });

  it('hai tên trùng (OCR mất prime) → bỏ qua (escalate)', () => {
    expect(intents('Cho hai đường tròn (O) và (O) cắt nhau tại A, B.')).toEqual([]);
  });

  it('không match khi chỉ một đường tròn', () => {
    expect(intents('Cho đường tròn (O) đường kính AB.')).toEqual([]);
  });
});
