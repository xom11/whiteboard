import { circleCRModule } from '../circles/circleCR';
import type { EmitContext } from '../_types';

const ctx: EmitContext = {
  resolveId: (n) => `id_${n}`,
  hintOf: () => 'point',
  mintAuxId: () => 'aux',
};

describe('circleCR kind', () => {
  it('parses valid input', () => {
    const r = circleCRModule.schema.safeParse({
      name: 'O', kind: 'circleCR', center: 'O', radius: 3,
    });
    expect(r.success).toBe(true);
  });

  it('rejects negative radius', () => {
    const r = circleCRModule.schema.safeParse({
      name: 'O', kind: 'circleCR', center: 'O', radius: -1,
    });
    expect(r.success).toBe(false);
  });

  it('rejects zero radius', () => {
    const r = circleCRModule.schema.safeParse({
      name: 'O', kind: 'circleCR', center: 'O', radius: 0,
    });
    expect(r.success).toBe(false);
  });

  it('collects refs', () => {
    const refs = circleCRModule.collectRefs({
      name: 'O', kind: 'circleCR', center: 'O', radius: 3,
    } as never);
    expect(refs).toEqual(['O']);
  });

  it('emits primary circle object', () => {
    const out = circleCRModule.emit({
      name: 'C1', kind: 'circleCR', center: 'O', radius: 2.5,
    } as never, ctx);
    expect(out).toHaveLength(1);
    expect(out[0].role).toBe('primary');
    expect(out[0].object).toMatchObject({
      id: 'id_C1',
      kind: 'circle',
      attrs: { center: 'id_O', radius: 2.5 },
    });
  });
});
