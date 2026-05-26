import { constraintToWorld } from '../scene/constraintMath';
import type { State } from '../../../../core/scene';
import { listObjects } from '../../../../core/scene';
import type { Point3DAttrs } from '../../../../core/scene/kinds/point3d';
import type { View3DLike } from './rayCast';

export function findSnapPoint(
  screen: { x: number; y: number },
  view: View3DLike,
  state: State,
  pixelRadius = 8,
): string | null {
  // `screen` arrives in JSXGraph user-space (pixelToUser-converted in MiniBoard3D),
  // and project3DTo2D also returns user-space. Convert the desired pixel radius
  // to user units via the board's px-per-unit scale so the snap stays small
  // (a few real pixels) regardless of zoom or board size.
   
  const board = (view as any)?.board;
  // Fallback to 1 (no scaling) when board is missing — keeps unit tests, whose
  // mock view emits pixel-space coords directly, working unchanged.
  const ux = typeof board?.unitX === 'number' && board.unitX > 0 ? board.unitX : 1;
  const uy = typeof board?.unitY === 'number' && board.unitY > 0 ? board.unitY : ux;
  const rxUser = pixelRadius / ux;
  const ryUser = pixelRadius / uy;
  let best: { id: string; d2: number } | null = null;
  for (const obj of listObjects(state)) {
    if (obj.kind !== 'point3d') continue;
    if (!obj.visible) continue;
    const attrs = obj.attrs as Point3DAttrs;
    const world = constraintToWorld(attrs.constraint, state);
    const proj = view.project3DTo2D?.(world[0], world[1], world[2]);
    if (!proj) continue;
    const dxN = (proj[1] - screen.x) / rxUser;
    const dyN = (proj[2] - screen.y) / ryUser;
    const d2 = dxN * dxN + dyN * dyN;
    if (d2 <= 1 && (best === null || d2 < best.d2)) {
      best = { id: obj.id, d2 };
    }
  }
  return best?.id ?? null;
}
