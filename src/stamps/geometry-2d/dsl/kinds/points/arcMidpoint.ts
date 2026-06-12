// src/stamps/geometry-2d/dsl/kinds/points/arcMidpoint.ts
import { z } from 'zod';
import { NameZ } from '../../names';
import type { DslPointT } from '../../schema';
import { defineModule, type RefSpec } from '../_types';
import { emitPointObject } from '../_shared';

type Input = Extract<DslPointT, { kind: 'arcMidpoint' }>;

export const arcMidpointModule = defineModule<'arcMidpoint', Input>({
  kind: 'arcMidpoint',
  role: 'point',
  category: 'points',
  prefix: 'p',
  schema: z.object({
    name: NameZ,
    kind: z.literal('arcMidpoint'),
    circle: NameZ,
    a: NameZ,
    b: NameZ,
    // Đúng 1 trong notContaining / containing — bất biến cứng kiểm ở
    // scene-constraint validate (không .refine vì registry dựng
    // discriminatedUnion yêu cầu ZodObject thuần).
    notContaining: NameZ.optional(),
    containing: NameZ.optional(),
  }),
  collectRefs: (e) => {
    const refs = [e.circle, e.a, e.b];
    const containment = e.notContaining ?? e.containing;
    if (containment) refs.push(containment);
    return refs;
  },
  // refSpecs động: notContaining/containing TỐI ĐA 1 — có thể không có (cung không mơ hồ).
  refSpecs: (e) => {
    const specs: RefSpec[] = [
      { field: 'circle', role: 'circle' },
      { field: 'a', role: 'point' },
      { field: 'b', role: 'point' },
    ];
    if (e.containing ?? e.notContaining) {
      specs.push({ field: e.containing ? 'containing' : 'notContaining', role: 'point' });
    }
    return specs;
  },
  emit: (e, ctx) => [{
    role: 'primary',
    object: emitPointObject(ctx.resolveId(e.name), e.name, {
      kind: 'arcMidpoint',
      circle: ctx.resolveId(e.circle),
      a: ctx.resolveId(e.a),
      b: ctx.resolveId(e.b),
      // notContaining/containing optional: cung KHÔNG mơ hồ (nửa đường tròn) → bỏ cả hai.
      ...(e.containing
        ? { containing: ctx.resolveId(e.containing) }
        : e.notContaining
          ? { notContaining: ctx.resolveId(e.notContaining) }
          : {}),
    }),
  }],
});
