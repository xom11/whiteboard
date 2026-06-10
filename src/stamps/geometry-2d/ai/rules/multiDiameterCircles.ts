// src/stamps/geometry-2d/ai/rules/multiDiameterCircles.ts
//
// NHIỀU nửa đường tròn đường kính + tâm đặt tên, phân phối (arbelos):
//   "Vẽ … các nửa đường tròn có đường kính theo thứ tự là AB, AC, CB và có tâm
//    theo thứ tự là O, I, K"
//     → 3 cặp (AB,O),(AC,I),(CB,K). Mỗi cặp: center=midpoint(2 đầu mút),
//       circle "<center>_c" diameter [đầu mút]. 2 đầu mút của đường kính ĐẦU
//       (AB) = free (điểm cho); đầu mút khác (C) = onSegment(AB) (điểm trong).
//
// Bù circleDiameter (1 đường tròn / clause) + diameterCircleSecant (không tâm).
// GOTCHA \b: ký tự Việt → cờ 'u' + (?!\p{L}).
import type { LanguageRule, RuleMatch } from './_types';
import type { IntentT } from '../intent';
import { addPoint, connect, drawCircle } from './_shared';

// "đường kính (theo thứ tự)? (là)? <blob đôi HOA> … tâm (theo thứ tự)? (là)? <blob HOA>"
const RE =
  /đường\s*kính\s+(?:theo\s+thứ\s+tự\s+)?(?:là\s+)?((?:[A-Z]{2}\s*,\s*)+[A-Z]{2})(?![A-Z])[^.]{0,30}?tâm\s+(?:theo\s+thứ\s+tự\s+)?(?:là\s+)?((?:[A-Z](?:['′])?\s*,\s*)+[A-Z](?:['′])?)(?![A-Z])/u;

const PREFILTER = /đường\s*kính[^.]{0,40}?tâm/u;

export const multiDiameterCirclesRule: LanguageRule = {
  id: 'multiDiameterCircles',
  priority: 67, // như circleDiameter — dựng đầu mút + tâm trước điểm phái sinh
  languages: ['vi'],
  patterns: [PREFILTER],
  match(ctx) {
    for (const c of ctx.clauses) {
      const m = RE.exec(c.text);
      if (!m) continue;
      const diams = m[1].split(',').map((s) => s.trim());
      const centers = m[2].split(',').map((s) => s.trim().replace('′', "'"));
      if (diams.length !== centers.length || diams.length < 2) continue;
      // mỗi đường kính = cặp 2 đỉnh HOA.
      const pairs = diams.map((d) => [d[0], d[1]] as const);
      if (pairs.some((p) => p[0] === p[1])) continue;

      // Đầu mút đường kính ĐẦU = extremes (free). Đầu mút khác = điểm trong đoạn đầu.
      const [exA, exB] = pairs[0];
      const intents: IntentT[] = [addPoint(exA, { kind: 'free' }), addPoint(exB, { kind: 'free' })];
      const seen = new Set([exA, exB]);
      for (const [p0, p1] of pairs) {
        for (const e of [p0, p1]) {
          if (seen.has(e)) continue;
          seen.add(e);
          intents.push(addPoint(e, { kind: 'onSegment', of: `${exA}${exB}` }));
        }
      }
      intents.push(connect(exA, exB, 'segment')); // đoạn đường kính lớn
      // mỗi cặp: tâm = trung điểm, đường tròn "<center>_c" đường kính.
      for (let i = 0; i < pairs.length; i++) {
        const [x, y] = pairs[i];
        const center = centers[i];
        if (center === x || center === y) continue;
        intents.push(addPoint(center, { kind: 'midpoint', of: `${x}${y}` }));
        intents.push(drawCircle(`${center}_c`, 'diameter', { endpoints: [x, y] }));
      }
      return [{ ruleId: 'multiDiameterCircles', clauseIds: [c.id], intents }];
    }
    return [];
  },
};
