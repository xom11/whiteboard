// src/stamps/geometry-2d/ai/rules/cevian.ts
//
// Cevian (đường đồng quy từ đỉnh): đường cao / trung tuyến / phân giác.
// Phrasing thực tế: tên cevian dạng VF = đỉnh + chân (vd "đường cao AH",
// "AM là trung tuyến", "vẽ phân giác AD"). Cần triangle context (ctx.problem)
// để suy ra cạnh đối diện đỉnh = 2 đỉnh còn lại.
//
// Mỗi cevian khớp → RuleMatch với 2 intent cùng clauseId:
//   - add-point (chân: perpFoot / midpoint / angleBisectorFoot)
//   - connect (đoạn cevian visible VF, style segment)
//
// Nguyên tắc fail-safe:
//   - 1 clause có thể chứa NHIỀU cevian (cùng/khác loại): dùng matchAll (cờ /g)
//     để emit ĐỦ, không chỉ match đầu tiên.
//   - foot trùng đỉnh tam giác ("đường cao AB" → foot=B) → SKIP (đừng tạo
//     add-point sẽ bị builder hạ về 'free' → fidelity guard escalate).
//   - 2 cevian KHÁC nhau cùng đặt 1 tên chân (vd "đường cao AH" + "trung tuyến
//     BH" — cùng tên H nhưng ràng buộc mâu thuẫn) → SKIP tất cả cevian mang tên
//     chân đó (không claim → coverage escalate). Thà escalate còn hơn dựng SAI.
import type { LanguageRule, RuleMatch } from './_types';
import { addPoint, connect } from './_shared';

// Tam giác từ toàn đề (cần để suy cạnh đối diện). LƯU Ý: \b không khớp quanh
// ký tự Việt → dùng class trực tiếp, có cờ 'u'.
const TRI = /tam\s*giác(?:\s+(?:vuông|cân|đều|nhọn|tù))?\s+([A-Z])([A-Z])([A-Z])/u;

// Cevian type → patterns. Mỗi pattern capture đỉnh (g1) + chân (g2): 2 ký tự
// HOA liền (vd "AH"). (?![A-Z]) chặn match nhầm vào cụm 3 ký tự (vd "ABC").
// TẤT CẢ pattern dùng cờ /g để matchAll bắt MỌI cevian trong 1 clause.
type CevianType = 'altitude' | 'median' | 'bisector' | 'externalBisector';

// LƯU Ý case: KHÔNG dùng cờ 'i' (làm [A-Z] khớp chữ thường → bắt rác). Nhưng
// keyword có thể HOA ở đầu câu ("Đường cao AH", "Trung tuyến AM", "Phân giác AD")
// → ký tự đầu keyword + verb dùng [Xx]; vertices LUÔN strict [A-Z].
const CEVIAN_PATTERNS: ReadonlyArray<{ type: CevianType; patterns: readonly RegExp[] }> = [
  {
    type: 'altitude',
    patterns: [
      /(?:[Kk]ẻ|[Vv]ẽ|[Hh]ạ|[Dd]ựng)\s+[Đđ]ường\s*cao\s+([A-Z])([A-Z])(?![A-Z])/gu,
      /[Đđ]ường\s*cao\s+([A-Z])([A-Z])(?![A-Z])/gu,
      /(?<![A-Z])([A-Z])([A-Z])\s+(?:là\s+|=\s+)?đường\s*cao/gu,
    ],
  },
  {
    type: 'median',
    patterns: [
      /(?:[Kk]ẻ|[Vv]ẽ|[Dd]ựng)\s+[Tt]rung\s*tuyến\s+([A-Z])([A-Z])(?![A-Z])/gu,
      /[Tt]rung\s*tuyến\s+([A-Z])([A-Z])(?![A-Z])/gu,
      /(?<![A-Z])([A-Z])([A-Z])\s+(?:là\s+|=\s+)?trung\s*tuyến/gu,
    ],
  },
  {
    // "phân giác (trong) AD": từ "trong" (phân giác TRONG = internal bisector,
    // loại thường) tuỳ chọn chen giữa "phân giác" và cặp đỉnh. "phân giác NGOÀI"
    // (external bisector) CHƯA hỗ trợ: forward tự reject (sau "phân giác" là chữ
    // thường "ngoài", không HOA pair); suffix cần (?!\s+ngoài) để KHÔNG nhận nhầm
    // "AD là phân giác ngoài" thành internal → escalate (fail-safe).
    type: 'bisector',
    patterns: [
      /(?:[Kk]ẻ|[Vv]ẽ|[Dd]ựng)\s+(?:[Đđ]ường\s*|[Tt]ia\s+)?phân\s*giác(?:\s+trong)?\s+([A-Z])([A-Z])(?![A-Z])/gu,
      /(?:[Đđ]ường\s*phân\s*giác|[Tt]ia\s+phân\s*giác|[Pp]hân\s*giác)(?:\s+trong)?\s+([A-Z])([A-Z])(?![A-Z])/gu,
      /(?<![A-Z])([A-Z])([A-Z])\s+(?:là\s+|=\s+)?(?:đường\s*|tia\s+)?phân\s*giác(?:\s+trong)?(?!\s+ngoài)/gu,
    ],
  },
  {
    // "phân giác NGOÀI AD" (external bisector, Issue #46 nhóm A). Nhánh RIÊNG,
    // BẮT BUỘC có từ "ngoài" sau "phân giác" (forward) hoặc trước/sau cặp đỉnh
    // (suffix). Phân giác ngoài ⊥ phân giác trong tại đỉnh → builder dựng qua
    // angleBisector(trong) + perpendicular. KHÔNG đụng pattern 'bisector' nội bộ
    // (vốn đã reject "ngoài" qua chữ thường forward + (?!\s+ngoài) suffix).
    type: 'externalBisector',
    patterns: [
      /(?:[Kk]ẻ|[Vv]ẽ|[Dd]ựng)\s+(?:[Đđ]ường\s*|[Tt]ia\s+)?phân\s*giác\s+ngoài\s+([A-Z])([A-Z])(?![A-Z])/gu,
      /(?:[Đđ]ường\s*phân\s*giác|[Tt]ia\s+phân\s*giác|[Pp]hân\s*giác)\s+ngoài\s+([A-Z])([A-Z])(?![A-Z])/gu,
      /(?<![A-Z])([A-Z])([A-Z])\s+(?:là\s+|=\s+)?(?:đường\s*|tia\s+)?phân\s*giác\s+ngoài/gu,
    ],
  },
];

