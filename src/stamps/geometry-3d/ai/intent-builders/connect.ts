import type { IntentBuilder3D } from './_types';
import { addShape3dObj, resolveId } from './_types';
import { nextLabel } from '../../../../core/scene';

export const buildConnect: IntentBuilder3D = (s, intent) => {
  if (intent.op !== 'connect') return;
  const p1 = resolveId(s, intent.from);
  const p2 = resolveId(s, intent.to);
  const kind =
    intent.style === 'line' ? 'line3d'
    : intent.style === 'ray' ? 'ray3d'
    : 'segment3d';
  const label = nextLabel(s.store.getState(), kind);
  addShape3dObj(s, kind, 'l', label, { p1, p2 }, true, false);
};
