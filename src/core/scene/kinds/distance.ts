// src/core/scene/kinds/distance.ts
import { registerKind } from '../registry';
import type { KindDef } from '../types';
import { labelOf } from './labelOf';

/**
 * Distance measurement: text "d = X.XX" hiển thị tại trung điểm p1-p2.
 *
 * Dùng function-based coords + content cho JSXGraph text → live update khi
 * user kéo p1/p2 (khác commit cũ pre-scene-v2 vốn freeze value lúc create).
 */
export type DistanceAttrs = {
  p1: string;
  p2: string;
  color?: string;
  fontSize?: number;
  /** Tiền tố hiển thị, mặc định 'd = '. Để '' nếu chỉ muốn số. */
  prefix?: string;
  /** Số chữ số sau dấu phẩy, mặc định 2. */
  precision?: number;
};

const def: KindDef<DistanceAttrs> = {
  type: 'distance',
  schemaVersion: 1,
  migrate: {},
  validate: (a) => {
    if (!a?.p1 || !a?.p2) throw new Error('distance: p1 và p2 bắt buộc');
  },
  dependsOn: (a) => [a.p1, a.p2],
  describe: (obj, state) => `Khoảng cách ${labelOf(obj.attrs.p1, state)}${labelOf(obj.attrs.p2, state)}`,
  render: (obj, ctx) => {
     
    const board = ctx.jxg as any;
     
    const p1: any = ctx.resolveRef(obj.attrs.p1);
     
    const p2: any = ctx.resolveRef(obj.attrs.p2);
    const prefix = obj.attrs.prefix ?? 'd = ';
    const precision = obj.attrs.precision ?? 2;
    return board.create('text', [
      () => (p1.X() + p2.X()) / 2,
      () => (p1.Y() + p2.Y()) / 2,
      () => `${prefix}${Math.hypot(p1.X() - p2.X(), p1.Y() - p2.Y()).toFixed(precision)}`,
    ], {
      fontSize: obj.attrs.fontSize ?? 14,
      strokeColor: obj.attrs.color ?? '#dc2626',
      anchorX: 'middle',
      anchorY: 'middle',
      visible: obj.visible,
      fixed: true,
    });
  },
};

registerKind(def);
