// src/stamps/geometry-2d/ai/deterministic/coverage.ts
//
// Clause segmentation + coverage cho deterministic-first gate.
// Track A chỉ "tự tin" dùng kết quả khi MỌI clause mang nội dung hình học
// đều được ít nhất 1 rule match claim. Còn sót → escalate AI.
import { countGeometryKeywords } from './vocabulary';

export interface Clause {
  id: number;
  text: string;
  /** clause chứa ≥1 từ khoá hình học → tính vào mẫu số coverage. */
  hasGeometry: boolean;
}

export interface CoverageReport {
  complete: boolean;
  coveredClauseIds: number[];
  uncovered: Clause[];
  ratio: number;
}

interface MatchLike {
  clauseIds: number[];
}

/**
 * Tách đề thành clause theo dấu câu (. ; xuống dòng) và dấu phẩy đứng trước
 * từ dẫn ("Gọi", "Vẽ", "Kẻ"…). Clause thuần văn xuôi (không từ khoá hình học)
 * vẫn được giữ nhưng `hasGeometry=false` để không ép escalate.
 */
export function segmentClauses(problem: string): Clause[] {
  return problem
    .split(/[.;\n]+|,\s*(?=(?:Gọi|Vẽ|Kẻ|Cho|Lấy|Dựng|trên|với)\b)/u)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .map((text, id) => ({ id, text, hasGeometry: countGeometryKeywords(text) > 0 }));
}

export function computeCoverage(
  clauses: readonly Clause[],
  matches: readonly MatchLike[],
): CoverageReport {
  const claimed = new Set<number>();
  for (const m of matches) for (const id of m.clauseIds) claimed.add(id);

  const geoClauses = clauses.filter((c) => c.hasGeometry);
  const uncovered = geoClauses.filter((c) => !claimed.has(c.id));
  const coveredClauseIds = geoClauses
    .filter((c) => claimed.has(c.id))
    .map((c) => c.id);

  return {
    complete: uncovered.length === 0 && geoClauses.length > 0,
    coveredClauseIds,
    uncovered,
    ratio: geoClauses.length === 0 ? 0 : coveredClauseIds.length / geoClauses.length,
  };
}
