// src/core/scene/render/JxgRenderer.ts
import type { Store } from '../store';
import type { State, SceneObject, RenderCtx } from '../types';
import { getKind } from '../registry';
import { DEFAULT_THEME_2D, type Theme2D } from './types2d';

export type JxgRendererOptions = { theme?: Theme2D };

export class JxgRenderer {
  private board: unknown;
  private store: Store;
  private theme: Theme2D;
  private elements = new Map<string, unknown>();
  private unsubscribe: () => void;
  private disposed = false;

  constructor(store: Store, board: unknown, options: JxgRendererOptions = {}) {
    this.store = store;
    this.board = board;
    this.theme = options.theme ?? DEFAULT_THEME_2D;
    this.unsubscribe = store.subscribe((next, prev) => this.applyDiff(prev, next));
    // Render state hiện tại (vd LOAD chạy trước khi subscribe).
    this.applyDiff(undefined, store.getState());
  }

  private ctx(): RenderCtx {
    return {
      jxg: this.board,
      resolveRef: (id: string) => {
        const el = this.elements.get(id);
        if (!el) throw new Error(`[scene/2d] resolveRef: chưa render id="${id}"`);
        return el;
      },
      defaults: { theme: this.theme },
    };
  }

  private create(obj: SceneObject): void {
    try {
      const def = getKind(obj.kind);
      const el = def.render(obj, this.ctx());
      this.elements.set(obj.id, el);
    } catch (err) {
      console.warn(`[scene/render/2d] không render được ${obj.kind} id="${obj.id}":`, err);
    }
  }

  private remove(id: string): void {
    const el = this.elements.get(id);
    if (!el) return;
    try {
      (this.board as { removeObject?: (e: unknown) => void }).removeObject?.(el);
    } catch (err) {
      console.warn(`[scene/render/2d] không remove được id="${id}":`, err);
    }
    this.elements.delete(id);
  }

  private applyDiff(prev: State | undefined, next: State): void {
    if (this.disposed) return;
    const prevObjs = prev?.objects ?? {};
    const nextObjs = next.objects;

    // Xoá ids biến mất.
    for (const id of Object.keys(prevObjs)) {
      if (!(id in nextObjs)) this.remove(id);
    }

    // Thêm/cập nhật theo state.order — đảm bảo refs có trước.
    for (const id of next.order) {
      const cur = nextObjs[id];
      const old = prevObjs[id] as SceneObject | undefined;
      if (!old) {
        this.create(cur);
        continue;
      }
      if (Object.is(old, cur)) continue;
      const def = getKind(cur.kind);
      const existing = this.elements.get(id);
      if (def.update && existing) {
        try { def.update(cur, old, this.ctx(), existing); continue; }
        catch (err) { console.warn(`[scene/render/2d] update fail, recreate:`, err); }
      }
      this.remove(id);
      this.create(cur);
    }
  }

  dispose(): void {
    if (this.disposed) return;
    this.unsubscribe();
    for (const id of Array.from(this.elements.keys())) this.remove(id);
    this.disposed = true;
  }
}