// Prefilter: bất kỳ từ khoá cevian nào trên toàn đề (hoa đầu câu → [Đđ]/[Tt]/[Pp]).
const PREFILTER = [/[Đđ]ường\s*cao/u, /[Tt]rung\s*tuyến/u, /[Pp]hân\s*giác/u];

/** Cạnh đối diện đỉnh V trong tam giác = 2 đỉnh còn lại, join token (vd "BC"). */
function opposite(tri: readonly string[], vertex: string): string | undefined {
  const rest = tri.filter((v) => v !== vertex);
  return rest.length === 2 ? rest[0] + rest[1] : undefined;
}

interface Cevian {
  clauseId: number;
  type: CevianType;
  apex: string;
  foot: string;
  opp: string;
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

    // ── Pass 1: gom MỌI cevian hợp lệ (apex là đỉnh, foot không trùng đỉnh) ──
    // Dedup theo (apex,foot,type) — KHÔNG dedup chỉ theo tên chân: 2 cevian
    // khác nhau cùng tên chân là XUNG ĐỘT (xử ở pass 2), không phải trùng lặp.
    const candidates: Cevian[] = [];
    const seen = new Set<string>(); // "apex|foot|type"

    for (const c of ctx.clauses) {
      for (const cp of CEVIAN_PATTERNS) {
        for (const re of cp.patterns) {
          re.lastIndex = 0;
          for (const m of c.text.matchAll(re)) {
            const apex = m[1];
            const foot = m[2];
            // apex phải là đỉnh tam giác; else có thể là cặp cạnh ngẫu nhiên.
            if (!tri.includes(apex)) continue;
            // foot trùng đỉnh tam giác ("đường cao AB" → foot=B) → SKIP sớm:
            // builder sẽ hạ điểm về 'free' → fidelity guard escalate; bỏ ở đây
            // cho sạch (không claim → coverage escalate trực tiếp).
            if (tri.includes(foot)) continue;
            const opp = opposite(tri, apex);
            if (!opp) continue; // apex không suy ra được cạnh đối diện → bỏ qua

            const key = `${apex}|${foot}|${cp.type}`;
            if (seen.has(key)) continue;
            seen.add(key);
            candidates.push({ clauseId: c.id, type: cp.type, apex, foot, opp });
          }
        }
      }
    }

    // ── Pass 2: phát hiện XUNG ĐỘT tên chân ──
    // Nếu 1 tên chân được ≥2 cevian khác nhau đặt (vd "đường cao AH" +
    // "trung tuyến BH" cùng tên H, ràng buộc mâu thuẫn) → bỏ TẤT cevian mang
    // tên đó. Không claim → escalate (thà escalate còn hơn dựng SAI ngữ nghĩa).
    const footCount = new Map<string, number>();
    for (const cv of candidates) footCount.set(cv.foot, (footCount.get(cv.foot) ?? 0) + 1);

    const out: RuleMatch[] = [];
    for (const cv of candidates) {
      if ((footCount.get(cv.foot) ?? 0) > 1) continue; // tên chân xung đột → skip

      let pointIntent;
      if (cv.type === 'altitude') {
        pointIntent = addPoint(cv.foot, { kind: 'perpFoot', from: cv.apex, onLine: cv.opp });
      } else if (cv.type === 'median') {
        pointIntent = addPoint(cv.foot, { kind: 'midpoint', of: cv.opp });
      } else if (cv.type === 'externalBisector') {
        pointIntent = addPoint(cv.foot, {
          kind: 'externalAngleBisectorFoot',
          from: cv.apex,
          onLine: cv.opp,
        });
      } else {
        pointIntent = addPoint(cv.foot, {
          kind: 'angleBisectorFoot',
          from: cv.apex,
          onLine: cv.opp,
        });
      }

      out.push({
        ruleId: 'cevian',
        clauseIds: [cv.clauseId],
        intents: [pointIntent, connect(cv.apex, cv.foot, 'segment')],
      });
    }
    return out;
  },
};
