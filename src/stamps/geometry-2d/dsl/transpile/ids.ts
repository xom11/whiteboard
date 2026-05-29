// src/stamps/geometry-2d/dsl/transpile/ids.ts
import type { Symbol } from './symbols';
import { KIND_REGISTRY } from '../registry';

export function assignIds(symbols: Map<string, Symbol>): Map<string, string> {
  const counters = new Map<string, number>();
  const ids = new Map<string, string>();
  for (const [name, sym] of symbols.entries()) {
    const mod = KIND_REGISTRY.get(sym.entity.kind);
    if (!mod) throw new Error(`assignIds: no registry entry for kind "${sym.entity.kind}"`);
    const prefix = mod.prefix;
    counters.set(prefix, (counters.get(prefix) ?? 0) + 1);
    ids.set(name, `${prefix}${counters.get(prefix)}`);
  }
  return ids;
}
