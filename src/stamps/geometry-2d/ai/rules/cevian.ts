// src/stamps/geometry-2d/ai/rules/cevian.ts
//
// Cevian (đường đồng quy từ đỉnh): đường cao / trung tuyến / phân giác.
// Phrasing thực tế: tên cevian dạng VF = đỉnh + chân (vd "đường cao AH",
// "AM là trung tuyến", "vẽ phân giác AD"). Cần triangle context (ctx.problem)
// để suy ra cạnh đối diện đỉnh = 2 đỉnh còn lại.
//
// Mỗi clause khớp → RuleMatch với 2 intent cùng clauseId:
//   - add-point (chân: perpFoot / midpoint / angleBisectorFoot)
//   - connect (đoạn cevian visible VF, style segment)
import type { LanguageRule, RuleMatch } from './_types';
import { addPoint, connect } from './_shared';

// Tam giác từ toàn đề (cần để suy cạnh đối diện). LƯU Ý: \b không khớp quanh
// ký tự Việt → dùng class trực tiếp, có cờ 'u'.
const TRI = /tam\s*giác(?:\s+(?:vuông|cân|đều|nhọn|tù))?\s+([A-Z])([A-Z])([A-Z])/u;

// Cevian type → patterns. Mỗi pattern capture đỉnh (g1) + chân (g2): 2 ký tự
// HOA liền (vd "AH"). (?![A-Z]) chặn match nhầm vào cụm 3 ký tự (vd "ABC").
type CevianType = 'altitude' | 'median' | 'bisector';

const CEVIAN_PATTERNS: ReadonlyArray<{ type: CevianType; patterns: readonly RegExp[] }> = [
  {
    type: 'altitude',
    patterns: [
      /(?:kẻ|vẽ|hạ|dựng)\s+đường\s*cao\s+([A-Z])([A-Z])(?![A-Z])/u,
      /đường\s*cao\s+([A-Z])([A-Z])(?![A-Z])/u,
      /(?<![A-Z])([A-Z])([A-Z])\s+(?:là\s+|=\s+)?đường\s*cao/u,
    ],
  },
  {
    type: 'median',
    patterns: [
      /(?:kẻ|vẽ|dựng)\s+trung\s*tuyến\s+([A-Z])([A-Z])(?![A-Z])/u,
      /trung\s*tuyến\s+([A-Z])([A-Z])(?![A-Z])/u,
      /(?<![A-Z])([A-Z])([A-Z])\s+(?:là\s+|=\s+)?trung\s*tuyến/u,
    ],
  },
  {
    type: 'bisector',
    patterns: [
      /(?:kẻ|vẽ|dựng)\s+(?:đường\s*|tia\s+)?phân\s*giác\s+([A-Z])([A-Z])(?![A-Z])/u,
      /(?:đường\s*phân\s*giác|tia\s+phân\s*giác|phân\s*giác)\s+([A-Z])([A-Z])(?![A-Z])/u,
      /(?<![A-Z])([A-Z])([A-Z])\s+(?:là\s+|=\s+)?(?:đường\s*|tia\s+)?phân\s*giác/u,
    ],
  },
];

// Prefilter: bất kỳ từ khoá cevian nào trên toàn đề.
const PREFILTER = [/đường\s*cao/u, /trung\s*tuyến/u, /phân\s*giác/u];

/** Cạnh đối diện đỉnh V trong tam giác = 2 đỉnh còn lại, join token (vd "BC"). */
function opposite(tri: readonly string[], vertex: string): string | undefined {
  const rest = tri.filter((v) => v !== vertex);
  return rest.length === 2 ? rest[0] + rest[1] : undefined;
}

/**
 * "đường cao AH" / "trung tuyến AM" / "phân giác AD" → add-point(chân) +
 * connect(VF). apex PHẢI là đỉnh tam giác (else bỏ qua: tránh match nhầm
 * cặp như "BD cắt"). Không có tam giác hoặc apex ngoài tam giác → escalate.
 */
export const cevianRule: LanguageRule = {
  id: 'cevian',
  priority: 60,
  languages: ['vi'],
  patterns: PREFILTER,
  match(ctx) {
    const triMatch = TRI.exec(ctx.problem);
    if (!triMatch) return []; // không có tam giác → escalate
    const tri = [triMatch[1], triMatch[2], triMatch[3]];

    const out: RuleMatch[] = [];
    const claimedFeet = new Set<string>();

    for (const c of ctx.clauses) {
      // 1 clause có thể chứa nhiều cevian khác loại ("đường cao AH và trung
      // tuyến BM") → duyệt MỌI type, mỗi cevian 1 RuleMatch riêng.
      for (const cp of CEVIAN_PATTERNS) {
        let matched: { apex: string; foot: string } | undefined;
        for (const re of cp.patterns) {
          const m = re.exec(c.text);
          if (!m) continue;
          const apex = m[1];
          const foot = m[2];
          // apex phải là đỉnh tam giác; else có thể là cặp cạnh ngẫu nhiên.
          if (!tri.includes(apex)) continue;
          matched = { apex, foot };
          break;
        }
        if (!matched) continue;
        if (claimedFeet.has(matched.foot)) continue;

        const opp = opposite(tri, matched.apex);
        if (!opp) continue; // apex không suy ra được cạnh đối diện → bỏ qua

        const { apex, foot } = matched;
        let pointIntent;
        if (cp.type === 'altitude') {
          pointIntent = addPoint(foot, { kind: 'perpFoot', from: apex, onLine: opp });
        } else if (cp.type === 'median') {
          pointIntent = addPoint(foot, { kind: 'midpoint', of: opp });
        } else {
          pointIntent = addPoint(foot, {
            kind: 'angleBisectorFoot',
            from: apex,
            onLine: opp,
          });
        }

        claimedFeet.add(foot);
        out.push({
          ruleId: 'cevian',
          clauseIds: [c.id],
          intents: [pointIntent, connect(apex, foot, 'segment')],
        });
      }
    }
    return out;
  },
};
