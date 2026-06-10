// src/stamps/geometry-2d/ai/rules/angleBisectorCutsCircleLine.ts
//
// Phân giác của một GÓC (3 đỉnh) cắt ĐƯỜNG TRÒN tại E và (tuỳ chọn) cắt 1 đường
// thẳng tại F — KHÔNG có chân trên cạnh đối (khác angleBisectorCutsSideCircle):
//   "Phân giác trong của góc DAB cắt đường tròn tại E và cắt CH tại F"
//     → E = secondIntersection(line=bisDAB, circle, other=A)
//       F = intersection(bisDAB, CH)
//
// bisDAB = tia phân giác (angleBisectorAngle priority 62 dựng TRƯỚC, cùng quy
// ước tên "bis"+p1+vertex+p2). vertex (đỉnh góc) = chữ GIỮA; vertex nằm trên
// đường tròn (đề kiểu nội tiếp/đường kính) nên other=vertex hợp lệ.
//
// GOTCHA \b: ký tự Việt → cờ 'u' + (?!\p{L}).
import type { LanguageRule, RuleMatch } from './_types';
import type { IntentT } from '../intent';
import { addPoint } from './_shared';

const PREFILTER = /[Pp]hân\s*giác[^.]{0,40}?cắt\s+(?:đường\s*tròn|\()/u;

// "phân giác (trong)? (của)? góc XYZ cắt (đường tròn|(O)) (tại|ở) E (khác V)?
//  (và (cắt)? (đường thẳng|cạnh|đoạn)? L (tại|ở) F)?"
const RE = new RegExp(
  '[Pp]hân\\s*giác\\s+(?:trong\\s+)?(?:của\\s+)?góc\\s+([A-Z])([A-Z])([A-Z])(?![A-Z])' +
    "\\s+cắt\\s+(?:đường\\s*tròn\\s*)?(?:\\(\\s*([A-Z])(?:['′]?)\\s*\\))?" +
    '[^.]{0,16}?(?:tại|ở)\\s+(?:điểm\\s+)?([A-Z])(?![A-Z])(?:\\s+khác\\s+[A-Z](?![A-Z]))?' +
    '(?:\\s*,?\\s*và\\s+(?:cắt\\s+)?(?:đường\\s*thẳng\\s+|cạnh\\s+|đoạn\\s+)?([A-Z]{2})(?![A-Z])\\s+(?:tại|ở)\\s+(?:điểm\\s+)?([A-Z])(?![A-Z]))?',
  'u',
);

// Đường tròn toàn đề khi clause nêu "đường tròn" trần (không "(X)"): lấy "(X)" /
// "tâm X" duy nhất → emit raw (resolveCircleNames map "_c" nếu cần).
const ANY_CIRCLE = /(?:đường\s*tròn\s*\(\s*([A-Z])(?:['′]?)\s*\)|tâm\s+([A-Z])(?![A-Za-z]))/u;

export const angleBisectorCutsCircleLineRule: LanguageRule = {
  id: 'angleBisectorCutsCircleLine',
  // 49: TRÊN lineCircleIntersection (47) — F phải dựng trước khi "DF cắt (O) tại
  // N" tham chiếu đoạn DF; DƯỚI inputs (angleBisectorAngle 62, onSegment 62,
  // perpFoot 65 dựng tia/C/H trước).
  priority: 49,
  languages: ['vi'],
  patterns: [PREFILTER],
  match(ctx) {
    const out: RuleMatch[] = [];
    for (const c of ctx.clauses) {
      const m = RE.exec(c.text);
      if (!m) continue;
      const [p1, vertex, p2] = [m[1], m[2], m[3]];
      const circleInline = m[4];
      const e = m[5];
      const lineF = m[6];
      const f = m[7];
      const bis = `bis${p1}${vertex}${p2}`;

      let circle = circleInline;
      if (!circle) {
        const cm = ANY_CIRCLE.exec(ctx.problem);
        circle = cm?.[1] ?? cm?.[2];
      }
      if (!circle) continue;
      if (e === vertex) continue;

      const intents: IntentT[] = [
        addPoint(e, { kind: 'secondIntersection', line: bis, circle, other: vertex }),
      ];
      // F = giao tia phân giác với 1 đường thẳng (nếu nêu "và cắt L tại F").
      if (lineF && f && f !== e && !lineF.includes(f)) {
        intents.push(addPoint(f, { kind: 'intersection', of: [bis, lineF] }));
      }
      out.push({ ruleId: 'angleBisectorCutsCircleLine', clauseIds: [c.id], intents });
    }
    return out;
  },
};
