import { quadRule } from '../quad';
import { segmentClauses } from '../../deterministic/coverage';

function run(problem: string) {
  return quadRule.match({ problem, clauses: segmentClauses(problem) });
}

/** Tách 3 thành phần của 1 match tứ giác nội tiếp: circle + glider[] + polygon. */
function cyclicParts(intents: any[]) {
  return {
    circle: intents.find((i) => i.op === 'draw-circle'),
    gliders: intents.filter((i) => i.op === 'add-point' && i.constraint.kind === 'onCircle'),
    poly: intents.find((i) => i.op === 'mark-shape'),
  };
}

/** Match chứa cấu trúc tứ giác nội tiếp (có mark-shape) với labels cho trước. */
function cyclicMatch(matches: ReturnType<typeof run>, labels: string) {
  return matches.find((x) =>
    (x.intents as any[]).some((i) => i.op === 'mark-shape' && i.labels.join('') === labels),
  );
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
  // FIX 2026-06-09: 4 đỉnh là glider onCircle (CONSTRAINED), KHÔNG free; circle
  // centerRadius (tâm hiện); polygon qua mark-shape. (Trước: free + circle3 → đỉnh
  // thứ 4 rời đường tròn khi kéo.)
  it('"tứ giác ABCD nội tiếp đường tròn (O)" → circle centerRadius + 4 glider onCircle + mark-shape', () => {
    const m = run('Cho tứ giác ABCD nội tiếp đường tròn (O)');
    expect(m.length).toBe(1);
    const { circle, gliders, poly } = cyclicParts(m[0].intents as any[]);
    expect(circle.op).toBe('draw-circle');
    expect(circle.spec).toBe('centerRadius');
    expect(circle.name).toBe('O');
    expect(circle.radius).toBeGreaterThan(0);
    expect(gliders.map((g) => g.name)).toEqual(['A', 'B', 'C', 'D']);
    expect(gliders.every((g) => g.constraint.circle === 'O')).toBe(true);
    expect(new Set(gliders.map((g) => g.constraint.theta)).size).toBe(4); // 4 góc phân biệt
    expect(poly.op).toBe('mark-shape');
    expect(poly.shape).toBe('quadrilateral');
    expect(poly.labels).toEqual(['A', 'B', 'C', 'D']);
  });

  it('bare paren "tứ giác ABCD nội tiếp (O)" (KHÔNG chữ "đường tròn" — C31) → vẫn circle + 4 glider', () => {
    const m = run('Cho tứ giác ABCD nội tiếp (O)');
    expect(m.length).toBe(1);
    const { circle, gliders, poly } = cyclicParts(m[0].intents as any[]);
    expect(circle.spec).toBe('centerRadius');
    expect(circle.name).toBe('O');
    expect(gliders.map((g) => g.name)).toEqual(['A', 'B', 'C', 'D']);
    expect(poly.shape).toBe('quadrilateral');
  });

  it('bare paren + "trong": "tứ giác ABCD nội tiếp trong (O)" (C10) → vẫn circle + 4 glider', () => {
    const m = run('Cho tứ giác ABCD nội tiếp trong (O), AC cắt BD tại J');
    expect(m.length).toBeGreaterThanOrEqual(1);
    const { circle, gliders, poly } = cyclicParts(m[0].intents as any[]);
    expect(circle.spec).toBe('centerRadius');
    expect(circle.name).toBe('O');
    expect(gliders.map((g) => g.name)).toEqual(['A', 'B', 'C', 'D']);
    expect(poly.shape).toBe('quadrilateral');
  });

  it('Pattern B: "Đường tròn (O) ngoại tiếp tứ giác MNPQ" → circle + 4 glider + mark-shape', () => {
    const m = run('Đường tròn (O) ngoại tiếp tứ giác MNPQ');
    expect(m.length).toBe(1);
    const { circle, gliders, poly } = cyclicParts(m[0].intents as any[]);
    expect(circle.name).toBe('O');
    expect(circle.spec).toBe('centerRadius');
    expect(gliders.map((g) => g.name)).toEqual(['M', 'N', 'P', 'Q']);
    expect(poly.labels).toEqual(['M', 'N', 'P', 'Q']);
  });

  it('default center "đường tròn" (không tên) → circle name "O"', () => {
    const m = run('Cho tứ giác ABCD nội tiếp đường tròn');
    expect(m.length).toBe(1);
    expect(cyclicParts(m[0].intents as any[]).circle.name).toBe('O');
  });

  it('named center "tâm I" → circle name "I"', () => {
    const m = run('Cho tứ giác ABCD nội tiếp đường tròn tâm I');
    expect(m.length).toBe(1);
    expect(cyclicParts(m[0].intents as any[]).circle.name).toBe('I');
  });

  it('Pattern B named center "tâm K" → circle name "K"', () => {
    const m = run('Đường tròn tâm K ngoại tiếp tứ giác MNPQ');
    expect(m.length).toBe(1);
    expect(cyclicParts(m[0].intents as any[]).circle.name).toBe('K');
  });

  // --- "tứ giác nội tiếp ABCD" — ĐỈNH ĐỨNG SAU "nội tiếp" (t02:BT9) ----------
  it('"tứ giác nội tiếp ABCD" → cyclic quad (circle O + 4 glider + mark-shape)', () => {
    const m = run('Cho tứ giác nội tiếp ABCD');
    const match = cyclicMatch(m, 'ABCD');
    expect(match).toBeDefined();
    const { circle, gliders, poly } = cyclicParts(match!.intents as any[]);
    expect(circle.name).toBe('O');
    expect(circle.spec).toBe('centerRadius');
    expect(gliders.map((g) => g.name)).toEqual(['A', 'B', 'C', 'D']);
    expect(poly.labels).toEqual(['A', 'B', 'C', 'D']);
  });

  it('"tứ giác nội tiếp (I) ABCD" → cyclic quad với tâm I', () => {
    const m = run('Cho tứ giác nội tiếp (I) ABCD');
    const match = cyclicMatch(m, 'ABCD');
    expect(match).toBeDefined();
    expect(cyclicParts(match!.intents as any[]).circle.name).toBe('I');
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

  // --- C29: tam giác con (⊆ đỉnh tứ giác) KHÔNG chặn cyclic -------------------
  it('SUBSET-OK: "tứ giác ABCD nội tiếp (O) ... tam giác ABD" → vẫn cyclic (ABD ⊆ ABCD, C29)', () => {
    const m = run('Cho tứ giác ABCD nội tiếp (O), AC = CD. Gọi I là tâm đường tròn nội tiếp tam giác ABD.');
    const abcd = cyclicMatch(m, 'ABCD');
    expect(abcd).toBeDefined();
    const { circle, gliders } = cyclicParts(abcd!.intents as any[]);
    expect(circle.spec).toBe('centerRadius');
    expect(circle.name).toBe('O');
    expect(gliders.map((g) => g.name)).toEqual(['A', 'B', 'C', 'D']);
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

    it('EN quadrilateral inscribed in circle → 4 glider onCircle + circleCR + mark-shape', () => {
      // "Quadrilateral ABCD inscribed in circle (O)" NAY render đủ circumcircle.
      const quad = cyclicMatch(run('Quadrilateral ABCD inscribed in circle (O)'), 'ABCD');
      expect(quad).toBeDefined();
      const { circle, gliders, poly } = cyclicParts(quad!.intents as any[]);
      expect(circle.op).toBe('draw-circle');
      expect(circle.spec).toBe('centerRadius');
      expect(circle.name).toBe('O');
      expect(gliders.map((g) => g.name)).toEqual(['A', 'B', 'C', 'D']);
      expect(poly.shape).toBe('quadrilateral');
      expect(poly.labels).toEqual(['A', 'B', 'C', 'D']);
    });

    // --- EN cyclic quadrilateral (issue #46 nhóm B Tier 2) ------------------
    describe('EN cyclic', () => {
      it('Pattern A "is inscribed in circle (O)" → 4 glider + circleCR', () => {
        const quad = cyclicMatch(run('Quadrilateral ABCD is inscribed in circle (O)'), 'ABCD');
        expect(quad).toBeDefined();
        const { circle, gliders } = cyclicParts(quad!.intents as any[]);
        expect(circle.spec).toBe('centerRadius');
        expect(circle.name).toBe('O');
        expect(gliders.map((g) => g.name)).toEqual(['A', 'B', 'C', 'D']);
        expect(gliders.every((g) => g.constraint.circle === 'O')).toBe(true);
      });

      it('Pattern A "is inscribed in the circle (O)" → circle name "O"', () => {
        const quad = cyclicMatch(run('Quadrilateral ABCD is inscribed in the circle (O)'), 'ABCD');
        expect(quad).toBeDefined();
        expect(cyclicParts(quad!.intents as any[]).circle.name).toBe('O');
      });

      it('Pattern B "Circle (O) circumscribes quadrilateral MNPQ" → 4 glider + circleCR', () => {
        const quad = cyclicMatch(run('Circle (O) circumscribes quadrilateral MNPQ'), 'MNPQ');
        expect(quad).toBeDefined();
        const { circle, gliders } = cyclicParts(quad!.intents as any[]);
        expect(circle.spec).toBe('centerRadius');
        expect(circle.name).toBe('O');
        expect(gliders.map((g) => g.name)).toEqual(['M', 'N', 'P', 'Q']);
      });

      it('Pattern B "circle (O) is circumscribed about quadrilateral MNPQ" → circleCR name "O"', () => {
        const quad = cyclicMatch(run('A circle (O) is circumscribed about quadrilateral MNPQ'), 'MNPQ');
        expect(quad).toBeDefined();
        const { circle } = cyclicParts(quad!.intents as any[]);
        expect(circle.spec).toBe('centerRadius');
        expect(circle.name).toBe('O');
      });

      it('subset triangle (ABC ⊆ ABCD) → vẫn cyclic (tam giác con cùng đường tròn)', () => {
        // ABC ⊆ ABCD → tam giác con tự động đồng viên → KHÔNG xung đột (như C29).
        const quad = cyclicMatch(run('Triangle ABC. Quadrilateral ABCD is inscribed in circle (O)'), 'ABCD');
        expect(quad).toBeDefined();
        const { circle } = cyclicParts(quad!.intents as any[]);
        expect(circle.name).toBe('O');
      });

      it('fail-safe: đỉnh NGOÀI tứ giác (Triangle ABE ⊄ ABCD) → quad-only (no circle)', () => {
        // ABE có E NGOÀI ABCD → xung đột thật (E đặt theo toạ độ riêng) → chặn concyclic.
        const m = run('Triangle ABE. Quadrilateral ABCD is inscribed in circle (O)');
        const quad = m.find((x) => (x.intents[0] as any).labels?.join('') === 'ABCD');
        expect(quad).toBeDefined();
        expect(quad!.intents.length).toBe(1);
        expect((quad!.intents[0] as any).explicitCoords).toBeUndefined();
      });

      it('escalate-safe: 5 vertices "Circle (O) circumscribes quadrilateral ABCDE" → no quad hit', () => {
        const m = run('Circle (O) circumscribes quadrilateral ABCDE');
        expect(m.length).toBe(0);
      });

      it('regression: plain EN quad "Quadrilateral ABCD" → 1 intent, no explicitCoords', () => {
        const m = run('Quadrilateral ABCD');
        expect(m.length).toBe(1);
        expect(m[0].intents.length).toBe(1);
        expect((m[0].intents[0] as any).explicitCoords).toBeUndefined();
      });
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

  // Tên hình viết HOA đầu câu (đề mở đầu bằng "Hình thang …"/"Tứ giác …", KHÔNG
  // có "Cho" phía trước) — bug case-sensitivity: trước fix `hình`/`tứ giác` chỉ
  // khớp chữ thường → prefilter trượt → rule không chạy → NONE (toan8:26/31).
  describe('chữ HOA đầu câu (no "Cho" lead)', () => {
    it('"Hình thang cân ABCD …" đầu câu → trapezoid isoceles', () => {
      const m = run('Hình thang cân ABCD có đáy nhỏ AB');
      const hit = m.find((x) => (x.intents[0] as any).labels?.join('') === 'ABCD');
      expect(hit).toBeDefined();
      const intent = hit!.intents[0] as any;
      expect(intent.op).toBe('draw-shape');
      expect(intent.shape).toBe('trapezoid');
      expect(intent.variant).toBe('isoceles');
      expect(intent.labels).toEqual(['A', 'B', 'C', 'D']);
    });

    it('"Tứ giác ABCD …" đầu câu → quadrilateral', () => {
      const m = run('Tứ giác ABCD có hai đường chéo cắt nhau');
      const hit = m.find((x) => (x.intents[0] as any).labels?.join('') === 'ABCD');
      expect(hit).toBeDefined();
      expect((hit!.intents[0] as any).shape).toBe('quadrilateral');
    });

    it('"Hình vuông ABCD" đầu câu → square', () => {
      const m = run('Hình vuông ABCD');
      expect(m.length).toBe(1);
      expect((m[0].intents[0] as any).shape).toBe('square');
      expect((m[0].intents[0] as any).labels).toEqual(['A', 'B', 'C', 'D']);
    });

    it('PREFILTER khớp "Hình thang cân ABCD" đầu câu', () => {
      expect(quadRule.patterns.some((re) => re.test('Hình thang cân ABCD'))).toBe(true);
    });

    it('regression: "Cho hình thang cân ABCD" (chữ thường) vẫn match', () => {
      const m = run('Cho hình thang cân ABCD');
      const hit = m.find((x) => (x.intents[0] as any).labels?.join('') === 'ABCD');
      expect(hit).toBeDefined();
      expect((hit!.intents[0] as any).variant).toBe('isoceles');
    });
  });
});
