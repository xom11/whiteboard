// src/stamps/geometry-2d/ai/rules/__tests__/registry.invariants.test.ts
//
// Guard bất biến của registry rule (Mức 1): bắt sớm các lỗi cấu hình khó thấy.
import { ALL_RULES } from '../registry';

describe('rule registry — invariants', () => {
  it('không có rule.id trùng (chống copy-paste khi thêm rule)', () => {
    const ids = ALL_RULES.map((r) => r.id);
    const dups = [...new Set(ids.filter((id, i) => ids.indexOf(id) !== i))];
    expect(dups).toEqual([]);
  });

  it('ALL_RULES sắp xếp priority giảm dần (contract runRules)', () => {
    for (let i = 1; i < ALL_RULES.length; i++) {
      expect(ALL_RULES[i - 1].priority).toBeGreaterThanOrEqual(ALL_RULES[i].priority);
    }
  });

  it('mọi rule có patterns không rỗng (patterns:[] → prefilter false → rule CHẾT)', () => {
    const dead = ALL_RULES.filter((r) => r.patterns.length === 0).map((r) => r.id);
    expect(dead).toEqual([]);
  });
});
