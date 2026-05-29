// src/stamps/geometry-2d/dsl/kinds/points/circumcenter.ts
import { z } from 'zod';
import { NameZ } from '../../names';
import type { DslPointT } from '../../schema';
import { defineModule } from '../_types';

type Input = Extract<DslPointT, { kind: 'circumcenter' }>;

export const circumcenterModule = defineModule<'circumcenter', Input>({
  kind: 'circumcenter',
  role: 'point',
  category: 'points',
  prefix: 'p',
  schema: z.object({
    name: NameZ,
    kind: z.literal('circumcenter'),
    vertices: z.tuple([NameZ, NameZ, NameZ]),
  }),
  collectRefs: (e) => [...e.vertices],
  emit: () => {
    throw new Error('circumcenter.emit: not yet migrated (Phase 5 / Task 8)');
  },
});
