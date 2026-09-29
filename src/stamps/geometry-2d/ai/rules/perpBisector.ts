// src/stamps/geometry-2d/ai/rules/perpBisector.ts
import type { LanguageRule, RuleMatch } from './_types';
import { addPoint, connect, pairFromToken } from './_shared';

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
  /(?<!\p{L})[Tt]rung\s*trực\s+(?:(?:của|đoạn|đoạn\s+thẳng|cạnh)\s+)*([A-Z][A-Z])(?!\p{L})/gu;

// Phân phối: "Trung trực của CA, AB cắt PA tại E, F" → trung trực(CA)∩PA=E,
// trung trực(AB)∩PA=F. group1=PAIR1, 2=PAIR2, 3=đường bị cắt, 4=P1, 5=P2.
// Cũng nhận "và" giữa các cặp/tên và "(theo) thứ tự … ở": "Các đường trung trực
// của AB và AC cắt cạnh BC theo thứ tự ở M và N".
const PERP_BIS_CUT_DISTRIB =
  /(?<!\p{L})[Tt]rung\s*trực\s+(?:(?:của|đoạn|đoạn\s+thẳng|cạnh)\s+)*([A-Z][A-Z])\s*(?:,|và)\s*(?:(?:của|đoạn|đoạn\s+thẳng|cạnh)\s+)*([A-Z][A-Z])(?!\p{L})\s+cắt\s+(?:đường\s*thẳng\s+|đoạn(?:\s+thẳng)?\s+|cạnh\s+|tia\s+)?([A-Z][A-Z])(?!\p{L})\s+(?:(?:lần\s*lượt|(?:theo\s+)?thứ\s+tự)\s+)?(?:tại|ở)\s+(?:(?:các\s+)?điểm\s+)?([A-Z])\s*(?:,|và)\s*([A-Z])(?!\p{L})/gu;

// Chuỗi cắt: sau "trung trực PAIR1", một hay nhiều vế "(,|và)? cắt PAIR2 (tại|ở) (điểm)? D":
//   "Đường trung trực của đoạn thẳng AC cắt AC tại H, cắt BC tại D"
//   "Đường trung trực của cạnh AC cắt tia CB tại điểm D"
const PB_HEAD =
  /(?<!\p{L})[Tt]rung\s*trực\s+(?:(?:của|đoạn|đoạn\s+thẳng|cạnh)\s+)*([A-Z][A-Z])(?!\p{L})/gu;
const PB_CUT_STEP =
  /^\s*(?:,\s*|và\s+)?cắt\s+(?:đường\s*thẳng\s+|đoạn(?:\s+thẳng)?\s+|cạnh\s+|tia\s+)?([A-Z][A-Z])(?!\p{L})\s+(?:tại|ở)\s+(?:điểm\s+)?([A-Z])(?![A-Z'′])/u;

/** prefilter nhanh trên toàn đề. */
const PREFILTER = /[Tt]rung\s*trực/u;

// === EN (issue #46 group B) ===
// "(the)? perpendicular bisector (of|the|segment|line|side)* PAIR" → connect(P1,P2,'perpBisector').
// First-letter flex [Pp] (KHÔNG cờ 'i'). Global để bắt nhiều cụm/clause như VN.
const PERP_BISECTOR_EN =
  /[Pp]erpendicular\s+bisector\s+(?:(?:of|the|segment|line|side)\s+)*([A-Z][A-Z])(?!\p{L})/gu;
const PERP_BISECTOR_EN_PRE = /[Pp]erpendicular\s+bisector/u;

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
  languages: ['vi', 'en'],
  patterns: [PREFILTER, PERP_BISECTOR_EN_PRE],
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

      // "trung trực PAIR1 cắt PAIR2 tại D" → perpBisector(PAIR1) + giao điểm D.
      // Emit connect(perpBisector) NGAY TRƯỚC intersection (cùng match) để shape
      // 'pb_<PAIR1>' tồn tại khi transpile resolve ref của intersection (connect
      // trùng với loop plain ở trên sẽ bị dedup JSON → an toàn).
      for (const h of c.text.matchAll(PB_HEAD)) {
        const pb = pairFromToken(h[1]);
        if (pb.length !== 2) continue;
        const pbName = `pb_${pb[0]}${pb[1]}`; // khớp connect builder uniqueShapeName('pb_BC')
        let rest = c.text.slice(h.index! + h[0].length);
        const intents = [];
        for (let step = PB_CUT_STEP.exec(rest); step; step = PB_CUT_STEP.exec(rest)) {
          const line = pairFromToken(step[1]);
          const d = step[2];
          rest = rest.slice(step[0].length);
          // Giao điểm phải là điểm MỚI: D không trùng đỉnh nào của 2 cặp.
          if (line.length !== 2 || new Set([pb[0], pb[1], line[0], line[1]]).has(d)) continue;
          intents.push(addPoint(d, { kind: 'intersection', of: [pbName, step[1]] }));
        }
        if (intents.length === 0) continue;
        out.push({
          ruleId: 'perpBisector',
          clauseIds: [c.id],
          intents: [connect(pb[0], pb[1], 'perpBisector'), ...intents],
        });
      }
      // Phân phối "trung trực CA, AB cắt PA tại E, F" → 2 perpBisector + 2 giao.
      PERP_BIS_CUT_DISTRIB.lastIndex = 0;
      for (const m of c.text.matchAll(PERP_BIS_CUT_DISTRIB)) {
        const pb1 = pairFromToken(m[1]);
        const pb2 = pairFromToken(m[2]);
        const line = pairFromToken(m[3]);
        const [d1, d2] = [m[4], m[5]];
        if (pb1.length !== 2 || pb2.length !== 2 || line.length !== 2 || d1 === d2) continue;
        out.push({
          ruleId: 'perpBisector',
          clauseIds: [c.id],
          intents: [
            connect(pb1[0], pb1[1], 'perpBisector'),
            connect(pb2[0], pb2[1], 'perpBisector'),
            addPoint(d1, { kind: 'intersection', of: [`pb_${pb1[0]}${pb1[1]}`, m[3]] }),
            addPoint(d2, { kind: 'intersection', of: [`pb_${pb2[0]}${pb2[1]}`, m[3]] }),
          ],
        });
      }

      // --- EN (issue #46 group B) — mirror VN: global, emit-all, escalate-safe ---
      PERP_BISECTOR_EN.lastIndex = 0;
      for (const m of c.text.matchAll(PERP_BISECTOR_EN)) {
        const pair = pairFromToken(m[1]);
        if (pair.length !== 2) continue;
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
