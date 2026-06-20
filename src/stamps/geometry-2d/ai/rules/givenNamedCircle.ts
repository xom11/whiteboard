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
import { drawCircle, CIRCLE_KW, escapeRe } from './_shared';
import { SYMBOLIC_RADIUS } from './circleRadius';

// "(X)" trơ: 1 ký tự HOA trong ngoặc, KHÔNG ";"/"," (radius) bên trong.
const BARE_PAREN = /\(\s*([A-Z])\s*\)/gu;
// Có điểm trên đường tròn (onCircle-style) → circle không "trơ".
const HAS_POINTS_ON = /(?:trên|thuộc)\s+(?:nửa\s+)?(?:đường\s*tròn|cung|\(\s*[A-Z]\s*\))/u;
// (O) TRẦN được tham chiếu bởi TIẾP TUYẾN / CÁT TUYẾN (không có điểm "trên" nó):
//   "Cho (O) và tiếp tuyến Ax" / "Kẻ cát tuyến BEF với đường tròn" (vao10:168).
// Tiếp tuyến/cát tuyến cần circle "O" làm ref (tangentAt.circle / secondIntersection
// .circle) — nếu (O) không được dựng → transpile-fail cascade. Đây là indicator
// đủ mạnh để dựng (O) nền (vẫn qua per-center guard radius/đường-kính/nội-ngoại-tiếp).
const HAS_TANGENT_OR_SECANT = /tiếp\s*tuyến|cát\s*tuyến/u;

export const givenNamedCircleRule: LanguageRule = {
  id: 'givenNamedCircle',
  priority: 74, // dưới circleRadius(75)/circleTriangle, trên điểm onCircle(64)
  languages: ['vi'],
  patterns: [/\(\s*[A-Z]\s*\)/u],
  match(ctx) {
    if (!HAS_POINTS_ON.test(ctx.problem) && !HAS_TANGENT_OR_SECANT.test(ctx.problem)) return [];
    const out: RuleMatch[] = [];
    const seen = new Set<string>();
    BARE_PAREN.lastIndex = 0;
    for (const m of ctx.problem.matchAll(BARE_PAREN)) {
      const center = m[1];
      if (seen.has(center)) continue;
      const c = center; // single [A-Z]
      // Bỏ qua nếu tâm này CÓ qualifier khác (rule khác lo): bán kính số/chữ
      // "(O; …)", đường kính, nội/ngoại tiếp.
      if (new RegExp(`\\(\\s*${escapeRe(c)}\\s*[;,]`, 'u').test(ctx.problem)) continue; // (O; R)/(O; 3)
      if (new RegExp(`\\(\\s*${escapeRe(c)}\\s*\\)[^.]{0,30}?đường\\s*kính|đường\\s*kính[^.]{0,30}?\\(\\s*${escapeRe(c)}\\s*\\)`, 'u').test(ctx.problem)) continue;
      if (new RegExp(`(?:nội|ngoại)\\s*tiếp[^.]{0,30}?\\(\\s*${escapeRe(c)}\\s*\\)|\\(\\s*${escapeRe(c)}\\s*\\)[^.]{0,30}?(?:nội|ngoại)\\s*tiếp`, 'u').test(ctx.problem)) continue;
      // "(O)" phải là đường tròn:
      //   (a) đứng sau "đường tròn"/"(nửa) đường tròn" — "Cho đường tròn (O)", HOẶC
      //   (b) đề MỞ bằng "Cho (O)" (notation tắt phổ biến — "(O)" trần = đường tròn
      //       tâm O) — chỉ chấp nhận khi (O) được THAM CHIẾU bởi tiếp/cát tuyến (đã
      //       qua HAS_TANGENT_OR_SECANT ở đầu match) → tránh nuốt "(O)" chú thích điểm.
      // Yêu cầu CIRCLE_KW gần HOẶC mở đầu "Cho (O)" để không nuốt "(O)" chú thích.
      const isNamedCircle = new RegExp(`${CIRCLE_KW}\\s*\\(\\s*${escapeRe(c)}\\s*\\)`, 'u').test(ctx.problem);
      const isOpenedBare = new RegExp(`^[Cc]ho\\s+\\(\\s*${escapeRe(c)}\\s*\\)`, 'u').test(ctx.problem.trimStart());
      if (!isNamedCircle && !isOpenedBare) continue;
      seen.add(center);
      // claim clause chứa "(center)".
      const owner = ctx.clauses.find((cl) => new RegExp(`\\(\\s*${escapeRe(c)}\\s*\\)`, 'u').test(cl.text));
      out.push({
        ruleId: 'givenNamedCircle',
        clauseIds: owner ? [owner.id] : [],
        intents: [drawCircle(center, 'centerRadius', { center, radius: SYMBOLIC_RADIUS })],
      });
    }
    return out;
  },
};
