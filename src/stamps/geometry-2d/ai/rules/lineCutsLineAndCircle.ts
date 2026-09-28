// src/stamps/geometry-2d/ai/rules/lineCutsLineAndCircle.ts
//
// MỘT đường thẳng cắt lần lượt MỘT đường thẳng và MỘT đường tròn trong cùng câu —
// dạng rất hay gặp ở ý b) c) đề vào 10:
//   "Đường thẳng AH cắt BC tại D và cắt đường tròn (O, R) tại điểm thứ hai tại P"
//   "AH cắt OC tại D và cắt đường tròn (O) tại điểm thứ hai là K (K khác A)"
//   "BC cắt (O) tại D và cắt AC tại E" (thứ tự ngược)
// → D = giao(XY, L); P = giao thứ hai của XY với (O), điểm chung = X (lượt
// suaGiaoDiemThuHai đổi sang Y nếu Y mới là điểm nằm trên đường tròn).
//
// Chặn "vuông góc với AC cắt AC tại N" (XY là đường tham chiếu, không phải chủ ngữ)
// bằng lookbehind "với/góc/song song" + XY ≠ L. \b cạnh chữ Việt → (?!\p{L}), cờ 'u'.
import type { LanguageRule, RuleMatch } from './_types';
import { addPoint } from './_shared';

const CIRCLE = String.raw`(?:(?:nửa\s+)?đường\s*tròn\s*)?\(\s*([A-Z])\s*(?:[;,]\s*[Rr]\s*)?\)`;
const LINE = String.raw`(?:đường\s*thẳng\s+|tia\s+|đoạn(?:\s+thẳng)?\s+|cạnh\s+)?([A-Z]{2})(?![A-Z])(?:\s+kéo\s+dài)?`;
const AT = String.raw`\s+(?:tại|ở)\s+(?:điểm\s+)?`;
const AT_2ND = String.raw`\s+(?:tại|ở)\s+(?:điểm\s+(?:thứ\s+hai\s+)?)?(?:(?:là|tại)\s+)?`;
const SUBJ = String.raw`(?<!(?:với|góc|song|của|và)\s+)(?<![A-Z])([A-Z]{2})(?![A-Z])`;

// XY cắt L tại D (,|và) cắt (lại)? (O) tại (điểm thứ hai)? (là|tại)? P
const LINE_THEN_CIRCLE = new RegExp(
  SUBJ + String.raw`\s+cắt\s+` + LINE + AT + String.raw`([A-Z])(?![A-Z'′])\s*(?:,|và)\s*cắt\s+(?:lại\s+)?` + CIRCLE + AT_2ND + String.raw`([A-Z])(?![A-Z'′])`,
  'gu',
);
// XY cắt (O) tại (điểm thứ hai)? P (,|và) cắt L tại D
const CIRCLE_THEN_LINE = new RegExp(
  SUBJ + String.raw`\s+cắt\s+(?:lại\s+)?` + CIRCLE + AT_2ND + String.raw`([A-Z])(?![A-Z'′])\s*(?:,|và)\s*cắt\s+` + LINE + AT + String.raw`([A-Z])(?![A-Z'′])`,
  'gu',
);

const PREFILTER = /cắt[^.]{0,40}?(?:tại|ở)[^.]{0,20}?(?:,|và)\s*cắt/u;

export const lineCutsLineAndCircleRule: LanguageRule = {
  id: 'lineCutsLineAndCircle',
  // Cùng mức lineCircleIntersection (47): trên intersection (45) để D, P có trước
  // các giao điểm sau dùng tới chúng (order-retry topo lo phần còn lại).
  priority: 47,
  languages: ['vi'],
  patterns: [PREFILTER],
  match(ctx) {
    const out: RuleMatch[] = [];
    for (const c of ctx.clauses) {
      const emit = (xy: string, l: string, d: string, circle: string, p: string) => {
        if (xy === l || [...xy].includes(d) || [...xy].includes(p) || d === p || [...l].includes(d)) return;
        if ([...xy].sort().join('') === [...l].sort().join('')) return;
        out.push({
          ruleId: 'lineCutsLineAndCircle',
          clauseIds: [c.id],
          intents: [
            addPoint(d, { kind: 'intersection', of: [xy, l] }),
            addPoint(p, { kind: 'secondIntersection', line: xy, circle, other: xy[0] }),
          ],
        });
      };
      LINE_THEN_CIRCLE.lastIndex = 0;
      for (const m of c.text.matchAll(LINE_THEN_CIRCLE)) emit(m[1], m[2], m[3], m[4], m[5]);
      CIRCLE_THEN_LINE.lastIndex = 0;
      for (const m of c.text.matchAll(CIRCLE_THEN_LINE)) emit(m[1], m[4], m[5], m[2], m[3]);
    }
    return out;
  },
};
