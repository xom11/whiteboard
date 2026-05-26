 
export type JxgObj = any;

import type { State, SceneObject } from '../../../core/scene';

/**
 * Trả về danh sách id điểm "định nghĩa" object — dùng cho transform tools
 * (translate/rotate/reflect/dilate) cần biết các điểm gốc để clone.
 *
 * Signature: `(obj: SceneObject, state: State)`. `state` được pass để
 * forward-compatible với các kind phái sinh (vd: lookup dependentsOf cho
 * compound shapes); hiện tại chỉ đọc `obj.kind` + `obj.attrs`.
 */
export function getDefiningPoints(obj: SceneObject, _state: State): string[] {
  if (obj.kind === 'point' || obj.kind === 'intersection') return [obj.id];
  if (obj.kind === 'segment' || obj.kind === 'line') {
    const a = obj.attrs as { p1: string; p2: string };
    return [a.p1, a.p2];
  }
  if (obj.kind === 'ray') {
    const a = obj.attrs as { origin: string; through: string };
    return [a.origin, a.through];
  }
  if (obj.kind === 'vector') {
    const a = obj.attrs as { from: string; to: string };
    return [a.from, a.to];
  }
  if (obj.kind === 'circle') {
    const a = obj.attrs as { center: string; surfacePoint: string };
    return [a.center, a.surfacePoint];
  }
  if (obj.kind === 'polygon') {
    return [...(obj.attrs as { vertices: string[] }).vertices];
  }
  return [];
}

export type TransformInput =
  | { kind: 'translate'; vectorPoints: [JxgObj, JxgObj] }
  | { kind: 'rotate'; center: JxgObj; angleDeg: number }
  | { kind: 'reflectLine'; line: JxgObj }
  | { kind: 'reflectPoint'; center: JxgObj }
  | { kind: 'dilate'; center: JxgObj; k: number };

export interface TransformSpec {
  params: unknown[];
  attrs: { type: 'translate' | 'rotate' | 'reflect' | 'scale' };
  /**
   * Khi `chain` được set, finalizeTransformCreate dựng từng transform trong chain
   * (theo thứ tự) rồi pass mảng vào `board.create('point', [src, [t1, t2, t3]])`.
   * Dùng cho `dilate` (scale-quanh-điểm) vì JSXGraph 'scale' không nhận center.
   */
  chain?: Array<{ params: unknown[]; attrs: { type: 'translate' | 'rotate' | 'reflect' | 'scale' } }>;
}

export function buildTransformSpec(input: TransformInput): TransformSpec {
  switch (input.kind) {
    case 'translate': {
      // Literal dx/dy (không phải callback) để serialize qua JSON.stringify được.
      // Trade-off: transformed object không cập nhật khi user kéo điểm vector — chấp nhận.
      const [a, b] = input.vectorPoints;
      const dx = b.X() - a.X();
      const dy = b.Y() - a.Y();
      return { params: [dx, dy], attrs: { type: 'translate' } };
    }
    case 'rotate':
      return {
        params: [(input.angleDeg * Math.PI) / 180, input.center],
        attrs: { type: 'rotate' },
      };
    case 'reflectLine':
      return { params: [input.line], attrs: { type: 'reflect' } };
    case 'reflectPoint':
      // JSXGraph 'scale' chỉ nhận 2 tham số (sx, sy) và scale quanh gốc toạ độ —
      // tham số center thứ 3 bị lờ → trước đây sai. Đối xứng qua điểm = quay 180°
      // quanh điểm đó. Dùng 'rotate' (params [angle, center]) để chuẩn.
      return { params: [Math.PI, input.center], attrs: { type: 'rotate' } };
    case 'dilate':
      // JSXGraph 'scale' chỉ nhận đúng 2 tham số (sx, sy) và scale quanh gốc toạ độ —
      // tham số center thứ 3 làm constructor throw. Dilate quanh điểm c bằng tỷ số k
      // = compose 3 phép: T(-c) → S(k,k) → T(+c). Sinh ra chain (mảng spec) thay vì
      // 1 spec đơn; consumer (finalizeTransformCreate) tự nhận biết.
      return {
        params: [],
        attrs: { type: 'scale' },
        chain: [
          { params: [-input.center.X(), -input.center.Y()], attrs: { type: 'translate' as const } },
          { params: [input.k, input.k], attrs: { type: 'scale' as const } },
          { params: [input.center.X(), input.center.Y()], attrs: { type: 'translate' as const } },
        ],
      };
  }
}
