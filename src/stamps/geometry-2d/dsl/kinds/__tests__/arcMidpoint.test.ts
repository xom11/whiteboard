// src/stamps/geometry-2d/dsl/kinds/__tests__/arcMidpoint.test.ts
import { arcMidpointModule } from '../points/arcMidpoint';
import type { EmitContext } from '../_types';

const ctx: EmitContext = { resolveId: (n) => `id_${n}`, hintOf: () => 'point', mintAuxId: () => 'aux' };

describe('arcMidpoint kind', () => {
  it('parse valid', () => {
    expect(arcMidpointModule.schema.safeParse({
      name: 'M', kind: 'arcMidpoint', circle: 'O', a: 'B', b: 'C', notContaining: 'A',
    }).success).toBe(true);
  });
  it('collectRefs', () => {
    expect(arcMidpointModule.collectRefs({
      name: 'M', kind: 'arcMidpoint', circle: 'O', a: 'B', b: 'C', notContaining: 'A',
    } as never)).toEqual(['O', 'B', 'C', 'A']);
  });
  it('emit primary point', () => {
    const out = arcMidpointModule.emit({
      name: 'M', kind: 'arcMidpoint', circle: 'O', a: 'B', b: 'C', notContaining: 'A',
    } as never, ctx);
    expect(out[0].object.attrs).toMatchObject({
      constraint: { kind: 'arcMidpoint', circle: 'id_O', a: 'id_B', b: 'id_C', notContaining: 'id_A' },
    });
  });

  it('parse valid biến thể containing', () => {
    expect(arcMidpointModule.schema.safeParse({
      name: 'T', kind: 'arcMidpoint', circle: 'O', a: 'B', b: 'C', containing: 'A',
    }).success).toBe(true);
  });
  // Bất biến "đúng 1 của notContaining|containing" kiểm ở scene-constraint
  // validate (point.test.ts), KHÔNG ở DSL schema — registry dựng
  // discriminatedUnion nên schema phải là ZodObject thuần (không .refine).
  it('collectRefs dùng containing', () => {
    expect(arcMidpointModule.collectRefs({
      name: 'T', kind: 'arcMidpoint', circle: 'O', a: 'B', b: 'C', containing: 'A',
    } as never)).toEqual(['O', 'B', 'C', 'A']);
  });
  it('emit biến thể containing', () => {
    const out = arcMidpointModule.emit({
      name: 'T', kind: 'arcMidpoint', circle: 'O', a: 'B', b: 'C', containing: 'A',
    } as never, ctx);
    expect(out[0].object.attrs).toMatchObject({
      constraint: { kind: 'arcMidpoint', circle: 'id_O', a: 'id_B', b: 'id_C', containing: 'id_A' },
    });
  });
});
