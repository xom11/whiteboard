// src/stamps/geometry-2d/ai/rules/twoCirclesMeet.ts
//
// HAI đường tròn TỰ DO cắt nhau tại 2 điểm:
//   "Cho hai đường tròn (O) và (O′) cắt nhau tại hai điểm A, B"
//   "Cho hai đường tròn (O;R) và (O′;R′) cắt nhau tại A và B"
//
// → 2 circleCR (tâm O, O′ — free center, bán kính canonical) + A,B = giao điểm
//   (circleIntersection which 0/1). Builder tự inject free coord cho 2 tâm;
//   `repairCircleIntersections` (chạy trong intentToDsl) dời tâm free để 2 đường
//   tròn THỰC SỰ cắt nhau 2 điểm (|r1-r2| < d < r1+r2). Hạ tầng circleIntersection
//   (intent + add-point builder + editor tool + render) đã có sẵn — rule này chỉ
//   nối dây.
//
// KHÁC diameterCirclePairwise/circumcirclePairMeet (đường tròn DẪN XUẤT từ
// đường kính / ngoại tiếp): ở đây 2 đường tròn là FREE, chỉ ràng buộc "cắt nhau".
//
// Guard: 2 tâm phải KHÁC tên (OCR hay rơi prime "(O′)"→"(O)" làm 2 tên trùng →
// hỏng dữ liệu, escalate). A≠B, A/B ∉ {tâm}.
//
// GOTCHA \b: ký tự Việt → cờ 'u' + lookaround.
import type { LanguageRule, RuleMatch } from './_types';
import { addPoint, drawCircle } from './_shared';
import { SYMBOLIC_RADIUS } from './circleRadius';

const PREFILTER = /hai\s+đường\s*tròn[^.]{0,70}?cắt\s+nhau/u;

// "(X)" / "(X;R)" với X = 1 ký tự HOA + prime optional.
const CIRCLE = "\\(\\s*([A-Z]['′]?)(?:\\s*[;,]\\s*[Rr]['′]?)?\\s*\\)";
const TWO_MEET = new RegExp(
  'hai\\s+đường\\s*tròn\\s*' +
    CIRCLE +
    '\\s*(?:[;,]\\s*)?và\\s*' +
    CIRCLE +
    '[^.]{0,50}?cắt\\s+nhau\\s+(?:ở|tại)\\s+(?:hai\\s+điểm\\s+)?([A-Z])(?![A-Za-z])\\s*(?:,|và)\\s*([A-Z])(?![A-Za-z])',
  'u',
);

/** Chuẩn hoá prime Unicode ′ → ASCII ' để khớp LabelZ. */
const norm = (s: string) => s.replace(/′/g, "'");

export const twoCirclesMeetRule: LanguageRule = {
  id: 'two-circles-meet',
  // TRÊN chord (71) / externalPoint (68): A,B (giao 2 đường tròn) là gốc nhiều
  // phái sinh downstream → dựng sớm. DƯỚI circleRadius (75) cho nhất quán.
  priority: 74,
  languages: ['vi'],
  patterns: [PREFILTER],
  match(ctx) {
    const m = TWO_MEET.exec(ctx.problem);
    if (!m) return [];
    const c1 = norm(m[1]);
    const c2 = norm(m[2]);
    const a = m[3];
    const b = m[4];
    if (c1 === c2) return []; // 2 tâm trùng tên (OCR mất prime) → escalate
    if (a === b || a === c1 || a === c2 || b === c1 || b === c2) return [];

    // Clause chứa khai báo 2 đường tròn (để coverage claim).
    const declId = ctx.clauses.find((c) => /hai\s+đường\s*tròn/u.test(c.text))?.id;
    const out: RuleMatch[] = [];
    out.push({
      ruleId: 'two-circles-meet',
      clauseIds: declId === undefined ? [] : [declId],
      intents: [
        drawCircle(c1, 'centerRadius', { center: c1, radius: SYMBOLIC_RADIUS }),
        drawCircle(c2, 'centerRadius', { center: c2, radius: SYMBOLIC_RADIUS }),
        addPoint(a, { kind: 'circleIntersection', c1, c2, which: 0 }),
        addPoint(b, { kind: 'circleIntersection', c1, c2, which: 1 }),
      ],
    });
    return out;
  },
};
