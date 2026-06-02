// src/stamps/geometry-2d/dsl/kinds/__tests__/circleIntersection.test.ts
import { circleIntersectionModule } from '../points/circleIntersection';
import type { EmitContext } from '../_types';

const ctx: EmitContext = {
  resolveId: (n) => `id_${n}`,
  hintOf: () => 'point',
  mintAuxId: () => 'aux',
};

describe('circleIntersection kind', () => {
  it('parses valid input', () => {
    const r = circleIntersectionModule.schema.safeParse({
      name: 'A', kind: 'circleIntersection', c1: 'O', c2: 'Op', which: 0,
    });
    expect(r.success).toBe(true);
  });

  it('rejects out-of-range which', () => {
    const r = circleIntersectionModule.schema.safeParse({
      name: 'A', kind: 'circleIntersection', c1: 'O', c2: 'Op', which: 2,
    });
    expect(r.success).toBe(false);
  });

  it('collects refs', () => {
    const refs = circleIntersectionModule.collectRefs({
      name: 'A', kind: 'circleIntersection', c1: 'O', c2: 'Op', which: 0,
    } as never);
    expect(refs).toEqual(['O', 'Op']);
  });

  it('emits primary point object', () => {
    const out = circleIntersectionModule.emit({
      name: 'A', kind: 'circleIntersection', c1: 'O', c2: 'Op', which: 1,
    } as never, ctx);
    expect(out).toHaveLength(1);
    expect(out[0].object.attrs).toMatchObject({
      constraint: {
        kind: 'circleIntersection',
        c1: 'id_O',
        c2: 'id_Op',
        which: 1,
      },
    });
  });
});
