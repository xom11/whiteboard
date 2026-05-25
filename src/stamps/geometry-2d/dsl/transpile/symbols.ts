// src/stamps/geometry-2d/dsl/transpile/symbols.ts
import type { DslInputT, DslPointT, DslShapeT } from '../schema';
import { mkError, type TranspileError } from './errors';

export type Role = 'point' | 'shape';

export interface Symbol {
  name: string;
  role: Role;
  entity: DslPointT | DslShapeT;
  index: number; // vị trí trong list nguyên thuỷ (cho deterministic id assign sau)
}

export interface SymbolResult {
  symbols: Map<string, Symbol>;
  errors: TranspileError[];
}

export function buildSymbols(dsl: DslInputT): SymbolResult {
  const symbols = new Map<string, Symbol>();
  const errors: TranspileError[] = [];
  let counter = 0;

  for (const p of dsl.points) {
    if (symbols.has(p.name)) {
      errors.push(mkError('DUPLICATE_NAME', `Tên trùng: "${p.name}"`, { path: [p.name] }));
      continue;
    }
    symbols.set(p.name, { name: p.name, role: 'point', entity: p, index: counter++ });
  }

  for (const s of dsl.shapes) {
    if (symbols.has(s.name)) {
      errors.push(mkError('DUPLICATE_NAME', `Tên trùng: "${s.name}"`, { path: [s.name] }));
      continue;
    }
    symbols.set(s.name, { name: s.name, role: 'shape', entity: s, index: counter++ });
  }

  return { symbols, errors };
}
