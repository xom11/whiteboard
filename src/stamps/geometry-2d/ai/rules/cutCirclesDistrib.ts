// src/stamps/geometry-2d/ai/rules/cutCirclesDistrib.ts
//
// Phân phối giao của 2 ĐOẠN với 2 ĐƯỜNG TRÒN khác nhau (arbelos):
//   "Gọi M, N theo thứ tự là giao điểm của EA, EB với các nửa đường tròn (I), (K)"
//     → M = secondIntersection(EA, (I), other=<đầu mút EA ∈ đường kính của (I)>)
//       N = secondIntersection(EB, (K), other=<tương tự>)
//
// "other" (điểm chung đã biết) = đầu mút đoạn nằm trên đường tròn đó = đầu mút
// trùng 1 trong 2 đầu đường kính của đường tròn (lấy từ map "đường kính … tâm …").
// Không xác định được → fallback đầu mút thứ hai (vẫn nằm trên đường line∩circle).
//
// GOTCHA \b: ký tự Việt → cờ 'u' + (?!\p{L}).
import type { LanguageRule, RuleMatch } from './_types';
import type { IntentT } from '../intent';
import { addPoint } from './_shared';

// "M, N (theo thứ tự|lần lượt)? (là)? giao điểm (của)? EA, EB (với|cắt) (các)?
//  (nửa)? đường tròn (I), (K)"
const RE = new RegExp(
  '([A-Z])\\s*,\\s*([A-Z])(?![A-Z])\\s+(?:theo\\s+thứ\\s+tự\\s+|lần\\s*lượt\\s+)?(?:là\\s+)?' +
    'giao\\s*điểm\\s+(?:của\\s+)?([A-Z]{2})\\s*,\\s*([A-Z]{2})(?![A-Z])\\s+(?:với|cắt)\\s+' +
    "(?:các\\s+)?(?:(?:nửa\\s+)?đường\\s*tròn\\s*)?\\(\\s*([A-Z](?:['′])?)\\s*\\)\\s*,?\\s*(?:và\\s+)?\\(\\s*([A-Z](?:['′])?)\\s*\\)",
  'u',
);

// map tâm → 2 đầu mút đường kính, từ "đường kính … <blob> … tâm … <blob>".
const DIA_CENTERS = /đường\s*kính\s+(?:theo\s+thứ\s+tự\s+)?(?:là\s+)?((?:[A-Z]{2}\s*,\s*)+[A-Z]{2})(?![A-Z])[^.]{0,30}?tâm\s+(?:theo\s+thứ\s+tự\s+)?(?:là\s+)?((?:[A-Z](?:['′])?\s*,\s*)+[A-Z](?:['′])?)(?![A-Z])/u;

function diameterMap(problem: string): Map<string, [string, string]> {
  const m = DIA_CENTERS.exec(problem);
  const map = new Map<string, [string, string]>();
  if (!m) return map;
  const diams = m[1].split(',').map((s) => s.trim());
  const centers = m[2].split(',').map((s) => s.trim().replace('′', "'"));
  if (diams.length !== centers.length) return map;
  for (let i = 0; i < diams.length; i++) {
    if (diams[i].length === 2) map.set(centers[i], [diams[i][0], diams[i][1]]);
  }
  return map;
}

const PREFILTER = /giao\s*điểm\s+(?:của\s+)?[A-Z]{2}\s*,\s*[A-Z]{2}[^.]{0,30}?(?:với|cắt)\s+(?:các\s+)?(?:(?:nửa\s+)?đường\s*tròn\s*)?\(/u;

export const cutCirclesDistribRule: LanguageRule = {
  id: 'cutCirclesDistrib',
  priority: 45,
  languages: ['vi'],
  patterns: [PREFILTER],
  match(ctx) {
    const map = diameterMap(ctx.problem);
    const out: RuleMatch[] = [];
    for (const c of ctx.clauses) {
      const m = RE.exec(c.text);
      if (!m) continue;
      const [n1, n2, l1, l2, c1, c2] = [m[1], m[2], m[3], m[4], m[5], m[6]];
      const pickOther = (line: string, center: string): string => {
        const ends = map.get(center);
        if (ends) {
          if (line.includes(ends[0])) return ends[0];
          if (line.includes(ends[1])) return ends[1];
        }
        return line[1];
      };
      const intents: IntentT[] = [];
      if (!l1.includes(n1)) intents.push(addPoint(n1, { kind: 'secondIntersection', line: l1, circle: c1, other: pickOther(l1, c1) }));
      if (!l2.includes(n2)) intents.push(addPoint(n2, { kind: 'secondIntersection', line: l2, circle: c2, other: pickOther(l2, c2) }));
      if (intents.length > 0) out.push({ ruleId: 'cutCirclesDistrib', clauseIds: [c.id], intents });
    }
    return out;
  },
};
