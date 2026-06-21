import type { IntentBuilder3D } from './_types';
import { addShape3dObj, resolveId } from './_types';

// Vẽ mặt cầu (trong suốt) qua tâm + 1 điểm mặt. registerInNameMap=false:
// mặt cầu không được tham chiếu bởi nhãn (chỉ tâm-điểm mới được ref).
export const buildSphere: IntentBuilder3D = (s, intent) => {
  if (intent.op !== 'sphere') return;
  addShape3dObj(s, 'sphere3d', 'sp', intent.name ?? '', {
    center: resolveId(s, intent.center),
    surfacePoint: resolveId(s, intent.surfacePoint),
  }, true, false);
};
