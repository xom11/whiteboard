// tryPartialFigure: render PHẦN chắc chắn đúng khi rule base không phủ đủ đề.
// Cắt phần phụ thuộc entity chưa dựng được (ref treo, lan truyền) + verify lại
// tập con; chỉ render khi còn ≥1 hình thật. KHÔNG gọi LLM.
import { tryPartialFigure, describePartialTodo } from '../partialFigure';

describe('tryPartialFigure', () => {
  it('(a) tam giác ABC + construct chưa hỗ trợ → render ABC, to-do nêu phần thiếu', () => {
    const r = tryPartialFigure('Cho tam giác ABC. Vẽ đường tròn mixtilinear.');
    expect(r).not.toBeNull();
    if (!r) return;
    // Polygon ABC sống sót.
    expect(r.figure.dsl.shapes.some((s) => s.kind === 'polygon')).toBe(true);
    expect(r.figure.transpile.ok).toBe(true);
    expect(r.figure.verify.ok).toBe(true);
    // To-do liệt kê clause chưa phủ.
    expect(r.todo.uncovered.some((c) => /mixtilinear/.test(c.text))).toBe(true);
  });

  it('(b) điểm phái sinh phụ thuộc entity treo → bị cắt lan truyền, ABC vẫn render', () => {
    // K = trung điểm MT, nhưng T thuộc clause "mixtilinear" chưa hỗ trợ → T treo.
    // K (refs T) và đoạn MT (refs T) phải bị cắt; ABC + M + đoạn BC giữ lại.
    const r = tryPartialFigure(
      'Cho tam giác ABC. Gọi M là trung điểm BC. Vẽ đường tròn mixtilinear chạm AB tại T. Gọi K là trung điểm MT.',
    );
    expect(r).not.toBeNull();
    if (!r) return;
    const names = [...r.figure.dsl.points.map((p) => p.name), ...r.figure.dsl.shapes.map((s) => s.name)];
    // K bị cắt (phụ thuộc T treo).
    expect(names).not.toContain('K');
    expect(r.todo.pruned).toContain('K');
    // ABC + M giữ lại, transpile + verify sạch.
    expect(names).toContain('ABC');
    expect(names).toContain('M');
    expect(r.figure.transpile.ok).toBe(true);
    expect(r.figure.verify.ok).toBe(true);
  });

  it('(c) không cứu được hình thật nào (chỉ điểm rời / không match) → null', () => {
    // Không rule nào dựng được → detIntents rỗng → null (báo miss toàn bộ).
    expect(tryPartialFigure('Cho hai điểm A và B. Vẽ đường tròn mixtilinear.')).toBeNull();
    expect(tryPartialFigure('Chứng minh định lý Pytago.')).toBeNull();
  });

  it('(named-missing) "ABC vẽ được, P là điểm Fermat không" → render ABC, to-do nêu P', () => {
    // Kịch bản kinh điển: clause "P là điểm Fermat" được claim (coverage complete)
    // nhưng P không dựng được → KHÔNG phải ref treo, chỉ named-entity guard thấy.
    const r = tryPartialFigure('Cho tam giác ABC, P là điểm Fermat của tam giác.');
    expect(r).not.toBeNull();
    if (!r) return;
    expect(r.figure.dsl.shapes.some((s) => s.kind === 'polygon')).toBe(true);
    expect(r.todo.missingNamed).toContain('P');
  });

  it('đề ĐẦY ĐỦ (không miss) vẫn cho partial result hợp lệ (caller chỉ gọi khi full miss)', () => {
    // tryPartialFigure không tự kiểm "đã full chưa" — đề complete vẫn dựng được,
    // chỉ là caller (generateFigureIntent) chỉ gọi nó trên nhánh fail.
    const r = tryPartialFigure('Cho tam giác ABC. Gọi M là trung điểm BC.');
    expect(r).not.toBeNull();
    if (!r) return;
    expect(r.todo.uncovered).toHaveLength(0);
    expect(r.todo.missingNamed).toHaveLength(0);
    expect(r.todo.pruned).toHaveLength(0);
  });
});

describe('describePartialTodo', () => {
  it('format 3 nhóm: uncovered (chưa hỗ trợ) + missingNamed + pruned (phụ thuộc)', () => {
    const msg = describePartialTodo({
      uncovered: [{ id: 1, text: 'Vẽ đường tròn mixtilinear', hasGeometry: true }],
      missingNamed: ['P'],
      pruned: ['K'],
    });
    expect(msg).toContain('mixtilinear');
    expect(msg).toContain('chưa hỗ trợ');
    expect(msg).toContain('P');
    expect(msg).toContain('K');
    expect(msg).toContain('phụ thuộc');
    expect(msg).toContain('tự dựng nốt');
  });

  it('rỗng cả 3 nhóm → câu chung không có bullet', () => {
    const msg = describePartialTodo({ uncovered: [], missingNamed: [], pruned: [] });
    expect(msg).not.toContain('•');
    expect(msg).toContain('chắc chắn đúng');
  });
});
