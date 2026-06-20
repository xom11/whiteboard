import { commonTangentPointModule } from '../points/commonTangentPoint';
import type { EmitContext } from '../_types';

const ctx: EmitContext = { resolveId: (n) => `id_${n}`, hintOf: () => 'point', mintAuxId: () => 'aux' };
const base = { name: 'T', kind: 'commonTangentPoint', circles: ['O', "O'"], on: 0, variant: 'external', side: 0 } as const;

describe('commonTangentPoint kind', () => {
  it('parse external on=0 side=0', () => {
    expect(commonTangentPointModule.schema.safeParse(base).success).toBe(true);
  });
  it('parse internal on=1 side=1', () => {
    expect(commonTangentPointModule.schema.safeParse({ ...base, on: 1, variant: 'internal', side: 1 }).success).toBe(true);
  });
  it('reject variant không hợp lệ', () => {
    expect(commonTangentPointModule.schema.safeParse({ ...base, variant: 'mixed' }).success).toBe(false);
  });
  it('reject on=2 / side=2', () => {
    expect(commonTangentPointModule.schema.safeParse({ ...base, on: 2 }).success).toBe(false);
    expect(commonTangentPointModule.schema.safeParse({ ...base, side: 2 }).success).toBe(false);
  });
  it('reject circles thiếu phần tử', () => {
    expect(commonTangentPointModule.schema.safeParse({ ...base, circles: ['O'] }).success).toBe(false);
  });
  it('collectRefs = 2 circles', () => {
    expect(commonTangentPointModule.collectRefs(base as never)).toEqual(['O', "O'"]);
  });
  it('refSpecs khai ref circles role circle many', () => {
    const specs = commonTangentPointModule.refSpecs;
    expect(specs).toEqual([{ field: 'circles', role: 'circle', many: true }]);
  });
  it('emit resolves circle ids + giữ on/variant/side', () => {
    const out = commonTangentPointModule.emit(base as never, ctx);
    expect(out[0].role).toBe('primary');
    expect(out[0].object.attrs).toMatchObject({
      constraint: { kind: 'commonTangentPoint', circles: ['id_O', "id_O'"], on: 0, variant: 'external', side: 0 },
    });
  });
});
