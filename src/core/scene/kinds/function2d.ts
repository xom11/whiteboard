// src/core/scene/kinds/function2d.ts
import { registerKind } from '../registry';
import type { KindDef } from '../types';
import { validate as validateExpr, compile } from '../expressions/parser';

export interface Function2DAttrs {
  expression: string;
  color: string;
  visible: boolean;
  domain?: { min: number; max: number };
}

const def: KindDef<Function2DAttrs> = {
  type: 'function2d',
  schemaVersion: 1,
  migrate: {},
  validate: (a) => {
    if (!a) throw new Error('function2d: attrs bắt buộc');
    if (typeof a.expression !== 'string' || !a.expression.trim()) {
      throw new Error('function2d: expression rỗng');
    }
    const v = validateExpr(a.expression);
    if (!v.ok) throw new Error(`function2d: expression invalid — ${v.error}`);
    if (typeof a.color !== 'string') throw new Error('function2d: color bắt buộc');
    if (typeof a.visible !== 'boolean') throw new Error('function2d: visible bắt buộc');
    if (a.domain) {
      if (a.domain.min >= a.domain.max) {
        throw new Error('function2d: domain min phải < max');
      }
    }
  },
  dependsOn: () => [],
  describe: (obj) => `${obj.label}(x) = ${obj.attrs.expression}`,
  render: (obj, ctx) => {
     
    const board = ctx.jxg as any;
    if (!obj.visible || !obj.attrs.visible) return null;
    const fn = compile(obj.attrs.expression, (ctx.paramMap ?? {}) as Record<string, number>);
    if (typeof fn !== 'function') return null;
    const view = (ctx.defaults as { view?: { xMin?: number; xMax?: number } }).view;
    const xMin = obj.attrs.domain?.min ?? view?.xMin ?? -10;
    const xMax = obj.attrs.domain?.max ?? view?.xMax ?? 10;
    return board.create('functiongraph', [fn, xMin, xMax], {
      strokeColor: obj.attrs.color,
      strokeWidth: 2,
      name: obj.label,
      withLabel: false,
      highlight: false,
      fixed: true,
    });
  },
};

registerKind(def);
