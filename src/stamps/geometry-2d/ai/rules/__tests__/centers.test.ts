import { centersRule } from '../centers';
import { segmentClauses } from '../../deterministic/coverage';

function run(problem: string) {
  return centersRule.match({ problem, clauses: segmentClauses(problem) });
}

// gom toàn bộ intent của mọi match để tìm theo kind
function intents(problem: string) {
  return run(problem).flatMap((m) => m.intents as any[]);
}

function find(problem: string, kind: string) {
  return intents(problem).find((i) => i.op === 'add-point' && i.constraint.kind === kind);
}

describe('centersRule', () => {
  it('"Gọi G là trọng tâm tam giác ABC" → centroid of [A,B,C]', () => {
    const i = find('Gọi G là trọng tâm tam giác ABC', 'centroid');
    expect(i).toBeDefined();
    expect(i.name).toBe('G');
    expect(i.constraint).toEqual({ kind: 'centroid', of: ['A', 'B', 'C'] });
  });

  it('"trọng tâm G của tam giác ABC" (tên sau từ khoá) → centroid', () => {
    const i = find('Cho tam giác ABC, lấy trọng tâm G của tam giác', 'centroid');
    expect(i).toBeDefined();
    expect(i.name).toBe('G');
    expect(i.constraint.of).toEqual(['A', 'B', 'C']);
  });

  it('"H là trực tâm" → orthocenter', () => {
    const i = find('Cho tam giác ABC. H là trực tâm của tam giác', 'orthocenter');
    expect(i).toBeDefined();
    expect(i.name).toBe('H');
    expect(i.constraint).toEqual({ kind: 'orthocenter', of: ['A', 'B', 'C'] });
  });

  it('"tâm đường tròn ngoại tiếp O" → circumcenter', () => {
    const i = find('Cho tam giác ABC. Gọi O là tâm đường tròn ngoại tiếp tam giác ABC', 'circumcenter');
    expect(i).toBeDefined();
    expect(i.name).toBe('O');
    expect(i.constraint).toEqual({ kind: 'circumcenter', of: ['A', 'B', 'C'] });
  });

  it('"I là tâm đường tròn nội tiếp tam giác ABC" → incenter', () => {
    const i = find('Cho tam giác ABC. I là tâm đường tròn nội tiếp tam giác ABC', 'incenter');
    expect(i).toBeDefined();
    expect(i.name).toBe('I');
    expect(i.constraint).toEqual({ kind: 'incenter', of: ['A', 'B', 'C'] });
  });

  it('fallback qua "tam giác cân ABC" khi clause tâm không nêu lại tam giác', () => {
    const i = find('Cho tam giác cân ABC. I là tâm đường tròn nội tiếp', 'incenter');
    expect(i).toBeDefined();
    expect(i.name).toBe('I');
    expect(i.constraint).toEqual({ kind: 'incenter', of: ['A', 'B', 'C'] });
  });

  it('"tâm nội tiếp" tên sau cụm từ khoá → incenter', () => {
    const i = find('Cho tam giác ABC. Vẽ tâm nội tiếp I', 'incenter');
    expect(i).toBeDefined();
    expect(i.name).toBe('I');
  });

  it('nhiều tâm cùng đề: trọng tâm G + trực tâm H', () => {
    const all = intents('Cho tam giác ABC. Gọi G là trọng tâm tam giác ABC. Gọi H là trực tâm tam giác ABC');
    const g = all.find((i) => i.constraint?.kind === 'centroid');
    const h = all.find((i) => i.constraint?.kind === 'orthocenter');
    expect(g?.name).toBe('G');
    expect(h?.name).toBe('H');
    expect(g.constraint.of).toEqual(['A', 'B', 'C']);
    expect(h.constraint.of).toEqual(['A', 'B', 'C']);
  });

  // --- bind tam giác theo CLAUSE, không lấy tam giác đầu đề ------------------

  it('"trọng tâm tam giác DEF" (đề có cả ABC) → centroid of [D,E,F] không phải [A,B,C]', () => {
    const i = find('Cho tam giác ABC và tam giác DEF. Gọi G là trọng tâm tam giác DEF', 'centroid');
    expect(i).toBeDefined();
    expect(i.name).toBe('G');
    expect(i.constraint).toEqual({ kind: 'centroid', of: ['D', 'E', 'F'] });
  });

  it('"trực tâm tam giác MBC" (đề có cả ABC) → orthocenter of [M,B,C]', () => {
    const i = find('Cho tam giác ABC, lấy M trên BC. H là trực tâm tam giác MBC', 'orthocenter');
    expect(i).toBeDefined();
    expect(i.name).toBe('H');
    expect(i.constraint).toEqual({ kind: 'orthocenter', of: ['M', 'B', 'C'] });
  });

  it('"nội tiếp tam giác DEF" (đề có cả ABC) → incenter of [D,E,F]', () => {
    const i = find('Cho tam giác ABC và tam giác DEF. I là tâm đường tròn nội tiếp tam giác DEF', 'incenter');
    expect(i).toBeDefined();
    expect(i.name).toBe('I');
    expect(i.constraint).toEqual({ kind: 'incenter', of: ['D', 'E', 'F'] });
  });

  it('"ngoại tiếp tam giác DEF" (đề có cả ABC) → circumcenter of [D,E,F]', () => {
    const i = find('Cho tam giác ABC và tam giác DEF. Gọi O là tâm đường tròn ngoại tiếp tam giác DEF', 'circumcenter');
    expect(i).toBeDefined();
    expect(i.name).toBe('O');
    expect(i.constraint).toEqual({ kind: 'circumcenter', of: ['D', 'E', 'F'] });
  });

  it('clause không nêu tam giác + đề CÓ DUY NHẤT 1 tam giác → fallback', () => {
    const i = find('Cho tam giác ABC. Gọi G là trọng tâm', 'centroid');
    expect(i).toBeDefined();
    expect(i.constraint.of).toEqual(['A', 'B', 'C']);
  });

  // --- ràng buộc an toàn (escalate thay vì đoán sai) -------------------------

  it('không có tam giác trong đề → bỏ qua (không match)', () => {
    expect(run('Gọi G là trọng tâm')).toEqual([]);
  });

  it('clause không nêu tam giác + đề có >1 tam giác → nhập nhằng, bỏ qua', () => {
    // "trọng tâm" không nói tam giác nào; đề có ABC và DEF → không đoán → []
    expect(find('Cho tam giác ABC và tam giác DEF. Gọi G là trọng tâm', 'centroid')).toBeUndefined();
  });

  it('"trung trực BC" KHÔNG nhầm thành trực tâm', () => {
    expect(find('Cho tam giác ABC. Vẽ đường trung trực của cạnh BC', 'orthocenter')).toBeUndefined();
  });

  it('"ngoại tiếp" ưu tiên hơn "nội tiếp" khi cùng clause nhập nhằng', () => {
    // "đường tròn ngoại tiếp" — không được sinh incenter
    const all = intents('Cho tam giác ABC. Gọi O là tâm đường tròn ngoại tiếp tam giác ABC');
    expect(all.some((i) => i.constraint?.kind === 'incenter')).toBe(false);
    expect(all.some((i) => i.constraint?.kind === 'circumcenter')).toBe(true);
  });

  it('claim clauseIds của clause chứa từ khoá', () => {
    const m = run('Cho tam giác ABC. Gọi G là trọng tâm tam giác ABC');
    expect(m.length).toBeGreaterThan(0);
    expect(m[0].clauseIds.length).toBe(1);
    expect(typeof m[0].clauseIds[0]).toBe('number');
  });
});

