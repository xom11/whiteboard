import { affineModule } from '../points/affine';
import type { EmitContext } from '../_types';

const ctx: EmitContext = { resolveId: (n) => `id_${n}`, hintOf: () => 'point', mintAuxId: () => 'aux' };
const base = { name: 'D', kind: 'affine', points: ['A', 'C', 'B'], weights: [1, 1, -1] } as const;

describe('affine kind', () => {
  it('parse + reject thiếu điểm', () => {
    expect(affineModule.schema.safeParse(base).success).toBe(true);
    expect(affineModule.schema.safeParse({ ...base, points: ['A'], weights: [1] }).success).toBe(false);
  });
  it('collectRefs / refSpecs = mọi điểm nguồn', () => {
    expect(affineModule.collectRefs(base as never)).toEqual(['A', 'C', 'B']);
    expect(affineModule.refSpecs).toEqual([{ field: 'points', role: 'point', many: true }]);
  });
  it('emit resolve id + giữ nguyên trọng số', () => {
    const out = affineModule.emit(base as never, ctx);
    expect(out[0].object.attrs).toMatchObject({
      constraint: { kind: 'affine', points: ['id_A', 'id_C', 'id_B'], weights: [1, 1, -1] },
    });
  });
});
