// src/stamps/geometry-2d/ai/rules/circleCutsArcSecond.ts
//
// Đường tròn (đường kính XY) CẮT CUNG của một đường tròn khác tại giao THỨ HAI:
//   "đường tròn đường kính MP cắt cung nhỏ BC tại điểm N khác M"
//     → N = circleSecondIntersection(c1=kMP, c2=<đường tròn chứa cung BC>, exclude=M)
//
// c1 = đường tròn đường kính XY (diameterCircleSecant đặt tên "kXY").
// c2 = đường tròn NGOẠI TIẾP/chính trong đề chứa cung PQ — resolve qua
//      "nội tiếp/ngoại tiếp (đường tròn)? (tâm)? (O)". exclude = "khác M" (điểm
//      chung 2 đường tròn — thường là đầu mút đường kính nằm trên cung).
//
// Nếu không xác định được c2 / exclude → BỎ QUA (escalate fail-safe).
// GOTCHA \b: ký tự Việt → cờ 'u' + (?!\p{L}).
import type { LanguageRule, RuleMatch } from './_types';
import { addPoint } from './_shared';

const PREFILTER = /đường\s*tròn\s+đường\s*kính\s+[A-Z]{2}[^.]{0,40}?cắt\s+(?:cung|(?:nửa\s+)?đường\s*tròn)/u;

// "đường tròn đường kính XY cắt cung (nhỏ|lớn)? PQ ... (tại|ở) (điểm)? N (khác M)?"
const CUTS_ARC = new RegExp(
  'đường\\s*tròn\\s+đường\\s*kính\\s+([A-Z])([A-Z])(?![A-Z])' +
    '[^.]{0,20}?cắt\\s+cung\\s+(?:nhỏ\\s+|lớn\\s+)?([A-Z])([A-Z])(?![A-Z])' +
    '[^.]{0,24}?(?:tại|ở)\\s+(?:điểm\\s+)?([A-Z])(?![A-Z])(?:\\s+khác\\s+([A-Z])(?![A-Z]))?',
  'u',
);
// "đường tròn đường kính XY cắt (nửa)? đường tròn (O') (tại|ở) N (khác M)?"
const CUTS_CIRCLE = new RegExp(
  'đường\\s*tròn\\s+đường\\s*kính\\s+([A-Z])([A-Z])(?![A-Z])' +
    "[^.]{0,20}?cắt\\s+(?:nửa\\s+)?đường\\s*tròn\\s*\\(\\s*([A-Z])(?:['′]?)\\s*\\)" +
    '[^.]{0,24}?(?:tại|ở)\\s+(?:điểm\\s+)?([A-Z])(?![A-Z])(?:\\s+khác\\s+([A-Z])(?![A-Z]))?',
  'u',
);

// Đường tròn ngoại tiếp/chính chứa cung: "nội tiếp/ngoại tiếp (đường tròn)?
// (tâm)? (O)/tâm O". Trả tâm thô (resolveCircleNames map nếu cần).
const CIRCUM = /(?:nội\s*tiếp|ngoại\s*tiếp)\s+(?:đường\s*tròn\s+)?(?:tâm\s+)?\(?\s*([A-Z])(?:['′]?)\s*\)?/u;

export const circleCutsArcSecondRule: LanguageRule = {
  id: 'circleCutsArcSecond',
  priority: 45, // sau mọi rule dựng đường tròn + điểm chung
  languages: ['vi'],
  patterns: [PREFILTER],
  match(ctx) {
    const out: RuleMatch[] = [];
    for (const c of ctx.clauses) {
      // Dạng cắt CUNG: c2 = đường tròn ngoại tiếp/chính (chứa cung).
      const ma = CUTS_ARC.exec(c.text);
      if (ma) {
        const c1 = `k${ma[1]}${ma[2]}`;
        const name = ma[5];
        const exclude = ma[6] ?? ma[1]; // "khác M" hoặc đầu mút đường kính thứ nhất
        const cm = CIRCUM.exec(ctx.problem);
        if (cm && name !== exclude) {
          out.push({
            ruleId: 'circleCutsArcSecond',
            clauseIds: [c.id],
            intents: [addPoint(name, { kind: 'circleSecondIntersection', c1, c2: cm[1], exclude })],
          });
          continue;
        }
      }
      // Dạng cắt (nửa)? đường tròn (O') — c2 nêu tường minh.
      const mc = CUTS_CIRCLE.exec(c.text);
      if (mc) {
        const c1 = `k${mc[1]}${mc[2]}`;
        const c2 = mc[3];
        const name = mc[4];
        const exclude = mc[5] ?? mc[1];
        if (name !== exclude) {
          out.push({
            ruleId: 'circleCutsArcSecond',
            clauseIds: [c.id],
            intents: [addPoint(name, { kind: 'circleSecondIntersection', c1, c2, exclude })],
          });
        }
      }
    }
    return out;
  },
};
