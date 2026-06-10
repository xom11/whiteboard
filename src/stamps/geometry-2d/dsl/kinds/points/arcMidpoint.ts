// src/stamps/geometry-2d/dsl/kinds/points/arcMidpoint.ts
import { z } from 'zod';
import { NameZ } from '../../names';
import type { DslPointT } from '../../schema';
import { defineModule } from '../_types';
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
  collectRefs: (e) => [e.circle, e.a, e.b, (e.notContaining ?? e.containing)!],
  emit: (e, ctx) => [{
    role: 'primary',
    object: emitPointObject(ctx.resolveId(e.name), e.name, {
      kind: 'arcMidpoint',
      circle: ctx.resolveId(e.circle),
      a: ctx.resolveId(e.a),
      b: ctx.resolveId(e.b),
      ...(e.containing
        ? { containing: ctx.resolveId(e.containing) }
        : { notContaining: ctx.resolveId(e.notContaining!) }),
    }),
  }],
});
