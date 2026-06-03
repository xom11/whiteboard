// src/stamps/geometry-2d/dsl/transpile/topology.ts
//
// Stable topological sort: preserve DSL insertion order khi không có constraint,
// chỉ trì hoãn entity tới khi mọi reference đã emit. Fix bug render perpFoot
// đứng trước segment dùng làm onLine.
//
// Khác DFS post-order (kéo deps lên trước): Kahn-style iterative đảm bảo
// roundtrip stability — entity không có constraint phụ thuộc lẫn nhau giữ
// đúng thứ tự DSL gốc.

import type { Symbol } from './symbols';
import { collectRefs } from './refs';

/**
 * Trả về danh sách tên entity theo thứ tự topological STABLE:
 *   - Mọi name X xuất hiện SAU mọi name X tham chiếu.
 *   - Khi 2 entity không phụ thuộc lẫn nhau, giữ relative order từ symbols
 *     (= DSL insertion order: points trước shapes, mỗi nhóm theo DSL order).
 *
 * Giả định cycles đã được loại bởi detectCycles trước đó. Nếu vẫn có cycle,
 * entity unresolved sẽ append cuối để output đủ count.
 */
export function topoSort(symbols: Map<string, Symbol>): string[] {
  const all = [...symbols.keys()];
  const emitted = new Set<string>();
  const order: string[] = [];

  // Pre-compute deps filtered xuống chỉ tên có trong symbols.
  const depsOf = new Map<string, string[]>();
  for (const name of all) {
    const sym = symbols.get(name);
    if (!sym) {
      depsOf.set(name, []);
      continue;
    }
    const refs = collectRefs(sym.entity).filter((r) => symbols.has(r));
    depsOf.set(name, refs);
  }

  // Lặp: mỗi vòng emit tất cả entity có deps đã emit, theo DSL order.
  // Worst case O(n^2) but n nhỏ (~20 entity/figure).
  let progressed = true;
  while (progressed) {
    progressed = false;
    for (const name of all) {
      if (emitted.has(name)) continue;
      const deps = depsOf.get(name)!;
      if (deps.every((d) => emitted.has(d))) {
        emitted.add(name);
        order.push(name);
        progressed = true;
      }
    }
  }

  // Cycle leftovers (defensive — detectCycles đáng lẽ catch): append đúng count.
  for (const name of all) {
    if (!emitted.has(name)) order.push(name);
  }

  return order;
}
