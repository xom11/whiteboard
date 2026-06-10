// src/stamps/geometry-2d/ai/rules/externalPoint.ts
//
// Điểm nằm NGOÀI đường tròn (free external point):
//   "Lấy điểm A nằm ngoài đường tròn (O)" → addPoint(A, {externalToCircle, circle:'O'})
//   "Lấy điểm A ở ngoài (O)"              → addPoint(A, {externalToCircle, circle:'O'})
//   "Gọi A là điểm nằm ngoài (O)"         → addPoint(A, {externalToCircle, circle:'O'})
//   "Take a point A outside the circle (O)." (EN) → addPoint(A, {externalToCircle, circle:'O'})
//
// Mục đích: UNBLOCK tangentFromExt render END-TO-END. tangentFromExt emit
// drawLine(from:'A', circle:'O') nhưng KHÔNG rule nào dựng điểm A ngoài circle
// → transpile UNKNOWN_REF A → escalate. Rule này dựng A (qua builder
// externalToCircle, đọc tâm+bán kính từ build state, đặt A free ngoài circle).
//
// PRIORITY 68: sau circleRadius (75) / circleTriangle (72) để circle build
// TRƯỚC, trước tangentFromExt (65) để A build TRƯỚC tangent. Build order:
// circle → A → tangent (đúng phụ thuộc).
//
// GOTCHA \b: ký tự Việt "ngoài" → KHÔNG dùng \b. Cờ 'u' cho mọi regex.
// `[^.A-Z]` giữa name và "ngoài"/"outside" chặn nhảy qua nhãn HOA khác / dấu chấm.
import type { LanguageRule, RuleMatch } from './_types';
import { addPoint } from './_shared';

// VN: "(Lấy|Gọi) (điểm)? A ... ngoài (đường tròn (X) | (X))".
//   - from = nhóm 1 (1 ký tự HOA).
//   - circle = nhóm 2 ("đường tròn X") HOẶC nhóm 3 ("(X)").
//   - [^.A-Z]{0,14}? cho "nằm"/"ở" chen giữa, chặn dấu chấm / nhãn HOA khác.
const VN_FORM = new RegExp(
  String.raw`(?:[Ll]ấy|[Gg]ọi)\s+(?:điểm\s+)?([A-Z])(?:['′]?)[^.A-Z]{0,14}?ngoài\s+(?:đường\s*tròn\s*\(?\s*([A-Z])\s*\)?|\(\s*([A-Z])\s*\))`,
  'u',
);

// VN không nêu tên circle: "(Lấy|Gọi) (điểm)? A ... ngoài đường tròn" (KHÔNG
// "(X)" theo sau) → resolve circle DUY NHẤT trong đề. Phổ biến: "Lấy điểm C nằm
// ngoài đường tròn và …". group1 = A. Circle suy từ "(X)" duy nhất toàn đề.
const VN_FORM_UNNAMED = new RegExp(
  String.raw`(?:[Ll]ấy|[Gg]ọi)\s+(?:điểm\s+)?([A-Z])(?:['′]?)[^.A-Z]{0,14}?ngoài\s+đường\s*tròn(?!\s*\(?\s*[A-Z]\s*\)?)`,
  'u',
);
const ONLY_CIRCLE = /\(\s*([A-Z])\s*\)/u;

// EN: "(Take|Let|Mark|Choose|Pick) (a)? (point)? A ... outside (the)? (circle (X) | (X))".
//   - from = nhóm 1; circle = nhóm 2 ("circle X") HOẶC nhóm 3 ("(X)").
//   - [^.A-Z]{0,24}? cho "be a point"/"nằm" chen giữa, chặn dấu chấm / nhãn HOA.
const EN_FORM = new RegExp(
  String.raw`(?:[Tt]ake|[Ll]et|[Mm]ark|[Cc]hoose|[Pp]ick)\s+(?:a\s+)?(?:point\s+)?([A-Z])(?:['′]?)[^.A-Z]{0,24}?outside\s+(?:the\s+)?(?:[Cc]ircle\s*\(?\s*([A-Z])\s*\)?|\(\s*([A-Z])\s*\))`,
  'u',
);

export const externalPointRule: LanguageRule = {
  id: 'externalPoint',
  priority: 68,
  languages: ['vi', 'en'],
  // Prefilter toàn đề (runRules prefilter qua patterns[], BỎ QUA languages):
  // cần bắt cả VN ("ngoài") lẫn EN ("outside"). match() mới có regex chặt.
  patterns: [/ngoài/u, /[Oo]utside/u],
  match(ctx) {
    const out: RuleMatch[] = [];
    for (const c of ctx.clauses) {
      const m = VN_FORM.exec(c.text) ?? EN_FORM.exec(c.text);
      let from: string | undefined;
      let circle: string | undefined;
      if (m) {
        from = m[1];
        circle = m[2] ?? m[3];
      } else {
        // Fallback: "ngoài đường tròn" KHÔNG nêu tên → circle duy nhất toàn đề.
        const u = VN_FORM_UNNAMED.exec(c.text);
        const oc = ONLY_CIRCLE.exec(ctx.problem);
        if (u && oc) {
          from = u[1];
          circle = oc[1];
        }
      }
      if (!from || !circle) continue; // escalate-safe
      out.push({
        ruleId: 'externalPoint',
        clauseIds: [c.id],
        intents: [addPoint(from, { kind: 'externalToCircle', circle })],
      });
    }
    return out;
  },
};
