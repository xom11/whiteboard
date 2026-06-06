// src/stamps/geometry-2d/ai/rules/midpoint.ts
import type { LanguageRule, RuleMatch } from './_types';
import { addPoint, extractPointName, pairFromToken } from './_shared';

// LƯU Ý: \b của JS dựa trên ASCII word-char nên KHÔNG khớp quanh ký tự Việt
// ("đ","ề"…). Mọi regex chứa ký tự Việt dùng cờ 'u' + lookaround \p{L}.

// Prefilter toàn đề. "trung điểm" KHÔNG khớp "trung trực" (an toàn, rule khác lo).
const MIDPOINT = /trung\s*điểm/u;

// Dạng A: tên điểm ĐỨNG TRƯỚC "(là) trung điểm (của (cạnh|đoạn)) <PAIR>".
//   "Gọi M là trung điểm BC" | "M là trung điểm của BC" | "M trung điểm cạnh BC"
const NAME_BEFORE =
  /([A-Z])(?:['′]?)\s+(?:là\s+|=\s+)?trung\s*điểm\s+(?:của\s+)?(?:cạnh\s+|đoạn\s+)?([A-Z])([A-Z])/u;

// Dạng B: tên điểm ĐỨNG SAU "trung điểm <NAME> của (cạnh|đoạn) <PAIR>".
//   "trung điểm I của (cạnh) AB"
const NAME_AFTER =
  /trung\s*điểm\s+([A-Z])(?:['′]?)\s+của\s+(?:cạnh\s+|đoạn\s+)?([A-Z])([A-Z])/u;

/**
 * "Gọi M là trung điểm BC" → add-point M {kind:'midpoint', of:'BC'}.
 *
 * Trích tên điểm theo thứ tự ưu tiên:
 *   1. extractPointName (lời dẫn "Gọi/Lấy/… X là …")
 *   2. ký tự HOA ngay trước "(là) trung điểm" (dạng A)
 *   3. ký tự HOA ngay sau "trung điểm" (dạng B, "trung điểm I của AB")
 * Cặp đỉnh `of` lấy từ token 2 ký tự HOA liền sau cụm trung điểm.
 * Không trích được tên hoặc cặp đỉnh → BỎ QUA clause (escalate AI).
 */
export const midpointRule: LanguageRule = {
  id: 'midpoint',
  priority: 50,
  languages: ['vi'],
  patterns: [MIDPOINT],
  match(ctx) {
    const out: RuleMatch[] = [];
    for (const c of ctx.clauses) {
      if (!MIDPOINT.test(c.text)) continue;

      let name: string | undefined;
      let pair: string[] = [];

      const before = NAME_BEFORE.exec(c.text);
      const after = NAME_AFTER.exec(c.text);

      if (before) {
        // Lời dẫn ("Gọi M …") ưu tiên hơn ký tự đứng trước nếu có; cả hai
        // thường trùng nhau, nhưng extractPointName an toàn với "Gọi điểm M".
        name = extractPointName(c.text) ?? before[1];
        pair = pairFromToken(before[2] + before[3]);
      } else if (after) {
        name = after[1];
        pair = pairFromToken(after[2] + after[3]);
      }

      // Không có tên hoặc cặp đỉnh → bỏ qua (đừng bịa tên).
      if (!name || pair.length !== 2) continue;

      out.push({
        ruleId: 'midpoint',
        clauseIds: [c.id],
        intents: [addPoint(name, { kind: 'midpoint', of: pair.join('') })],
      });
    }
    return out;
  },
};
