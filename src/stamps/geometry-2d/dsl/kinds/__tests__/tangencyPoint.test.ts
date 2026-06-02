import { tangencyPointModule } from '../points/tangencyPoint';
import type { EmitContext } from '../_types';

const ctx: EmitContext = {
  resolveId: (n) => `id_${n}`,
  hintOf: () => 'point',
  mintAuxId: () => 'aux',
};

describe('tangencyPoint kind', () => {
  it('parses valid input', () => {
    const r = tangencyPointModule.schema.safeParse({
      name: 'D', kind: 'tangencyPoint', circle: 'I', onLine: 'BC',
    });
    expect(r.success).toBe(true);
  });

  it('collects refs', () => {
    const refs = tangencyPointModule.collectRefs({
      name: 'D', kind: 'tangencyPoint', circle: 'I', onLine: 'BC',
    } as never);
    expect(refs).toEqual(['I', 'BC']);
  });

  it('emits primary point object', () => {
    const out = tangencyPointModule.emit({
      name: 'D', kind: 'tangencyPoint', circle: 'I', onLine: 'BC',
    } as never, ctx);
    expect(out).toHaveLength(1);
    expect(out[0].object.attrs).toMatchObject({
      constraint: {
        kind: 'tangencyPoint',
        circle: 'id_I',
        onLine: 'id_BC',
      },
    });
  });
});
