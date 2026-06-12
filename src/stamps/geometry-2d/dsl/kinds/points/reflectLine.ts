// src/stamps/geometry-2d/dsl/kinds/points/reflectLine.ts
import { z } from 'zod';
import { NameZ } from '../../names';
import type { DslPointT } from '../../schema';
import { defineModule } from '../_types';
import { emitPointObject } from '../_shared';

type Input = Extract<DslPointT, { kind: 'reflectLine' }>;

export const reflectLineModule = defineModule<'reflectLine', Input>({
  kind: 'reflectLine',
  role: 'point',
  category: 'points',
  prefix: 'p',
  schema: z.object({ name: NameZ, kind: z.literal('reflectLine'), of: NameZ, through: NameZ }),
  collectRefs: (e) => [e.of, e.through],
  refSpecs: [
    { field: 'of', role: 'point' },
    { field: 'through', role: 'line-like' },
  ],
  emit: (e, ctx) => [{
    role: 'primary',
    object: emitPointObject(ctx.resolveId(e.name), e.name, {
      kind: 'transformed',
      source: ctx.resolveId(e.of),
      transform: { kind: 'reflectLine', line: ctx.resolveId(e.through) },
    }),
  }],
});
