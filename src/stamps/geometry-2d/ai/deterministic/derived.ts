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

  // Track kind đã thực sự push vào state — base for matched labels.
  // Why: tránh false positive khi keyword xuất hiện trong prompt nhưng
  // extractRequirements không nhận diện được phrasing (vd "E, F lần lượt
  // là hình chiếu của M lên AB, AD") → không emit point nào nhưng label
  // 'altitude' vẫn được push → confidence tăng giả tạo → fast-path hit
  // với DSL thiếu point.
  const addedPointKinds = new Set<string>();
  const addedShapeKinds = new Set<string>();

  for (const stub of ex.points) {
    if (state.points.some((p) => p.name === stub.name)) continue;
    state.points.push({ name: stub.name, kind: stub.kind, ...stub.fields } as DslPointT);
    addedPointKinds.add(stub.kind);
  }
  for (const stub of ex.shapes) {
    if (state.shapes.some((s) => s.name === stub.name)) continue;
    state.shapes.push({ name: stub.name, kind: stub.kind, ...stub.fields } as DslShapeT);
    addedShapeKinds.add(stub.kind);
  }

  // Map kind → label, chỉ push khi entity tương ứng thực sự đã được thêm.
  if (addedPointKinds.has('midpoint')) state.matched.push('midpoint');
  if (addedPointKinds.has('onSegment')) state.matched.push('on-segment');
  if (addedPointKinds.has('perpFoot')) state.matched.push('altitude');
  if (addedPointKinds.has('centroid')) state.matched.push('centroid');
  if (addedPointKinds.has('orthocenter')) state.matched.push('orthocenter');
  if (addedPointKinds.has('circumcenter')) state.matched.push('circumscribed');
  if (addedPointKinds.has('incenter')) state.matched.push('inscribed');
  if (addedPointKinds.has('tangencyPoint')) state.matched.push('inscribed');
  if (addedPointKinds.has('tangentPointExt')) state.matched.push('tangent');
  if (addedShapeKinds.has('circle3')) state.matched.push('circumscribed');
  if (addedShapeKinds.has('incircle')) state.matched.push('inscribed');
  if (addedShapeKinds.has('tangent')) state.matched.push('tangent');
  if (addedShapeKinds.has('angleBisector')) state.matched.push('bisector');
  if (addedShapeKinds.has('perpBisector')) state.matched.push('bisector');
  if (addedShapeKinds.has('parallel')) state.matched.push('parallel');
  if (addedShapeKinds.has('perpendicular')) state.matched.push('perpendicular');
}
