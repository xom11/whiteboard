// point-constraints/shared.ts
import type { RenderCtx, SceneObject } from '../../types';
import type { ConstraintDistanceSpec, TransformDef } from '../2d-constraint';
import type { PointAttrs } from './_types';

/**
 * Build mảng JSXGraph 'transform' elements cho TransformDef. Dilate → chain
 * 3 transform (T(-c) → S(k) → T(+c)) vì JSXGraph 'scale' không nhận center.
 *
 * Center là pointId; resolve qua ctx + dùng function-based để dilate cập nhật
 * live khi user kéo center.
 */

export function buildJxgTransforms(board: any, ctx: RenderCtx, t: TransformDef): any[] {
  switch (t.kind) {
    case 'translate':
      return [board.create('transform', [t.dx, t.dy], { type: 'translate' })];
    case 'rotate': {

      const c: any = ctx.resolveRef(t.center);
      return [board.create('transform', [t.angleRad, c], { type: 'rotate' })];
    }
    case 'reflectPoint': {
      // Đối xứng qua điểm = quay π quanh điểm đó.

      const c: any = ctx.resolveRef(t.center);
      return [board.create('transform', [Math.PI, c], { type: 'rotate' })];
    }
    case 'reflectLine': {

      const l: any = ctx.resolveRef(t.line);
      return [board.create('transform', [l], { type: 'reflect' })];
    }
    case 'dilate': {

      const c: any = ctx.resolveRef(t.center);
      // Function-based để chain cập nhật khi user kéo center.
      return [
        board.create('transform', [() => -c.X(), () => -c.Y()], { type: 'translate' }),
        board.create('transform', [t.k, t.k], { type: 'scale' }),
        board.create('transform', [() => c.X(), () => c.Y()], { type: 'translate' }),
      ];
    }
  }
}

/**
 * Trả hàm tính khoảng cách `d` reactive cho pointAtDistance.
 * d = scale·base + offset (scale mặc định 1, offset mặc định 0). Spec cũ không
 * có scale/offset → d = base Y HỆT trước (additive).
 */
export function makeDistanceFn(ctx: RenderCtx, d: ConstraintDistanceSpec): () => number {
  const scale = d.scale ?? 1;
  const offset = d.offset ?? 0;
  if (d.kind === 'literal') {
    const v = d.value;
    return () => scale * v + offset;
  }
  if (d.kind === 'segmentLength') {
    const p = ctx.resolveRef(d.p1) as any;
    const q = ctx.resolveRef(d.p2) as any;
    return () => scale * Math.hypot(p.X() - q.X(), p.Y() - q.Y()) + offset;
  }
  const circle = ctx.resolveRef(d.circle) as any;
  return () => scale * circle.Radius() + offset;
}

/** opts y hệt point.ts render hiện tại (defaults #1e40af / 'o' / 4). */
export function buildPointOpts(obj: SceneObject<PointAttrs>): Record<string, unknown> {
  return {
    name: obj.label,
    withLabel: obj.attrs.showLabel ?? true,
    visible: obj.visible,
    fixed: obj.locked,
    strokeColor: obj.attrs.color ?? '#1e40af',
    fillColor: obj.attrs.color ?? '#1e40af',
    face: obj.attrs.face ?? 'o',
    size: obj.attrs.size ?? 4,
  };
}
