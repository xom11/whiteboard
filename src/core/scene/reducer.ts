// src/core/scene/reducer.ts
import type { Draft } from 'immer';
import type { Action, State, SceneObject } from './types';
import { getKind } from './registry';

function collectDependents(state: Draft<State> | State, rootId: string): Set<string> {
  const dependents = new Set<string>([rootId]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const obj of Object.values(state.objects) as SceneObject[]) {
      if (dependents.has(obj.id)) continue;
      let kindDef;
      try { kindDef = getKind(obj.kind); } catch { continue; }
      const refs = kindDef.dependsOn(obj.attrs as never);
      if (refs.some(r => dependents.has(r))) {
        dependents.add(obj.id);
        grew = true;
      }
    }
  }
  return dependents;
}

export function reduce(draft: Draft<State>, action: Action): void {
  switch (action.type) {
    case 'ADD': {
      const { obj } = action.payload;
      if (draft.objects[obj.id]) throw new Error(`[scene] id "${obj.id}" đã tồn tại`);
      const kindDef = getKind(obj.kind);
      kindDef.validate?.(obj.attrs as never);
      draft.objects[obj.id] = obj;
      draft.order.push(obj.id);
      draft.counter += 1;
      return;
    }
    case 'UPDATE': {
      const { id, patch } = action.payload;
      const obj = draft.objects[id];
      if (!obj) return;
      Object.assign(obj, patch);
      return;
    }
    case 'UPDATE_ATTRS': {
      const { id, patch } = action.payload;
      const obj = draft.objects[id];
      if (!obj) return;
      const kindDef = getKind(obj.kind);
      const nextAttrs = { ...(obj.attrs as object), ...patch };
      kindDef.validate?.(nextAttrs as never);
      obj.attrs = nextAttrs;
      return;
    }
    case 'DELETE': {
      const { id } = action.payload;
      if (!draft.objects[id]) return;
      const toDelete = collectDependents(draft, id);
      for (const delId of toDelete) {
        delete draft.objects[delId];
      }
      draft.order = draft.order.filter(x => !toDelete.has(x));
      return;
    }
    case 'RESET': {
      draft.objects = {};
      draft.order = [];
      draft.counter = 0;
      return;
    }
    case 'LOAD': {
      const { state } = action.payload;
      draft.objects = { ...state.objects };
      draft.order = [...state.order];
      draft.counter = state.counter;
      draft.meta = { ...state.meta };
      return;
    }
    case 'TRANSACTION': {
      for (const sub of action.payload.actions) {
        reduce(draft, sub);
      }
      return;
    }
  }
}
