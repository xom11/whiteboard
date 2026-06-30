// src/stamps/geometry-2d/ai/rules/circleCenterRadiusCutsSides.ts
//
// "Đường tròn tâm H bán kính AH cắt AB, AC (lần lượt|theo thứ tự)? tại M, N"
//   → đường tròn TÂM H đi qua A (bán kính = đoạn AH, một đầu mút là tâm H, đầu
//     kia A là điểm-qua trên đường tròn), centerThrough(H, A).
//     A là đỉnh CHUNG của cả AB lẫn AC ⇒ điểm chung (other) loại trừ cho giao
//     thứ hai trên mỗi cạnh:
//       M = secondIntersection(AB, đường tròn, other=A)
//       N = secondIntersection(AC, đường tròn, other=A)
//
// KHÁC circleCenterRadiusSegment (case 1) — rule đó CHỈ emit đường tròn (không
// xử lý "cắt …") VÀ buộc chữ ĐẦU của bán kính = tâm ("tâm A bán kính AH"). Ở đây
// tâm có thể là đầu mút THỨ HAI của bán kính ("tâm H bán kính AH" — A là through).
//
// KHÁC circleThroughTwoCutsSides — đường tròn ở đó qua 2 điểm (1 bậc tự do, tâm
// trên trung trực) và MỖI cạnh chứa 1 điểm-qua KHÁC nhau. Ở đây through-point
// DUY NHẤT (A) phải nằm trên CẢ HAI cạnh (đỉnh chung) ⇒ other = A cho cả hai.
//
// Fail-safe (escalate, thà thiếu hơn dựng sai):
//   - bán kính không xuất phát từ tâm (cả 2 đầu mút ≠ tâm) → bỏ qua.
//   - số cạnh ≠ số điểm → bỏ qua.
//   - through-point không nằm trên một cạnh → other không xác định → bỏ qua.
//   - tên giao trùng đỉnh cạnh / through-point / tâm → bỏ qua.
//
// GOTCHA \b: ký tự Việt → cờ 'u' + lookaround (?!\p{L}), KHÔNG \b ASCII.
import type { LanguageRule, RuleMatch } from './_types';
import type { IntentT } from '../intent';
import { addPoint, drawCircle, CIRCLE_KW } from './_shared';

// "đường tròn tâm <H> bán kính <X><Y> ... cắt <lineRegion> (lần lượt|theo thứ tự)?
//  tại <pointList ≥1>". lineRegion lazy tới "tại"; pointList chặt (HOA + ,/và).
//  groups: 1=center 2=r0 3=r1 4=lineRegion 5=pointList.
const PATTERN = new RegExp(
  CIRCLE_KW +
    '\\s+tâm\\s+([A-Z])(?![A-Z])\\s*' +
    'bán\\s*kính\\s+([A-Z])([A-Z])(?![A-Z])' +
    '[^.;\\n]*?cắt\\s+([^.;\\n]*?)\\s+(?:(?:lần\\s*lượt|theo\\s+thứ\\s+tự)\\s+)?' +
    'tại\\s+(?:các\\s+)?(?:điểm\\s+)?' +
    '([A-Z](?!\\p{L})(?:\\s*(?:,|và)\\s*[A-Z](?!\\p{L}))*)',
  'gu',
);

const PREFILTER = new RegExp(
  CIRCLE_KW + '\\s+tâm\\s+[A-Z]\\s*bán\\s*kính\\s+[A-Z]{2}[^.;\\n]*?cắt',
  'u',
);

export const circleCenterRadiusCutsSidesRule: LanguageRule = {
  id: 'circle-center-radius-cuts-sides',
  // THẤP HƠN triangle (100) + centers (cần đỉnh + tâm H dựng trước). Cùng họ với
  // diameterCircleCutsSides (66) / circleThroughTwoCutsSides (58). Đặt 57.
  priority: 57,
  languages: ['vi'],
  patterns: [PREFILTER],
  match(ctx) {
    const out: RuleMatch[] = [];
    for (const c of ctx.clauses) {
      PATTERN.lastIndex = 0;
      for (const m of c.text.matchAll(PATTERN)) {
        const center = m[1];
        const r0 = m[2];
        const r1 = m[3];
        // bán kính xuất phát từ tâm: 1 trong 2 đầu mút = tâm; through = đầu kia.
        let through: string | undefined;
        if (r0 === center && r1 !== center) through = r1;
        else if (r1 === center && r0 !== center) through = r0;
        if (!through) continue;

        const lines = m[4].match(/[A-Z][A-Z](?![A-Z])/gu) ?? [];
        const points = m[5].match(/[A-Z](?![A-Z])/gu) ?? [];
        // phân phối 1-1: ≥1 cạnh và số cạnh == số điểm.
        if (lines.length === 0 || lines.length !== points.length) continue;

        const circ = `${center}_c`;
        const intents: IntentT[] = [
          drawCircle(circ, 'centerThrough', { center, through }),
        ];

        let ok = true;
        const seen = new Set<string>();
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          const pt = points[i];
          // through-point PHẢI nằm trên cạnh (điểm chung đã biết trên cả cạnh
          // lẫn đường tròn) để làm other cho giao thứ hai.
          if (!line.includes(through)) { ok = false; break; }
          // tên giao MỚI, không trùng đỉnh cạnh / through / tâm / đã thấy.
          if (line.includes(pt) || pt === through || pt === center || seen.has(pt)) {
            ok = false;
            break;
          }
          seen.add(pt);
          intents.push(
            addPoint(pt, { kind: 'secondIntersection', line, circle: circ, other: through }),
          );
        }
        if (!ok) continue;

        out.push({ ruleId: 'circle-center-radius-cuts-sides', clauseIds: [c.id], intents });
      }
    }
    return out;
  },
};
