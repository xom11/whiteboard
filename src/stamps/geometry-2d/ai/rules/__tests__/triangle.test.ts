import { triangleRule } from '../triangle';
import { segmentClauses } from '../../deterministic/coverage';

function run(problem: string) {
  return triangleRule.match({ problem, clauses: segmentClauses(problem) });
}

describe('triangleRule', () => {
  it('"tam giác ABC" → draw-shape triangle any', () => {
    const m = run('Cho tam giác ABC');
    expect(m.length).toBe(1);
    const intent = m[0].intents[0] as any;
    expect(intent.op).toBe('draw-shape');
    expect(intent.shape).toBe('triangle');
    expect(intent.labels).toEqual(['A', 'B', 'C']);
    expect(intent.variant).toBe('any');
    expect(m[0].clauseIds).toContain(0);
  });

  it('"vuông tại A" → right-at-A', () => {
    const m = run('Cho tam giác ABC vuông tại A');
    expect((m[0].intents[0] as any).variant).toBe('right-at-A');
  });

  it('"tam giác nhọn ABC" → vẫn dựng ABC (nhọn = any, không chặn nhãn)', () => {
    const i = run('Cho tam giác nhọn ABC nội tiếp (O)').flatMap((m) => m.intents)[0] as any;
    expect(i.shape).toBe('triangle');
    expect(i.labels).toEqual(['A', 'B', 'C']);
    expect(i.variant).toBe('any');
  });

  it('"cân tại A" → isoceles-BC (đáy 2 đỉnh còn lại)', () => {
    const m = run('Cho tam giác ABC cân tại A');
    expect((m[0].intents[0] as any).variant).toBe('isoceles-BC');
  });

  it('"cân tại B" → isoceles-CA (cyclic, không phải AC)', () => {
    const m = run('Cho tam giác ABC cân tại B');
    expect((m[0].intents[0] as any).variant).toBe('isoceles-CA');
  });

  it('"cân tại C" → isoceles-AB', () => {
    const m = run('Cho tam giác ABC cân tại C');
    expect((m[0].intents[0] as any).variant).toBe('isoceles-AB');
  });

  it('"đều" → equilateral', () => {
    const m = run('Cho tam giác ABC đều');
    expect((m[0].intents[0] as any).variant).toBe('equilateral');
  });

  it('"tam giác đều ABC" (leadMod) → equilateral', () => {
    const m = run('Cho tam giác đều ABC');
    const i = m.flatMap((x) => x.intents) as any[];
    expect(i).toHaveLength(1);
    expect(i[0].labels).toEqual(['A', 'B', 'C']);
    expect(i[0].variant).toBe('equilateral');
  });

  // --- MULTI-MATCH + WINDOW (bug adversarial) -------------------------------

  it('"tam giác ABC và tam giác ABD vuông tại A" → CẢ HAI: ABC any + ABD right-at-A', () => {
    const m = run('Cho tam giác ABC và tam giác ABD vuông tại A');
    const i = m.flatMap((x) => x.intents) as any[];
    expect(i).toHaveLength(2);
    expect(i[0].labels).toEqual(['A', 'B', 'C']);
    expect(i[0].variant).toBe('any'); // KHÔNG vơ "vuông tại A" của ABD
    expect(i[1].labels).toEqual(['A', 'B', 'D']);
    expect(i[1].variant).toBe('right-at-A');
  });

  it('"tam giác ABC và tam giác ACD cân tại A" → ABC any + ACD isoceles-BC (apex idx 0, POSITIONAL)', () => {
    const m = run('Cho tam giác ABC và tam giác ACD cân tại A');
    const i = m.flatMap((x) => x.intents) as any[];
    expect(i).toHaveLength(2);
    expect(i[0].labels).toEqual(['A', 'B', 'C']);
    expect(i[0].variant).toBe('any');
    expect(i[1].labels).toEqual(['A', 'C', 'D']);
    // apex A = vertex[0] của [A,C,D] → variant POSITIONAL isoceles-BC (builder
    // dựng vertex[0] làm đỉnh cân), KHÔNG phải nhãn 'isoceles-CD' (vô nghĩa enum).
    expect(i[1].variant).toBe('isoceles-BC');
  });

  it('"tam giác đều DEF nội tiếp tam giác ABC" → DEF equilateral + ABC any (KHÔNG drop DEF, KHÔNG gán đều cho ABC)', () => {
    const m = run('Cho tam giác đều DEF nội tiếp tam giác ABC');
    const i = m.flatMap((x) => x.intents) as any[];
    expect(i).toHaveLength(2);
    expect(i[0].labels).toEqual(['D', 'E', 'F']);
    expect(i[0].variant).toBe('equilateral');
    expect(i[1].labels).toEqual(['A', 'B', 'C']);
    expect(i[1].variant).toBe('any');
  });

  it('"tam giác ABC nội tiếp tam giác đều MNP" → ABC any + MNP equilateral', () => {
    const m = run('Cho tam giác ABC nội tiếp tam giác đều MNP');
    const i = m.flatMap((x) => x.intents) as any[];
    expect(i).toHaveLength(2);
    expect(i[0].labels).toEqual(['A', 'B', 'C']);
    expect(i[0].variant).toBe('any'); // KHÔNG vơ "đều" của MNP
    expect(i[1].labels).toEqual(['M', 'N', 'P']);
    expect(i[1].variant).toBe('equilateral');
  });

  it('cân tại đỉnh KHÔNG thuộc tam giác → bỏ qua bind (any)', () => {
    // "vuông tại D" nhưng tam giác là ABC (D không thuộc) → any, không right-at-D bậy.
    const m = run('Cho tam giác ABC vuông tại D');
    const i = m.flatMap((x) => x.intents) as any[];
    expect(i).toHaveLength(1);
    expect(i[0].variant).toBe('any');
  });

  // === EN phrasing (issue #46 group B) — mirror VN variant semantics exactly ===
  describe('EN', () => {
    it('"triangle ABC" → draw-shape triangle any', () => {
      const m = run('Triangle ABC');
      expect(m.length).toBe(1);
      const intent = m[0].intents[0] as any;
      expect(intent.op).toBe('draw-shape');
      expect(intent.shape).toBe('triangle');
      expect(intent.labels).toEqual(['A', 'B', 'C']);
      expect(intent.variant).toBe('any');
    });

    it('lowercase mid-sentence "a triangle ABC" → triangle any', () => {
      const m = run('Consider a triangle ABC');
      const i = m.flatMap((x) => x.intents) as any[];
      expect(i).toHaveLength(1);
      expect(i[0].labels).toEqual(['A', 'B', 'C']);
      expect(i[0].variant).toBe('any');
    });

    it('"equilateral triangle ABC" (lead) → equilateral', () => {
      const m = run('Equilateral triangle ABC');
      const i = m.flatMap((x) => x.intents) as any[];
      expect(i).toHaveLength(1);
      expect(i[0].variant).toBe('equilateral');
    });

    it('"triangle ABC is equilateral" (window) → equilateral', () => {
      const m = run('Triangle ABC is equilateral');
      expect((m[0].intents[0] as any).variant).toBe('equilateral');
    });

    it('"right triangle ABC" WITHOUT named vertex → any', () => {
      const m = run('Right triangle ABC');
      expect((m[0].intents[0] as any).variant).toBe('any');
    });

    it('"right-angled triangle ABC" WITHOUT named vertex → any', () => {
      const m = run('Right-angled triangle ABC');
      expect((m[0].intents[0] as any).variant).toBe('any');
    });

    it('"right triangle ABC, right angle at A" → right-at-A', () => {
      const m = run('Right triangle ABC, right angle at A');
      const i = m.flatMap((x) => x.intents) as any[];
      expect(i).toHaveLength(1);
      expect(i[0].labels).toEqual(['A', 'B', 'C']);
      expect(i[0].variant).toBe('right-at-A');
    });

    it('"triangle ABC, right-angled at B" → right-at-B (positional)', () => {
      const m = run('Triangle ABC, right-angled at B');
      expect((m.flatMap((x) => x.intents)[0] as any).variant).toBe('right-at-B');
    });

    it('"right angle at C" → right-at-C', () => {
      const m = run('Triangle ABC with a right angle at C');
      expect((m.flatMap((x) => x.intents)[0] as any).variant).toBe('right-at-C');
    });

    it('"right angle at D" (vertex NOT in triangle) → any (fail-safe)', () => {
      const m = run('Triangle ABC, right angle at D');
      expect((m.flatMap((x) => x.intents)[0] as any).variant).toBe('any');
    });

    it('"isosceles triangle ABC" WITHOUT apex → any', () => {
      const m = run('Isosceles triangle ABC');
      expect((m[0].intents[0] as any).variant).toBe('any');
    });

    it('"isosceles triangle ABC with apex A" → isoceles-BC (positional)', () => {
      const m = run('Isosceles triangle ABC with apex A');
      expect((m.flatMap((x) => x.intents)[0] as any).variant).toBe('isoceles-BC');
    });

    it('"isosceles triangle ACD with apex A" → isoceles-BC (apex idx 0, POSITIONAL)', () => {
      const m = run('Isosceles triangle ACD with apex A');
      const i = m.flatMap((x) => x.intents) as any[];
      expect(i[0].labels).toEqual(['A', 'C', 'D']);
      expect(i[0].variant).toBe('isoceles-BC');
    });

    it('apex NOT in triangle → any (fail-safe)', () => {
      const m = run('Isosceles triangle ABC with apex D');
      expect((m.flatMap((x) => x.intents)[0] as any).variant).toBe('any');
    });

    it('multi-triangle window does not leak modifier: "triangle ABC and right triangle ABD, right angle at A"', () => {
      const m = run('Triangle ABC and triangle ABD, right angle at A');
      const i = m.flatMap((x) => x.intents) as any[];
      expect(i).toHaveLength(2);
      expect(i[0].labels).toEqual(['A', 'B', 'C']);
      expect(i[0].variant).toBe('any'); // does not grab "right angle at A" of ABD
      expect(i[1].labels).toEqual(['A', 'B', 'D']);
      expect(i[1].variant).toBe('right-at-A');
    });

    it('"equilateral triangle DEF inscribed in triangle ABC" → DEF equilateral + ABC any', () => {
      const m = run('Equilateral triangle DEF inscribed in triangle ABC');
      const i = m.flatMap((x) => x.intents) as any[];
      expect(i).toHaveLength(2);
      expect(i[0].labels).toEqual(['D', 'E', 'F']);
      expect(i[0].variant).toBe('equilateral');
      expect(i[1].labels).toEqual(['A', 'B', 'C']);
      expect(i[1].variant).toBe('any');
    });
  });

  // === Thales: tam giác vuông NỘI TIẾP đường tròn → BC đường kính + A glider ===
  describe('Thales (vuông + nội tiếp)', () => {
    function flat(problem: string) {
      return run(problem).flatMap((m) => m.intents) as any[];
    }

    it('"vuông tại A (AB<AC) nội tiếp đường tròn (O)" → B,C đầu mút đường kính + O tâm + A glider', () => {
      const ints = flat('Cho tam giác ABC vuông tại A (AB < AC) nội tiếp đường tròn (O)');
      const A = ints.find((i) => i.op === 'add-point' && i.name === 'A');
      const B = ints.find((i) => i.op === 'add-point' && i.name === 'B');
      const C = ints.find((i) => i.op === 'add-point' && i.name === 'C');
      const O = ints.find((i) => i.op === 'add-point' && i.name === 'O');
      const circ = ints.find((i) => i.op === 'draw-circle');
      const poly = ints.find((i) => i.op === 'mark-shape');
      // A = glider trên đường tròn (vuông tại A ràng buộc qua Thales).
      expect(A.constraint.kind).toBe('onCircle');
      // B, C = free đầu mút đường kính. AB<AC → B (cạnh ngắn) đặt bên trái (x<0).
      expect(B.constraint.kind).toBe('free');
      expect(C.constraint.kind).toBe('free');
      expect(B.constraint.at[0]).toBeLessThan(0);
      expect(C.constraint.at[0]).toBeGreaterThan(0);
      // O = trung điểm BC (tâm đường tròn).
      expect(O.constraint.kind).toBe('midpoint');
      // circle centerThrough (bán kính theo đầu mút → kéo vẫn đúng).
      expect(circ.spec).toBe('centerThrough');
      // polygon ABC (thứ tự nhãn gốc).
      expect(poly.shape).toBe('triangle');
      expect(poly.labels).toEqual(['A', 'B', 'C']);
      // KHÔNG còn draw-shape (thay bằng mark-shape).
      expect(ints.some((i) => i.op === 'draw-shape')).toBe(false);
    });

    it('"AC < AB" → C (cạnh ngắn AC) đặt bên trái', () => {
      const ints = flat('Cho tam giác ABC vuông tại A (AC < AB) nội tiếp đường tròn (O)');
      const B = ints.find((i) => i.op === 'add-point' && i.name === 'B');
      const C = ints.find((i) => i.op === 'add-point' && i.name === 'C');
      expect(C.constraint.at[0]).toBeLessThan(0);
      expect(B.constraint.at[0]).toBeGreaterThan(0);
    });

    it('vuông tại A KHÔNG nội tiếp → vẫn draw-shape right-at-A (không Thales)', () => {
      const ints = flat('Cho tam giác ABC vuông tại A');
      expect(ints.length).toBe(1);
      expect(ints[0].op).toBe('draw-shape');
      expect(ints[0].variant).toBe('right-at-A');
    });

    it('nội tiếp nhưng KHÔNG vuông → draw-shape (Thales chỉ cho tam giác vuông)', () => {
      const ints = flat('Cho tam giác ABC nội tiếp đường tròn (O)');
      expect(ints.some((i) => i.op === 'draw-shape')).toBe(true);
      expect(ints.some((i) => i.op === 'mark-shape')).toBe(false);
    });

    it('vuông tại B nội tiếp (O) → apex B là glider, A,C đầu mút', () => {
      const ints = flat('Cho tam giác ABC vuông tại B nội tiếp đường tròn (O)');
      const B = ints.find((i) => i.op === 'add-point' && i.name === 'B');
      expect(B.constraint.kind).toBe('onCircle');
      expect(ints.find((i) => i.name === 'A').constraint.kind).toBe('free');
      expect(ints.find((i) => i.name === 'C').constraint.kind).toBe('free');
    });
  });
});
