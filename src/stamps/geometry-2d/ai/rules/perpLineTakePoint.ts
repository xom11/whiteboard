// src/stamps/geometry-2d/ai/rules/perpLineTakePoint.ts
//
// "Trên đường thẳng vuông góc với <XY> tại <H>, lấy một điểm <M> (ở ngoài đường
// tròn)?" — dựng đường vuông góc với XY tại H (perpThrough) RỒI đặt điểm M trên
// đường đó.
//
//   Trên đường thẳng vuông góc với OB tại H, lấy một điểm M ở ngoài đường tròn
//     → draw-line prpH (perpThrough H→OB)
//       M = onSegment(prpH)   (onSegment builder tự promote line non-segment →
//                              DSL onLine vì prpH là 'perpendicular' line-like)
//
// parallelPerp YÊU CẦU tiền tố "Qua/Từ <P>" — ở đây vắng ("trên đường thẳng
// vuông góc với OB tại H") nên parallelPerp KHÔNG fire; rule này tự emit đường
// vuông góc + điểm trên đó để phủ trọn câu.
//
// Tên đường: 'prp' + điểm-tại (CÙNG quy ước parallelPerp 'prp'+through) → nếu có
// rule khác dựng cùng đường thì JSON trùng và dedup.
//
// GOTCHA \b: dùng (?!\p{L})/(?<!\p{L}) + cờ 'u' quanh ký tự Việt.
import type { LanguageRule, RuleMatch } from './_types';
import { addPoint, drawLine, DUONG_KW } from './_shared';

// group1+2 = cặp đỉnh đường tham chiếu (vd OB); group3 = điểm "tại";
// group4 = điểm lấy trên đường vuông góc.
const RE = new RegExp(
  DUONG_KW +
    '\\s*thẳng\\s+vuông\\s*góc\\s+(?:với\\s+)?(?:cạnh\\s+|đoạn(?:\\s+thẳng)?\\s+)?' +
    '([A-Z])([A-Z])(?![A-Z])\\s+tại\\s+([A-Z])(?![A-Z])' +
    '[^.;]{0,40}?(?:lấy|Lấy)\\s+(?:một\\s+)?(?:điểm\\s+)?([A-Z])(?![A-Z])',
  'gu',
);

const PREFILTER = new RegExp(
  DUONG_KW + '\\s*thẳng\\s+vuông\\s*góc[^.;]{0,60}?(?:lấy|Lấy)',
  'u',
);

export const perpLineTakePointRule: LanguageRule = {
  id: 'perpLineTakePoint',
  // Cao hơn pairSecondIntersection (46) vì C/D có thể tham chiếu MA/MB ⇒ M phải
  // dựng trước. Đặt 56.
  priority: 56,
  languages: ['vi'],
  patterns: [PREFILTER],
  match(ctx) {
    const out: RuleMatch[] = [];
    for (const c of ctx.clauses) {
      RE.lastIndex = 0;
      for (const m of c.text.matchAll(RE)) {
        const to = m[1] + m[2];
        const at = m[3];
        const pt = m[4];
        // Tên điểm lấy không được trùng đầu mút đường tham chiếu / điểm "tại".
        if (to.includes(pt) || pt === at) continue;
        const line = 'prp' + at;
        out.push({
          ruleId: 'perpLineTakePoint',
          clauseIds: [c.id],
          intents: [
            drawLine(line, 'perpThrough', { through: at, to }),
            addPoint(pt, { kind: 'onSegment', of: line }),
          ],
        });
      }
    }
    return out;
  },
};
