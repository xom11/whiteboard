// src/core/scene/kinds/polygon.ts
import { registerKind } from '../registry';
import type { KindDef } from '../types';

export type PolygonAttrs = {
  vertices: string[];
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
    if (!Array.isArray(a?.vertices) || a.vertices.length < 3) {
      throw new Error('polygon: cần ít nhất 3 đỉnh');
    }
  },
  dependsOn: (a) => [...a.vertices],
  describe: (obj) => `Đa giác ${obj.attrs.vertices.join('')}`,
  render: (obj, ctx) => {
    const board = ctx.jxg as any;
    const verts = obj.attrs.vertices.map(id => ctx.resolveRef(id));
    const label = obj.label;
    const showValue = obj.attrs.showValue ?? false;
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
