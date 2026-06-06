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

  // --- ràng buộc an toàn (escalate thay vì đoán sai) -------------------------

  it('không có tam giác trong đề → bỏ qua (không match)', () => {
    expect(run('Gọi G là trọng tâm')).toEqual([]);
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
