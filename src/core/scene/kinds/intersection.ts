// src/core/scene/kinds/intersection.ts
import { registerKind } from '../registry';
import type { KindDef } from '../types';

export type IntersectionAttrs =
  | { kind: 'lineLine'; ref1: string; ref2: string; color?: string }
  | { kind: 'lineCircle'; ref1: string; ref2: string; branch: 0 | 1; color?: string }
  | { kind: 'circleCircle'; ref1: string; ref2: string; branch: 0 | 1; color?: string };

const def: KindDef<IntersectionAttrs> = {
  type: 'intersection',
  schemaVersion: 1,
  migrate: {},
  validate: (a) => {
    if (!a || !('kind' in a)) throw new Error('intersection: kind bắt buộc');
    if (!a.ref1 || !a.ref2) throw new Error('intersection: ref1 và ref2 bắt buộc');
    if (a.kind === 'lineLine') return;
    if (a.kind === 'lineCircle' || a.kind === 'circleCircle') {
      if (a.branch !== 0 && a.branch !== 1) {
        throw new Error(`intersection.${a.kind}: branch phải là 0 hoặc 1`);
      }
      return;
    }
    throw new Error(`intersection: kind không hợp lệ "${(a as { kind: string }).kind}"`);
  },
  dependsOn: (a) => [a.ref1, a.ref2],
  describe: (obj) => {
    const a = obj.attrs;
    return `${obj.label} = giao ${a.ref1} ∩ ${a.ref2}`;
  },
  render: (obj, ctx) => {
    const board = ctx.jxg as any;
    const a = ctx.resolveRef(obj.attrs.ref1);
    const b = ctx.resolveRef(obj.attrs.ref2);
    const opts: Record<string, unknown> = {
      name: obj.label,
      withLabel: true,
      // Cùng màu xanh với mọi điểm khác (buildPointOpts dùng '#1e40af').
      // Trước đây điểm giao tô đỏ '#dc2626' → tách biệt thị giác nhưng gây
      // khó hiểu ("vì sao điểm này khác màu?"). Giữ chung một màu.
      strokeColor: obj.attrs.color ?? '#1e40af',
      fillColor: obj.attrs.color ?? '#1e40af',
      visible: obj.visible,
      fixed: obj.locked,
    };
    if (obj.attrs.kind === 'lineLine') {
      return board.create('intersection', [a, b, 0], opts);
    }
    // lineCircle hoặc circleCircle: branch 0/1
    const branch = obj.attrs.branch ?? 0;
    return board.create('intersection', [a, b, branch], opts);
  },
  /**
   * Cập nhật TẠI CHỖ các thuộc tính "trang trí" (tên/màu/ẩn-hiện/khoá) qua
   * setAttribute — giữ nguyên JxgObj identity nên các object phụ thuộc điểm
   * giao (đường thẳng qua nó, …) KHÔNG bị stale parent ref. Mô phỏng update
   * hook của point.ts.
   *
   * Nếu định nghĩa hình học đổi (kind/ref1/ref2/branch) thì throw → renderer
   * fallback remove + create để JSXGraph dựng lại phép giao đúng.
   */
  update: (obj, prev, ctx, existing) => {
    const a = obj.attrs;
    const p = prev.attrs;
    const branchA = (a as { branch?: number }).branch;
    const branchP = (p as { branch?: number }).branch;
    if (a.kind !== p.kind || a.ref1 !== p.ref1 || a.ref2 !== p.ref2 || branchA !== branchP) {
      throw new Error('intersection: định nghĩa hình học đổi — recreate');
    }
    const el = existing as { setAttribute?: (o: Record<string, unknown>) => void };
    if (typeof el.setAttribute === 'function') {
      try {
        el.setAttribute({
          name: obj.label,
          withLabel: true,
          strokeColor: a.color ?? '#1e40af',
          fillColor: a.color ?? '#1e40af',
          visible: obj.visible,
          fixed: obj.locked,
        });
      } catch { /* ignore */ }
    }
    void ctx;
  },
};

registerKind(def);
