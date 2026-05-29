// src/stamps/geometry-2d/dsl/kinds/points/intersection.ts
import { z } from 'zod';
import { NameZ } from '../../names';
import type { DslPointT } from '../../schema';
import type { DslKindModule } from '../_types';

type Input = Extract<DslPointT, { kind: 'intersection' }>;

export const intersectionModule: DslKindModule<'intersection', Input> = {
  kind: 'intersection',
  role: 'point',
  category: 'points',
  prefix: '',
  schema: z.object({
    name: NameZ,
    kind: z.literal('intersection'),
    ref1: NameZ,
    ref2: NameZ,
    branch: z.union([z.literal(0), z.literal(1)]).optional(),
  }),
  collectRefs: (e) => [e.ref1, e.ref2],
  emit: () => {
    throw new Error('intersection.emit: not yet migrated (Phase 5 / Task 8)');
  },
};
