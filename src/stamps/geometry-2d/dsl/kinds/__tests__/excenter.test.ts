// src/stamps/geometry-2d/dsl/kinds/__tests__/excenter.test.ts
import { excenterModule } from '../points/excenter';
import type { EmitContext } from '../_types';

const ctx: EmitContext = { resolveId: (n) => `id_${n}`, hintOf: () => 'point', mintAuxId: () => 'aux' };

describe('excenter kind', () => {
  it('parse valid', () => {
    expect(excenterModule.schema.safeParse({
      name: 'J', kind: 'excenter', vertices: ['A', 'B', 'C'], opposite: 'A',
    }).success).toBe(true);
  });
  it('rejects vertices length != 3', () => {
    expect(excenterModule.schema.safeParse({
      name: 'J', kind: 'excenter', vertices: ['A', 'B'], opposite: 'A',
    }).success).toBe(false);
  });
  it('collectRefs = vertices', () => {
    expect(excenterModule.collectRefs({
      name: 'J', kind: 'excenter', vertices: ['A', 'B', 'C'], opposite: 'A',
    } as never)).toEqual(['A', 'B', 'C']);
  });
  // opposite ∈ vertices không được enforce ở DSL schema (ZodEffects phá discriminatedUnion).
  // Invariant được guard ở scene renderer (validateRefs kiểm tra opposite resolves as point,
  // và renderer validate "opposite phải là một trong vertices").
  it('schema allows opposite not in vertices (invariant enforced downstream)', () => {
    expect(excenterModule.schema.safeParse({
      name: 'J', kind: 'excenter', vertices: ['A', 'B', 'C'], opposite: 'X',
    }).success).toBe(true);
  });
  it('emit primary point', () => {
    const out = excenterModule.emit({
      name: 'J', kind: 'excenter', vertices: ['A', 'B', 'C'], opposite: 'A',
    } as never, ctx);
    expect(out[0].object.attrs).toMatchObject({
      constraint: { kind: 'excenter', vertices: ['id_A', 'id_B', 'id_C'], opposite: 'id_A' },
    });
  });
});