// === EN (issue #46 group B) =================================================
// Mirror VN semantics for English center nouns. Vertex labels stay [A-Z]
// (no 'i' flag). Triangle binding reuses resolveTriangle once trianglesIn
// also recognizes the EN "triangle ABC" form.
describe('centersRule — EN (issue #46 group B)', () => {
  // --- name BEFORE the keyword ("G is the centroid of triangle ABC") --------
  it('"G is the centroid of triangle ABC" → centroid of [A,B,C]', () => {
    const i = find('Triangle ABC. G is the centroid of triangle ABC', 'centroid');
    expect(i).toBeDefined();
    expect(i.name).toBe('G');
    expect(i.constraint).toEqual({ kind: 'centroid', of: ['A', 'B', 'C'] });
  });

  it('"H is the orthocenter of triangle ABC" → orthocenter', () => {
    const i = find('Triangle ABC. H is the orthocenter of triangle ABC', 'orthocenter');
    expect(i).toBeDefined();
    expect(i.name).toBe('H');
    expect(i.constraint).toEqual({ kind: 'orthocenter', of: ['A', 'B', 'C'] });
  });

  it('"O is the circumcenter of triangle ABC" → circumcenter', () => {
    const i = find('Triangle ABC. O is the circumcenter of triangle ABC', 'circumcenter');
    expect(i).toBeDefined();
    expect(i.name).toBe('O');
    expect(i.constraint).toEqual({ kind: 'circumcenter', of: ['A', 'B', 'C'] });
  });

  it('"I is the incenter of triangle ABC" → incenter', () => {
    const i = find('Triangle ABC. I is the incenter of triangle ABC', 'incenter');
    expect(i).toBeDefined();
    expect(i.name).toBe('I');
    expect(i.constraint).toEqual({ kind: 'incenter', of: ['A', 'B', 'C'] });
  });

  it('"Let G be the centroid of triangle ABC" → centroid', () => {
    const i = find('Triangle ABC. Let G be the centroid of triangle ABC', 'centroid');
    expect(i).toBeDefined();
    expect(i.name).toBe('G');
    expect(i.constraint).toEqual({ kind: 'centroid', of: ['A', 'B', 'C'] });
  });

  // --- name AFTER the keyword ("centroid G") --------------------------------
  it('"centroid G" (name after keyword) → centroid', () => {
    const i = find('Triangle ABC. Mark the centroid G of triangle ABC', 'centroid');
    expect(i).toBeDefined();
    expect(i.name).toBe('G');
    expect(i.constraint.of).toEqual(['A', 'B', 'C']);
  });

  it('"orthocenter H" (name after keyword) → orthocenter', () => {
    const i = find('Triangle ABC. Draw the orthocenter H of triangle ABC', 'orthocenter');
    expect(i).toBeDefined();
    expect(i.name).toBe('H');
    expect(i.constraint.of).toEqual(['A', 'B', 'C']);
  });

  // --- in-clause triangle binding (not the head-of-problem triangle) --------
  it('"centroid of triangle DEF" (problem also has ABC) → of [D,E,F]', () => {
    const i = find('Triangle ABC and triangle DEF. G is the centroid of triangle DEF', 'centroid');
    expect(i).toBeDefined();
    expect(i.name).toBe('G');
    expect(i.constraint).toEqual({ kind: 'centroid', of: ['D', 'E', 'F'] });
  });

  // --- unique-problem-triangle fallback -------------------------------------
  it('clause without triangle + problem has exactly 1 triangle → fallback', () => {
    const i = find('Triangle ABC. Let G be the centroid', 'centroid');
    expect(i).toBeDefined();
    expect(i.constraint.of).toEqual(['A', 'B', 'C']);
  });

  // --- multiple centers in one clause → emit both ---------------------------
  it('"G is the centroid and H is the orthocenter" → emit both', () => {
    const all = intents(
      'Triangle ABC. G is the centroid and H is the orthocenter of triangle ABC',
    );
    const g = all.find((i) => i.constraint?.kind === 'centroid');
    const h = all.find((i) => i.constraint?.kind === 'orthocenter');
    expect(g?.name).toBe('G');
    expect(h?.name).toBe('H');
    expect(g.constraint.of).toEqual(['A', 'B', 'C']);
    expect(h.constraint.of).toEqual(['A', 'B', 'C']);
  });

  // --- fail-safe (escalate instead of guessing) -----------------------------
  it('no triangle anywhere → no match', () => {
    expect(run('G is the centroid')).toEqual([]);
  });

  it('ambiguous: clause without triangle + problem has >1 triangle → no emit', () => {
    expect(
      find('Triangle ABC and triangle DEF. G is the centroid', 'centroid'),
    ).toBeUndefined();
  });

  it('name missing ("the centroid of triangle ABC", no point name) → no emit', () => {
    expect(
      find('Triangle ABC. Draw the centroid of triangle ABC', 'centroid'),
    ).toBeUndefined();
  });

  // --- VN regression: EN triangle detection must not corrupt VN -------------
  it('VN still binds via "tam giác" (EN triangle regex additive)', () => {
    const i = find('Gọi G là trọng tâm tam giác ABC', 'centroid');
    expect(i).toBeDefined();
    expect(i.constraint).toEqual({ kind: 'centroid', of: ['A', 'B', 'C'] });
  });
});
