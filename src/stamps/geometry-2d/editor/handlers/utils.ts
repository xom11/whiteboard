import type { HandlerCtx } from './ctx';

export type SceneObj = {
  id: string;
  kind: string;
  label: string;
  visible: boolean;
  locked: boolean;
  layer: string;
  schemaVersion: number;
  attrs: Record<string, unknown>;
};

export function freshId(ctx: HandlerCtx, prefix: string): string {
  const counter = ctx.store.getState().counter;
  // Loop until unique (counter is monotonic but ids may have been deleted/reused
  // in non-trivial scenarios; safer to probe).
  let n = counter + 1;
  let id = `${prefix}_${n}`;
  const objs = ctx.store.getState().objects;
  while (id in objs) {
    n += 1;
    id = `${prefix}_${n}`;
  }
  return id;
}

export function mkSceneObj(
  id: string,
  kind: string,
  label: string,
  attrs: Record<string, unknown>,
): SceneObj {
  return {
    id,
    kind,
    label,
    visible: true,
    locked: false,
    layer: 'default',
    schemaVersion: 1,
    attrs,
  };
}

/** Tạo point free + dispatch ADD; trả về scene id mới. */
export function dispatchAddFreePoint(ctx: HandlerCtx, x: number, y: number): string {
  const id = freshId(ctx, 'p');
  const label = ctx.nextLabel('point');
  const obj = mkSceneObj(id, 'point', label, { constraint: { kind: 'free', x, y } });
  ctx.store.dispatch({ type: 'ADD', payload: { obj } });
  return id;
}

/** Tạo intersection point + dispatch ADD; trả về scene id mới. */
export function dispatchAddIntersection(
  ctx: HandlerCtx,
  attrs: Record<string, unknown>,
): string {
  const id = freshId(ctx, 'X');
  const label = ctx.nextLabel('intersection');
  const obj = mkSceneObj(id, 'intersection', label, attrs);
  ctx.store.dispatch({ type: 'ADD', payload: { obj } });
  return id;
}
