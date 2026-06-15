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

// Prefilter: bất kỳ tiếp tuyến đặt tên "<Ray>" nào (match() lọc tiếp). Đủ để bắt
// cả forward ("lấy trên Ax") lẫn reverse ("Trên tia Ax lấy điểm M").
const PREFILTER = /tiếp\s*tuyến\s+[A-Z][xyzt]/u;

// "lấy trên tiếp tuyến đó (một)? điểm P" — anaphora (tia gần nhất).
const TAKE_ON_THAT =
  /lấy\s+trên\s+tiếp\s*tuyến\s+(?:đó|ấy|này)\s+(?:một\s+)?điểm\s+([A-Z])(?![A-Za-z])/u;
// "lấy trên Ax (một)? điểm P" — gọi thẳng token tia.
const TAKE_ON_RAY =
  /lấy\s+trên\s+([A-Z][xyzt])(?![A-Za-z])[^.]{0,16}?điểm\s+([A-Z])(?![A-Za-z])/u;
// Reverse: "Trên (tia)? Ax lấy (một)? điểm M" (group1=ray, group2=point).
const REV_TAKE_ON_RAY =
  /[Tt]rên\s+(?:tia\s+)?([A-Z][xyzt])(?![A-Za-z])\s+lấy\s+(?:một\s+)?điểm\s+([A-Z])(?![A-Za-z])/u;
// "(điểm)? M trên Ax" — "Từ điểm M trên Ax kẻ …" (group1=point, group2=ray).
const ON_RAY =
  /điểm\s+([A-Z])(?![A-Za-z])\s+trên\s+([A-Z][xyzt])(?![A-Za-z])/u;

export const pointOnTangentRayRule: LanguageRule = {
  id: 'point-on-tangent-ray',
  // Dưới tangent-ray (63) để tia đã dựng; trên intersect-ray (48).
  priority: 55,
  languages: ['vi'],
  patterns: [PREFILTER],
  match(ctx) {
    // Tập tia tiếp tuyến ĐÃ đặt tên toàn đề (tangentRay dựng các tia này). Reverse
    // form chỉ emit khi ray ∈ tập này → tránh onSegment của shape chưa dựng
    // (transpile-fail). "Trên tia Bx" mà Bx không phải tiếp tuyến → bỏ qua.
    const namedRays = new Set<string>();
    for (const m of ctx.problem.matchAll(NAMED_TANGENT)) namedRays.add(m[1]);

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

      // Reverse "Trên tia Ax lấy điểm M" / "điểm M trên Ax" — chỉ khi Ax là tiếp
      // tuyến đặt tên toàn đề (đã dựng). Không trùng forward (forward dùng "lấy
      // trên").
      if (intents.length === 0) {
        const rev = REV_TAKE_ON_RAY.exec(c.text) ?? ON_RAY.exec(c.text);
        if (rev) {
          // REV_TAKE: g1=ray g2=point. ON_RAY: g1=point g2=ray. Token tia có dạng
          // [A-Z][xyzt]; điểm là [A-Z] đơn → phân biệt bằng dạng token.
          const rayTok = /^[A-Z][xyzt]$/.test(rev[1]) ? rev[1] : rev[2];
          const ptTok = rayTok === rev[1] ? rev[2] : rev[1];
          if (namedRays.has(rayTok) && /^[A-Z]$/.test(ptTok)) {
            intents.push(addPoint(ptTok, { kind: 'onSegment', of: rayTok }));
          }
        }
      }

      if (intents.length > 0) {
        out.push({ ruleId: 'point-on-tangent-ray', clauseIds: [c.id], intents });
      }
    }
    return out;
  },
};
