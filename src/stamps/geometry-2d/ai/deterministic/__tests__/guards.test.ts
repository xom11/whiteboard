import { allNamedEntitiesPresent } from '../guards';
import type { DslInputT } from '../../../dsl/schema';

const baseDsl: DslInputT = {
  version: 1,
  points: [
    { name: 'A', kind: 'free', x: 0, y: 0 },
    { name: 'B', kind: 'free', x: 1, y: 0 },
    { name: 'C', kind: 'free', x: 0, y: 1 },
  ],
  shapes: [],
};

describe('allNamedEntitiesPresent', () => {
  it('bỏ qua tên chỉ xuất hiện trong clause chứng minh/tính toán', () => {
    const r = allNamedEntitiesPresent(
      'Cho tam giác ABC. Chứng minh I, J, K thẳng hàng. Biết AN cắt OP tại K, PM cắt ON tại I.',
      baseDsl,
    );
    expect(r).toEqual({ ok: true, missing: [] });
  });

  it('vẫn bắt tên trong clause dựng thêm "Gọi ..."', () => {
    const r = allNamedEntitiesPresent(
      'Cho tam giác ABC. Chứng minh ABC vuông. Gọi I là giao điểm của AB và CD.',
      baseDsl,
    );
    expect(r.ok).toBe(false);
    expect(r.missing).toContain('I');
  });
});
