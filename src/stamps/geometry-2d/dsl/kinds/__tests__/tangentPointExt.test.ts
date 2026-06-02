import { tangentPointExtModule } from '../points/tangentPointExt';
import type { EmitContext } from '../_types';

const ctx: EmitContext = {
  resolveId: (n) => `id_${n}`,
  hintOf: () => 'point',
  mintAuxId: () => 'aux',
};

describe('tangentPointExt kind', () => {
  it('parses valid input', () => {
    const r = tangentPointExtModule.schema.safeParse({
      name: 'B', kind: 'tangentPointExt', from: 'A', circle: 'O', which: 0,
    });
    expect(r.success).toBe(true);
  });

  it('rejects out-of-range which', () => {
    const r = tangentPointExtModule.schema.safeParse({
      name: 'B', kind: 'tangentPointExt', from: 'A', circle: 'O', which: 2,
    });
    expect(r.success).toBe(false);
  });

  it('collects refs', () => {
    const refs = tangentPointExtModule.collectRefs({
      name: 'B', kind: 'tangentPointExt', from: 'A', circle: 'O', which: 0,
    } as never);
    expect(refs).toEqual(['A', 'O']);
  });

  it('emits primary point object', () => {
    const out = tangentPointExtModule.emit({
      name: 'B', kind: 'tangentPointExt', from: 'A', circle: 'O', which: 1,
    } as never, ctx);
    expect(out).toHaveLength(1);
    expect(out[0].object.attrs).toMatchObject({
      constraint: {
        kind: 'tangentPointExt',
        from: 'id_A',
        circle: 'id_O',
        which: 1,
      },
    });
  });
});
