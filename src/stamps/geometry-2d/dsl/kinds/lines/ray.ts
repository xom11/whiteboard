// src/stamps/geometry-2d/dsl/kinds/lines/ray.ts
import { z } from 'zod';
import { NameZ } from '../../names';
import type { DslShapeT } from '../../schema';
import { defineModule } from '../_types';

type Input = Extract<DslShapeT, { kind: 'ray' }>;

export const rayModule = defineModule<'ray', Input>({
  kind: 'ray',
  role: 'ray',
  category: 'lines',
  prefix: 'r',
  schema: z.object({
    name: NameZ,
    kind: z.literal('ray'),
    origin: NameZ,
    through: NameZ,
  }),
  collectRefs: (e) => [e.origin, e.through],
  emit: () => {
    throw new Error('ray.emit: not yet migrated (Phase 5 / Task 9)');
  },
});
