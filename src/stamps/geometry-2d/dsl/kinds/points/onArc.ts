// src/stamps/geometry-2d/dsl/kinds/points/onArc.ts
//
// Điểm chạy trên CUNG AB của đường tròn: "M thuộc cung nhỏ BC", "E trên cung lớn
// AB", "D thuộc cung BC không chứa A". Glider trên cung (scene constraint onArc).
import { z } from 'zod';
import { NameZ } from '../../names';
import type { DslPointT } from '../../schema';
import { defineModule, type RefSpec } from '../_types';
import { emitPointObject } from '../_shared';

type Input = Extract<DslPointT, { kind: 'onArc' }>;

export const onArcModule = defineModule<'onArc', Input>({
  kind: 'onArc',
  role: 'point',
  category: 'points',
  prefix: 'p',
  schema: z.object({
    name: NameZ,
    kind: z.literal('onArc'),
    circle: NameZ,
    a: NameZ,
    b: NameZ,
    mode: z.enum(['minor', 'major', 'notContaining', 'containing']),
    ref: NameZ.optional(),
    t: z.number().gt(0).lt(1),
  }),
  collectRefs: (e) => (e.ref ? [e.circle, e.a, e.b, e.ref] : [e.circle, e.a, e.b]),
  refSpecs: (e) => {
    const specs: RefSpec[] = [
      { field: 'circle', role: 'circle' },
      { field: 'a', role: 'point' },
      { field: 'b', role: 'point' },
    ];
    if (e.ref) specs.push({ field: 'ref', role: 'point' });
    return specs;
  },
  emit: (e, ctx) => [{
    role: 'primary',
    object: emitPointObject(ctx.resolveId(e.name), e.name, {
      kind: 'onArc',
      circle: ctx.resolveId(e.circle),
      a: ctx.resolveId(e.a),
      b: ctx.resolveId(e.b),
      mode: e.mode,
      t: e.t,
      ...(e.ref ? { ref: ctx.resolveId(e.ref) } : {}),
    }),
  }],
});
