// src/stamps/geometry-2d/dsl/kinds/points/incenter.ts
import { z } from 'zod';
import { NameZ } from '../../names';
import type { DslPointT } from '../../schema';
import type { DslKindModule } from '../_types';

type Input = Extract<DslPointT, { kind: 'incenter' }>;

export const incenterModule: DslKindModule<'incenter', Input> = {
  kind: 'incenter',
  role: 'point',
  category: 'points',
  prefix: '',
  schema: z.object({
    name: NameZ,
    kind: z.literal('incenter'),
    vertices: z.tuple([NameZ, NameZ, NameZ]),
  }),
  collectRefs: (e) => [...e.vertices],
  emit: () => {
    throw new Error('incenter.emit: not yet migrated (Phase 5 / Task 8)');
  },
};
