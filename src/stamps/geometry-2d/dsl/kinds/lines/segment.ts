// src/stamps/geometry-2d/dsl/kinds/lines/segment.ts
import { z } from 'zod';
import { NameZ } from '../../names';
import type { DslShapeT } from '../../schema';
import { defineModule } from '../_types';
import { SHAPE_BASE_FIELDS } from '../_shared';

type Input = Extract<DslShapeT, { kind: 'segment' }>;

export const segmentModule = defineModule<'segment', Input>({
  kind: 'segment',
  role: 'segment',
  category: 'lines',
  prefix: 's',
  schema: z.object({
    name: NameZ,
    kind: z.literal('segment'),
    p1: NameZ,
    p2: NameZ,
  }),
  collectRefs: (e) => [e.p1, e.p2],
  emit: (e, ctx) => [{
    role: 'primary',
    object: {
      id: ctx.resolveId(e.name),
      kind: 'segment',
      label: e.name,
      ...SHAPE_BASE_FIELDS,
      attrs: { p1: ctx.resolveId(e.p1), p2: ctx.resolveId(e.p2) },
    },
  }],
});
