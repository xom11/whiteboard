// src/core/scene/kinds/polygon.ts
import { registerKind } from '../registry';
import type { KindDef } from '../types';

/**
 * Cách dựng đa giác phái sinh. Khi `construction` có mặt, `vertices` bị bỏ qua
 * — renderer dùng nhánh tương ứng.
 *
 * - regular: đa giác đều n cạnh dựng từ 2 đỉnh kề (p1, p2 = vertex0, vertex1).
 *   JSXGraph 'regularpolygon' tự sinh n-2 đỉnh còn lại.
 */
export type PolygonConstruction =
  | { kind: 'regular'; p1: string; p2: string; n: number };

export type PolygonAttrs = {
  /** Danh sách đỉnh — bắt buộc khi không có `construction`. */
  vertices?: string[];
  construction?: PolygonConstruction;
  color?: string;
  fillOpacity?: number;
  width?: number;
  showLabel?: boolean;
  showValue?: boolean;   // hiển thị diện tích
};

const def: KindDef<PolygonAttrs> = {
  type: 'polygon',
  schemaVersion: 1,
  migrate: {},
  validate: (a) => {
    if (a?.construction) {
      if (a.construction.kind === 'regular') {
        if (!a.construction.p1 || !a.construction.p2) {
          throw new Error('polygon (regular): p1 và p2 bắt buộc');
        }
        if (!Number.isFinite(a.construction.n) || a.construction.n < 3) {
          throw new Error('polygon (regular): n ≥ 3');
        }
      }
      return;
    }
    if (!Array.isArray(a?.vertices) || a.vertices.length < 3) {
      throw new Error('polygon: cần ít nhất 3 đỉnh');
    }
  },
  dependsOn: (a) => {
    if (a.construction?.kind === 'regular') return [a.construction.p1, a.construction.p2];
    return [...(a.vertices ?? [])];
  },
  describe: (obj) => {
    if (obj.attrs.construction?.kind === 'regular') {
      const c = obj.attrs.construction;
      return `Đa giác đều ${c.n} cạnh (${c.p1}, ${c.p2})`;
    }
    return `Đa giác ${(obj.attrs.vertices ?? []).join('')}`;
  },
  render: (obj, ctx) => {
    const board = ctx.jxg as any;
    const label = obj.label;
    const showValue = obj.attrs.showValue ?? false;
    // Construction 'regular': dùng JSXGraph 'regularpolygon' với 2 đỉnh kề + n.
    // showValue không support cho regular (JSXGraph 'regularpolygon' không expose
    // Area() — nếu cần, user có thể đo qua tool 'area' riêng).
    if (obj.attrs.construction?.kind === 'regular') {
      const c = obj.attrs.construction;
      const p1 = ctx.resolveRef(c.p1);
      const p2 = ctx.resolveRef(c.p2);
      return board.create('regularpolygon', [p1, p2, c.n], {
        name: label,
        withLabel: obj.attrs.showLabel ?? false,
        borders: {
          strokeColor: obj.attrs.color ?? '#0f172a',
          strokeWidth: obj.attrs.width ?? 2,
        },
        fillColor: obj.attrs.color ?? '#60a5fa',
        fillOpacity: obj.attrs.fillOpacity ?? 0.15,
        visible: obj.visible,
        fixed: obj.locked,
      });
    }
    const verts = (obj.attrs.vertices ?? []).map(id => ctx.resolveRef(id));
    // showValue=true: hiển thị label dạng "ABC: S = 8.50" với diện tích live.
    // showLabel=false + showValue=true: chỉ số diện tích. JSXGraph polygon's
    // Area() trả về |∮ x dy| theo đỉnh hiện tại → live update khi kéo đỉnh.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const poly = board.create('polygon', verts, {
      name: showValue
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ? function (this: any) {
            // `this` là polygon element; gọi Area() để lấy giá trị live.
            const a = typeof this.Area === 'function' ? this.Area() : 0;
            const prefix = (obj.attrs.showLabel ?? true) ? `${label}: ` : '';
            return `${prefix}S = ${Math.abs(a).toFixed(2)}`;
          }
        : label,
      withLabel: showValue ? true : (obj.attrs.showLabel ?? false),
      borders: {
        strokeColor: obj.attrs.color ?? '#0f172a',
        strokeWidth: obj.attrs.width ?? 2,
      },
      fillColor: obj.attrs.color ?? '#60a5fa',
      fillOpacity: obj.attrs.fillOpacity ?? 0.15,
      visible: obj.visible,
      fixed: obj.locked,
    });
    return poly;
  },
};

registerKind(def);
