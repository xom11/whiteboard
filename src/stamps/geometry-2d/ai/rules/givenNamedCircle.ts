// src/stamps/geometry-2d/ai/rules/givenNamedCircle.ts
//
// Đường tròn ĐẶT TÊN cho trước, TRƠ tên (không bán kính số/chữ, không đường kính,
// không nội/ngoại tiếp tam giác) NHƯNG CÓ điểm khai báo trên nó:
//   "Cho đường tròn (O) và hai điểm B, C cố định trên đường tròn. Lấy A trên (O)…"
//     → circle O (centerRadius bán kính canonical, O tự do). onCircle A,B,C trỏ O.
//
// circleRadius CỐ Ý bỏ "(O)" trơ (không số/chữ/"đi qua"); circleTriangle chỉ lo
// circle gắn tam giác (nội/ngoại tiếp). Khi (O) là GIVEN gốc + có điểm trên nó
// (onCirclePoint trỏ "O"/"O_c"), cần dựng circle "O" để ref hợp lệ. Đề olympiad
// dạng "Cho (O), A,B,C ∈ (O)" cực phổ biến.
//
// resolveCircleNames sẽ đổi circle "O"→"O_c" + thêm tâm O free (center===name) và
// map onCircle ref "O"→"O_c" — nhất quán.
//
// GOTCHA \b: ký tự Việt → cờ 'u'.
import type { LanguageRule, RuleMatch } from './_types';
import { drawCircle, CIRCLE_KW } from './_shared';
import { SYMBOLIC_RADIUS } from './circleRadius';

// "(X)" trơ: 1 ký tự HOA trong ngoặc, KHÔNG ";"/"," (radius) bên trong.
const BARE_PAREN = /\(\s*([A-Z])\s*\)/gu;
// Có điểm trên đường tròn (onCircle-style) → circle không "trơ".
const HAS_POINTS_ON = /(?:trên|thuộc)\s+(?:nửa\s+)?(?:đường\s*tròn|cung|\(\s*[A-Z]\s*\))/u;

export const givenNamedCircleRule: LanguageRule = {
  id: 'givenNamedCircle',
  priority: 74, // dưới circleRadius(75)/circleTriangle, trên điểm onCircle(64)
  languages: ['vi'],
  patterns: [/\(\s*[A-Z]\s*\)/u],
  match(ctx) {
    if (!HAS_POINTS_ON.test(ctx.problem)) return [];
    const out: RuleMatch[] = [];
    const seen = new Set<string>();
    BARE_PAREN.lastIndex = 0;
    for (const m of ctx.problem.matchAll(BARE_PAREN)) {
      const center = m[1];
      if (seen.has(center)) continue;
      const c = center; // single [A-Z]
      // Bỏ qua nếu tâm này CÓ qualifier khác (rule khác lo): bán kính số/chữ
      // "(O; …)", đường kính, nội/ngoại tiếp.
      if (new RegExp(`\\(\\s*${c}\\s*[;,]`, 'u').test(ctx.problem)) continue; // (O; R)/(O; 3)
      if (new RegExp(`\\(\\s*${c}\\s*\\)[^.]{0,30}?đường\\s*kính|đường\\s*kính[^.]{0,30}?\\(\\s*${c}\\s*\\)`, 'u').test(ctx.problem)) continue;
      if (new RegExp(`(?:nội|ngoại)\\s*tiếp[^.]{0,30}?\\(\\s*${c}\\s*\\)|\\(\\s*${c}\\s*\\)[^.]{0,30}?(?:nội|ngoại)\\s*tiếp`, 'u').test(ctx.problem)) continue;
      // "(O)" phải là đường tròn (đứng sau "đường tròn"/"(nửa) đường tròn") HOẶC
      // đề mở bằng "Cho (đường tròn)? (O)". Yêu cầu CIRCLE_KW gần để không nuốt
      // "(O)" chú thích điểm.
      if (!new RegExp(`${CIRCLE_KW}\\s*\\(\\s*${c}\\s*\\)`, 'u').test(ctx.problem)) continue;
      seen.add(center);
      // claim clause chứa "(center)".
      const owner = ctx.clauses.find((cl) => new RegExp(`\\(\\s*${c}\\s*\\)`, 'u').test(cl.text));
      out.push({
        ruleId: 'givenNamedCircle',
        clauseIds: owner ? [owner.id] : [],
        intents: [drawCircle(center, 'centerRadius', { center, radius: SYMBOLIC_RADIUS })],
      });
    }
    return out;
  },
};
