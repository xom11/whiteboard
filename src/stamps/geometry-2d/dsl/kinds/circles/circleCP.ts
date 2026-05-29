// src/stamps/geometry-2d/dsl/kinds/circles/circleCP.ts
import { z } from 'zod';
import { NameZ } from '../../names';
import type { DslShapeT } from '../../schema';
import type { DslKindModule } from '../_types';

type Input = Extract<DslShapeT, { kind: 'circleCP' }>;

export const circleCPModule: DslKindModule<'circleCP', Input> = {
  kind: 'circleCP',
  role: 'circle',
  category: 'circles',
  prefix: '',
  schema: z.object({
    name: NameZ,
    kind: z.literal('circleCP'),
    center: NameZ,
    surfacePoint: NameZ,
  }),
  collectRefs: (e) => [e.center, e.surfacePoint],
  emit: () => {
    throw new Error('circleCP.emit: not yet migrated (Phase 5 / Task 9)');
  },
};
