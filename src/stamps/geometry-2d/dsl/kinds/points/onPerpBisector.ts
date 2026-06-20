// src/stamps/geometry-2d/dsl/kinds/points/onPerpBisector.ts
//
// Điểm tự do TRÊN trung trực của (p1, p2) — glider, offset `t` so với trung điểm
// (mặc định lệch để không trùng tâm). Dùng cho "đường tròn qua 2 điểm": tâm nằm
// trên trung trực ⇒ centerThrough(tâm, p1) đi qua CẢ p1 lẫn p2.
import { z } from 'zod';
import { NameZ } from '../../names';
import type { DslPointT } from '../../schema';
import { defineModule } from '../_types';
import { emitPointObject } from '../_shared';

type Input = Extract<DslPointT, { kind: 'onPerpBisector' }>;

export const onPerpBisectorModule = defineModule<'onPerpBisector', Input>({
  kind: 'onPerpBisector',
  role: 'point',
  category: 'points',
  prefix: 'p',
  schema: z.object({
    name: NameZ,
    kind: z.literal('onPerpBisector'),
    p1: NameZ,
    p2: NameZ,
    t: z.number().optional(),
  }),
  collectRefs: (e) => [e.p1, e.p2],
  refSpecs: [{ field: 'p1', role: 'point' }, { field: 'p2', role: 'point' }],
  emit: (e, ctx) => [{
    role: 'primary',
    object: emitPointObject(ctx.resolveId(e.name), e.name, {
      kind: 'onPerpBisector',
      p1: ctx.resolveId(e.p1),
      p2: ctx.resolveId(e.p2),
      t: e.t ?? 3,
    }),
  }],
});
