import { circleRadiusRule } from '../circleRadius';
import { segmentClauses } from '../../deterministic/coverage';

function run(problem: string) {
  return circleRadiusRule.match({ problem, clauses: segmentClauses(problem) });
}

describe('circleRadiusRule', () => {
  it('"đường tròn tâm O bán kính 3" → centerRadius {center:O, radius:3}', () => {
    const m = run('Cho đường tròn tâm O bán kính 3');
    expect(m.length).toBe(1);
    const intent = m[0].intents[0] as any;
    expect(intent.op).toBe('draw-circle');
    expect(intent.name).toBe('O');
    expect(intent.spec).toBe('centerRadius');
    expect(intent.center).toBe('O');
    expect(intent.radius).toBe(3);
    expect(m[0].clauseIds).toContain(0);
  });

  it('"đường tròn (O) bán kính 4" (tâm trong ngoặc) → centerRadius radius:4', () => {
    const m = run('Cho đường tròn (O) bán kính 4');
    expect(m.length).toBe(1);
    const intent = m[0].intents[0] as any;
    expect(intent.spec).toBe('centerRadius');
    expect(intent.center).toBe('O');
    expect(intent.radius).toBe(4);
  });

  it('"(O; 3)" ký hiệu gọn → centerRadius radius:3 (claim clause chứa "(O")', () => {
    const m = run('Cho đường tròn (O; 3)');
    expect(m.length).toBe(1);
    const intent = m[0].intents[0] as any;
    expect(intent.spec).toBe('centerRadius');
    expect(intent.center).toBe('O');
    expect(intent.radius).toBe(3);
    // segmentation cắt "(O" và "3)" → clause 0 chứa fragment "(O".
    expect(m[0].clauseIds).toContain(0);
  });

  it('"(O, 2.5)" thập phân dấu chấm → centerRadius radius:2.5', () => {
    const m = run('Cho đường tròn (O, 2.5)');
    expect(m.length).toBe(1);
    const intent = m[0].intents[0] as any;
    expect(intent.spec).toBe('centerRadius');
    expect(intent.center).toBe('O');
    expect(intent.radius).toBe(2.5);
  });

  it('"đường tròn tâm O đi qua A" → centerThrough {center:O, through:A}', () => {
    const m = run('Cho đường tròn tâm O đi qua A');
    expect(m.length).toBe(1);
    const intent = m[0].intents[0] as any;
    expect(intent.op).toBe('draw-circle');
    expect(intent.spec).toBe('centerThrough');
    expect(intent.center).toBe('O');
    expect(intent.through).toBe('A');
    expect(m[0].clauseIds).toContain(0);
  });

  it('"đường tròn (O) đi qua A" (ngoặc) → centerThrough through:A', () => {
    const m = run('Cho đường tròn (O) đi qua A');
    expect(m.length).toBe(1);
    const intent = m[0].intents[0] as any;
    expect(intent.spec).toBe('centerThrough');
    expect(intent.center).toBe('O');
    expect(intent.through).toBe('A');
  });

  it('"(O)" trơ (không số, không "đi qua") → BỎ QUA (0 match)', () => {
    const m = run('Cho đường tròn (O)');
    expect(m.length).toBe(0);
  });

  it('bán kính CHỮ "R" (không số) → BỎ QUA để escalate AI', () => {
    const m = run('Cho đường tròn tâm O bán kính R');
    expect(m.length).toBe(0);
  });

  it('hai đường tròn ký hiệu gọn → 2 match centerRadius riêng', () => {
    const m = run('Cho đường tròn (O; 3) và đường tròn (I; 5)');
    expect(m.length).toBe(2);
    const byCenter = Object.fromEntries(
      m.map((x) => [(x.intents[0] as any).center, (x.intents[0] as any).radius]),
    );
    expect(byCenter).toEqual({ O: 3, I: 5 });
  });

  // --- Bug 1: WORDS form, hai đường tròn cùng clause (không dấu câu tách) ------
  it('"tâm I bán kính 2 và tâm O bán kính 5" → 2 centerRadius (I:2, O:5)', () => {
    const m = run('Cho đường tròn tâm I bán kính 2 và đường tròn tâm O bán kính 5');
    expect(m.length).toBe(2);
    const byCenter = Object.fromEntries(
      m.map((x) => [(x.intents[0] as any).center, (x.intents[0] as any).radius]),
    );
    expect(byCenter).toEqual({ I: 2, O: 5 });
    // mọi intent đúng spec centerRadius
    for (const x of m) {
      expect((x.intents[0] as any).spec).toBe('centerRadius');
    }
  });

  // --- Bug 2: bare "tâm O" KHÔNG bị nuốt, bán kính 5 bind đúng vào I ----------
  it('"tâm O và … tâm I bán kính 5" → CHỈ I:5 (O trơ không claim)', () => {
    const m = run('Cho đường tròn tâm O và đường tròn tâm I bán kính 5');
    // chỉ 1 centerRadius cho I; "tâm O" trơ (không số/không đi qua) → bỏ qua
    expect(m.length).toBe(1);
    const intent = m[0].intents[0] as any;
    expect(intent.spec).toBe('centerRadius');
    expect(intent.center).toBe('I');
    expect(intent.radius).toBe(5);
  });

  // --- Bug 3: "đi qua B và C" (≥2 điểm) → SKIP để escalate (không claim) ------
  it('"tâm A đi qua B và C" (≥2 surface point) → BỎ QUA (0 match) để escalate', () => {
    const m = run('Cho đường tròn tâm A đi qua B và C');
    expect(m.length).toBe(0);
  });

  it('"tâm A đi qua B, C" (dấu phẩy, ≥2 điểm) → BỎ QUA (0 match)', () => {
    const m = run('Cho đường tròn tâm A đi qua B, C');
    expect(m.length).toBe(0);
  });

  it('"đi qua A" (1 điểm) vẫn centerThrough bình thường', () => {
    const m = run('Cho đường tròn tâm O đi qua A');
    expect(m.length).toBe(1);
    expect((m[0].intents[0] as any).spec).toBe('centerThrough');
    expect((m[0].intents[0] as any).through).toBe('A');
  });

  it('hai "đi qua" trong 1 clause → 2 centerThrough riêng', () => {
    const m = run('Cho đường tròn tâm O đi qua A và đường tròn tâm I đi qua B');
    expect(m.length).toBe(2);
    const pairs = m.map((x) => [
      (x.intents[0] as any).center,
      (x.intents[0] as any).through,
    ]);
    expect(pairs).toContainEqual(['O', 'A']);
    expect(pairs).toContainEqual(['I', 'B']);
  });
});
