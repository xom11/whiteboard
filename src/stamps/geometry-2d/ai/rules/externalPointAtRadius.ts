// src/stamps/geometry-2d/ai/rules/externalPointAtRadius.ts
//
// Điểm NGOÀI đường tròn cho bằng metric khoảng-cách-tới-tâm:
//   "Cho (O) và một điểm A sao cho OA = 3R" → A ngoài (O)
//   "OM = 2R" (O tâm) → M ngoài (O)
//
// givenNamedCircle/circleRadius dựng (O) NHƯNG KHÔNG dựng A → mọi dựng phái sinh
// từ A (tiếp tuyến AP/AQ…) transpile-fail UNKNOWN_REF A → cả bài rớt. Đặt A free
// NGOÀI circle (externalToCircle — builder đã có, đọc tâm+R từ build state).
// Khoảng cách chính xác k·R KHÔNG quan trọng cho topo hình (k≥2 ⇒ ngoài).
//
// PRIORITY 67: sau circle (75/72) + externalPoint (68), trước tiếp-tuyến-từ-ngoài
// (≤65) để A build TRƯỚC tangent (topo-retry vẫn lo nếu lệch).
import type { LanguageRule, RuleMatch } from './_types';
import { addPoint } from './_shared';

// "OA = 3R" / "OM =2R" — 2 nhãn HOA, "=", số ≥2, "R". 1 nhãn là TÂM, nhãn kia =
// điểm ngoài. k=1 (=R) BỎ (điểm TRÊN đường tròn, rule khác lo). Cờ 'g' multi-match.
const METRIC = /([A-Z])(?:['′]?)([A-Z])(?:['′]?)\s*=\s*([2-9])\s*[Rr](?![A-Za-z])/gu;

// nhãn c là TÂM nếu toàn đề có "(c)"/"(c;..."/ "tâm c" / "đường tròn (c)".
function isCenter(problem: string, c: string): boolean {
  const e = c.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
  return new RegExp(
    String.raw`\(\s*${e}[\s);,]|tâm\s*${e}(?![A-Za-z])|đường\s*tròn\s*\(?\s*${e}(?![A-Za-z])`,
    'u',
  ).test(problem);
}

export const externalPointAtRadiusRule: LanguageRule = {
  id: 'externalPointAtRadius',
  priority: 67,
  languages: ['vi'],
  patterns: [/[A-Z](?:['′]?)[A-Z](?:['′]?)\s*=\s*[2-9]\s*[Rr](?![A-Za-z])/u],
  match(ctx) {
    const out: RuleMatch[] = [];
    for (const c of ctx.clauses) {
      METRIC.lastIndex = 0;
      for (const m of c.text.matchAll(METRIC)) {
        const a = m[1];
        const b = m[2];
        let center: string | undefined;
        let point: string | undefined;
        const aC = isCenter(ctx.problem, a);
        const bC = isCenter(ctx.problem, b);
        if (aC && !bC) {
          center = a;
          point = b;
        } else if (bC && !aC) {
          center = b;
          point = a;
        }
        if (!center || !point || center === point) continue;
        out.push({
          ruleId: 'externalPointAtRadius',
          clauseIds: [c.id],
          intents: [addPoint(point, { kind: 'externalToCircle', circle: center })],
        });
      }
    }
    return out;
  },
};
