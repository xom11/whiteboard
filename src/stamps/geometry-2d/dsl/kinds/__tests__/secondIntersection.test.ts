import { secondIntersectionModule } from '../points/secondIntersection';
import type { EmitContext } from '../_types';

const ctx: EmitContext = {
  resolveId: (n) => `id_${n}`,
  hintOf: () => 'point',
  mintAuxId: () => 'aux',
};

describe('secondIntersection kind', () => {
  it('parses valid input', () => {
    const r = secondIntersectionModule.schema.safeParse({
      name: 'E', kind: 'secondIntersection', line: 'AD', circle: 'O', other: 'A',
    });
    expect(r.success).toBe(true);
  });

  it('rejects missing fields', () => {
    const r = secondIntersectionModule.schema.safeParse({
      name: 'E', kind: 'secondIntersection', line: 'AD',
    });
    expect(r.success).toBe(false);
  });

  it('collects refs', () => {
    const refs = secondIntersectionModule.collectRefs({
      name: 'E', kind: 'secondIntersection', line: 'AD', circle: 'O', other: 'A',
    } as never);
    expect(refs).toEqual(['AD', 'O', 'A']);
  });

  it('emits primary point object', () => {
    const out = secondIntersectionModule.emit({
      name: 'E', kind: 'secondIntersection', line: 'AD', circle: 'O', other: 'A',
    } as never, ctx);
    expect(out).toHaveLength(1);
    expect(out[0].role).toBe('primary');
    expect(out[0].object.attrs).toMatchObject({
      constraint: {
        kind: 'secondIntersection',
        line: 'id_AD',
        circle: 'id_O',
        other: 'id_A',
      },
    });
  });
});
