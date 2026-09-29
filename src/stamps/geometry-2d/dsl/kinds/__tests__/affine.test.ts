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
    const specs = typeof affineModule.refSpecs === 'function' ? affineModule.refSpecs(base as never) : affineModule.refSpecs;
    expect(specs).toEqual([{ field: 'points', role: 'point', many: true }]);
  });
  it('emit resolve id + giữ nguyên trọng số', () => {
    const out = affineModule.emit(base as never, ctx);
    expect(out[0].object.attrs).toMatchObject({
      constraint: { kind: 'affine', points: ['id_A', 'id_C', 'id_B'], weights: [1, 1, -1] },
    });
  });
  it('rot + awayFrom: ref gồm awayFrom, emit giữ rot và resolve awayFrom', () => {
    const e = { ...base, points: ['A', 'B'], weights: [0, 1], rot: [-1, 1], awayFrom: 'C' } as const;
    expect(affineModule.schema.safeParse(e).success).toBe(true);
    expect(affineModule.collectRefs(e as never)).toEqual(['A', 'B', 'C']);
    const specs = typeof affineModule.refSpecs === 'function' ? affineModule.refSpecs(e as never) : affineModule.refSpecs;
    expect(specs).toEqual([{ field: 'points', role: 'point', many: true }, { field: 'awayFrom', role: 'point' }]);
    expect(affineModule.emit(e as never, ctx)[0].object.attrs).toMatchObject({
      constraint: { kind: 'affine', points: ['id_A', 'id_B'], weights: [0, 1], rot: [-1, 1], awayFrom: 'id_C' },
    });
  });
});
