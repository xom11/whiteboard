// src/core/scene/kinds/polygon.ts
import { registerKind } from '../registry';
import type { KindDef } from '../types';
import { labelOf } from './labelOf';

/** Tên tiếng Việt cho đa giác đều theo số cạnh. */
function regularPolygonName(n: number): string {
  if (n === 3) return 'Tam giác đều';
  if (n === 4) return 'Hình vuông';
  if (n === 5) return 'Ngũ giác đều';
  if (n === 6) return 'Lục giác đều';
  return `${n}-giác đều`;
}

/**
 * Sinh nhãn đỉnh dạng "ABCDE..." khi p1/p2 là 2 chữ cái in hoa liên tiếp.
 * Vd p1=A, p2=B, n=4 → "ABCD". Vd p1=C, p2=D, n=3 → "CDE".
 * Fallback "p1Label · p2Label…" khi không suy ra được dãy chữ.
 */
function regularVertexLabels(p1Label: string, p2Label: string, n: number): string {
  const A = 'A'.charCodeAt(0);
  const Z = 'Z'.charCodeAt(0);
  if (p1Label.length === 1 && p2Label.length === 1) {
    const c1 = p1Label.charCodeAt(0);
    const c2 = p2Label.charCodeAt(0);
    if (c1 >= A && c1 <= Z && c2 === c1 + 1 && c1 + n - 1 <= Z) {
      let out = '';
      for (let i = 0; i < n; i++) out += String.fromCharCode(c1 + i);
      return out;
    }
  }
  return `${p1Label}${p2Label}…`;
}

/**
 * Cách dựng đa giác phái sinh. Khi `construction` có mặt, `vertices` bị bỏ qua
 * — renderer dùng nhánh tương ứng.
 *
 * - regular: đa giác đều n cạnh dựng từ 2 đỉnh kề (p1, p2 = vertex0, vertex1).
 *   JSXGraph 'regularpolygon' tự sinh n-2 đỉnh còn lại.
 * - square: 2 đỉnh kề, render qua 'regularpolygon' n=4.
 * - rectangle/rhombus/parallelogram: 3 đỉnh; D = A + (C − B) suy ngầm trong
 *   render. rectangle: p3 nằm trên ⟂ tại p2 ⟂ AB. rhombus: p3 trên vòng tròn
 *   tâm p2 bán kính |AB|. parallelogram: p3 free.
 * - isoTrapezoid: 3 đỉnh; đỉnh thứ 4 = ảnh phản chiếu p3 qua trung trực AB.
 * - isoTriangle: 3 đỉnh; apex nằm trên trung trực (base1, base2).
 * - rightTriangle: 3 đỉnh; leg2End nằm trên ⟂ qua rightAngle ⟂ (rightAngle, leg1End).
 */
export type PolygonConstruction =
  | { kind: 'regular'; p1: string; p2: string; n: number }
  | { kind: 'square'; p1: string; p2: string }
  | { kind: 'rectangle'; p1: string; p2: string; p3: string }
  | { kind: 'rhombus'; p1: string; p2: string; p3: string }
  | { kind: 'parallelogram'; p1: string; p2: string; p3: string }
  | { kind: 'isoTrapezoid'; p1: string; p2: string; p3: string }
  | { kind: 'isoTriangle'; base1: string; base2: string; apex: string }
  | { kind: 'rightTriangle'; rightAngle: string; leg1End: string; leg2End: string };

function specialShapeName(kind: PolygonConstruction['kind']): string {
  switch (kind) {
    case 'square': return 'Hình vuông';
    case 'rectangle': return 'Hình chữ nhật';
    case 'rhombus': return 'Hình thoi';
    case 'parallelogram': return 'Hình bình hành';
    case 'isoTrapezoid': return 'Hình thang cân';
    case 'isoTriangle': return 'Tam giác cân';
    case 'rightTriangle': return 'Tam giác vuông';
    case 'regular': return '';
  }
}

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
      const c = a.construction;
      if (c.kind === 'regular') {
        if (!c.p1 || !c.p2) throw new Error('polygon (regular): p1 và p2 bắt buộc');
        if (!Number.isFinite(c.n) || c.n < 3) throw new Error('polygon (regular): n ≥ 3');
        return;
      }
      if (c.kind === 'square') {
        if (!c.p1 || !c.p2) throw new Error('polygon (square): p1 và p2 bắt buộc');
        return;
      }
      if (c.kind === 'rectangle' || c.kind === 'rhombus' || c.kind === 'parallelogram' || c.kind === 'isoTrapezoid') {
        if (!c.p1 || !c.p2 || !c.p3) throw new Error(`polygon (${c.kind}): p1, p2, p3 bắt buộc`);
        return;
      }
      if (c.kind === 'isoTriangle') {
        if (!c.base1 || !c.base2 || !c.apex) throw new Error('polygon (isoTriangle): base1, base2, apex bắt buộc');
        return;
      }
      if (c.kind === 'rightTriangle') {
        if (!c.rightAngle || !c.leg1End || !c.leg2End) throw new Error('polygon (rightTriangle): rightAngle, leg1End, leg2End bắt buộc');
        return;
      }
      return;
    }
    if (!Array.isArray(a?.vertices) || a.vertices.length < 3) {
      throw new Error('polygon: cần ít nhất 3 đỉnh');
    }
  },
  dependsOn: (a) => {
    const c = a.construction;
    if (!c) return [...(a.vertices ?? [])];
    switch (c.kind) {
      case 'regular':       return [c.p1, c.p2];
      case 'square':        return [c.p1, c.p2];
      case 'rectangle':
      case 'rhombus':
      case 'parallelogram':
      case 'isoTrapezoid':  return [c.p1, c.p2, c.p3];
      case 'isoTriangle':   return [c.base1, c.base2, c.apex];
      case 'rightTriangle': return [c.rightAngle, c.leg1End, c.leg2End];
    }
  },
  describe: (obj, state) => {
    const c = obj.attrs.construction;
    if (c) {
      if (c.kind === 'regular') {
        const labels = regularVertexLabels(labelOf(c.p1, state), labelOf(c.p2, state), c.n);
        return `${regularPolygonName(c.n)} ${labels}`;
      }
      const name = specialShapeName(c.kind);
      let labels: string[] = [];
      switch (c.kind) {
        case 'square':
          labels = [labelOf(c.p1, state), labelOf(c.p2, state)];
          break;
        case 'rectangle':
        case 'rhombus':
        case 'parallelogram':
        case 'isoTrapezoid':
          labels = [labelOf(c.p1, state), labelOf(c.p2, state), labelOf(c.p3, state)];
          break;
        case 'isoTriangle':
          labels = [labelOf(c.apex, state), labelOf(c.base1, state), labelOf(c.base2, state)];
          break;
        case 'rightTriangle':
          labels = [labelOf(c.rightAngle, state), labelOf(c.leg1End, state), labelOf(c.leg2End, state)];
          break;
      }
      return `${name} ${labels.join('')}`;
    }
    return `Đa giác ${(obj.attrs.vertices ?? []).map((id) => labelOf(id, state)).join('')}`;
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
     
    const poly = board.create('polygon', verts, {
      name: showValue
         
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
