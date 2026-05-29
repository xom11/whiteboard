// src/stamps/geometry-2d/dsl/kinds/points/midpoint.ts
import { z } from 'zod';
import { NameZ } from '../../names';
import type { DslPointT } from '../../schema';
import type { DslKindModule } from '../_types';

type Input = Extract<DslPointT, { kind: 'midpoint' }>;

export const midpointModule: DslKindModule<'midpoint', Input> = {
  kind: 'midpoint',
  role: 'point',
  category: 'points',
  prefix: '',
  schema: z.object({
    name: NameZ,
    kind: z.literal('midpoint'),
    p1: NameZ,
    p2: NameZ,
  }),
  collectRefs: (e) => [e.p1, e.p2],
  emit: () => {
    throw new Error('midpoint.emit: not yet migrated (Phase 5 / Task 8)');
  },
};
