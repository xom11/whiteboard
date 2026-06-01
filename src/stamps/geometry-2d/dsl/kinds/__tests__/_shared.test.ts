// src/stamps/geometry-2d/dsl/kinds/__tests__/_shared.test.ts
import {
  emitPointObject,
  resolveTriangleVertices,
  POINT_BASE_FIELDS,
  SHAPE_BASE_FIELDS,
} from '../_shared';
import type { EmitContext } from '../_types';

const ctx: EmitContext = {
  resolveId: (name) => `id_${name}`,
  hintOf: () => 'point',
  mintAuxId: (parent, suffix) => `aux_${parent}_${suffix}1`,
};

describe('_shared helpers', () => {
  test('emitPointObject wraps constraint into SceneObject', () => {
    const obj = emitPointObject('p1', 'A', { kind: 'free', x: 1, y: 2 });
    expect(obj).toEqual({
      id: 'p1',
      kind: 'point',
      label: 'A',
      ...POINT_BASE_FIELDS,
      attrs: { constraint: { kind: 'free', x: 1, y: 2 } },
    });
  });

  test('resolveTriangleVertices maps 3 names through ctx', () => {
    expect(resolveTriangleVertices(ctx, ['A', 'B', 'C'])).toEqual(['id_A', 'id_B', 'id_C']);
  });

  test('POINT_BASE_FIELDS and SHAPE_BASE_FIELDS share visible/locked/layer/schemaVersion', () => {
    expect(POINT_BASE_FIELDS).toEqual({ visible: true, locked: false, layer: 'default', schemaVersion: 1 });
    expect(SHAPE_BASE_FIELDS).toEqual({ visible: true, locked: false, layer: 'default', schemaVersion: 1 });
  });
});
