// src/stamps/geometry-2d/ai/rules/perpBisector.ts
import type { LanguageRule, RuleMatch } from './_types';
import { connect, pairFromToken } from './_shared';

// LƯU Ý: \b của JS dựa trên ASCII word-char nên KHÔNG khớp quanh ký tự Việt
// ("đ","ề"…). Dùng lookaround \p{L} (cờ 'u') thay cho \b.
//
// "(đường) trung trực (của) (đoạn|đoạn thẳng|cạnh) <PAIR>"
//   "đường trung trực của BC" → connect('B','C','perpBisector')
//   "trung trực AB"           → connect('A','B','perpBisector')
//   "d là đường trung trực BC" → connect('B','C','perpBisector') (tên 'd' bỏ qua;
//                                connect không nhận name)
//
// Cụm nối giữa "trung trực" và cặp đỉnh: optional "của", "đoạn", "đoạn thẳng",
// "cạnh" (lặp tự do). Cặp đỉnh = 2 ký tự HOA liền.
const PERP_BISECTOR =
  /(?<!\p{L})trung\s*trực\s+(?:(?:của|đoạn|đoạn\s+thẳng|cạnh)\s+)*([A-Z][A-Z])(?!\p{L})/u;

/** prefilter nhanh trên toàn đề. */
const PREFILTER = /trung\s*trực/u;

/**
 * "(đường) trung trực của <PAIR>" → connect(P1, P2, 'perpBisector').
 *
 * Lấy cặp đỉnh ngay sau "trung trực" (bỏ qua "của/đoạn/cạnh" xen giữa). Nếu
 * không trích được cặp đỉnh hợp lệ → bỏ qua clause (escalate AI, an toàn hơn
 * đoán sai). Tên đường (vd "d là …") không cần — connect không nhận name.
 */
export const perpBisectorRule: LanguageRule = {
  id: 'perpBisector',
  priority: 70,
  languages: ['vi'],
  patterns: [PREFILTER],
  match(ctx) {
    const out: RuleMatch[] = [];
    for (const c of ctx.clauses) {
      const m = PERP_BISECTOR.exec(c.text);
      if (!m) continue;
      const pair = pairFromToken(m[1]);
      if (pair.length !== 2) continue; // không trích được cặp đỉnh → escalate
      out.push({
        ruleId: 'perpBisector',
        clauseIds: [c.id],
        intents: [connect(pair[0], pair[1], 'perpBisector')],
      });
    }
    return out;
  },
};
