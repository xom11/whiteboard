// src/stamps/geometry-2d/ai/intent-builders/add-point/externalAngleBisectorFoot.ts
//
// add-point constraint.kind=externalAngleBisectorFoot — phân giác NGOÀI (Issue #46 nhóm A).
// Mirror buildAngleBisectorFoot, nhưng phân giác ngoài = đường VUÔNG GÓC với phân
// giác trong tại đỉnh `from`. Multi-emit:
//   1. angleBisector shape (phân giác TRONG — helper, làm cơ sở dựng);
//   2. perpendicular shape qua `from`, ⊥ phân giác trong = phân giác NGOÀI;
//   3. ensureSegment(onLine) — cạnh đối (kéo dài) để giao;
//   4. intersection point = phân giác ngoài ∩ đường thẳng cạnh đối.

import type { BuildState } from '../_types';
import { IntentBuilderError } from '../_types';
import { addPoint, addShape, ensureSegment, parseEnds, resolveSegmentRef, uniqueShapeName } from '../shared';
import type { AddPointIntentT } from '../../intent';

export const buildExternalAngleBisectorFoot = (s: BuildState, intent: AddPointIntentT): void => {
  const c = intent.constraint;
  if (c.kind !== 'externalAngleBisectorFoot') return;
  const name = intent.name;
  const ends = parseEnds(c.onLine);
  if (!ends) throw new IntentBuilderError(`externalAngleBisectorFoot.onLine không parse: ${c.onLine}`, intent);
  // Phân giác trong (helper, cơ sở dựng phân giác ngoài).
  const bisName = uniqueShapeName(s, `ab_${c.from}${c.onLine}`);
  addShape(s, { name: bisName, kind: 'angleBisector', p1: ends[0], vertex: c.from, p2: ends[1] });
  // Phân giác ngoài = đường vuông góc với phân giác trong tại đỉnh `from`.
  const extName = uniqueShapeName(s, `abx_${c.from}${c.onLine}`);
  addShape(s, { name: extName, kind: 'perpendicular', throughPoint: c.from, toLine: bisName });
  ensureSegment(s, ends[0], ends[1]);
  addPoint(s, { name, kind: 'intersection', ref1: extName, ref2: resolveSegmentRef(s, c.onLine) });
};
