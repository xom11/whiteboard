// src/stamps/geometry-2d/dsl/kinds/lines/parallel.ts
import { z } from 'zod';
import { NameZ } from '../../names';
import type { DslShapeT } from '../../schema';
import { defineModule } from '../_types';

type Input = Extract<DslShapeT, { kind: 'parallel' }>;

export const parallelModule = defineModule<'parallel', Input>({
  kind: 'parallel',
  role: 'lineConstruction',
  category: 'lines',
  prefix: 'l',
  schema: z.object({
    name: NameZ,
    kind: z.literal('parallel'),
    throughPoint: NameZ,
    toLine: NameZ,
  }),
  collectRefs: (e) => [e.throughPoint, e.toLine],
  emit: () => {
    throw new Error('parallel.emit: not yet migrated (Phase 5 / Task 9)');
  },
});
