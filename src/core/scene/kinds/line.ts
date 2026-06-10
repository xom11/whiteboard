// src/core/scene/kinds/line.ts
import { registerKind } from '../registry';
import type { KindDef } from '../types';
import { labelOf } from './labelOf';
import { labelOpts } from './_label';
import { radicalAxisFoot } from './pointConstructions';

/**
 * Cách dựng đường thẳng phái sinh. Khi `construction` có mặt, `p1`/`p2` ở
 * trên LineAttrs bị bỏ qua — renderer dùng nhánh tương ứng (perpendicular /
 * parallel / perpBisector / angleBisector / tangent).
 *
 * Lưu ý: tangent dựng qua một glider ẩn nằm trên đường tròn gần `throughPoint`;
 * glider được lưu tại property `_helpers` của element trả về để renderer dọn
 * dẹp khi đường tangent bị xoá.
 */
export type LineConstruction =
  | { kind: 'perpendicular'; throughPoint: string; toLine: string }
  | { kind: 'parallel'; throughPoint: string; toLine: string }
  | { kind: 'perpBisector'; p1: string; p2: string }
  | { kind: 'angleBisector'; p1: string; vertex: string; p2: string }
  | { kind: 'angleBisectorLines'; line1: string; line2: string; branch: 0 | 1 }
  | { kind: 'lineThrough'; points: string[] }
  | { kind: 'radicalAxis'; circle1: string; circle2: string }
  | { kind: 'tangent'; throughPoint: string; toCircle: string; branch?: 0 | 1 | 'on' };

export type LineAttrs = {
  /** Hai-điểm fallback — bắt buộc khi không có `construction`. */
  p1?: string;
  p2?: string;
  construction?: LineConstruction;
  color?: string;
  width?: number;
  dash?: number;
  showLabel?: boolean;
  /** Offset nhãn (pixel) so với anchor; undefined = default JSXGraph. */
  labelOffset?: [number, number];
};

// Polygon edges là sub-segment do JSXGraph tự tạo bên trong polygon — không có
// scene id riêng. Synthetic id "<polyId>:border:<i>" cho phép construct tools
// (perpendicular, parallel) tham chiếu cạnh đa giác như một line, nhưng
// dependency graph cần biết line phụ thuộc vào polygon thật (để DELETE polygon
// cascade xoá line). Strip suffix về polyId ở đây.
function stripBorderSuffix(id: string): string {
  const m = /^(.+):border:\d+$/.exec(id);
  return m ? m[1] : id;
}

function constructionRefs(c: LineConstruction): string[] {
  switch (c.kind) {
    case 'perpendicular':
    case 'parallel':
      return [c.throughPoint, stripBorderSuffix(c.toLine)];
    case 'perpBisector':
      return [c.p1, c.p2];
    case 'angleBisector':
      return [c.p1, c.vertex, c.p2];
    case 'angleBisectorLines':
      return [stripBorderSuffix(c.line1), stripBorderSuffix(c.line2)];
    case 'lineThrough':
      return [...c.points];
    case 'radicalAxis':
      return [c.circle1, c.circle2];
    case 'tangent':
      return [c.throughPoint, c.toCircle];
  }
}

