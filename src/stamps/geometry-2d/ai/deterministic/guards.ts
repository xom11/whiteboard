// src/stamps/geometry-2d/ai/deterministic/guards.ts
//
// Guard chống "im lặng thiếu điểm": mọi điểm/đối tượng được ĐẶT TÊN trong đề
// ("Gọi M…", "lấy điểm D", "cắt … tại D") PHẢI tồn tại trong DSL dựng được.
// Nếu thiếu → rule đã claim clause nhưng không dựng đủ → router escalate AI thay
// vì dùng hình thiếu. Đây là lớp gate bổ sung cho coverage clause-level (coarse).
import type { DslInputT } from '../../dsl/schema';

// Tên điểm được giới thiệu/tham chiếu rõ ràng. KHÔNG dùng \b (ASCII) quanh ký tự
// Việt; bắt 1 ký tự HOA đơn (không phải cặp đỉnh hay từ dài hơn).
const NAMED = /(?:Gọi|gọi|Lấy|lấy|Dựng|dựng|Đặt|đặt|tại|điểm)\s+(?:điểm\s+)?([A-Z])(?![A-Za-z])/gu;

export interface NamedEntityReport {
  ok: boolean;
  missing: string[];
}

export function allNamedEntitiesPresent(
  problem: string,
  dsl: DslInputT,
): NamedEntityReport {
  const present = new Set<string>();
  for (const p of dsl.points) present.add(p.name);
  for (const s of dsl.shapes) present.add(s.name);

  const missing = new Set<string>();
  NAMED.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = NAMED.exec(problem)) !== null) {
    const name = m[1];
    if (!present.has(name)) missing.add(name);
  }
  return { ok: missing.size === 0, missing: [...missing] };
}
