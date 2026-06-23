import type { IntentBuilder3D } from './_types';
import { addShape3dObj, resolveId, projectedRadius3d } from './_types';

// Vẽ khối trụ qua 2 tâm đáy + bán kính. radius literal (standalone) HOẶC radiusTo
// (điểm trên đường tròn đáy → bán kính phái sinh = khoảng cách ⊥ trục, tính build-time).
export const buildCylinder: IntentBuilder3D = (s, intent) => {
  if (intent.op !== 'cylinder') return;
  const baseId = resolveId(s, intent.baseCenter);
  const topId = resolveId(s, intent.topCenter);
  const radius = intent.radiusTo != null
    ? projectedRadius3d(s, baseId, topId, resolveId(s, intent.radiusTo))
    : (intent.radius ?? 0);
  addShape3dObj(s, 'cylinder3d', 'cy', intent.name ?? '', { baseCenter: baseId, topCenter: topId, radius }, true, false);
};
