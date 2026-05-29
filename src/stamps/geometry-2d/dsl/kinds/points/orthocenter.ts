// src/stamps/geometry-2d/dsl/kinds/points/orthocenter.ts
import { z } from 'zod';
import { NameZ } from '../../names';
import type { DslPointT } from '../../schema';
import type { DslKindModule } from '../_types';

type Input = Extract<DslPointT, { kind: 'orthocenter' }>;

export const orthocenterModule: DslKindModule<'orthocenter', Input> = {
  kind: 'orthocenter',
  role: 'point',
  category: 'points',
  prefix: '',
  schema: z.object({
    name: NameZ,
    kind: z.literal('orthocenter'),
    vertices: z.tuple([NameZ, NameZ, NameZ]),
  }),
  collectRefs: (e) => [...e.vertices],
  emit: () => {
    throw new Error('orthocenter.emit: not yet migrated (Phase 5 / Task 8)');
  },
};
