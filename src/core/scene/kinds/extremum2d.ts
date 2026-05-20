// src/core/scene/kinds/extremum2d.ts
import { registerKind } from '../registry';
import type { KindDef } from '../types';
import { scanExtrema } from '../expressions/evaluator';
import { compile } from '../expressions/parser';

export interface Extremum2DAttrs {
  functionId: string;
  interval: { min: number; max: number };
  mode: 'max' | 'min';
}

const def: KindDef<Extremum2DAttrs> = {
  type: 'extremum2d',
  schemaVersion: 1,
  migrate: {},
  validate: (a) => {
    if (!a || typeof a.functionId !== 'string' || !a.functionId) {
      throw new Error('extremum2d: functionId bắt buộc');
    }
    if (!a.interval || a.interval.min >= a.interval.max) {
      throw new Error('extremum2d: interval min phải < max');
    }
    if (a.mode !== 'max' && a.mode !== 'min') {
      throw new Error('extremum2d: mode phải là "max" hoặc "min"');
    }
  },
  dependsOn: (a) => [a.functionId],
  describe: (obj) => `${obj.attrs.mode === 'max' ? 'Cực đại' : 'Cực tiểu'} của ${obj.attrs.functionId} trong [${obj.attrs.interval.min}, ${obj.attrs.interval.max}]`,
  render: (obj, ctx) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const board = ctx.jxg as any;
    // Need expression from function — look up via state if needed.
    // Simplified: use compiled-from-attrs cached in ctx.defaults._functionExpr (renderer populates).
    const expr = (ctx.defaults as { _functionExpr?: Record<string, string> })._functionExpr?.[obj.attrs.functionId];
    if (!expr) return null;
    const fn = compile(expr, (ctx.paramMap ?? {}) as Record<string, number>);
    if (typeof fn !== 'function') return null;
    const extrema = scanExtrema(fn, obj.attrs.interval.min, obj.attrs.interval.max).filter((e) => e.type === obj.attrs.mode);
    return extrema.map((e) => board.create('point', [e.x, e.y], {
      name: obj.label,
      size: 3,
      fillColor: '#dc2626',
      strokeColor: '#dc2626',
      withLabel: obj.label !== '',
    }));
  },
};

registerKind(def);
