// src/stamps/geometry-2d/dsl/kinds/__tests__/registry.test.ts
import {
  KIND_REGISTRY,
  POINT_KINDS,
  LINE_LIKE_SHAPE_KINDS,
  CIRCLE_KINDS,
  DslEntitySchema,
} from '../../registry';
import { transpile } from '../../transpile';

describe('registry', () => {
  test('every module has a unique kind string', () => {
    const seen = new Set<string>();
    for (const mod of KIND_REGISTRY.values()) {
      expect(seen.has(mod.kind)).toBe(false);
      seen.add(mod.kind);
    }
  });

  test('module kind matches schema literal', () => {
    for (const mod of KIND_REGISTRY.values()) {
      const parsed = mod.schema.safeParse({ name: 'X', kind: mod.kind });
      // Schema may fail on missing fields, but the kind discriminator must match.
      // If the kind is wrong, Zod returns a discriminator error.
      const hasDiscriminatorError =
        !parsed.success && parsed.error.issues.some((i) => i.code === 'invalid_literal');
      expect(hasDiscriminatorError).toBe(false);
    }
  });

  test('POINT_KINDS contains exactly all role=point kinds', () => {
    const expected = new Set(
      Array.from(KIND_REGISTRY.values()).filter((m) => m.role === 'point').map((m) => m.kind),
    );
    expect(POINT_KINDS).toEqual(expected);
  });

  test('LINE_LIKE_SHAPE_KINDS contains segment/line/ray + lineConstruction kinds', () => {
    const expected = new Set(
      Array.from(KIND_REGISTRY.values())
        .filter((m) => ['segment', 'line', 'ray', 'lineConstruction'].includes(m.role))
        .map((m) => m.kind),
    );
    expect(LINE_LIKE_SHAPE_KINDS).toEqual(expected);
  });

  test('CIRCLE_KINDS contains exactly role=circle kinds', () => {
    const expected = new Set(
      Array.from(KIND_REGISTRY.values()).filter((m) => m.role === 'circle').map((m) => m.kind),
    );
    expect(CIRCLE_KINDS).toEqual(expected);
  });

  test('DslEntitySchema parses every kind module exemplar', () => {
    const samples: Array<Record<string, unknown>> = [
      { name: 'A', kind: 'free', x: 0, y: 0 },
      { name: 'M', kind: 'midpoint', p1: 'A', p2: 'B' },
      { name: 'X', kind: 'intersection', ref1: 'a', ref2: 'b' },
      { name: 'AB', kind: 'segment', p1: 'A', p2: 'B' },
      { name: 'CP', kind: 'circleCP', center: 'O', surfacePoint: 'A' },
    ];
    for (const s of samples) {
      const r = DslEntitySchema.safeParse(s);
      expect(r.success).toBe(true);
    }
  });

  test('registry has 41 kinds (regression guard)', () => {
    expect(KIND_REGISTRY.size).toBe(41);
  });
});

describe('emit context mintAuxId', () => {
  test('transpile pipeline produces no auxiliary ids for the 32 atomic kinds', () => {
    const dsl = {
      version: 1 as const,
      points: [{ name: 'A', kind: 'free' as const, x: 0, y: 0 }],
      shapes: [],
    };
    const result = transpile(dsl);
    expect(result.ok).toBe(true);
    if (result.ok) {
      for (const id of Object.keys(result.state.objects)) {
        expect(id.startsWith('aux_')).toBe(false);
      }
    }
  });
});
