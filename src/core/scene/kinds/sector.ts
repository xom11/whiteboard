// src/core/scene/kinds/sector.ts
import { registerKind } from '../registry';
import type { KindDef } from '../types';
import { labelOf } from './labelOf';

export type SectorConstruction =
  | { kind: 'byCenter'; center: string; p1: string; p2: string };

export type SectorAttrs = {
  construction: SectorConstruction;
  color?: string;
  width?: number;
  fillColor?: string;
  fillOpacity?: number;
  showLabel?: boolean;
};

const def: KindDef<SectorAttrs> = {
  type: 'sector',
  schemaVersion: 1,
  migrate: {},
  validate: (a) => {
    const c = a?.construction;
    if (!c) throw new Error('sector: construction bắt buộc');
    if (c.kind === 'byCenter') {
      if (!c.center || !c.p1 || !c.p2) {
        throw new Error('sector.byCenter: center, p1, p2 bắt buộc');
      }
    }
  },
  dependsOn: (a) => {
    const c = a.construction;
    return [c.center, c.p1, c.p2];
  },
  describe: (obj, state) => {
    const L = (id: string) => labelOf(id, state);
    const c = obj.attrs.construction;
    return `Hình quạt tâm ${L(c.center)} ${L(c.p1)}${L(c.p2)}`;
  },
  render: (obj, ctx) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const board = ctx.jxg as any;
    const c = obj.attrs.construction;
    const O = ctx.resolveRef(c.center);
    const A = ctx.resolveRef(c.p1);
    const B = ctx.resolveRef(c.p2);
    return board.create('sector', [O, A, B], {
      name: obj.label,
      withLabel: obj.attrs.showLabel ?? false,
      strokeColor: obj.attrs.color ?? '#0f172a',
      strokeWidth: obj.attrs.width ?? 2,
      fillColor: obj.attrs.fillColor ?? '#f59e0b',
      fillOpacity: obj.attrs.fillOpacity ?? 0.18,
      visible: obj.visible,
      fixed: obj.locked,
    });
  },
};

registerKind(def);
