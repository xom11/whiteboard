import type { State } from '../../../core/scene';
import type { ObjectSnapshot } from './MiniBoard.types';

/**
 * Build snapshot từ scene object để PropertiesPopover render. Trả null nếu
 * object kind không hỗ trợ properties panel (vd polygon, angle, …).
 *
 * Pure function — không touch board/JSXGraph state. Caller pass anchorScreen
 * (vị trí pixel mà popover sẽ hiển thị).
 */
export function buildObjectSnapshot(
  state: State,
  id: string,
  anchorScreen: { x: number; y: number },
): ObjectSnapshot | null {
  const obj = state.objects[id];
  if (!obj) return null;
  const k = obj.kind;
  if (k !== 'point' && k !== 'line' && k !== 'circle' && k !== 'segment' && k !== 'ray' && k !== 'vector') {
    return null;
  }
  const a = obj.attrs as Record<string, unknown>;
  const jKind: 'point' | 'line' | 'circle' = k === 'point' ? 'point' : (k === 'circle' ? 'circle' : 'line');
  return {
    id,
    kind: jKind,
    name: obj.label,
    color: (a.color as string) ?? '#0f172a',
    width: (a.width as number) ?? 2,
    dash: (a.dash as number) ?? 0,
    face: (a.face as ObjectSnapshot['face']) ?? 'o',
    showLabel: (a.showLabel as boolean) ?? true,
    showValue: (a.showValue as boolean) ?? false,
    screenCoords: anchorScreen,
  };
}
