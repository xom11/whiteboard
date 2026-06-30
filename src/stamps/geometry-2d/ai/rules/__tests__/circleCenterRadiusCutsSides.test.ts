import { circleCenterRadiusCutsSidesRule } from '../circleCenterRadiusCutsSides';
import { segmentClauses } from '../../deterministic/coverage';

function intents(problem: string) {
  return circleCenterRadiusCutsSidesRule
    .match({ problem, clauses: segmentClauses(problem) })
    .flatMap((m) => m.intents as any[]);
}

describe('circleCenterRadiusCutsSidesRule', () => {
  // C66 — "Đường tròn tâm H bán kính AH cắt AB, AC theo thứ tự tại M,N".
  // Bán kính AH ⇒ A thuộc đường tròn; A là đỉnh chung của AB và AC ⇒ điểm chung
  // (other) cho giao thứ hai trên mỗi cạnh.
  it('center=H, radius AH, "cắt AB, AC theo thứ tự tại M,N" → centerThrough(H,A) + 2 giao thứ hai loại A', () => {
    const p =
      'Cho tam giác ABC. Gọi H là trực tâm. Đường tròn tâm H bán kính AH cắt AB, AC theo thứ tự tại M,N.';
    const all = intents(p);
    expect(all).toContainEqual({
      op: 'draw-circle',
      name: 'H_c',
      spec: 'centerThrough',
      center: 'H',
      through: 'A',
    });
    expect(all).toContainEqual({
      op: 'add-point',
      name: 'M',
      constraint: { kind: 'secondIntersection', line: 'AB', circle: 'H_c', other: 'A' },
    });
    expect(all).toContainEqual({
      op: 'add-point',
      name: 'N',
      constraint: { kind: 'secondIntersection', line: 'AC', circle: 'H_c', other: 'A' },
    });
  });

  // Biến thể "lần lượt" + nối "và" giữa điểm + center-first radius "HA" (đảo thứ tự
  // endpoint vẫn cho through-point = A, chữ KHÁC tâm).
  it('radius "HA" (center-first) + "lần lượt tại M và N" → through-point A', () => {
    const p =
      'Cho tam giác ABC. Đường tròn tâm H bán kính HA cắt AB, AC lần lượt tại M và N.';
    const all = intents(p);
    expect(all).toContainEqual({
      op: 'draw-circle',
      name: 'H_c',
      spec: 'centerThrough',
      center: 'H',
      through: 'A',
    });
    expect(all.find((i) => i.name === 'M')?.constraint).toEqual({
      kind: 'secondIntersection',
      line: 'AB',
      circle: 'H_c',
      other: 'A',
    });
    expect(all.find((i) => i.name === 'N')?.constraint).toEqual({
      kind: 'secondIntersection',
      line: 'AC',
      circle: 'H_c',
      other: 'A',
    });
  });

  // Fail-safe: through-point KHÔNG nằm trên (đúng 1) cạnh → escalate.
  it('through-point không trên cạnh → bỏ qua', () => {
    // bán kính HK, K ∉ {A,B,C}; cạnh AB/AC không chứa K → other không xác định.
    const p = 'Cho tam giác ABC. Đường tròn tâm H bán kính HK cắt AB, AC tại M, N.';
    expect(intents(p).length).toBe(0);
  });

  // Fail-safe: bán kính không xuất phát từ tâm (cả 2 đầu mút ≠ tâm) → bỏ qua.
  it('bán kính rời tâm → bỏ qua', () => {
    const p = 'Cho tam giác ABC. Đường tròn tâm H bán kính AB cắt AB, AC tại M, N.';
    expect(intents(p).length).toBe(0);
  });

  // Fail-safe: số cạnh ≠ số điểm.
  it('số cạnh ≠ số điểm → bỏ qua', () => {
    const p = 'Cho tam giác ABC. Đường tròn tâm H bán kính AH cắt AB, AC, BC tại M, N.';
    expect(intents(p).length).toBe(0);
  });
});
