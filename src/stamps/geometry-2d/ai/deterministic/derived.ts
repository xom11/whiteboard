// src/stamps/geometry-2d/ai/deterministic/derived.ts
//
// Wrap existing extractRequirements() (validator.ts) → mutate skeleton state
// in-place. Adds derived points (midpoint, perpFoot, centroid, ...) and
// supporting segments (e.g. AH for altitude).
//
// Duplicate-name check: if skeleton already has a point/shape with the same
// name, skip injection (skeleton wins — caller may have explicit override).

import type { DslPointT, DslShapeT } from '../../dsl/schema';
import { extractRequirements } from '../validator';

interface DerivedState {
  points: DslPointT[];
  shapes: DslShapeT[];
  matched: string[];
}

export function applyDerived(prompt: string, state: DerivedState): void {
  const ex = extractRequirements(prompt);

  for (const stub of ex.points) {
    if (state.points.some((p) => p.name === stub.name)) continue;
    state.points.push({ name: stub.name, kind: stub.kind, ...stub.fields } as DslPointT);
  }
  for (const stub of ex.shapes) {
    if (state.shapes.some((s) => s.name === stub.name)) continue;
    state.shapes.push({ name: stub.name, kind: stub.kind, ...stub.fields } as DslShapeT);
  }

  if (/trung\s*điểm/i.test(prompt)) state.matched.push('midpoint');
  if (/chân\s+(của\s+)?đường\s+(cao|vuông\s*góc)|hình\s*chiếu\s+vuông\s+góc/i.test(prompt))
    state.matched.push('altitude');
  if (/đường\s*cao\s+[A-Z]{2}/i.test(prompt)) state.matched.push('altitude');
  if (/trung\s*tuyến/i.test(prompt)) state.matched.push('median');
  if (/phân\s*giác/i.test(prompt)) state.matched.push('bisector');
  if (/trọng\s*tâm/i.test(prompt)) state.matched.push('centroid');
  if (/trực\s*tâm/i.test(prompt)) state.matched.push('orthocenter');
  if (/ngoại\s*tiếp/i.test(prompt)) state.matched.push('circumscribed');
  if (/nội\s*tiếp/i.test(prompt)) state.matched.push('inscribed');
  if (/tiếp\s*tuyến/i.test(prompt)) state.matched.push('tangent');
  if (/song\s*song/i.test(prompt)) state.matched.push('parallel');
  if (/vuông\s*góc/i.test(prompt)) state.matched.push('perpendicular');
}
