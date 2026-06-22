import { cylinderRule } from '../cylinder';
function clause(text: string, id = 0) { return { id, text, hasGeometry: true }; }

describe('cylinder rule', () => {
  it('hình trụ standalone (không thiết diện) → cylinder + 2 điểm', () => {
    // Đề axial ("thiết diện qua trục") giờ vẽ thêm hcn mặt cắt — case đó ở cylinderSection.test.ts.
    const ctx = { problem: 'Cho hình trụ có chiều cao h.', clauses: [clause('Cho hình trụ có chiều cao h', 0)] };
    const m = cylinderRule.match(ctx as any);
    expect(m.length).toBe(1);
    expect(m[0].intents.map((i: any) => i.op)).toContain('cylinder');
    expect(m[0].intents.filter((i: any) => i.op === 'add-point-3d').length).toBe(2);
  });

  it('skip khi có lăng trụ dotted (compound)', () => {
    const ctx = { problem: 'Cho hình lăng trụ ABC.A′B′C′. Hình trụ nội tiếp lăng trụ.', clauses: [clause('Hình trụ nội tiếp lăng trụ', 0)] };
    expect(cylinderRule.match(ctx as any).length).toBe(0);
  });
});
