// point-constraints/registry.ts
import type { PointConstraintModule } from './_types';
// (mỗi batch: import { freeConstraint } from './free'; ... rồi thêm vào ALL)
const ALL: PointConstraintModule[] = [];
export const POINT_CONSTRAINTS: ReadonlyMap<string, PointConstraintModule> =
  new Map(ALL.map((m) => [m.kind, m]));
