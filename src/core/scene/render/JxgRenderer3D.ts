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
      // State sống cho điểm phái sinh 3D (constraintToWorld đọc toạ độ gốc hiện tại).
      getState: () => this.store.getState(),
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
    // Selection halo phải bị xoá TRƯỚC element gốc (halo tham chiếu parent).
    this.removeHalo(id);
    this.selectedIds.delete(id);
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

  listElements(): Map<string, unknown> {
    return this.elements;
  }

  // Selection halo overlay (3D): multi-select, halo phía sau element gốc cho
  // các kind đơn giản (point3d, segment/line/ray/vector). Các composite shape
  // (polyhedron/cone/cylinder/plane) chưa hỗ trợ halo overlay — bỏ qua.
  private selectedIds: Set<string> = new Set();
  private haloMap: Map<string, unknown[]> = new Map();

  highlight(ids: string | string[] | null): void {
    if (this.disposed) return;
    const newIds = new Set<string>(
      ids == null ? [] : Array.isArray(ids) ? ids : [ids],
    );
    for (const id of this.selectedIds) {
      if (!newIds.has(id)) this.removeHalo(id);
    }
    for (const id of newIds) {
      if (!this.selectedIds.has(id) && this.elements.has(id)) this.addHalo(id);
    }
    this.selectedIds = newIds;
    try {
      (this.view as { update?: () => void }).update?.();
    } catch { /* ignore */ }
  }

  private removeHalo(id: string): void {
    const halos = this.haloMap.get(id);
    if (!halos) return;
    const view = this.view as { removeObject?: (e: unknown) => void };
    for (const h of halos) {
      try { view.removeObject?.(h); } catch { /* ignore */ }
    }
    this.haloMap.delete(id);
  }

  private addHalo(id: string): void {
    const el = this.elements.get(id) as
      | {
          elType?: string;
          getAttribute?: (k: string) => unknown;
          point1?: unknown;
          point2?: unknown;
          element2D?: { X?: () => number; Y?: () => number };
        }
      | undefined;
    if (!el) return;
    const view = this.view as {
      create?: (kind: string, parents: unknown[], attrs?: unknown) => unknown;
    };
    if (!view.create) return;

    const SEL_STROKE = '#475569';
    const SEL_FILL = '#cbd5e1';
    const haloBase = {
      strokeColor: SEL_STROKE,
      strokeOpacity: 0.55,
      fillColor: SEL_FILL,
      fillOpacity: 0.3,
      fixed: true,
      withLabel: false,
      name: '',
      highlight: false,
      needsRegularUpdate: true,
    };
    const halos: unknown[] = [];
    try {
      switch (el.elType) {
        case 'point3d': {
          // 3D point: tạo point3d ở cùng coords với size to + gray. Lấy coords
          // qua element2D.X/Y (JSXGraph 3D nội bộ chiếu xuống 2D plane), nhưng
          // an toàn nhất là reference element gốc và đọc Z() / coords() runtime.
          const elAny = el as unknown as {
            X?: () => number; Y?: () => number; Z?: () => number;
            getAttribute?: (k: string) => unknown;
          };
          const baseSize = (elAny.getAttribute?.('size') as number | undefined) ?? 4;
          if (typeof elAny.X === 'function' && typeof elAny.Y === 'function' && typeof elAny.Z === 'function') {
            const halo = view.create('point3d', [
              () => elAny.X?.() ?? 0,
              () => elAny.Y?.() ?? 0,
              () => elAny.Z?.() ?? 0,
            ], {
              ...haloBase,
              size: baseSize + 6,
              face: 'o',
              strokeWidth: 2,
              strokeOpacity: 0.75,
              fillOpacity: 0.25,
            });
            halos.push(halo);
          }
          break;
        }
        case 'line3d': {
          if (el.point1 && el.point2) {
            const halo = view.create('line3d', [el.point1, el.point2], {
              ...haloBase,
              strokeWidth: 9,
              straightFirst: (el.getAttribute?.('straightFirst') as boolean | undefined) ?? false,
              straightLast: (el.getAttribute?.('straightLast') as boolean | undefined) ?? false,
            });
            halos.push(halo);
          }
          break;
        }
        default:
          // Composite/plane/sphere/cone/cylinder/polygon3d/polyhedron3d:
          // halo overlay khó (composite faces, depth ordering) — bỏ qua.
          // Selection visible qua ObjectListPanel row highlight thay vì
          // halo trên canvas.
          break;
      }
    } catch (err) {
      console.warn('[scene/render/3d] halo create fail:', err);
    }
    if (halos.length) this.haloMap.set(id, halos);
  }
}
