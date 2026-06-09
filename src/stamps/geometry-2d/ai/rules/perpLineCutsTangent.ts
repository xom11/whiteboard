// src/stamps/geometry-2d/ai/rules/perpLineCutsTangent.ts
//
// "Đường thẳng vuông góc với <AB> tại <M> cắt tiếp tuyến tại <N> của đường tròn ở <P>"
//   → draw-line prpM (perpThrough qua M, vuông góc AB)
//     + tiếp tuyến tN tại N của đường tròn (tangentAt)
//     + P = giao(prpM, tN).
//
// parallelPerp KHÔNG khớp (không mở đầu "Qua/Từ"); tangentAt khớp "tiếp tuyến tại N"
// nhưng KHÔNG dựng giao P. Rule này phủ TRỌN clause.
//
// Circle ref = THÔ chữ tâm; resolveCircleNames map → '_c' nếu cần. Tên tiếp tuyến
// 'tN' khớp quy ước tangentAt ('t' + điểm) → intent draw-line cùng tên dedup
// (addShape idempotent), không tạo 2 tiếp tuyến.
//
// Thứ tự (intentsToDsl xử lý priority DESC): N phải có TRƯỚC tN và P; M trước prpM.
// Đặt priority cao (65) để chạy trước tangentAt (63), nhưng N/M do rule khác tạo
// (lineCircleIntersection 47 / onSegment) — intentsToDsl loop theo priority nên
// các điểm đó add SAU; tuy vậy add-point P chỉ cần prpM & tN là SHAPE (đã add ở
// cùng match này, trước P trong mảng intents) — điểm M/N chỉ là tham số dựng line,
// builder line dung sai forward-ref điểm? KHÔNG — line cần điểm tồn tại. Vì thế
// priority phải THẤP hơn rule tạo M, N. Đặt 44 (dưới lineCircleIntersection 47,
// onSegmentPoint). Xem ghi chú priority trong registry.
//
// GOTCHA \b: ký tự Việt → cờ 'u' + (?!\p{L}).
import type { LanguageRule, RuleMatch } from './_types';
import { addPoint, drawLine, CIRCLE_KW, DUONG_KW } from './_shared';

// "Đường thẳng vuông góc với <X><Y> tại <M> cắt tiếp tuyến tại <N> của đường tròn ở/tại <P>"
const RE = new RegExp(
  DUONG_KW +
    '\\s*thẳng\\s+vuông\\s*góc\\s+(?:với\\s+)?([A-Z])([A-Z])(?![A-Z])\\s+tại\\s+([A-Z])(?![A-Z])' +
    '[^.]{0,20}?cắt\\s+tiếp\\s*tuyến\\s+tại\\s+([A-Z])(?![A-Z])' +
    '(?:\\s+của\\s+' +
    CIRCLE_KW +
    ')?\\s+(?:ở|tại)\\s+([A-Z])(?![A-Z])',
  'u',
);

// Tâm đường tròn từ toàn đề ("(O)" / "(O; R)").
const CIRCLE_REF = /(?:đường\s*tròn\s*)?\(\s*([A-Z])(?:\s*[;,]\s*[Rr])?\s*\)/u;

const PREFILTER = new RegExp(
  DUONG_KW + '\\s*thẳng\\s+vuông\\s*góc[^.]{0,40}?cắt\\s+tiếp\\s*tuyến',
  'u',
);

export const perpLineCutsTangentRule: LanguageRule = {
  id: 'perp-line-cuts-tangent',
  // Dưới các rule tạo điểm M (onSegment ~?), N (lineCircleIntersection 47) để N,M
  // tồn tại trước khi rule này dựng line tham chiếu chúng. Đặt 44.
  priority: 44,
  languages: ['vi'],
  patterns: [PREFILTER],
  match(ctx) {
    const cm = CIRCLE_REF.exec(ctx.problem);
    const center = cm?.[1];
    if (!center) return [];
    const out: RuleMatch[] = [];
    for (const c of ctx.clauses) {
      const m = RE.exec(c.text);
      if (!m) continue;
      const to = m[1] + m[2];
      const mPt = m[3];
      const nPt = m[4];
      const p = m[5];
      // Tên phân biệt + M không nằm trong đường tham chiếu là endpoint trùng? cho phép.
      if (mPt === nPt || mPt === p || nPt === p) continue;
      const prpName = `prp${mPt}`;
      const tName = `t${nPt}`;
      out.push({
        ruleId: 'perp-line-cuts-tangent',
        clauseIds: [c.id],
        intents: [
          drawLine(prpName, 'perpThrough', { through: mPt, to }),
          drawLine(tName, 'tangentAt', { through: nPt, circle: center }),
          addPoint(p, { kind: 'intersection', of: [prpName, tName] }),
        ],
      });
    }
    return out;
  },
};
