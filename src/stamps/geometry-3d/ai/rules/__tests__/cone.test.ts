import { coneRule } from '../cone';
function clause(text: string, id = 0) { return { id, text, hasGeometry: true }; }

describe('cone rule', () => {
  it('hình nón đỉnh S → cone + 2 điểm free', () => {
    const ctx = { problem: 'Cho hình nón đỉnh S có chiều cao h.', clauses: [clause('Cho hình nón đỉnh S có chiều cao h', 0)] };
    const m = coneRule.match(ctx as any);
    expect(m.length).toBe(1);
    const ops = m[0].intents.map((i: any) => i.op);
    expect(ops.filter((o: string) => o === 'add-point-3d').length).toBe(2);
    expect(ops).toContain('cone');
    const co = m[0].intents.find((i: any) => i.op === 'cone') as any;
    expect(co.apex).toBe('S');
  });

  it('hình nón trần → synth apex/base', () => {
    const ctx = { problem: 'Cho hình nón có chiều cao bằng 2.', clauses: [clause('Cho hình nón có chiều cao bằng 2', 0)] };
    expect(coneRule.match(ctx as any).length).toBe(1);
  });

  it('skip khi có solid head (compound nội tiếp)', () => {
    const ctx = { problem: 'Cho hình chóp S.ABCD. Khối nón đỉnh S đáy nội tiếp ABCD.', clauses: [clause('Khối nón đỉnh S', 0)] };
    expect(coneRule.match(ctx as any).length).toBe(0);
  });

  it('skip khi nội/ngoại tiếp', () => {
    const ctx = { problem: 'Hình nón nội tiếp hình cầu bán kính 9.', clauses: [clause('Hình nón nội tiếp hình cầu', 0)] };
    expect(coneRule.match(ctx as any).length).toBe(0);
  });
});
