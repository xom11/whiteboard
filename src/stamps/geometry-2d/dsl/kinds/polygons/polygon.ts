// src/stamps/geometry-2d/dsl/kinds/polygons/polygon.ts
import { z } from 'zod';
import { NameZ } from '../../names';
import type { DslShapeT } from '../../schema';
import type { DslKindModule } from '../_types';

type Input = Extract<DslShapeT, { kind: 'polygon' }>;

export const polygonModule: DslKindModule<'polygon', Input> = {
  kind: 'polygon',
  role: 'polygon',
  category: 'polygons',
  prefix: '',
  schema: z.object({
    name: NameZ,
    kind: z.literal('polygon'),
    vertices: z.array(NameZ).min(3),
  }),
  collectRefs: (e) => [...e.vertices],
  emit: () => {
    throw new Error('polygon.emit: not yet migrated (Phase 5 / Task 9)');
  },
};
