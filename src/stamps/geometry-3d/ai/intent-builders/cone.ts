import type { IntentBuilder3D } from './_types';
import { addShape3dObj, resolveId, projectedRadius3d } from './_types';

// Vẽ khối nón qua tâm đáy + đỉnh + bán kính. radius literal (standalone) HOẶC radiusTo
// (điểm trên đường tròn đáy → bán kính phái sinh = khoảng cách ⊥ trục, tính build-time).
export const buildCone: IntentBuilder3D = (s, intent) => {
  if (intent.op !== 'cone') return;
  const baseId = resolveId(s, intent.baseCenter);
  const apexId = resolveId(s, intent.apex);
  const radius = intent.radiusTo != null
    ? projectedRadius3d(s, baseId, apexId, resolveId(s, intent.radiusTo))
    : (intent.radius ?? 0);
  addShape3dObj(s, 'cone3d', 'co', intent.name ?? '', { baseCenter: baseId, apex: apexId, radius }, true, false);
};
