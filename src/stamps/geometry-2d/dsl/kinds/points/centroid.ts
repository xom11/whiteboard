// src/stamps/geometry-2d/dsl/kinds/points/centroid.ts
import { z } from 'zod';
import { NameZ } from '../../names';
import type { DslPointT } from '../../schema';
import type { DslKindModule } from '../_types';

type Input = Extract<DslPointT, { kind: 'centroid' }>;

export const centroidModule: DslKindModule<'centroid', Input> = {
  kind: 'centroid',
  role: 'point',
  category: 'points',
  prefix: '',
  schema: z.object({
    name: NameZ,
    kind: z.literal('centroid'),
    vertices: z.tuple([NameZ, NameZ, NameZ]),
  }),
  collectRefs: (e) => [...e.vertices],
  emit: () => {
    throw new Error('centroid.emit: not yet migrated (Phase 5 / Task 8)');
  },
};
