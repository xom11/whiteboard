// src/core/scene/render/JxgRenderer3D.ts
import type { Store } from '../store';
import type { State, SceneObject, RenderCtx } from '../types';
import { getKind } from '../registry';
import { DEFAULT_THEME_3D, type Theme3D } from './types';

export type JxgRenderer3DOptions = { theme?: Theme3D };

export class JxgRenderer3D {
  private view: unknown;
  private store: Store;
  private theme: Theme3D;
  private elements = new Map<string, unknown>();
  private unsubscribe: () => void;
  private disposed = false;

  constructor(store: Store, view: unknown, options: JxgRenderer3DOptions = {}) {
    this.store = store;
    this.view = view;
    this.theme = options.theme ?? DEFAULT_THEME_3D;
    // Subscribe first, then render current state.
    this.unsubscribe = store.subscribe((next, prev) => this.applyDiff(prev, next));
    // Render initial state (e.g. if LOAD ran before subscribe).
    this.applyDiff(undefined, store.getState());
  }

  private ctx(): RenderCtx {
    return {
      jxg: this.view,
      resolveRef: (id: string) => {
        const el = this.elements.get(id);
        if (el === undefined) {
          throw new Error(`[scene] resolveRef: chưa render id="${id}"`);
        }
        return el;
      },
      defaults: {},
    };
  }

  private create(obj: SceneObject): void {
    try {
      const def = getKind(obj.kind);
      const el = def.render(obj, this.ctx());
      this.elements.set(obj.id, el);
    } catch (err) {
      console.warn(`[scene/render] không render được ${obj.kind} id="${obj.id}":`, err);
    }
  }

  private remove(id: string): void {
    const el = this.elements.get(id);
    if (el === undefined) return;
    try {
      this.removeFromView(el);
    } catch (err) {
      console.warn(`[scene/render] không remove được id="${id}":`, err);
    }
    this.elements.delete(id);
  }

  private removeFromView(el: unknown): void {
    const view = this.view as { removeObject?: (e: unknown) => void };
    if (el && typeof el === 'object') {
      const asObj = el as Record<string, unknown>;
      // Composite shape: { faces: [] } for polyhedron/cylinder/cone.
      if (Array.isArray(asObj['faces'])) {
        for (const face of asObj['faces'] as unknown[]) {
          view.removeObject?.(face);
        }
        // Also remove hidden vertex points if present (_verts).
        if (Array.isArray(asObj['_verts'])) {
          for (const v of asObj['_verts'] as unknown[]) {
            view.removeObject?.(v);
          }
        }
        return;
      }
    }
    view.removeObject?.(el);
  }

  private applyDiff(prev: State | undefined, next: State): void {
    if (this.disposed) return;
    const prevObjs = prev?.objects ?? {};
    const nextObjs = next.objects;

    // Remove ids that disappeared (iterate in order of prev to respect dependencies).
    for (const id of Object.keys(prevObjs)) {
      if (!(id in nextObjs)) {
        this.remove(id);
      }
    }

    // Add or update in next.order (preserves dependency order).
    for (const id of next.order) {
      const cur = nextObjs[id] as SceneObject | undefined;
      if (!cur) continue;
      const old = prevObjs[id] as SceneObject | undefined;
      if (!old) {
        // New object.
        this.create(cur);
        continue;
      }
      if (Object.is(old, cur)) {
        // Unchanged (same Immer reference).
        continue;
      }
      // Changed: try update hook, otherwise remove + recreate.
      let def;
      try { def = getKind(cur.kind); } catch { continue; }
      const existing = this.elements.get(id);
      if (def.update && existing !== undefined) {
        try {
          def.update(cur, old, this.ctx(), existing);
          continue;
        } catch (err) {
          console.warn(`[scene/render] update fail, recreate id="${id}":`, err);
        }
      }
      this.remove(id);
      this.create(cur);
    }
  }

  dispose(): void {
    if (this.disposed) return;
    this.unsubscribe();
    this.disposed = true;
    for (const id of Array.from(this.elements.keys())) {
      this.remove(id);
    }
  }
}
