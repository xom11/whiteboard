// src/stamps/geometry-2d/ai/rules/pointOnTangentRay.ts
//
// Điểm nằm TRÊN một tiếp tuyến ĐÃ ĐẶT TÊN (token tia Ax/Bx/By):
//   "Kẻ tiếp tuyến Ax và lấy trên tiếp tuyến đó một điểm P"   (Bài 7)
//   "lấy trên Ax một điểm P"                                   (gọi thẳng tên tia)
//
// → add-point P {kind:'onSegment', of:'Ax'} — builder resolveSegmentRef thấy
//   shape 'Ax' đã có (do tangentRay dựng trước, priority cao hơn) → glider trên
//   đường tiếp tuyến. "tiếp tuyến đó" = anaphora trỏ tia đặt tên gần nhất.
//
// GOTCHA \b: regex chứa ký tự Việt dùng cờ 'u' + lookaround (?!\p{L}).
import type { LanguageRule, RuleMatch } from './_types';
import type { IntentT } from '../intent';
import { addPoint } from './_shared';

// Token tiếp tuyến đặt tên: "tiếp tuyến Ax". Dùng để biết tia gần nhất (anaphora).
const NAMED_TANGENT = /tiếp\s*tuyến\s+([A-Z][xyzt])(?![A-Za-z])/gu;

// Prefilter: "tiếp tuyến <Ray>" + "lấy trên ... điểm <P>".
const PREFILTER = /tiếp\s*tuyến\s+[A-Z][xyzt][^]*lấy\s+trên/u;

// "lấy trên tiếp tuyến đó (một)? điểm P" — anaphora (tia gần nhất).
const TAKE_ON_THAT =
  /lấy\s+trên\s+tiếp\s*tuyến\s+(?:đó|ấy|này)\s+(?:một\s+)?điểm\s+([A-Z])(?![A-Za-z])/u;
// "lấy trên Ax (một)? điểm P" — gọi thẳng token tia.
const TAKE_ON_RAY =
  /lấy\s+trên\s+([A-Z][xyzt])(?![A-Za-z])[^.]{0,16}?điểm\s+([A-Z])(?![A-Za-z])/u;

export const pointOnTangentRayRule: LanguageRule = {
  id: 'point-on-tangent-ray',
  // Dưới tangent-ray (63) để tia đã dựng; trên intersect-ray (48).
  priority: 55,
  languages: ['vi'],
  patterns: [PREFILTER],
  match(ctx) {
    const out: RuleMatch[] = [];
    for (const c of ctx.clauses) {
      const intents: IntentT[] = [];

      // Dạng gọi thẳng tên tia "lấy trên Ax điểm P".
      const direct = TAKE_ON_RAY.exec(c.text);
      if (direct) {
        intents.push(addPoint(direct[2], { kind: 'onSegment', of: direct[1] }));
      } else {
        // Dạng anaphora "lấy trên tiếp tuyến đó điểm P" → bind tia đặt tên gần
        // nhất TRƯỚC vị trí "lấy trên".
        const anaph = TAKE_ON_THAT.exec(c.text);
        if (anaph) {
          const before = c.text.slice(0, anaph.index);
          let ray: string | undefined;
          NAMED_TANGENT.lastIndex = 0;
          for (const m of before.matchAll(NAMED_TANGENT)) ray = m[1];
          if (ray) intents.push(addPoint(anaph[1], { kind: 'onSegment', of: ray }));
        }
      }

      if (intents.length > 0) {
        out.push({ ruleId: 'point-on-tangent-ray', clauseIds: [c.id], intents });
      }
    }
    return out;
  },
};
