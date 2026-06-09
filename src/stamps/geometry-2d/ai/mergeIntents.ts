// src/stamps/geometry-2d/ai/mergeIntents.ts
//
// Hybrid partial-coverage (Phase 1): gộp intent deterministic + intent LLM bù
// phần clause chưa phủ. Hai quy tắc:
//   1. Dedup exact (cùng JSON).
//   2. Deterministic SỞ HỮU tên (đỉnh draw-shape / name add-point/draw-circle/
//      draw-line) → LLM KHÔNG được định nghĩa lại tên đó (drop bản LLM, det thắng).
//      intent tham chiếu (connect…) KHÔNG sở hữu tên → luôn giữ.
//
// Det luôn đứng trước, LLM (đã lọc) nối sau — giữ thứ tự dựng.
import type { IntentT } from './intent';

/** Tên mà 1 intent ĐỊNH NGHĨA (tạo mới). connect/ref → [] (chỉ tham chiếu). */
function intentOwnedNames(intent: IntentT): string[] {
  const i = intent as unknown as { op: string; labels?: unknown; name?: unknown };
  if (i.op === 'draw-shape') {
    return Array.isArray(i.labels) ? (i.labels as string[]) : [];
  }
  // add-point / draw-circle / draw-line đều có `name` định danh entity mới.
  if (typeof i.name === 'string') return [i.name];
  return [];
}

/**
 * Gộp intent deterministic (det) + intent LLM bù (llm). Det giữ nguyên; mỗi
 * intent LLM bị loại nếu: trùng JSON với intent đã có, HOẶC định nghĩa lại tên
 * mà det đã sở hữu (det thắng — phần deterministic đã đúng, đừng để LLM ghi đè).
 */
export function mergeIntents(det: readonly IntentT[], llm: readonly IntentT[]): IntentT[] {
  const detOwned = new Set<string>();
  for (const i of det) for (const n of intentOwnedNames(i)) detOwned.add(n);

  const seen = new Set<string>(det.map((i) => JSON.stringify(i)));
  const out: IntentT[] = [...det];

  for (const i of llm) {
    const key = JSON.stringify(i);
    if (seen.has(key)) continue; // trùng exact
    const owned = intentOwnedNames(i);
    if (owned.some((n) => detOwned.has(n))) continue; // redefine tên det → drop
    seen.add(key);
    out.push(i);
  }
  return out;
}
