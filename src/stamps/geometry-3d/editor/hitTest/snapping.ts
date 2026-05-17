import { constraintToWorld } from '../scene/constraintMath';
import type { Scene3D } from '../scene/Scene3D';
import type { View3DLike } from './rayCast';

export function findSnapPoint(
  screen: { x: number; y: number },
  view: View3DLike,
  scene: Scene3D,
  pixelRadius = 8,
): string | null {
  let best: { id: string; d2: number } | null = null;
  const r2 = pixelRadius * pixelRadius;
  for (const obj of scene.list()) {
    if (obj.kind !== 'point') continue;
    if (!obj.visible) continue;
    const world = constraintToWorld(obj.constraint, scene);
    const proj = view.project3DTo2D?.(world[0], world[1], world[2]);
    if (!proj) continue;
    const dx = proj[1] - screen.x;
    const dy = proj[2] - screen.y;
    const d2 = dx * dx + dy * dy;
    if (d2 <= r2 && (best === null || d2 < best.d2)) {
      best = { id: obj.id, d2 };
    }
  }
  return best?.id ?? null;
}
