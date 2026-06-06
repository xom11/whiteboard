// src/stamps/geometry-2d/dsl/kinds/__tests__/reflect.test.ts
import { reflectPointModule } from '../points/reflectPoint';
import { reflectLineModule } from '../points/reflectLine';
import type { EmitContext } from '../_types';

const ctx: EmitContext = { resolveId: (n) => `id_${n}`, hintOf: () => 'point', mintAuxId: () => 'aux' };

describe('reflectPoint kind', () => {
  it('parse + collectRefs', () => {
    expect(reflectPointModule.schema.safeParse({ name: 'Q', kind: 'reflectPoint', of: 'P', through: 'M' }).success).toBe(true);
    expect(reflectPointModule.collectRefs({ name: 'Q', kind: 'reflectPoint', of: 'P', through: 'M' } as never)).toEqual(['P', 'M']);
  });
  it('emit transformed/reflectPoint', () => {
    const out = reflectPointModule.emit({ name: 'Q', kind: 'reflectPoint', of: 'P', through: 'M' } as never, ctx);
    expect(out[0].object.attrs).toMatchObject({
      constraint: { kind: 'transformed', source: 'id_P', transform: { kind: 'reflectPoint', center: 'id_M' } },
    });
  });
});

describe('reflectLine kind', () => {
  it('emit transformed/reflectLine', () => {
    const out = reflectLineModule.emit({ name: 'D', kind: 'reflectLine', of: 'H', through: 'BC' } as never, ctx);
    expect(out[0].object.attrs).toMatchObject({
      constraint: { kind: 'transformed', source: 'id_H', transform: { kind: 'reflectLine', line: 'id_BC' } },
    });
  });
});
