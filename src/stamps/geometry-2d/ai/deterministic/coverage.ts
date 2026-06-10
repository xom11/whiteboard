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
  // Comma-split lookahead: tách clause ở dấu phẩy đứng TRƯỚC từ dẫn. VN dùng
  // (Gọi|Vẽ|Kẻ|Cho|Lấy|Dựng|trên|với). EN ADDITIVE (issue #46 group B): các từ
  // dẫn sub-clause viết HOA đầu câu (Let|Draw|Mark|Take|Construct|Join) — "Triangle
  // ABC, let M be the midpoint of BC" tách thành 2 clause. Thuần additive: không
  // đổi segmentation VN (alternation rời nhau, không trùng từ).
  let proofMode = false;

  return problem
    .split(
      /[.;\n]+|,\s*(?=(?:Gọi|Vẽ|Kẻ|Cho|Lấy|Dựng|trên|với|Let|Draw|Mark|Take|Construct|Join)\b)/u,
    )
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .map((text, id) => {
      const hasGeometryKeyword = countGeometryKeywords(text) > 0;
      const proofOnly = isProofOnlyClause(text, proofMode);
      if (startsProofSection(text)) proofMode = true;
      // Mệnh đề LOCUS ("điểm A di chuyển/di động trên (O)") = điều kiện chuyển
      // động trên điểm ĐÃ dựng (đỉnh), KHÔNG phải construct → loại khỏi coverage.
      const locusOnly = LOCUS_CLAUSE.test(text) && !CONSTRUCTION_LEAD.test(text);
      return { id, text, hasGeometry: hasGeometryKeyword && !proofOnly && !locusOnly };
    });
}

// Tiền tố đánh số mục: "1.", "2)", "a)", "b.", "II." — có thể lặp ("1. a)").
// Strip trước khi nhận diện từ dẫn proof/construction (đề thi hay đánh số câu/ý).
const ENUM_PREFIX = '(?:[0-9]+\\s*[.)]?\\s*|[a-zA-Z]\\s*[.)]\\s*)*';

// Locus: "(Điểm)? X di chuyển/di động trên …" — quỹ tích của điểm đã có.
const LOCUS_CLAUSE = /(?:di\s*chuyển|di\s*động)\s+trên/u;

const PROOF_SECTION_START = new RegExp(
  `^${ENUM_PREFIX}(?:[Cc]hứng\\s*minh|[Tt]ính|[Tt]ìm|[Xx]ác\\s*định|[Hh]ãy\\s+xác\\s*định)(?!\\p{L})`,
  'u',
);

const CONSTRUCTION_LEAD = new RegExp(
  `^${ENUM_PREFIX}(?:[Cc]ho|[Gg]ọi|[Vv]ẽ|[Kk]ẻ|[Ll]ấy|[Dd]ựng|[Qq]ua|[Tt]ừ|[Tt]rên|[Nn]ối|Let|Draw|Mark|Take|Construct|Join)(?!\\p{L})`,
  'u',
);

function startsProofSection(text: string): boolean {
  return PROOF_SECTION_START.test(text);
}

function isProofOnlyClause(text: string, proofMode: boolean): boolean {
  if (PROOF_SECTION_START.test(text) && !CONSTRUCTION_LEAD.test(text)) return true;
  return proofMode && !CONSTRUCTION_LEAD.test(text);
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
