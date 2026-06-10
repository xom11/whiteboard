// src/stamps/geometry-2d/ai/rules/givenDiameterCircle.ts
//
// Đường tròn đường kính CHO TRƯỚC, KHÔNG tên tâm, KHÔNG đa giác:
//   "Cho nửa đường tròn đường kính AB = 2R. Từ A và B kẻ hai tiếp tuyến…"
//     → A, B là điểm CHO (free); đường tròn "kAB" do diameterCircleSecant dựng.
//
// diameterCircleSecant chỉ vẽ đường tròn "kXY" (giả định X,Y có sẵn từ ngữ cảnh
// — vd Simson: M,C phái sinh). Khi đường tròn đường kính là GIVEN gốc (không tam
// giác/tứ giác/đa giác), 2 đầu mút CHƯA được rule nào dựng → cần free.
//
// GUARD (tránh dựng free đè điểm phái sinh):
//   - KHÔNG có tâm đặt tên ("(O)"/"tâm O") — circleDiameter lo dạng đó (đã free
//     A,B + center).
//   - KHÔNG có đa giác (tam giác/tứ giác/hình …) — nếu có, A,B có thể là đỉnh
//     hình (do triangle/quad dựng) → không free.
// Priority CAO (67) để A,B dựng TRƯỚC điểm phái sinh tham chiếu (intersection 45…).
import type { LanguageRule, RuleMatch } from './_types';
import { addPoint, connect } from './_shared';

const UNNAMED_DIAMETER = /(?:nửa\s+)?đường\s*tròn\s+đường\s*kính\s+([A-Z])([A-Z])(?![A-Z])/u;
const HAS_NAMED_CENTER = /đường\s*tròn\s*(?:\(\s*[A-Z]|tâm\s+[A-Z])/u;
const HAS_POLYGON = /tam\s*giác|tứ\s*giác|hình\s+(?:vuông|chữ|bình|thoi|thang)/u;

export const givenDiameterCircleRule: LanguageRule = {
  id: 'givenDiameterCircle',
  priority: 67,
  languages: ['vi'],
  patterns: [UNNAMED_DIAMETER],
  match(ctx) {
    if (HAS_NAMED_CENTER.test(ctx.problem)) return [];
    if (HAS_POLYGON.test(ctx.problem)) return [];
    for (const c of ctx.clauses) {
      const m = UNNAMED_DIAMETER.exec(c.text);
      if (!m) continue;
      const [a, b] = [m[1], m[2]];
      if (a === b) continue;
      return [
        {
          ruleId: 'givenDiameterCircle',
          clauseIds: [c.id],
          intents: [
            addPoint(a, { kind: 'free' }),
            addPoint(b, { kind: 'free' }),
            connect(a, b, 'segment'),
          ],
        },
      ];
    }
    return [];
  },
};
