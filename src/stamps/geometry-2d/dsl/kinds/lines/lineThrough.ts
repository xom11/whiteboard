// src/stamps/geometry-2d/dsl/kinds/lines/lineThrough.ts
//
// Đường thẳng qua ≥2 điểm đồng tuyến (vd 3 tâm Euler G/H/O). Render là đường
// VÔ HẠN qua 2 điểm xa nhau nhất (ổn định số học). Kind tổng quát role
// 'lineConstruction' — tái dùng cho Euler line (issue #47) và sau này Simson.
import { z } from 'zod';
import { NameZ } from '../../names';
import type { DslShapeT } from '../../schema';
import { defineModule } from '../_types';
import type { RefSpec } from '../_types';
import { SHAPE_BASE_FIELDS } from '../_shared';

type Input = Extract<DslShapeT, { kind: 'lineThrough' }>;

export const lineThroughModule = defineModule<'lineThrough', Input>({
  kind: 'lineThrough',
  role: 'lineConstruction',
  category: 'lines',
  prefix: 'l',
  schema: z.object({
    name: NameZ,
    kind: z.literal('lineThrough'),
    points: z.array(NameZ).min(2),
  }),
  collectRefs: (e) => [...e.points],
  refSpecs: [{ field: 'points', role: 'point', many: true }] as readonly RefSpec[],
  emit: (e, ctx) => [{
    role: 'primary',
    object: {
      id: ctx.resolveId(e.name),
      kind: 'line',
      label: e.name,
      ...SHAPE_BASE_FIELDS,
      attrs: {
        construction: {
          kind: 'lineThrough',
          points: e.points.map((p) => ctx.resolveId(p)),
        },
      },
    },
  }],
});
