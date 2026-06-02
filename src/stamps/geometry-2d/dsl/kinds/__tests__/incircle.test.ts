import { incircleModule } from '../circles/incircle';
import type { EmitContext } from '../_types';

const ctx: EmitContext = {
  resolveId: (n) => `id_${n}`,
  hintOf: () => 'point',
  mintAuxId: () => 'aux',
};

describe('incircle kind', () => {
  it('parses valid input', () => {
    const r = incircleModule.schema.safeParse({
      name: 'I', kind: 'incircle', vertices: ['A', 'B', 'C'],
    });
    expect(r.success).toBe(true);
  });

  it('rejects non-tuple-3 vertices', () => {
    const r = incircleModule.schema.safeParse({
      name: 'I', kind: 'incircle', vertices: ['A', 'B'],
    });
    expect(r.success).toBe(false);
  });

  it('collects refs', () => {
    const refs = incircleModule.collectRefs({
      name: 'I', kind: 'incircle', vertices: ['A', 'B', 'C'],
    } as never);
    expect(refs).toEqual(['A', 'B', 'C']);
  });

  it('emits primary circle object referencing 3 vertices', () => {
    const out = incircleModule.emit({
      name: 'I', kind: 'incircle', vertices: ['A', 'B', 'C'],
    } as never, ctx);
    expect(out).toHaveLength(1);
    expect(out[0].object).toMatchObject({
      id: 'id_I',
      kind: 'circle',
      attrs: { vertices: ['id_A', 'id_B', 'id_C'] },
    });
  });
});
