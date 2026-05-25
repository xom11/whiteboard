// src/stamps/geometry-2d/dsl/transpile/ids.ts
import type { DslPointT, DslShapeT } from '../schema';
import type { Symbol } from './symbols';

type Prefix = 'p' | 'i' | 's' | 'l' | 'r' | 'poly' | 'c';

function prefixFor(sym: Symbol): Prefix {
  if (sym.role === 'point') {
    const p = sym.entity as DslPointT;
    return p.kind === 'intersection' ? 'i' : 'p';
  }
  const s = sym.entity as DslShapeT;
  switch (s.kind) {
    case 'segment':       return 's';
    case 'ray':           return 'r';
    case 'polygon':       return 'poly';
    case 'circleCP':
    case 'circle3':       return 'c';
    // line + 5 line-constructions all share 'l'
    case 'line':
    case 'perpendicular':
    case 'parallel':
    case 'perpBisector':
    case 'angleBisector':
    case 'tangent':       return 'l';
  }
}

export function assignIds(symbols: Map<string, Symbol>): Map<string, string> {
  const counters: Record<Prefix, number> = { p: 0, i: 0, s: 0, l: 0, r: 0, poly: 0, c: 0 };
  const ids = new Map<string, string>();
  // Insertion order của Map khớp DSL order (points first, shapes after) — buildSymbols guarantee.
  for (const [name, sym] of symbols.entries()) {
    const prefix = prefixFor(sym);
    counters[prefix] += 1;
    ids.set(name, `${prefix}${counters[prefix]}`);
  }
  return ids;
}
