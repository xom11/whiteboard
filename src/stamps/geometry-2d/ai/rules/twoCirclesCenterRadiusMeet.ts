// src/stamps/geometry-2d/ai/rules/twoCirclesCenterRadiusMeet.ts
//
// HAI đường tròn TÂM-BÁN-KÍNH (tâm = đỉnh đã dựng, R = đoạn) cắt nhau:
//   "Lấy B làm tâm, vẽ đường tròn bán kính BA; lấy C làm tâm, vẽ đường tròn
//    bán kính CA. Hai đường tròn này cắt nhau tại điểm thứ hai là D."  (vxhung #7)
//
// → 2 circle centerThrough (tâm B qua A, tâm C qua A — R=|BA|,|CA| TỰ ĐỘNG đúng
//   bằng đoạn nêu) + D = circleIntersection(B, C, which=1).
//
//   Tâm CỐ ĐỊNH (đỉnh tam giác) + R CỐ ĐỊNH ⇒ 2 đtròn THỰC SỰ cắt tại A và D
//   (D = đối xứng A qua BC) — KHÔNG cần repairCircleIntersections (chỉ áp circleCR
//   với center FREE). "điểm thứ hai" / mặc định ⇒ which=1 (giao khác A).
//
//   draw-circle schema chỉ có radius SỐ → dùng centerThrough (R = |center·through|)
//   cho bán-kính-đoạn. circleIntersection ref circle theo TÊN nên hoạt động với
//   mọi spec (centerThrough/circleCR).
//
// Guard: PHẢI ≥2 cụm "tâm <X> ... bán kính <XY>" với 2 tâm KHÁC nhau + clause
// "hai đường tròn ... cắt nhau ... <D>". X (tâm) PHẢI là chữ đầu của đoạn bán kính.
//
// GOTCHA \b: ký tự Việt → cờ 'u' + lookaround (?!\p{L}).
import type { LanguageRule, RuleMatch } from './_types';
import type { IntentT } from '../intent';
import { addPoint, drawCircle, CIRCLE_KW } from './_shared';

// "(Lấy)? <X> làm tâm,? vẽ/dựng đường tròn bán kính <X><Y>" — tâm=chữ đầu đoạn.
const CENTER_RADIUS = new RegExp(
  '([A-Z])(?![A-Za-z])\\s+làm\\s+tâm\\s*,?\\s*(?:vẽ|dựng|kẻ)\\s+' +
    CIRCLE_KW +
    '\\s+bán\\s*kính\\s+([A-Z])([A-Z])(?![A-Za-z])',
  'gu',
);

// "hai đường tròn (này)? cắt nhau (tại điểm thứ hai)? (là|tại) <D>".
const MEET = new RegExp(
  '[Hh]ai\\s+' + CIRCLE_KW + '\\s*(?:này\\s+)?cắt\\s+nhau\\s+' +
    '(?:(?:ở|tại)\\s+)?(?:điểm\\s+thứ\\s+hai\\s+)?(?:là|tại)\\s+(?:điểm\\s+)?([A-Z])(?![A-Za-z])',
  'u',
);

const PREFILTER = /làm\s+tâm[^.]{0,40}?bán\s*kính/u;

export const twoCirclesCenterRadiusMeetRule: LanguageRule = {
  id: 'two-circles-center-radius-meet',
  // Cạnh twoCirclesMeet (74): 2 đtròn + giao điểm là gốc phái sinh.
  priority: 73,
  languages: ['vi'],
  patterns: [PREFILTER],
  match(ctx) {
    const p = ctx.problem;

    // Thu thập tất cả cụm "tâm <X> bán kính <XY>" (X = chữ đầu đoạn).
    CENTER_RADIUS.lastIndex = 0;
    const circles: { center: string; through: string }[] = [];
    let cm: RegExpExecArray | null;
    while ((cm = CENTER_RADIUS.exec(p)) !== null) {
      const center = cm[1];
      const a = cm[2];
      const b = cm[3];
      if (a !== center || b === center) continue; // bán kính phải XUẤT PHÁT từ tâm
      circles.push({ center, through: b });
    }
    // Cần đúng 2 đtròn, 2 tâm KHÁC nhau, CÙNG đi qua 1 điểm (giao A).
    if (circles.length !== 2) return [];
    const [k1, k2] = circles;
    if (k1.center === k2.center) return [];
    if (k1.through !== k2.through) return []; // 2 đtròn phải cùng qua A để cắt nhau

    const mm = MEET.exec(p);
    if (!mm) return [];
    const d = mm[1];
    if (d === k1.center || d === k2.center || d === k1.through) return [];

    // Claim mọi clause liên quan: 2 clause "tâm <X> bán kính" + clause "cắt nhau".
    const clauseIds = ctx.clauses
      .filter((c) => /làm\s+tâm/u.test(c.text) || /cắt\s+nhau/u.test(c.text))
      .map((c) => c.id);
    const intents: IntentT[] = [
      drawCircle(k1.center, 'centerThrough', { center: k1.center, through: k1.through }),
      drawCircle(k2.center, 'centerThrough', { center: k2.center, through: k2.through }),
      addPoint(d, { kind: 'circleIntersection', c1: k1.center, c2: k2.center, which: 1 }),
    ];
    return [
      {
        ruleId: 'two-circles-center-radius-meet',
        clauseIds,
        intents,
      } as RuleMatch,
    ];
  },
};
