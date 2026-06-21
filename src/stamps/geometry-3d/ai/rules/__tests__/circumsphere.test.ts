import { circumsphereRule } from '../circumsphere';
import { runDeterministicIntents3d } from '../../deterministic/runDeterministicIntents3d';

function clause(text: string, id = 0) { return { id, text, hasGeometry: true }; }

describe('circumsphere rule', () => {
  it('tứ diện ABCD: circumsphereCenter[A,B,C,D] + sphere', () => {
    const ctx = { problem: 'Cho tứ diện ABCD. Mặt cầu ngoại tiếp tứ diện ABCD.', clauses: [clause('Cho tứ diện ABCD', 0), clause('Mặt cầu ngoại tiếp tứ diện ABCD', 1)] };
    const m = circumsphereRule.match(ctx as any);
    expect(m.length).toBe(1);
    const kinds = m[0].intents.map((i: any) => i.op + (i.constraint ? '/' + i.constraint.kind : ''));
    expect(kinds).toContain('add-point-3d/circumsphereCenter');
    expect(kinds).toContain('sphere');
    const cs = m[0].intents.find((i: any) => i.constraint?.kind === 'circumsphereCenter') as any;
    expect(cs.constraint.vertices).toEqual(['A', 'B', 'C', 'D']);
  });

  it('hình chóp S.ABC: vertices [S,A,B,C]', () => {
    const ctx = { problem: 'Mặt cầu ngoại tiếp hình chóp S.ABC.', clauses: [clause('Mặt cầu ngoại tiếp hình chóp S.ABC', 0)] };
    const cs = circumsphereRule.match(ctx as any)[0].intents.find((i: any) => i.constraint?.kind === 'circumsphereCenter') as any;
    expect(cs.constraint.vertices).toEqual(['S', 'A', 'B', 'C']);
  });

  it('bare token SCDE: vertices [S,C,D,E]', () => {
    const ctx = { problem: 'mặt cầu ngoại tiếp SCDE', clauses: [clause('mặt cầu ngoại tiếp SCDE', 0)] };
    const cs = circumsphereRule.match(ctx as any)[0].intents.find((i: any) => i.constraint?.kind === 'circumsphereCenter') as any;
    expect(cs.constraint.vertices).toEqual(['S', 'C', 'D', 'E']);
  });

  it('lăng trụ ABC.A′B′C′: 6 đỉnh', () => {
    const ctx = { problem: 'Mặt cầu ngoại tiếp lăng trụ ABC.A′B′C′.', clauses: [clause('Mặt cầu ngoại tiếp lăng trụ ABC.A′B′C′', 0)] };
    const cs = circumsphereRule.match(ctx as any)[0].intents.find((i: any) => i.constraint?.kind === 'circumsphereCenter') as any;
    expect(cs.constraint.vertices).toEqual(['A', 'B', 'C', 'A′', 'B′', 'C′']);
  });

  it('"ngoại tiếp tam giác" (3 điểm) → bỏ', () => {
    const ctx = { problem: 'mặt cầu ngoại tiếp tam giác ABC', clauses: [clause('mặt cầu ngoại tiếp tam giác ABC', 0)] };
    expect(circumsphereRule.match(ctx as any).length).toBe(0);
  });

  it('tâm synth không trùng đỉnh', () => {
    const ctx = { problem: 'Mặt cầu ngoại tiếp tứ diện OABC.', clauses: [clause('Mặt cầu ngoại tiếp tứ diện OABC', 0)] };
    const cs = circumsphereRule.match(ctx as any)[0].intents.find((i: any) => i.constraint?.kind === 'circumsphereCenter') as any;
    const center = (circumsphereRule.match(ctx as any)[0].intents.find((i: any) => i.op === 'sphere') as any).center;
    expect(cs.constraint.vertices).toContain('O');
    expect(['O', 'A', 'B', 'C']).not.toContain(center); // synth né đỉnh O
  });

  it('e2e tứ diện: coverage FULL', () => {
    const r = runDeterministicIntents3d('Cho tứ diện đều ABCD. Mặt cầu ngoại tiếp tứ diện ABCD.');
    expect(r.ok).toBe(true);
  });
});
