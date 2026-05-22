// src/core/scene/kinds/line.ts
import { registerKind } from '../registry';
import type { KindDef } from '../types';
import { labelOf } from './labelOf';

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
      case 'tangent':       return `${obj.label}: tiếp tuyến ${L(c.toCircle)} qua ${L(c.throughPoint)}`;
    }
  },
  render: (obj, ctx) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const board = ctx.jxg as any;
    const baseOpts: Record<string, unknown> = {
      name: obj.label,
      withLabel: obj.attrs.showLabel ?? false,
      strokeColor: obj.attrs.color ?? '#0f172a',
      strokeWidth: obj.attrs.width ?? 2,
      dash: obj.attrs.dash ?? 0,
      visible: obj.visible,
      fixed: obj.locked,
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
      case 'tangent': {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const through = ctx.resolveRef(c.throughPoint) as any;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
