// src/stamps/geometry-2d/dsl/kinds/points/perpFoot.ts
import { z } from 'zod';
import { NameZ } from '../../names';
import type { DslPointT } from '../../schema';
import { defineModule } from '../_types';
import { emitPointObject } from '../_shared';

type Input = Extract<DslPointT, { kind: 'perpFoot' }>;

export const perpFootModule = defineModule<'perpFoot', Input>({
  kind: 'perpFoot',
  role: 'point',
  category: 'points',
  prefix: 'p',
  schema: z.object({
    name: NameZ,
    kind: z.literal('perpFoot'),
    from: NameZ,
    onLine: NameZ,
  }),
  collectRefs: (e) => [e.from, e.onLine],
  refSpecs: [
    { field: 'from', role: 'point' },
    { field: 'onLine', role: 'line-like' },
  ],
  emit: (e, ctx) => [{
    role: 'primary',
    object: emitPointObject(
      ctx.resolveId(e.name),
      e.name,
      { kind: 'perpFoot', from: ctx.resolveId(e.from), onLine: ctx.resolveId(e.onLine) },
    ),
  }],
});
