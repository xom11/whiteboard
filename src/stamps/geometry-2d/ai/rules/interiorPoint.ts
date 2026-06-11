// src/stamps/geometry-2d/ai/rules/interiorPoint.ts
//
// Điểm TỰ DO bên trong một hình:
//   "P là một điểm nằm trong tam giác ABC" → addPoint(P, {kind:'free'})
//   "Lấy điểm M nằm bên trong tứ giác ABCD"
//
// Điểm tự do (kéo được) — chỉ để UNBLOCK các construct phái sinh (vd PA, trung
// trực ∩ PA). KHÔNG kích hoạt khi clause CŨNG nói "trên đường tròn/cung" (onCircle
// giữ điểm đó — priority cao hơn + addPoint idempotent, nhưng guard để khỏi claim thừa).
//
// \b không khớp ký tự Việt → (?!\p{L}) + cờ 'u'. Priority THẤP (sau onCircle…).
import type { LanguageRule, RuleMatch } from './_types';
import { addPoint } from './_shared';

const PREFILTER = /(?:nằm\s+)?(?:bên\s+)?trong\s+(?:tam\s*giác|tứ\s*giác|hình|mặt\s*phẳng)/u;
// "trong tam giác/tứ giác/hình ABCD" HOẶC "trong mặt phẳng (chứa) tam giác ABC"
// (điểm thuộc mặt phẳng tam giác = điểm tự do gần tam giác → unblock construct).
const RE =
  /(?:[Gg]ọi\s+|[Ll]ấy\s+)?(?:điểm\s+)?([A-Z])(?!\p{L})\s+(?:là\s+)?(?:một\s+)?điểm\s+(?:nằm\s+)?(?:bên\s+)?trong\s+(?:mặt\s*phẳng\s+(?:chứa\s+)?)?(?:tam\s*giác|tứ\s*giác|hình\s+\S+)\s+[A-Z]{3,4}(?![A-Z])/u;

// Dạng tên-SAU-"điểm" + đỉnh hình KHÔNG lặp: "(một)? điểm O nằm (bên)? trong
// (hình chữ nhật|tam giác|…)" (Bài 5: "và một điểm O nằm trong hình chữ nhật").
// Hình đã được dựng ở chỗ khác (quad/triangle) → O là điểm tự do bên trong.
const RE2 =
  /(?:một\s+)?điểm\s+([A-Z])(?!\p{L})\s+nằm\s+(?:bên\s+)?trong\s+(?:tam\s*giác|tứ\s*giác|hình(?:\s+(?:chữ\s*nhật|vuông|thoi|bình\s*hành|thang|\S+))?)(?:\s+[A-Z]{3,4}(?![A-Z]))?/u;

export const interiorPointRule: LanguageRule = {
  id: 'interiorPoint',
  priority: 30,
  languages: ['vi'],
  patterns: [PREFILTER],
  match(ctx) {
    const out: RuleMatch[] = [];
    for (const c of ctx.clauses) {
      // onCircle/onSegment giữ điểm nếu clause nêu "trên (đường tròn|cung|…)".
      if (/trên\s+(?:đường\s*tròn|cung|nửa|\()/u.test(c.text)) continue;
      const m = RE.exec(c.text) ?? RE2.exec(c.text);
      if (!m) continue;
      out.push({
        ruleId: 'interiorPoint',
        clauseIds: [c.id],
        intents: [addPoint(m[1], { kind: 'free' })],
      });
    }
    return out;
  },
};