const def: KindDef<LineAttrs> = {
  type: 'line',
  schemaVersion: 1,
  migrate: {},
  validate: (a) => {
    if (a?.construction) return;
    if (!a?.p1 || !a?.p2) throw new Error('line: p1 và p2 bắt buộc (hoặc construction)');
  },
  dependsOn: (a) => (a.construction ? constructionRefs(a.construction) : [a.p1!, a.p2!]),
  describe: (obj, state) => {
    const L = (id: string) => labelOf(id, state);
    const c = obj.attrs.construction;
    if (!c) return `Đường thẳng ${L(obj.attrs.p1!)}${L(obj.attrs.p2!)}`;
    switch (c.kind) {
      case 'perpendicular': return `${obj.label} ⟂ ${L(c.toLine)} qua ${L(c.throughPoint)}`;
      case 'parallel':      return `${obj.label} ∥ ${L(c.toLine)} qua ${L(c.throughPoint)}`;
      case 'perpBisector':  return `${obj.label}: trung trực ${L(c.p1)}${L(c.p2)}`;
      case 'angleBisector': return `${obj.label}: phân giác góc ${L(c.p1)}${L(c.vertex)}${L(c.p2)}`;
      case 'angleBisectorLines': return `${obj.label}: phân giác ${L(c.line1)} & ${L(c.line2)} (${c.branch === 0 ? '1' : '2'})`;
      case 'lineThrough':   return `${obj.label}: đường qua ${c.points.map(L).join('')}`;
      case 'radicalAxis':   return `${obj.label}: trục đẳng phương ${L(c.circle1)} & ${L(c.circle2)}`;
      case 'tangent':       return `${obj.label}: tiếp tuyến ${L(c.toCircle)} qua ${L(c.throughPoint)}`;
    }
  },
  render: (obj, ctx) => {
     
    const board = ctx.jxg as any;
    const baseOpts: Record<string, unknown> = {
      name: obj.label,
      withLabel: obj.attrs.showLabel ?? false,
      strokeColor: obj.attrs.color ?? '#0f172a',
      strokeWidth: obj.attrs.width ?? 2,
      dash: obj.attrs.dash ?? 0,
      visible: obj.visible,
      fixed: obj.locked,
      ...labelOpts(obj.attrs.labelOffset),
    };
    const c = obj.attrs.construction;
    if (!c) {
      const p1 = ctx.resolveRef(obj.attrs.p1!);
      const p2 = ctx.resolveRef(obj.attrs.p2!);
      return board.create('line', [p1, p2], {
        ...baseOpts,
        straightFirst: true,
        straightLast: true,
      });
    }
    switch (c.kind) {
      case 'perpendicular': {
        const through = ctx.resolveRef(c.throughPoint);
        const toLine = ctx.resolveRef(c.toLine);
        // JSXGraph: create('perpendicular', [line, point]) → line qua point ⟂ line
        return board.create('perpendicular', [toLine, through], baseOpts);
      }
      case 'parallel': {
        const through = ctx.resolveRef(c.throughPoint);
        const toLine = ctx.resolveRef(c.toLine);
        return board.create('parallel', [toLine, through], baseOpts);
      }
      case 'perpBisector': {
        // JSXGraph 1.12 không có element 'perpendicularbisector' — compose từ
        // midpoint + helper line + perpendicular. Helper objects được lưu vào
        // `_helpers` để JxgRenderer.remove() dọn dẹp khi line bị xoá.
        const p1 = ctx.resolveRef(c.p1);
        const p2 = ctx.resolveRef(c.p2);
        const mid = board.create('midpoint', [p1, p2], {
          visible: false, withLabel: false, fixed: true, name: '',
        });
        const helperLine = board.create('line', [p1, p2], {
          visible: false, withLabel: false, fixed: true, name: '',
          straightFirst: true, straightLast: true,
        });
        const bisector = board.create('perpendicular', [helperLine, mid], baseOpts);
        (bisector as Record<string, unknown>)._helpers = [mid, helperLine];
        return bisector;
      }
      case 'angleBisector': {
        const p1 = ctx.resolveRef(c.p1);
        const vertex = ctx.resolveRef(c.vertex);
        const p2 = ctx.resolveRef(c.p2);
        return board.create('bisector', [p1, vertex, p2], baseOpts);
      }
      case 'angleBisectorLines': {
        // JSXGraph 'bisectorlines' tạo 2 đường phân giác vuông góc của góc giữa
        // 2 đường thẳng (qua giao điểm). Composition trả về có .line1 và .line2.
        // Mỗi scene entry chỉ hiển thị 1 nhánh (branch 0/1) — nhánh còn lại lưu
        // trong _helpers để JxgRenderer dọn dẹp khi entry bị xoá.
         
        const line1Jxg = ctx.resolveRef(c.line1) as any;
         
        const line2Jxg = ctx.resolveRef(c.line2) as any;
        const comp = board.create('bisectorlines', [line1Jxg, line2Jxg], {
          line1: { visible: false, withLabel: false, fixed: true, name: '' },
          line2: { visible: false, withLabel: false, fixed: true, name: '' },
        });
         
        const selected = (c.branch === 0 ? comp.line1 : comp.line2) as any;
         
        const other = (c.branch === 0 ? comp.line2 : comp.line1) as any;
        selected.setAttribute({
          ...baseOpts,
          visible: obj.visible,
          fixed: obj.locked,
        });
        (selected as Record<string, unknown>)._helpers = [other];
        return selected;
      }
      case 'lineThrough': {
        const pts = c.points.map((id) => ctx.resolveRef(id) as any);
        // Chọn 2 điểm xa nhau nhất (ổn định số học; mọi điểm đồng tuyến nên đường
        // qua 2 điểm bất kỳ là như nhau, nhưng cặp xa nhất tránh suy biến gần-trùng).
        let bi = 0, bj = 1, best = -1;
        for (let i = 0; i < pts.length; i++) {
          for (let j = i + 1; j < pts.length; j++) {
            const dx = pts[i].X() - pts[j].X();
            const dy = pts[i].Y() - pts[j].Y();
            const d = dx * dx + dy * dy;
            if (d > best) { best = d; bi = i; bj = j; }
          }
        }
        return board.create('line', [pts[bi], pts[bj]], {
          ...baseOpts, straightFirst: true, straightLast: true,
        });
      }
      case 'radicalAxis': {

        const k1 = ctx.resolveRef(c.circle1) as any;

        const k2 = ctx.resolveRef(c.circle2) as any;
        const o1 = (): [number, number] => [k1.center.X(), k1.center.Y()];
        const o2 = (): [number, number] => [k2.center.X(), k2.center.Y()];
        const foot = () => radicalAxisFoot(o1(), k1.Radius(), o2(), k2.Radius());
        const hide = { visible: false, withLabel: false, fixed: true, name: '' };
        const f1 = board.create('point', [() => foot()[0], () => foot()[1]], hide);
        // điểm thứ 2 = foot + pháp tuyến của O₁O₂ → đường ⊥ đường nối tâm.
        const f2 = board.create('point', [
          () => foot()[0] - (o2()[1] - o1()[1]),
          () => foot()[1] + (o2()[0] - o1()[0]),
        ], hide);
        const line = board.create('line', [f1, f2], {
          ...baseOpts, straightFirst: true, straightLast: true,
        });
        (line as Record<string, unknown>)._helpers = [f1, f2];
        return line;
      }
      case 'tangent': {

        const through = ctx.resolveRef(c.throughPoint) as any;
         
        const toCircle = ctx.resolveRef(c.toCircle) as any;
        const branch = c.branch ?? 'on';

        if (branch === 'on') {
          // P trên đường tròn (hoặc legacy data trước khi có branch): glider
          // tại P + JXG tangent element. Backward-compat với data cũ.
          const glider = board.create('glider', [through.X(), through.Y(), toCircle], {
            visible: false, withLabel: false, fixed: true, name: '',
          });
          const tangent = board.create('tangent', [glider], baseOpts);
          (tangent as Record<string, unknown>)._helpers = [glider];
          return tangent;
        }

        // branch 0 | 1: dựng qua Thales-circle intersection.
        //   M = midpoint(O, P). Auxiliary circle tâm M qua O và P → 2 giao
        //   điểm với đường tròn gốc là 2 tiếp điểm T (∠OTP = 90°).
        //   Tangent line = line(P, T_branch).
        const center = toCircle.center;
        const mid = board.create('midpoint', [center, through], {
          visible: false, withLabel: false, fixed: true, name: '',
        });
        const thales = board.create('circle', [mid, through], {
          visible: false, withLabel: false, fixed: true,
          strokeOpacity: 0, fillOpacity: 0,
        });
        const touch = board.create('intersection', [thales, toCircle, branch], {
          visible: false, withLabel: false, fixed: true, name: '',
        });
        const tangent = board.create('line', [through, touch], {
          ...baseOpts, straightFirst: true, straightLast: true,
        });
        (tangent as Record<string, unknown>)._helpers = [mid, thales, touch];
        return tangent;
      }
    }
  },
};

registerKind(def);
