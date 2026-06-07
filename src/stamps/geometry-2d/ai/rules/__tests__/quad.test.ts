import { quadRule } from '../quad';
import { segmentClauses } from '../../deterministic/coverage';

function run(problem: string) {
  return quadRule.match({ problem, clauses: segmentClauses(problem) });
}

describe('quadRule', () => {
  it('"hình vuông ABCD" → draw-shape square standard', () => {
    const m = run('Cho hình vuông ABCD');
    expect(m.length).toBe(1);
    const intent = m[0].intents[0] as any;
    expect(intent.op).toBe('draw-shape');
    expect(intent.shape).toBe('square');
    expect(intent.labels).toEqual(['A', 'B', 'C', 'D']);
    expect(intent.variant).toBe('standard');
    expect(m[0].clauseIds).toContain(0);
  });

  it('"hình chữ nhật ABCD" → rectangle wide', () => {
    const m = run('Cho hình chữ nhật ABCD');
    const intent = m[0].intents[0] as any;
    expect(intent.shape).toBe('rectangle');
    expect(intent.labels).toEqual(['A', 'B', 'C', 'D']);
    expect(intent.variant).toBe('wide');
  });

  it('"hình bình hành ABCD" → parallelogram standard', () => {
    const m = run('Cho hình bình hành ABCD');
    const intent = m[0].intents[0] as any;
    expect(intent.shape).toBe('parallelogram');
    expect(intent.labels).toEqual(['A', 'B', 'C', 'D']);
    expect(intent.variant).toBe('standard');
  });

  it('"hình thoi ABCD" → rhombus standard', () => {
    const m = run('Cho hình thoi ABCD');
    const intent = m[0].intents[0] as any;
    expect(intent.shape).toBe('rhombus');
    expect(intent.labels).toEqual(['A', 'B', 'C', 'D']);
    expect(intent.variant).toBe('standard');
  });

  it('"hình thang ABCD" → trapezoid general', () => {
    const m = run('Cho hình thang ABCD');
    const intent = m[0].intents[0] as any;
    expect(intent.shape).toBe('trapezoid');
    expect(intent.labels).toEqual(['A', 'B', 'C', 'D']);
    expect(intent.variant).toBe('general');
  });

  it('"hình thang cân ABCD" → trapezoid isoceles (ưu tiên hơn thang chung)', () => {
    const m = run('Cho hình thang cân ABCD');
    expect(m.length).toBe(1);
    const intent = m[0].intents[0] as any;
    expect(intent.shape).toBe('trapezoid');
    expect(intent.variant).toBe('isoceles');
    expect(intent.labels).toEqual(['A', 'B', 'C', 'D']);
  });

  it('"hình thang vuông ABCD" → trapezoid right', () => {
    const m = run('Cho hình thang vuông MNPQ');
    expect(m.length).toBe(1);
    const intent = m[0].intents[0] as any;
    expect(intent.shape).toBe('trapezoid');
    expect(intent.variant).toBe('right');
    expect(intent.labels).toEqual(['M', 'N', 'P', 'Q']);
  });

  it('"tứ giác ABCD" → quadrilateral any', () => {
    const m = run('Cho tứ giác ABCD');
    const intent = m[0].intents[0] as any;
    expect(intent.shape).toBe('quadrilateral');
    expect(intent.labels).toEqual(['A', 'B', 'C', 'D']);
    expect(intent.variant).toBe('any');
  });

  it('không trích được 4 đỉnh HOA liền → bỏ qua (escalate)', () => {
    const m = run('Cho một hình vuông bất kỳ');
    expect(m.length).toBe(0);
  });

  it('nhiều hình trong đề → mỗi clause khớp 1 RuleMatch', () => {
    const m = run('Cho hình vuông ABCD. Gọi tứ giác EFGH là tứ giác nội tiếp');
    expect(m.length).toBe(2);
    const shapes = m.map((x) => (x.intents[0] as any).shape).sort();
    expect(shapes).toEqual(['quadrilateral', 'square']);
  });

  // --- BUG 1: 2 hình trong CÙNG clause → emit-all theo thứ tự TEXT -----------
  it('"hình bình hành ABCD và hình chữ nhật EFGH" → 2 shape, theo thứ tự text', () => {
    const m = run('Cho hình bình hành ABCD và hình chữ nhật EFGH');
    expect(m.length).toBe(2);
    const a = m[0].intents[0] as any;
    const b = m[1].intents[0] as any;
    expect(a.shape).toBe('parallelogram');
    expect(a.labels).toEqual(['A', 'B', 'C', 'D']);
    expect(b.shape).toBe('rectangle');
    expect(b.labels).toEqual(['E', 'F', 'G', 'H']);
  });

  it('"hình thoi ABCD và hình vuông EFGH" → rhombus + square (thứ tự text)', () => {
    const m = run('Cho hình thoi ABCD và hình vuông EFGH');
    expect(m.length).toBe(2);
    expect((m[0].intents[0] as any).shape).toBe('rhombus');
    expect((m[0].intents[0] as any).labels).toEqual(['A', 'B', 'C', 'D']);
    expect((m[1].intents[0] as any).shape).toBe('square');
    expect((m[1].intents[0] as any).labels).toEqual(['E', 'F', 'G', 'H']);
  });

  // --- BUG 2: modifier 'vuông'/'cân' đứng SAU đỉnh ---------------------------
  it('"hình thang ABCD vuông tại A" → trapezoid right (modifier hậu vị)', () => {
    const m = run('Cho hình thang ABCD vuông tại A');
    expect(m.length).toBe(1);
    const intent = m[0].intents[0] as any;
    expect(intent.shape).toBe('trapezoid');
    expect(intent.variant).toBe('right');
    expect(intent.labels).toEqual(['A', 'B', 'C', 'D']);
  });

  it('"hình thang ABCD cân" → trapezoid isoceles (modifier hậu vị)', () => {
    const m = run('Cho hình thang ABCD cân');
    expect(m.length).toBe(1);
    const intent = m[0].intents[0] as any;
    expect(intent.shape).toBe('trapezoid');
    expect(intent.variant).toBe('isoceles');
  });

  it('modifier hậu vị KHÔNG nuốt "vuông" của hình kế tiếp', () => {
    // "hình thang ABCD và hình vuông EFGH": thang phải là general, KHÔNG right.
    const m = run('Cho hình thang ABCD và hình vuông EFGH');
    expect(m.length).toBe(2);
    const trap = m.find((x) => (x.intents[0] as any).shape === 'trapezoid');
    const sq = m.find((x) => (x.intents[0] as any).shape === 'square');
    expect(trap).toBeDefined();
    expect((trap!.intents[0] as any).variant).toBe('general');
    expect(sq).toBeDefined();
    expect((sq!.intents[0] as any).labels).toEqual(['E', 'F', 'G', 'H']);
  });

  it('"hình thang vuông ABCD" (modifier TIỀN vị) vẫn → right', () => {
    const m = run('Cho hình thang vuông ABCD');
    expect(m.length).toBe(1);
    expect((m[0].intents[0] as any).variant).toBe('right');
    expect((m[0].intents[0] as any).labels).toEqual(['A', 'B', 'C', 'D']);
  });

  // --- BUG 3: 5+ đỉnh KHÔNG match (escalate, không cắt im lặng) --------------
  it('"tứ giác ABCDE" (5 đỉnh) → không match (escalate)', () => {
    const m = run('Cho tứ giác ABCDE');
    expect(m.length).toBe(0);
  });

  it('"hình vuông ABCDE" (5 đỉnh) → không match (escalate)', () => {
    const m = run('Cho hình vuông ABCDE');
    expect(m.length).toBe(0);
  });

  // --- Tứ giác nội tiếp (cyclic quadrilateral) — issue #46 nhóm C -----------
  it('"tứ giác ABCD nội tiếp đường tròn (O)" → draw-shape (concyclic) + draw-circle through3', () => {
    const m = run('Cho tứ giác ABCD nội tiếp đường tròn (O)');
    expect(m.length).toBe(1);
    expect(m[0].intents.length).toBe(2);
    const shape = m[0].intents[0] as any;
    const circ = m[0].intents[1] as any;
    expect(shape.op).toBe('draw-shape');
    expect(shape.shape).toBe('quadrilateral');
    expect(shape.labels).toEqual(['A', 'B', 'C', 'D']);
    expect(shape.explicitCoords).toBeDefined();
    expect(shape.explicitCoords.A).toEqual([-3, 4]);
    expect(shape.explicitCoords.B).toEqual([4, 3]);
    expect(shape.explicitCoords.C).toEqual([3, -4]);
    expect(shape.explicitCoords.D).toEqual([-4, -3]);
    expect(circ.op).toBe('draw-circle');
    expect(circ.spec).toBe('through3');
    expect(circ.name).toBe('O');
    expect(circ.points).toEqual(['A', 'B', 'C']);
  });

  it('Pattern B: "Đường tròn (O) ngoại tiếp tứ giác MNPQ" → 2 intents', () => {
    const m = run('Đường tròn (O) ngoại tiếp tứ giác MNPQ');
    expect(m.length).toBe(1);
    expect(m[0].intents.length).toBe(2);
    const shape = m[0].intents[0] as any;
    const circ = m[0].intents[1] as any;
    expect(shape.shape).toBe('quadrilateral');
    expect(shape.labels).toEqual(['M', 'N', 'P', 'Q']);
    expect(shape.explicitCoords.M).toEqual([-3, 4]);
    expect(shape.explicitCoords.Q).toEqual([-4, -3]);
    expect(circ.name).toBe('O');
    expect(circ.spec).toBe('through3');
    expect(circ.points).toEqual(['M', 'N', 'P']);
  });

  it('default center "đường tròn" (không tên) → circle name "O"', () => {
    const m = run('Cho tứ giác ABCD nội tiếp đường tròn');
    expect(m.length).toBe(1);
    expect(m[0].intents.length).toBe(2);
    expect((m[0].intents[1] as any).name).toBe('O');
  });

  it('named center "tâm I" → circle name "I"', () => {
    const m = run('Cho tứ giác ABCD nội tiếp đường tròn tâm I');
    expect(m.length).toBe(1);
    expect(m[0].intents.length).toBe(2);
    expect((m[0].intents[1] as any).name).toBe('I');
  });

  it('Pattern B named center "tâm K" → circle name "K"', () => {
    const m = run('Đường tròn tâm K ngoại tiếp tứ giác MNPQ');
    expect(m.length).toBe(1);
    expect(m[0].intents.length).toBe(2);
    expect((m[0].intents[1] as any).name).toBe('K');
  });

  // --- Fail-safe: đỉnh dùng chung với tam giác → quad-only (no circle) -------
  it('ESCALATE-SAFE: "tam giác ABC ... tứ giác BCEF nội tiếp" → BCEF chỉ 1 intent (no circle)', () => {
    const m = run('Cho tam giác ABC. Vẽ đường tròn ngoại tiếp tứ giác BCEF');
    const bcef = m.find((x) => (x.intents[0] as any).labels?.join('') === 'BCEF');
    expect(bcef).toBeDefined();
    expect(bcef!.intents.length).toBe(1);
    const shape = bcef!.intents[0] as any;
    expect(shape.op).toBe('draw-shape');
    expect(shape.shape).toBe('quadrilateral');
    expect(shape.explicitCoords).toBeUndefined();
  });

  // --- Regression: plain quad không sinh circle / explicitCoords -------------
  it('plain quad "tứ giác ABCD" → 1 intent, không circle, không explicitCoords', () => {
    const m = run('Cho tứ giác ABCD');
    expect(m.length).toBe(1);
    expect(m[0].intents.length).toBe(1);
    const shape = m[0].intents[0] as any;
    expect(shape.op).toBe('draw-shape');
    expect(shape.explicitCoords).toBeUndefined();
  });

  // === EN phrasing (issue #46 group B) — same shape/variant mapping as VN ===
  describe('EN', () => {
    it('"square ABCD" → square standard', () => {
      const m = run('Square ABCD');
      const intent = m[0].intents[0] as any;
      expect(intent.shape).toBe('square');
      expect(intent.labels).toEqual(['A', 'B', 'C', 'D']);
      expect(intent.variant).toBe('standard');
    });

    it('lowercase mid-sentence "a square ABCD" → square standard', () => {
      const m = run('Consider a square ABCD');
      const intent = m[0].intents[0] as any;
      expect(intent.shape).toBe('square');
      expect(intent.labels).toEqual(['A', 'B', 'C', 'D']);
    });

    it('"rectangle ABCD" → rectangle wide', () => {
      const m = run('Rectangle ABCD');
      const intent = m[0].intents[0] as any;
      expect(intent.shape).toBe('rectangle');
      expect(intent.labels).toEqual(['A', 'B', 'C', 'D']);
      expect(intent.variant).toBe('wide');
    });

    it('"parallelogram ABCD" → parallelogram standard', () => {
      const m = run('Parallelogram ABCD');
      const intent = m[0].intents[0] as any;
      expect(intent.shape).toBe('parallelogram');
      expect(intent.variant).toBe('standard');
    });

    it('"rhombus ABCD" → rhombus standard', () => {
      const m = run('Rhombus ABCD');
      const intent = m[0].intents[0] as any;
      expect(intent.shape).toBe('rhombus');
      expect(intent.variant).toBe('standard');
    });

    it('"trapezoid ABCD" → trapezoid general', () => {
      const m = run('Trapezoid ABCD');
      const intent = m[0].intents[0] as any;
      expect(intent.shape).toBe('trapezoid');
      expect(intent.variant).toBe('general');
    });

    it('"trapezium ABCD" → trapezoid general', () => {
      const m = run('Trapezium ABCD');
      const intent = m[0].intents[0] as any;
      expect(intent.shape).toBe('trapezoid');
      expect(intent.variant).toBe('general');
    });

    it('"isosceles trapezoid ABCD" → trapezoid isoceles', () => {
      const m = run('Isosceles trapezoid ABCD');
      expect(m.length).toBe(1);
      const intent = m[0].intents[0] as any;
      expect(intent.shape).toBe('trapezoid');
      expect(intent.variant).toBe('isoceles');
      expect(intent.labels).toEqual(['A', 'B', 'C', 'D']);
    });

    it('"isosceles trapezium MNPQ" → trapezoid isoceles', () => {
      const m = run('Isosceles trapezium MNPQ');
      const intent = m[0].intents[0] as any;
      expect(intent.shape).toBe('trapezoid');
      expect(intent.variant).toBe('isoceles');
      expect(intent.labels).toEqual(['M', 'N', 'P', 'Q']);
    });

    it('"right trapezoid ABCD" → trapezoid right', () => {
      const m = run('Right trapezoid ABCD');
      const intent = m[0].intents[0] as any;
      expect(intent.shape).toBe('trapezoid');
      expect(intent.variant).toBe('right');
    });

    it('"right trapezium MNPQ" → trapezoid right', () => {
      const m = run('Right trapezium MNPQ');
      const intent = m[0].intents[0] as any;
      expect(intent.shape).toBe('trapezoid');
      expect(intent.variant).toBe('right');
      expect(intent.labels).toEqual(['M', 'N', 'P', 'Q']);
    });

    it('"quadrilateral ABCD" → quadrilateral any', () => {
      const m = run('Quadrilateral ABCD');
      const intent = m[0].intents[0] as any;
      expect(intent.shape).toBe('quadrilateral');
      expect(intent.variant).toBe('any');
    });

    it('5 vertices "square ABCDE" → no match (escalate)', () => {
      expect(run('Square ABCDE').length).toBe(0);
    });

    it('EN quadrilateral does NOT trigger cyclic circumscription (VN-only slice)', () => {
      // "quadrilateral ABCD inscribed in circle (O)" should just draw the quad.
      const m = run('Quadrilateral ABCD inscribed in circle (O)');
      const quad = m.find((x) => (x.intents[0] as any).shape === 'quadrilateral');
      expect(quad).toBeDefined();
      expect(quad!.intents.length).toBe(1);
      expect((quad!.intents[0] as any).explicitCoords).toBeUndefined();
    });

    it('two EN shapes same clause "square ABCD and rectangle EFGH" → 2 shapes in text order', () => {
      const m = run('Square ABCD and rectangle EFGH');
      expect(m.length).toBe(2);
      expect((m[0].intents[0] as any).shape).toBe('square');
      expect((m[0].intents[0] as any).labels).toEqual(['A', 'B', 'C', 'D']);
      expect((m[1].intents[0] as any).shape).toBe('rectangle');
      expect((m[1].intents[0] as any).labels).toEqual(['E', 'F', 'G', 'H']);
    });
  });
});
