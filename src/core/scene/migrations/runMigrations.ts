// src/core/scene/migrations/runMigrations.ts
import { getKind } from '../registry';
import type { State, SceneObject } from '../types';
import { listStateMigrations, CURRENT_STATE_VERSION } from './state';

export function migrateState(raw: any): State {
  if (!raw || typeof raw !== 'object') throw new Error('[scene] invalid state shape');
  let state = raw;

  const currentVersion: number = state.meta?.version ?? 1;
  const stateMigs = listStateMigrations();
  for (let v = currentVersion + 1; v <= Math.max(CURRENT_STATE_VERSION, ...stateMigs.keys()); v++) {
    const fn = stateMigs.get(v);
    if (fn) state = fn(state);
  }

  const migratedObjects: Record<string, SceneObject> = {};
  for (const [id, obj] of Object.entries<any>(state.objects ?? {})) {
    const def = getKind(obj.kind);
    let cur = obj;
    while ((cur.schemaVersion ?? 0) < def.schemaVersion) {
      const next = (cur.schemaVersion ?? 0) + 1;
      const mig = def.migrate[next];
      if (!mig) throw new Error(`[scene] missing migration cho ${obj.kind} v${next}`);
      cur = mig(cur);
      cur.schemaVersion = next;
    }
    if ((cur.schemaVersion ?? 0) !== def.schemaVersion) {
      throw new Error(
        `[scene] missing migration cho ${obj.kind}: stored v${cur.schemaVersion ?? 0}, current v${def.schemaVersion}`,
      );
    }
    migratedObjects[id] = cur;
  }

  return {
    objects: migratedObjects,
    order: state.order ?? [],
    counter: state.counter ?? 0,
    meta: state.meta ?? { domain: '3d', version: CURRENT_STATE_VERSION },
  };
}
