// src/core/scene/render/JxgRenderer.ts
import type { Store } from '../store';
import type { State, SceneObject, RenderCtx } from '../types';
import { getKind } from '../registry';
import { DEFAULT_THEME_2D, type Theme2D } from './types2d';
import { collectFreeVars } from '../expressions/parser';

export type JxgRendererOptions = { theme?: Theme2D };

export class JxgRenderer {
  private board: unknown;
  private store: Store;
  private theme: Theme2D;
  private elements = new Map<string, unknown>();
  private unsubscribe: () => void;
  private disposed = false;

  /** Chỉ dùng cho domain='graph2d': parameter.label → parameter.value */
  private paramMap: Record<string, number> = {};
  /** Chỉ dùng cho domain='graph2d': function2d.id → expression string */
  private functionExpr: Record<string, string> = {};

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
        // Synthetic "<polyId>:border:<N>" → polygon.borders[N]. Polygon edges
        // là sub-segment do JSXGraph auto-tạo bên trong polygon; chúng không
        // có scene id riêng. Synthetic id cho phép construct tools (vd
        // perpendicular qua một cạnh đa giác) tham chiếu cạnh như một line.
        const m = /^(.+):border:(\d+)$/.exec(id);
        if (m) {
          const poly = this.elements.get(m[1]) as { borders?: unknown[] } | undefined;
          if (!poly) throw new Error(`[scene/2d] resolveRef: chưa render polygon id="${m[1]}"`);
          const borders = poly.borders;
          const idx = parseInt(m[2], 10);
          if (!Array.isArray(borders) || !borders[idx]) {
            throw new Error(`[scene/2d] resolveRef: polygon "${m[1]}" không có border[${idx}]`);
          }
          return borders[idx];
        }
        const el = this.elements.get(id);
        if (!el) throw new Error(`[scene/2d] resolveRef: chưa render id="${id}"`);
        return el;
      },
      defaults: { theme: this.theme, _functionExpr: this.functionExpr },
      paramMap: this.paramMap,
    };
  }

  /**
   * Rebuild `paramMap` và `functionExpr` từ state hiện tại.
   * Chỉ chạy khi domain='graph2d'. Chi phí thấp vì parameters thường ≤ 8.
   */
  private rebuildGraphMaps(state: State): void {
    if (state.meta.domain !== 'graph2d') return;
    const params: Record<string, number> = {};
    const fns: Record<string, string> = {};
    for (const id of state.order) {
      const obj = state.objects[id];
      if (obj.kind === 'parameter') {
        params[obj.label] = (obj.attrs as { value: number }).value;
      } else if (obj.kind === 'function2d') {
        fns[obj.id] = (obj.attrs as { expression: string }).expression;
      }
    }
    this.paramMap = params;
    this.functionExpr = fns;
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
    // Selection halo (nếu có) phải bị xoá TRƯỚC element gốc — halo tham chiếu
    // tới point1/point2/center/vertices của element gốc qua lambda; xoá element
    // gốc trước sẽ làm halo dangling.
    this.removeHalo(id);
    this.selectedIds.delete(id);
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

    // Rebuild paramMap + functionExpr TRƯỚC khi diff, để ctx() có đúng
    // paramMap khi render lần đầu tiên.
    this.rebuildGraphMaps(next);

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

    // Sau diff bình thường: nếu domain='graph2d', detect parameter value changes
    // và force re-render các function2d phụ thuộc.
    if (next.meta.domain === 'graph2d' && prev) {
      const changedParams = new Set<string>();
      for (const id of next.order) {
        const cur = next.objects[id];
        const old = prev.objects[id] as SceneObject | undefined;
        if (cur.kind !== 'parameter' || old?.kind !== 'parameter') continue;
        if ((cur.attrs as { value: number }).value !== (old.attrs as { value: number }).value) {
          changedParams.add(cur.label);
        }
      }
      if (changedParams.size > 0) {
        for (const id of next.order) {
          const obj = next.objects[id];
          if (obj.kind !== 'function2d') continue;
          const expr = (obj.attrs as { expression: string }).expression;
          const refs = collectFreeVars(expr);
          if (refs.some((r) => changedParams.has(r))) {
            this.remove(id);
            this.create(obj);
          }
        }
      }
    }
  }

  dispose(): void {
    if (this.disposed) return;
    this.unsubscribe();
    for (const id of Array.from(this.elements.keys())) this.remove(id);
    this.disposed = true;
  }

  /** Return the rendered JSXGraph element for a scene id, or null if not found. */
  getElement(id: string): unknown {
    return this.elements.get(id) ?? null;
  }

  /** Return a read-only view of the scene id → JSXGraph element map (for hit-test). */
  listElements(): Map<string, unknown> {
    return this.elements;
  }

  // Selection halo overlay model: thay vì đổi màu element gốc thành đỏ, tạo
  // một halo element gray phía sau (lower layer) → giữ nguyên màu gốc. Hỗ
  // trợ multi-select cho cả canvas click-selection lẫn ObjectListPanel.
  private selectedIds: Set<string> = new Set();
  private haloMap: Map<string, unknown[]> = new Map();

  highlight(ids: string | string[] | null): void {
    if (this.disposed) return;
    const newIds = new Set<string>(
      ids == null ? [] : Array.isArray(ids) ? ids : [ids],
    );
    // Remove halos cho ids đã bị bỏ chọn.
    for (const id of this.selectedIds) {
      if (!newIds.has(id)) this.removeHalo(id);
    }
    // Add halos cho ids mới chọn.
    for (const id of newIds) {
      if (!this.selectedIds.has(id) && this.elements.has(id)) this.addHalo(id);
    }
    this.selectedIds = newIds;
    try {
      (this.board as { update?: () => void }).update?.();
    } catch { /* ignore */ }
  }

  private removeHalo(id: string): void {
    const halos = this.haloMap.get(id);
    if (!halos) return;
    const board = this.board as { removeObject?: (e: unknown) => void };
    for (const h of halos) {
      try { board.removeObject?.(h); } catch { /* ignore */ }
    }
    this.haloMap.delete(id);
  }

  private addHalo(id: string): void {
    const el = this.elements.get(id) as
      | {
          elType?: string;
          getAttribute?: (k: string) => unknown;
          X?: () => number;
          Y?: () => number;
          point1?: unknown;
          point2?: unknown;
          center?: unknown;
          Radius?: () => number;
          vertices?: unknown[];
        }
      | undefined;
    if (!el) return;
    const board = this.board as {
      create?: (kind: string, parents: unknown[], attrs?: unknown) => unknown;
    };
    if (!board.create) return;

    // Selection palette — gray fill + darker gray border (xem
    // tham chiếu /tmp/ss.png).
    const SEL_STROKE = '#475569'; // slate-600
    const SEL_FILL = '#cbd5e1';   // slate-300
    const haloBase = {
      strokeColor: SEL_STROKE,
      strokeOpacity: 0.55,
      fillColor: SEL_FILL,
      fillOpacity: 0.3,
      fixed: true,
      withLabel: false,
      name: '',
      highlight: false,
      layer: 4,
      needsRegularUpdate: true,
    };
    const halos: unknown[] = [];
    try {
      switch (el.elType) {
        case 'point':
        case 'glider':
        case 'intersection': {
          const baseSize = (el.getAttribute?.('size') as number | undefined) ?? 4;
          const halo = board.create('point', [
            () => el.X?.() ?? 0,
            () => el.Y?.() ?? 0,
          ], {
            ...haloBase,
            size: baseSize + 6,
            face: 'o',
            strokeWidth: 2,
            strokeOpacity: 0.75,
            fillOpacity: 0.25,
          });
          halos.push(halo);
          break;
        }
        case 'segment': {
          if (el.point1 && el.point2) {
            const halo = board.create('segment', [el.point1, el.point2], {
              ...haloBase,
              strokeWidth: 9,
              straightFirst: false,
              straightLast: false,
            });
            halos.push(halo);
          }
          break;
        }
        case 'line':
        case 'arrow':
        case 'ray':
        case 'vector':
        case 'tangent':
        case 'normal':
        case 'parallel':
        case 'perpendicular':
        case 'bisector': {
          if (el.point1 && el.point2) {
            const halo = board.create('line', [el.point1, el.point2], {
              ...haloBase,
              strokeWidth: 9,
            });
            halos.push(halo);
          }
          break;
        }
        case 'circle': {
          if (el.center && typeof el.Radius === 'function') {
            const halo = board.create('circle', [el.center, () => el.Radius?.() ?? 0], {
              ...haloBase,
              strokeWidth: 9,
              fillOpacity: 0,
            });
            halos.push(halo);
          }
          break;
        }
        case 'polygon': {
          if (Array.isArray(el.vertices) && el.vertices.length >= 3) {
            // JSXGraph polygon.vertices có thể append vertex đầu lặp lại ở
            // cuối để đóng path — trim cho an toàn.
            const last = el.vertices.length - 1;
            const verts = el.vertices[last] === el.vertices[0]
              ? el.vertices.slice(0, last)
              : el.vertices.slice();
            const halo = board.create('polygon', verts, {
              ...haloBase,
              fillOpacity: 0.2,
              borders: {
                strokeColor: SEL_STROKE,
                strokeWidth: 7,
                strokeOpacity: 0.55,
                highlight: false,
              },
            });
            halos.push(halo);
          }
          break;
        }
        default:
          // Các kind khác (curve, arc, sector, angle, ...) — chưa hỗ trợ halo.
          break;
      }
    } catch (err) {
      console.warn('[scene/render/2d] halo create fail:', err);
    }
    if (halos.length) this.haloMap.set(id, halos);
  }
}
