// e2e: "góc vuông nhìn đoạn" đi qua TOÀN pipeline deterministic
// (rule engine → coverage → intentsToDsl → transpile → guards).
// Trước 2026-06-12 năng lực này nằm ở completeRightAngle (post-processor LLM
// của pipeline cũ, đã chết khi xoá path DSL free-form) — nay là rule
// rightAngleViewing nên Track A tự dựng không cần LLM.
import { tryDeterministicFigure } from '../deterministic/tryDeterministicFigure';

describe('e2e: góc vuông nhìn đoạn (đề gốc ABC/CK/M)', () => {
  const problem =
    'Cho tam giác nhọn ABC, đường cao CK. ' +
    'Gọi M là một điểm trên CK sao cho góc AMB = 90 độ.';

  it('Track A dựng được trọn đề: M = giao CK ∩ đường tròn Thales ẩn', () => {
    const det = tryDeterministicFigure(problem);
    expect(det.ok).toBe(true);
    if (!det.ok) return;

    const { dsl, transpile } = det.figure;
    const m = dsl.points.find((p) => p.name === 'M');
    expect(m).toBeDefined();
    expect(m!.kind).toBe('intersection');

    // Đường tròn đường kính AB (Thales) phải được inject ẩn.
    const thales = dsl.shapes.find((s) => s.kind === 'circleCP' && s.visible === false);
    expect(thales).toBeDefined();

    expect(transpile.ok).toBe(true);
  });
});
