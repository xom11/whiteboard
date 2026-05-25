// src/stamps/geometry-2d/dsl/transpile/cycles.ts
import type { Symbol } from './symbols';
import { collectRefs } from './refs';
import { mkError, type TranspileError } from './errors';

type Color = 'white' | 'gray' | 'black';

export interface CyclesResult {
  errors: TranspileError[];
}

export function detectCycles(symbols: Map<string, Symbol>): CyclesResult {
  const color = new Map<string, Color>();
  const parent = new Map<string, string | null>();
  const errors: TranspileError[] = [];
  const reportedCycles = new Set<string>();

  for (const name of symbols.keys()) color.set(name, 'white');

  function reportCycle(start: string, hit: string) {
    // reconstruct chain hit ← ... ← start
    const chain: string[] = [start];
    let cur: string | null | undefined = parent.get(start);
    while (cur && cur !== hit && chain.length < symbols.size + 2) {
      chain.push(cur);
      cur = parent.get(cur);
    }
    chain.push(hit);
    // normalize cho dedupe (rotate min-first)
    const minIdx = chain.indexOf(chain.reduce((a, b) => (a < b ? a : b)));
    const rotated = [...chain.slice(minIdx), ...chain.slice(0, minIdx)];
    const key = rotated.join('→');
    if (reportedCycles.has(key)) return;
    reportedCycles.add(key);
    errors.push(mkError('CYCLE',
      `Phụ thuộc vòng: ${chain.reverse().join(' → ')}`,
      { path: [...chain], hint: 'Kiểm tra lại quan hệ midpoint/perpFoot/intersection.' }));
  }

  function dfs(name: string) {
    color.set(name, 'gray');
    const sym = symbols.get(name);
    if (sym) {
      for (const ref of collectRefs(sym.entity)) {
        if (!symbols.has(ref)) continue; // unknown — refs.ts handle
        const c = color.get(ref);
        if (c === 'gray') {
          reportCycle(name, ref);
          continue;
        }
        if (c === 'white') {
          parent.set(ref, name);
          dfs(ref);
        }
      }
    }
    color.set(name, 'black');
  }

  for (const name of symbols.keys()) {
    if (color.get(name) === 'white') {
      parent.set(name, null);
      dfs(name);
    }
  }

  return { errors };
}
