// src/core/scene/selectors.ts
import type { State, SceneObject } from './types';
import { getKind } from './registry';

export function listObjects(state: State): SceneObject[] {
  return state.order
    .map(id => state.objects[id])
    .filter((o): o is SceneObject => o !== undefined);
}

export function byKind(state: State, kind: string): SceneObject[] {
  return listObjects(state).filter(o => o.kind === kind);
}

export function dependentsOf(state: State, rootId: string): Set<string> {
  const result = new Set<string>([rootId]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const obj of Object.values(state.objects)) {
      if (result.has(obj.id)) continue;
      let def;
      try { def = getKind(obj.kind); } catch { continue; }
      const refs = def.dependsOn(obj.attrs as never);
      if (refs.some(r => result.has(r))) {
        result.add(obj.id);
        grew = true;
      }
    }
  }
  return result;
}

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export function nextLabel(state: State, kind: string): string {
  const used = new Set(byKind(state, kind).map(o => o.label));
  for (const c of ALPHABET) if (!used.has(c)) return c;
  let idx = 1;
  while (true) {
    for (const c of ALPHABET) {
      const candidate = `${c}${idx}`;
      if (!used.has(candidate)) return candidate;
    }
    idx += 1;
  }
}
