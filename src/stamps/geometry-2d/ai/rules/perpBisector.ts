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
// Cờ 'g' để bắt MỌI cụm "trung trực <PAIR>" trong 1 clause (vd "trung trực BC
// và trung trực CA" → emit cả 2). Reset lastIndex trước mỗi clause.
const PERP_BISECTOR =
  /(?<!\p{L})trung\s*trực\s+(?:(?:của|đoạn|đoạn\s+thẳng|cạnh)\s+)*([A-Z][A-Z])(?!\p{L})/gu;

/** prefilter nhanh trên toàn đề. */
const PREFILTER = /trung\s*trực/u;

/**
 * "(đường) trung trực của <PAIR>" → connect(P1, P2, 'perpBisector').
 *
 * GLOBAL: 1 clause có thể chứa nhiều cụm trung trực ("trung trực BC và trung
 * trực CA") → emit connect cho MỖI cặp. Lấy cặp đỉnh ngay sau mỗi "trung trực"
 * (bỏ qua "của/đoạn/cạnh" xen giữa). Cụm không trích được cặp đỉnh hợp lệ →
 * bỏ qua cụm đó (escalate AI, an toàn hơn đoán sai). Tên đường (vd "d là …")
 * không cần — connect không nhận name.
 */
export const perpBisectorRule: LanguageRule = {
  id: 'perpBisector',
  priority: 70,
  languages: ['vi'],
  patterns: [PREFILTER],
  match(ctx) {
    const out: RuleMatch[] = [];
    for (const c of ctx.clauses) {
      PERP_BISECTOR.lastIndex = 0; // regex 'g' có state — reset mỗi clause
      for (const m of c.text.matchAll(PERP_BISECTOR)) {
        const pair = pairFromToken(m[1]);
        if (pair.length !== 2) continue; // không trích được cặp đỉnh → bỏ cụm
        out.push({
          ruleId: 'perpBisector',
          clauseIds: [c.id],
          intents: [connect(pair[0], pair[1], 'perpBisector')],
        });
      }
    }
    return out;
  },
};
