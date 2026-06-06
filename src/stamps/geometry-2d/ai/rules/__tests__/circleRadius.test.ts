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
});
