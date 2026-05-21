import type { ToolDef, GeomTool } from '../../tools';
import type { HandlerCtx } from '../ctx';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type JxgObj = any;

export function handleSingleTargetTool(
  ctx: HandlerCtx,
  t: GeomTool,
  toolDef: ToolDef,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  e: any,
  bestHit: JxgObj | null,
): boolean {
  if (!(toolDef.needs === 1 && toolDef.accepts)) return false;
  const hit = bestHit ?? ctx.findNearestPointJxg(e, 12);
  if (!hit) {
    ctx.flashWarn('Click vào một đối tượng để áp dụng');
    return true;
  }
  const sid = ctx.jxgIdToSceneId(hit);
  if (!sid) return true;
  if (t === 'delete') {
    ctx.store.dispatch({ type: 'DELETE', payload: { id: sid } });
    return true;
  }
  if (t === 'toggleLabel') {
    const obj = ctx.store.getState().objects[sid];
    if (!obj) return true;
    const cur = (obj.attrs as { showLabel?: boolean }).showLabel;
    const next = !(cur ?? false);
    ctx.store.dispatch({ type: 'UPDATE_ATTRS', payload: { id: sid, patch: { showLabel: next } } });
    return true;
  }
  if (t === 'toggleVisible') {
    const obj = ctx.store.getState().objects[sid];
    if (!obj) return true;
    ctx.store.dispatch({ type: 'UPDATE', payload: { id: sid, patch: { visible: !obj.visible } } });
    return true;
  }
  return true;
}
