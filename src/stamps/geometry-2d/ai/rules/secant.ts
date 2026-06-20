// src/stamps/geometry-2d/ai/rules/secant.ts
//
// Cát tuyến từ điểm NGOÀI: đường thẳng qua điểm ngoài A cắt đường tròn tại 2
// điểm (gần→xa). Mô hình hoá để A, D, E THẲNG HÀNG:
//   D = onCircle(circle, theta)               (giao gần, glider)
//   E = secondIntersection(line="AD", circle, other=D)  (giao xa, trên đúng tia AD)
//   + đoạn A→E (chứa D).
//
// Dạng nhận:
//   "cát tuyến ADE"                     → ext=A, gần=D, xa=E (token 3 chữ).
//   "cát tuyến ACD tới/với đường tròn"  → ext=A, gần=C, xa=D.
//   "(Một) đường thẳng (d) (đi) qua A cắt (đường tròn|(O)) tại D và E" → A,D,E.
//
// Circle: "(X)" duy nhất toàn đề (emit thô; resolver chuẩn hoá base→_c). Điểm
// ngoài A phải do rule khác dựng (circleExternalPoint/externalPoint).
//
// Priority 58: DƯỚI circleExternalPoint(70)/externalPoint(68) (A + circle build
// trước) nhưng TRÊN midpoint(50)/intersection(45) (D,E build trước "H trung điểm
// DE" / "giao điểm … DE"). GOTCHA \b: ký tự Việt → cờ 'u'.
import type { LanguageRule, RuleMatch } from './_types';
import { addPoint, connect } from './_shared';

// Token "cát tuyến AXY" — A ngoài, X gần, Y xa.
const CAT_TUYEN = /cát\s*tuyến\s+([A-Z])([A-Z])([A-Z])(?![A-Z])/gu;
// "qua A cắt (nửa)? (đường tròn|(O)|O-trần) (tại|ở) D (và|,) E". Nhánh circle:
// "(O)" (capture m[2]) | tâm-trần "O " (consume, KHÔNG capture → fallbackCircle).
const LINE_THROUGH = new RegExp(
  String.raw`[Qq]ua\s+(?:điểm\s+)?([A-Z])(?!\p{L})[^.]{0,30}?cắt\s+(?:lại\s+)?(?:nửa\s+)?(?:đường\s*tròn\s*)?(?:\(\s*([A-Z])\s*\)\s*|[A-Z]\s+)?(?:tại|ở)\s+(?:hai\s+|2\s+)?(?:điểm\s+)?([A-Z])\s*(?:và|,)\s*([A-Z])(?![A-Z])`,
  'gu',
);
// "cát tuyến (<đường-thẳng-tên>)? cắt (nửa)? (đường tròn|(O)|O-trần) (tại|ở) P,Q"
// — KHÔNG có "qua X" (LINE_THROUGH lo dạng đó); điểm ngoài resolve từ context.
const CAT_CUTS = new RegExp(
  String.raw`cát\s*tuyến\s+(?:[a-z][a-z0-9]?\s+)?cắt\s+(?:lại\s+)?(?:nửa\s+)?(?:đường\s*tròn\s*)?(?:\(\s*([A-Z])\s*\)\s*|[A-Z]\s+)?(?:tại|ở)\s+(?:hai\s+|2\s+)?(?:điểm\s+)?([A-Z])\s*(?:và|,)\s*([A-Z])(?![A-Z])`,
  'gu',
);
const PAREN_CIRCLE = /\(\s*([A-Z])\s*\)/u;
// Điểm NGOÀI toàn đề: "<HOA> (ở|nằm)? ngoài (đường tròn|nửa|()" — resolve ext cho
// CAT_CUTS (cát tuyến không nêu điểm ngoài trong clause). Lấy HOA NGAY trước "ngoài".
const EXT_RESOLVE = /([A-Z])(?!\p{L})[^.A-Z]{0,25}?(?:ở\s+|nằm\s+)?ngoài\s+(?:\(|nửa|đường\s*tròn)/u;

const PREFILTER = /cát\s*tuyến|[Qq]ua\s+(?:điểm\s+)?[A-Z][^.]{0,30}?cắt/u;

function secantIntents(ext: string, near: string, far: string, circle: string, theta: number) {
  // đầu mút phân biệt + không trùng điểm ngoài.
  if (new Set([ext, near, far]).size !== 3) return null;
  const line = ext + near; // 2 chữ HOA cho secondIntersection
  return [
    addPoint(near, { kind: 'onCircle', circle, theta }),
    addPoint(far, { kind: 'secondIntersection', line, circle, other: near }),
    connect(ext, far, 'segment'),
  ];
}

export const secantRule: LanguageRule = {
  id: 'secant',
  priority: 58,
  languages: ['vi'],
  patterns: [PREFILTER],
  match(ctx) {
    const par = PAREN_CIRCLE.exec(ctx.problem);
    const fallbackCircle = par ? par[1] : 'O';
    const extM = EXT_RESOLVE.exec(ctx.problem);
    const resolvedExt = extM ? extM[1] : undefined;
    const out: RuleMatch[] = [];
    let theta = 2.4;
    for (const c of ctx.clauses) {
      // "cát tuyến (d)? cắt (O) tại P,Q" — điểm ngoài từ context (resolvedExt).
      if (resolvedExt) {
        CAT_CUTS.lastIndex = 0;
        for (const m of c.text.matchAll(CAT_CUTS)) {
          const circle = m[1] ?? fallbackCircle;
          const intents = secantIntents(resolvedExt, m[2], m[3], circle, theta);
          if (intents) {
            out.push({ ruleId: 'secant', clauseIds: [c.id], intents });
            theta += 0.7;
          }
        }
      }
      CAT_TUYEN.lastIndex = 0;
      for (const m of c.text.matchAll(CAT_TUYEN)) {
        const intents = secantIntents(m[1], m[2], m[3], fallbackCircle, theta);
        if (intents) {
          out.push({ ruleId: 'secant', clauseIds: [c.id], intents });
          theta += 0.7;
        }
      }
      LINE_THROUGH.lastIndex = 0;
      for (const m of c.text.matchAll(LINE_THROUGH)) {
        const circle = m[2] ?? fallbackCircle;
        const intents = secantIntents(m[1], m[3], m[4], circle, theta);
        if (intents) {
          out.push({ ruleId: 'secant', clauseIds: [c.id], intents });
          theta += 0.7;
        }
      }
    }
    return out;
  },
};
