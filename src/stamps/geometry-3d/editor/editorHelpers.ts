// src/stamps/geometry-3d/editor/editorHelpers.ts
import type { State } from '../../../core/scene';
import type { SceneHit } from './hitTest/hitTest';
import { DEFAULT_VIEW3D } from './theme';
import type { SerializedView3D } from '../serialize';

export function hitToHoverLabel(hit: SceneHit, state: State): string | null {
  if (hit.kind === 'empty') return null;
  if (hit.kind === 'existingPoint') return state.objects[hit.pointId]?.label ?? null;
  if (hit.kind === 'onGround') return 'mặt nền';
  if (hit.kind === 'onAxis') return `trục ${hit.axis.toUpperCase()}`;
  if (hit.kind === 'onPlane') return `mặt phẳng ${hit.planeId}`;
  if (hit.kind === 'onSphere') return `mặt cầu ${hit.sphereId}`;
  return null;
}

export function getView3DInfo(view: unknown): SerializedView3D {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const v = view as any;
  const azSlider = v?.az_slide ?? v?.az;
  const elSlider = v?.el_slide ?? v?.el;
  const azimuth = typeof azSlider?.Value === 'function' ? azSlider.Value() : 0;
  const elevation = typeof elSlider?.Value === 'function' ? elSlider.Value() : 0;
  return {
    azimuth,
    elevation,
    bbox3D: [...DEFAULT_VIEW3D.bbox3D] as [number, number, number, number, number, number],
  };
}
