import { circleTriangleRule } from '../circleTriangle';
import { segmentClauses } from '../../deterministic/coverage';

function run(problem: string) {
  return circleTriangleRule.match({ problem, clauses: segmentClauses(problem) });
}

describe('circleTriangleRule', () => {
  it('"đường tròn ngoại tiếp tam giác ABC" → through3 [A,B,C]', () => {
    const m = run('Vẽ đường tròn ngoại tiếp tam giác ABC');
    expect(m.length).toBe(1);
    const intent = m[0].intents[0] as any;
    expect(intent.op).toBe('draw-circle');
    expect(intent.spec).toBe('through3');
    expect(intent.points).toEqual(['A', 'B', 'C']);
    expect(intent.name).toBe('O');
  });

  it('"đường tròn (O) ngoại tiếp tam giác ABC" → name O từ (O)', () => {
    const m = run('Cho đường tròn (O) ngoại tiếp tam giác ABC');
    expect(m.length).toBe(1);
    const intent = m[0].intents[0] as any;
    expect(intent.spec).toBe('through3');
    expect(intent.name).toBe('O');
    expect(intent.points).toEqual(['A', 'B', 'C']);
  });

  it('tên tâm khác qua "(K)" → name K', () => {
    const m = run('Vẽ đường tròn (K) ngoại tiếp tam giác MNP');
    const intent = m[0].intents[0] as any;
    expect(intent.name).toBe('K');
    expect(intent.points).toEqual(['M', 'N', 'P']);
  });

  it('"đường tròn nội tiếp tam giác ABC" → inscribedIn {triangle}', () => {
    const m = run('Dựng đường tròn nội tiếp tam giác ABC');
    expect(m.length).toBe(1);
    const intent = m[0].intents[0] as any;
    expect(intent.op).toBe('draw-circle');
    expect(intent.spec).toBe('inscribedIn');
    expect(intent.triangle).toEqual(['A', 'B', 'C']);
    expect(intent.name).toBe('O');
  });

  it('"đường tròn (I) nội tiếp tam giác DEF" → inscribedIn name I', () => {
    const m = run('Vẽ đường tròn (I) nội tiếp tam giác DEF');
    const intent = m[0].intents[0] as any;
    expect(intent.spec).toBe('inscribedIn');
    expect(intent.name).toBe('I');
    expect(intent.triangle).toEqual(['D', 'E', 'F']);
  });

  it('"tam giác ABC nội tiếp đường tròn (O)" → circumcircle through3', () => {
    const m = run('Cho tam giác ABC nội tiếp đường tròn (O)');
    expect(m.length).toBe(1);
    const intent = m[0].intents[0] as any;
    expect(intent.name).toBe('O');
    expect(intent.points).toEqual(['A', 'B', 'C']);
    });

    it('TYPO: "đương tròn" → vẫn match', () => {
    const m = run('Cho tam giác ABC nhọn, không cân nội tiếp đương tròn (O)');
    expect(m.length).toBe(1);
    const intent = m[0].intents[0] as any;
    expect(intent.spec).toBe('through3');
    expect(intent.name).toBe('O');
    expect(intent.points).toEqual(['A', 'B', 'C']);
    });

    it('tam giác ABC nội tiếp (O) (KHÔNG có chữ "đường tròn") → circumcircle through3, name O', () => {

    const m = run('Cho tam giác ABC nội tiếp (O)');
    expect(m.length).toBe(1);
    const intent = m[0].intents[0] as any;
    expect(intent.spec).toBe('through3');
    expect(intent.name).toBe('O');
    expect(intent.points).toEqual(['A', 'B', 'C']);
  });

  it('"tam giác ABC ngoại tiếp (I)" (paren, không "đường tròn") → incircle inscribedIn, name I', () => {
    const m = run('Cho tam giác ABC ngoại tiếp (I)');
    expect(m.length).toBe(1);
    const intent = m[0].intents[0] as any;
    expect(intent.spec).toBe('inscribedIn');
    expect(intent.name).toBe('I');
    expect(intent.triangle).toEqual(['A', 'B', 'C']);
  });

  it('clause "Vẽ đường tròn ngoại tiếp" KHÔNG có tam giác ngay sau → bỏ qua (escalate)', () => {
    // Bind PHẢI theo cú pháp gần: token "tam giác XYZ" ngay sau từ khoá. Không có
    // → KHÔNG vơ tam giác đầu đề (chống mis-render) → escalate AI.
    const m = run('Cho tam giác ABC. Vẽ đường tròn ngoại tiếp');
    expect(m.length).toBe(0);
  });

  it('"nội tiếp" trần (không phân loại được) → bỏ qua escalate', () => {
    // không có "đường tròn nội tiếp tam giác" cũng không "tam giác ... nội tiếp
    // đường tròn" → mơ hồ → không emit
    const m = run('Tứ giác ABCD nội tiếp');
    expect(m.length).toBe(0);
  });

  it('không có tam giác → bỏ qua', () => {
    const m = run('Vẽ đường tròn ngoại tiếp');
    expect(m.length).toBe(0);
  });

  // --- BUG FIXES ------------------------------------------------------------

  it('BUG (1): "đường tròn ngoại tiếp tứ giác BCEF" → KHÔNG claim (escalate)', () => {
    // Circle ngoại tiếp TỨ GIÁC chưa hỗ trợ. KHÔNG được dựng through3 [A,B,C] từ
    // tam giác đầu đề (mis-render). Phải bỏ qua để escalate.
    const m = run('Cho tam giác ABC. Vẽ đường tròn ngoại tiếp tứ giác BCEF');
    expect(m.length).toBe(0);
  });

  it('BUG (1b): "đường tròn nội tiếp tứ giác ABCD" → KHÔNG claim (escalate)', () => {
    const m = run('Vẽ đường tròn nội tiếp tứ giác ABCD');
    expect(m.length).toBe(0);
  });

  it('BUG (1c): "đường tròn ngoại tiếp hình vuông ABCD" → KHÔNG claim (escalate)', () => {
    const m = run('Vẽ đường tròn ngoại tiếp hình vuông ABCD');
    expect(m.length).toBe(0);
  });

  it('BUG (2): "Đường tròn ngoại tiếp tam giác ABC" (hoa đầu câu) → through3 [A,B,C]', () => {
    const m = run('Đường tròn ngoại tiếp tam giác ABC');
    expect(m.length).toBe(1);
    const intent = m[0].intents[0] as any;
    expect(intent.spec).toBe('through3');
    expect(intent.points).toEqual(['A', 'B', 'C']);
  });

  it('BUG (2b): "Đường tròn nội tiếp tam giác DEF" (hoa đầu câu) → inscribedIn', () => {
    const m = run('Đường tròn nội tiếp tam giác DEF');
    expect(m.length).toBe(1);
    const intent = m[0].intents[0] as any;
    expect(intent.spec).toBe('inscribedIn');
    expect(intent.triangle).toEqual(['D', 'E', 'F']);
  });

  it('BUG (3): 2 tam giác / clause → emit-all đúng từng tam giác theo cú pháp gần', () => {
    const m = run(
      'Vẽ đường tròn ngoại tiếp tam giác ABC và đường tròn nội tiếp tam giác DEF',
    );
    expect(m.length).toBe(1);
    const intents = m[0].intents as any[];
    expect(intents.length).toBe(2);
    expect(intents[0].spec).toBe('through3');
    expect(intents[0].points).toEqual(['A', 'B', 'C']);
    expect(intents[1].spec).toBe('inscribedIn');
    expect(intents[1].triangle).toEqual(['D', 'E', 'F']);
  });

  it('BUG (3b): bind tam giác ngay sau từ khoá (không phải tam giác đầu clause)', () => {
    // "tam giác ABC" đứng đầu nhưng đường tròn ngoại tiếp gắn với "tam giác DEF".
    const m = run('Cho tam giác ABC. Vẽ đường tròn ngoại tiếp tam giác DEF');
    const circ = m.find((r) => (r.intents[0] as any).spec === 'through3');
    expect(circ).toBeDefined();
    expect((circ!.intents[0] as any).points).toEqual(['D', 'E', 'F']);
  });

  // ── Mức 2 Gap 3: ký hiệu "(O; R)" (segmenter cắt ';' → quét toàn đề) ──

  it('"Đường tròn (O; R) ngoại tiếp tam giác ABC" → through3, name O', () => {
    const m = run('Đường tròn (O; R) ngoại tiếp tam giác ABC');
    const all = m.flatMap((x) => x.intents) as any[];
    expect(all.length).toBe(1);
    expect(all[0].spec).toBe('through3');
    expect(all[0].points).toEqual(['A', 'B', 'C']);
    expect(all[0].name).toBe('O');
  });

  it('"(O; R) ngoại tiếp tam giác ABC" (không chữ "đường tròn") → through3', () => {
    const m = run('(O; R) ngoại tiếp tam giác ABC');
    const all = m.flatMap((x) => x.intents) as any[];
    expect(all.length).toBe(1);
    expect(all[0].spec).toBe('through3');
    expect(all[0].points).toEqual(['A', 'B', 'C']);
    expect(all[0].name).toBe('O');
  });

  it('coverage: ký hiệu "(O; R)" claim CẢ HAI clause bị segmenter cắt', () => {
    const problem = 'Đường tròn (O; R) ngoại tiếp tam giác ABC';
    const m = run(problem);
    expect(m.length).toBe(1);
    // clause "...(O" + clause "R) ngoại tiếp tam giác ABC" — cả 2 hasGeometry.
    expect(m[0].clauseIds.length).toBeGreaterThanOrEqual(2);
  });

  it('"Đường tròn (I; r) nội tiếp tam giác DEF" → inscribedIn, name I', () => {
    const m = run('Đường tròn (I; r) nội tiếp tam giác DEF');
    const all = m.flatMap((x) => x.intents) as any[];
    expect(all.length).toBe(1);
    expect(all[0].spec).toBe('inscribedIn');
    expect(all[0].triangle).toEqual(['D', 'E', 'F']);
    expect(all[0].name).toBe('I');
  });

  it('FAIL-SAFE Gap 3: paren méo "(A; B; C)" → không claim', () => {
    const m = run('(A; B; C) ngoại tiếp tam giác XYZ');
    expect(m.flatMap((x) => x.intents).length).toBe(0);
  });

  // ── Mức 2 Gap 4: "tam giác ABC ngoại tiếp đường tròn (I)" = incircle ──

  it('"Tam giác ABC ngoại tiếp đường tròn (I)" → inscribedIn ABC, name I', () => {
    const m = run('Tam giác ABC ngoại tiếp đường tròn (I)');
    const all = m.flatMap((x) => x.intents) as any[];
    expect(all.length).toBe(1);
    expect(all[0].spec).toBe('inscribedIn');
    expect(all[0].triangle).toEqual(['A', 'B', 'C']);
    expect(all[0].name).toBe('I');
  });

  it('"Tam giác MNP ngoại tiếp đường tròn tâm O" → inscribedIn MNP, name O', () => {
    const m = run('Tam giác MNP ngoại tiếp đường tròn tâm O');
    const all = m.flatMap((x) => x.intents) as any[];
    expect(all.length).toBe(1);
    expect(all[0].spec).toBe('inscribedIn');
    expect(all[0].triangle).toEqual(['M', 'N', 'P']);
    expect(all[0].name).toBe('O');
  });

  it('"Tam giác ABC ngoại tiếp đường tròn" (không tên tâm) → inscribedIn, default O', () => {
    const m = run('Tam giác ABC ngoại tiếp đường tròn');
    const all = m.flatMap((x) => x.intents) as any[];
    expect(all.length).toBe(1);
    expect(all[0].spec).toBe('inscribedIn');
    expect(all[0].name).toBe('O');
  });

  it('DISAMBIG: "đường tròn ngoại tiếp tam giác ABC" VẪN là through3 (KHÔNG inscribedIn)', () => {
    // Gap 4 không được lật ngữ nghĩa circumcircle: "đường tròn ngoại tiếp tam giác"
    // (đường tròn TRƯỚC) ≠ "tam giác ngoại tiếp đường tròn" (tam giác TRƯỚC).
    const m = run('Cho tam giác ABC. Vẽ đường tròn ngoại tiếp tam giác ABC');
    const all = m.flatMap((x) => x.intents) as any[];
    expect(all.length).toBe(1);
    expect(all[0].spec).toBe('through3');
    expect(all[0].points).toEqual(['A', 'B', 'C']);
  });

  // === EN (issue #46 group B) ================================================
  // Semantics đối xứng VN. through3 (circumcircle) / inscribedIn (incircle) phân
  // biệt theo SUBJECT (triangle vs circle) + verb (inscribed in / circumscribes
  // / circumscribed about). Center "(O)" hoặc bare "circle O".
  describe('circleTriangle EN (issue #46 group B)', () => {
    it('"Triangle ABC inscribed in circle (O)" → through3, tri ABC, center O', () => {
      const m = run('Triangle ABC inscribed in circle (O)');
      const all = m.flatMap((x) => x.intents) as any[];
      expect(all.length).toBe(1);
      expect(all[0].spec).toBe('through3');
      expect(all[0].points).toEqual(['A', 'B', 'C']);
      expect(all[0].name).toBe('O');
    });

    it('"Triangle ABC is inscribed in the circle (O)" (is/be + the) → through3', () => {
      const m = run('Triangle ABC is inscribed in the circle (O)');
      const all = m.flatMap((x) => x.intents) as any[];
      expect(all.length).toBe(1);
      expect(all[0].spec).toBe('through3');
      expect(all[0].points).toEqual(['A', 'B', 'C']);
      expect(all[0].name).toBe('O');
    });

    it('"Circle (O) circumscribes triangle ABC" → through3, center O', () => {
      const m = run('Circle (O) circumscribes triangle ABC');
      const all = m.flatMap((x) => x.intents) as any[];
      expect(all.length).toBe(1);
      expect(all[0].spec).toBe('through3');
      expect(all[0].points).toEqual(['A', 'B', 'C']);
      expect(all[0].name).toBe('O');
    });

    it('"Circle (O) circumscribed about triangle ABC" → through3', () => {
      const m = run('Circle (O) circumscribed about triangle ABC');
      const all = m.flatMap((x) => x.intents) as any[];
      expect(all.length).toBe(1);
      expect(all[0].spec).toBe('through3');
      expect(all[0].points).toEqual(['A', 'B', 'C']);
      expect(all[0].name).toBe('O');
    });

    it('"Circle (O) circumscribed around triangle ABC" → through3', () => {
      const m = run('Circle (O) circumscribed around triangle ABC');
      const all = m.flatMap((x) => x.intents) as any[];
      expect(all.length).toBe(1);
      expect(all[0].spec).toBe('through3');
      expect(all[0].points).toEqual(['A', 'B', 'C']);
    });

    it('"Circle (I) inscribed in triangle ABC" → inscribedIn, center I', () => {
      const m = run('Circle (I) inscribed in triangle ABC');
      const all = m.flatMap((x) => x.intents) as any[];
      expect(all.length).toBe(1);
      expect(all[0].spec).toBe('inscribedIn');
      expect(all[0].triangle).toEqual(['A', 'B', 'C']);
      expect(all[0].name).toBe('I');
    });

    it('"Triangle ABC circumscribes circle (I)" → inscribedIn, center I', () => {
      const m = run('Triangle ABC circumscribes circle (I)');
      const all = m.flatMap((x) => x.intents) as any[];
      expect(all.length).toBe(1);
      expect(all[0].spec).toBe('inscribedIn');
      expect(all[0].triangle).toEqual(['A', 'B', 'C']);
      expect(all[0].name).toBe('I');
    });

    it('"Triangle ABC circumscribed about circle (I)" → inscribedIn', () => {
      const m = run('Triangle ABC circumscribed about circle (I)');
      const all = m.flatMap((x) => x.intents) as any[];
      expect(all.length).toBe(1);
      expect(all[0].spec).toBe('inscribedIn');
      expect(all[0].triangle).toEqual(['A', 'B', 'C']);
      expect(all[0].name).toBe('I');
    });

    it('bare center "circle O circumscribes triangle ABC" → through3, center O', () => {
      const m = run('Circle O circumscribes triangle ABC');
      const all = m.flatMap((x) => x.intents) as any[];
      expect(all.length).toBe(1);
      expect(all[0].spec).toBe('through3');
      expect(all[0].points).toEqual(['A', 'B', 'C']);
      expect(all[0].name).toBe('O');
    });

    // --- paren whole-problem (segmenter cắt ';') ---
    it('"Triangle ABC inscribed in circle (O; 3)" → through3, center O', () => {
      const m = run('Triangle ABC inscribed in circle (O; 3)');
      const all = m.flatMap((x) => x.intents) as any[];
      expect(all.length).toBe(1);
      expect(all[0].spec).toBe('through3');
      expect(all[0].points).toEqual(['A', 'B', 'C']);
      expect(all[0].name).toBe('O');
    });

    it('"Circle (O; R) circumscribes triangle ABC" → through3, center O', () => {
      const m = run('Circle (O; R) circumscribes triangle ABC');
      const all = m.flatMap((x) => x.intents) as any[];
      expect(all.length).toBe(1);
      expect(all[0].spec).toBe('through3');
      expect(all[0].points).toEqual(['A', 'B', 'C']);
      expect(all[0].name).toBe('O');
    });

    it('"Circle (I; r) inscribed in triangle DEF" → inscribedIn, center I', () => {
      const m = run('Circle (I; r) inscribed in triangle DEF');
      const all = m.flatMap((x) => x.intents) as any[];
      expect(all.length).toBe(1);
      expect(all[0].spec).toBe('inscribedIn');
      expect(all[0].triangle).toEqual(['D', 'E', 'F']);
      expect(all[0].name).toBe('I');
    });

    // --- FAIL-SAFE ---
    it('FAIL-SAFE: "Circle (O) is tangent to triangle ABC" (no inscribe/circumscribe) → 0 match', () => {
      const m = run('Circle (O) is tangent to triangle ABC');
      expect(m.flatMap((x) => x.intents).length).toBe(0);
    });

    it('FAIL-SAFE: "Quadrilateral ABCD inscribed in circle (O)" (no triangle) → 0 match', () => {
      const m = run('Quadrilateral ABCD inscribed in circle (O)');
      expect(m.flatMap((x) => x.intents).length).toBe(0);
    });

    // --- VN regression (hành vi tiếng Việt giữ nguyên) ---
    it('VN regression: "đường tròn (O) ngoại tiếp tam giác ABC" vẫn through3', () => {
      const m = run('Cho đường tròn (O) ngoại tiếp tam giác ABC');
      expect(m.length).toBe(1);
      const intent = m[0].intents[0] as any;
      expect(intent.spec).toBe('through3');
      expect(intent.points).toEqual(['A', 'B', 'C']);
      expect(intent.name).toBe('O');
    });

    it('VN regression: "tam giác ABC nội tiếp đường tròn (O)" vẫn through3', () => {
      const m = run('Cho tam giác ABC nội tiếp đường tròn (O)');
      expect(m.length).toBe(1);
      const intent = m[0].intents[0] as any;
      expect(intent.spec).toBe('through3');
      expect(intent.points).toEqual(['A', 'B', 'C']);
    });
  });
});
