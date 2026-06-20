// src/stamps/geometry-3d/editor/scene/constraintMath.ts
// Re-export từ core. constraintToWorld/worldToConstraint ĐÃ CHUYỂN về
// core/scene/kinds/constraint3d-math.ts (toán thuần trên type core) để
// point3d.render (core) dùng được mà KHÔNG vi phạm layering core→stamps.
// Giữ nguyên đường import cũ cho usePointDrag / tools / hitTest / geometryChecks / tests.
export { constraintToWorld, worldToConstraint, type Vec3 } from '../../../../core/scene/kinds/constraint3d-math';
