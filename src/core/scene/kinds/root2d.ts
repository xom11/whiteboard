// src/core/scene/kinds/root2d.ts
import { registerKind } from '../registry';
import type { KindDef } from '../types';
import { scanRoots } from '../expressions/evaluator';
import { compile } from '../expressions/parser';

export interface Root2DAttrs {
  functionId: string;
  interval: { min: number; max: number };
}

const def: KindDef<Root2DAttrs> = {
  type: 'root2d',
  schemaVersion: 1,
  migrate: {},
  validate: (a) => {
    if (!a || typeof a.functionId !== 'string' || !a.functionId) {
      throw new Error('root2d: functionId bắt buộc');
    }
    if (!a.interval || a.interval.min >= a.interval.max) {
      throw new Error('root2d: interval min phải < max');
    }
  },
  dependsOn: (a) => [a.functionId],
  describe: (obj) => `Nghiệm của ${obj.attrs.functionId} trong [${obj.attrs.interval.min}, ${obj.attrs.interval.max}]`,
  render: (obj, ctx) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const board = ctx.jxg as any;
    const expr = (ctx.defaults as { _functionExpr?: Record<string, string> })._functionExpr?.[obj.attrs.functionId];
    if (!expr) return null;
    const fn = compile(expr, (ctx.paramMap ?? {}) as Record<string, number>);
    if (typeof fn !== 'function') return null;
    const roots = scanRoots(fn, obj.attrs.interval.min, obj.attrs.interval.max);
    return roots.map((x) => board.create('point', [x, 0], {
      name: obj.label,
      size: 3,
      fillColor: '#dc2626',
      strokeColor: '#dc2626',
      withLabel: obj.label !== '',
    }));
  },
};

registerKind(def);
