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

const PREFILTER = /(?:nằm\s+)?(?:bên\s+)?trong\s+(?:tam\s*giác|tứ\s*giác|hình)/u;
const RE =
  /(?:[Gg]ọi\s+|[Ll]ấy\s+)?(?:điểm\s+)?([A-Z])(?!\p{L})\s+(?:là\s+)?(?:một\s+)?điểm\s+(?:nằm\s+)?(?:bên\s+)?trong\s+(?:tam\s*giác|tứ\s*giác|hình\s+\S+)\s+[A-Z]{3,4}(?![A-Z])/u;

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
      const m = RE.exec(c.text);
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
