// src/stamps/geometry-2d/dsl/kinds/points/perpFoot.ts
import { z } from 'zod';
import { NameZ } from '../../names';
import type { DslPointT } from '../../schema';
import type { DslKindModule } from '../_types';

type Input = Extract<DslPointT, { kind: 'perpFoot' }>;

export const perpFootModule: DslKindModule<'perpFoot', Input> = {
  kind: 'perpFoot',
  role: 'point',
  category: 'points',
  prefix: '',
  schema: z.object({
    name: NameZ,
    kind: z.literal('perpFoot'),
    from: NameZ,
    onLine: NameZ,
  }),
  collectRefs: (e) => [e.from, e.onLine],
  emit: () => {
    throw new Error('perpFoot.emit: not yet migrated (Phase 5 / Task 8)');
  },
};
