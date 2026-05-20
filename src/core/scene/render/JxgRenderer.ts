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
      this.attachFreePointDragSync(obj, el);
    } catch (err) {
      console.warn(`[scene/render/2d] không render được ${obj.kind} id="${obj.id}":`, err);
    }
  }

  /**
   * Đồng bộ toạ độ live của free point về scene.constraint khi user kéo bằng
   * tay (Move tool / mobile drag). JSXGraph mutate obj.X()/Y() ngay nhưng
   * constraint vẫn giữ giá trị lúc tạo → serialize sẽ ra SVG y hệt cũ →
   * fileId SHA-256 trùng → Excalidraw bỏ qua refresh. (Regression từ
   * commit f41f366 sau scene v2 port.)
   *
   * Chỉ áp dụng cho free point — glider/intersection/midpoint không drag được
   * trực tiếp (toạ độ derived từ ref khác).
   */
  private attachFreePointDragSync(obj: SceneObject, el: unknown): void {
    if (obj.kind !== 'point') return;
    const c = (obj.attrs as { constraint?: { kind?: string } }).constraint;
    if (!c || c.kind !== 'free') return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const point = el as any;
    if (typeof point.on !== 'function') return;
    const sceneId = obj.id;
    point.on('up', () => {
      if (this.disposed) return;
      if (typeof point.X !== 'function' || typeof point.Y !== 'function') return;
      const x = point.X();
      const y = point.Y();
      if (!Number.isFinite(x) || !Number.isFinite(y)) return;
      const cur = this.store.getState().objects[sceneId];
      if (!cur) return;
      const curC = (cur.attrs as { constraint?: { kind?: string; x?: number; y?: number } }).constraint;
      if (!curC || curC.kind !== 'free') return;
      if (curC.x === x && curC.y === y) return;
      this.store.dispatch({
        type: 'UPDATE_ATTRS',
        payload: { id: sceneId, patch: { constraint: { kind: 'free', x, y } } },
      });
    });
  }

  private remove(id: string): void {
    const el = this.elements.get(id);
    if (!el) return;
    try {
      const helpers = (el as Record<string, unknown>)._helpers;
      // Element chính bị remove trước, sau đó helpers (glider phụ trợ cho
      // tangent ...). Helpers thường là parent của element chính — nếu xoá
      // parent trước, JSXGraph có thể phàn nàn dangling reference.
      (this.board as { removeObject?: (e: unknown) => void }).removeObject?.(el);
      if (Array.isArray(helpers)) {
        for (const h of helpers) {
          try {
            (this.board as { removeObject?: (e: unknown) => void }).removeObject?.(h);
          } catch { /* ignore */ }
        }
      }
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

  private highlightedId: string | null = null;
  private highlightOriginal: { stroke?: string; thick?: number } | null = null;

  highlight(id: string | null): void {
    if (this.disposed) return;
    // Clear previous.
    if (this.highlightedId && this.highlightOriginal) {
      const prev = this.elements.get(this.highlightedId) as
        | { setAttribute?: (a: Record<string, unknown>) => void }
        | undefined;
      try {
        prev?.setAttribute?.(this.highlightOriginal);
      } catch (err) {
        console.warn('[scene/render/2d] highlight restore fail:', err);
      }
    }
    this.highlightedId = null;
    this.highlightOriginal = null;

    if (!id) return;
    const el = this.elements.get(id) as
      | { getAttribute?: (k: string) => unknown; setAttribute?: (a: Record<string, unknown>) => void }
      | undefined;
    if (!el) return;
    try {
      const stroke = (el.getAttribute?.('strokeColor') as string | undefined) ?? '#1e40af';
      const thick = (el.getAttribute?.('strokeWidth') as number | undefined) ?? 2;
      this.highlightOriginal = { stroke, thick };
      el.setAttribute?.({ strokeColor: '#ef4444', strokeWidth: thick + 2 });
      this.highlightedId = id;
    } catch (err) {
      console.warn('[scene/render/2d] highlight apply fail:', err);
    }
  }
}
