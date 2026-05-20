import type { CollectedArg } from '../spec';
import type { Store, SceneObject } from '../../../../../core/scene';
import { nextLabel } from '../../../../../core/scene';
import { ensurePoint } from './_ensurePoint';

function makeDerivedId(store: Store, prefix: string): string {
  return `${prefix}${store.getState().counter + 1}`;
}

function addDerived(
  store: Store,
  kind: string,
  prefix: string,
  attrs: Record<string, unknown>,
): string {
  const id = makeDerivedId(store, prefix);
  const label = nextLabel(store.getState(), kind);
  const obj: SceneObject = {
    id,
    kind,
    label,
    visible: true,
    locked: false,
    layer: 'default',
    schemaVersion: 1,
    attrs,
  };
  store.dispatch({ type: 'ADD', payload: { obj } });
  return id;
}

export function buildSegment(args: CollectedArg[], store: Store): string | null {
  if (args.length < 2 || !args[0].hit || !args[1].hit) return null;
  const p1 = ensurePoint(args[0].hit, store);
  const p2 = ensurePoint(args[1].hit, store);
  if (!p1 || !p2 || p1 === p2) return null;
  return addDerived(store, 'segment3d', 's', { p1, p2 });
}

export function buildLine(args: CollectedArg[], store: Store): string | null {
  if (args.length < 2 || !args[0].hit || !args[1].hit) return null;
  const p1 = ensurePoint(args[0].hit, store);
  const p2 = ensurePoint(args[1].hit, store);
  if (!p1 || !p2 || p1 === p2) return null;
  return addDerived(store, 'line3d', 'l', { p1, p2 });
}

export function buildRay(args: CollectedArg[], store: Store): string | null {
  if (args.length < 2 || !args[0].hit || !args[1].hit) return null;
  const origin = ensurePoint(args[0].hit, store);
  const through = ensurePoint(args[1].hit, store);
  if (!origin || !through || origin === through) return null;
  return addDerived(store, 'ray3d', 'r', { origin, through });
}

export function buildVector(args: CollectedArg[], store: Store): string | null {
  if (args.length < 2 || !args[0].hit || !args[1].hit) return null;
  const from = ensurePoint(args[0].hit, store);
  const to = ensurePoint(args[1].hit, store);
  if (!from || !to || from === to) return null;
  return addDerived(store, 'vector3d', 'v', { from, to });
}
