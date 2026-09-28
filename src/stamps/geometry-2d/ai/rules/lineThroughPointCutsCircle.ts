// src/stamps/geometry-2d/ai/rules/lineThroughPointCutsCircle.ts
//
// "Qua B kẻ đường thẳng song song với DE cắt đường tròn (O) tại điểm thứ hai là A"
// "Từ A kẻ đường thẳng song song với MB, cắt (O) tại C"
// "Qua A vẽ đường thẳng vuông góc với IA cắt (O) tại C và cắt (O') tại D"
// → đường song song/vuông góc qua P (tên parP/prpP như parallelPerp để trùng) +
//   giao THỨ HAI với từng đường tròn, điểm chung = P (P nằm trên đường tròn).
// Nếu P không nằm trên đường tròn, secondIntersection lấy giao đầu tiên của tia
// (xem point-constraints/secondIntersection).
//
// Trước đây lineCircleIntersection bắt nhầm "DE cắt đường tròn (O) … là A" (DE là
// đường THAM CHIẾU của "song song với") ⇒ A = giao thứ hai của DE — sai hình. Rule
// này priority cao hơn (first-wins) và lineCircleIntersection chặn chủ ngữ đứng sau
// "với/song song/vuông góc".
import type { LanguageRule, RuleMatch } from './_types';
import { addPoint, drawLine } from './_shared';

const CIRCLE = String.raw`(?:(?:nửa\s+)?đường\s*tròn\s*)?\(\s*([A-Z]['′]?)\s*(?:[;,]\s*[Rr]\s*)?\)`;
const AT_2ND = String.raw`\s+(?:tại|ở)\s+(?:điểm\s+(?:thứ\s+hai\s+)?)?(?:là\s+)?([A-Z])(?![A-Z'′])`;
const RE = new RegExp(
  String.raw`(?:[Qq]ua|[Tt]ừ)\s+(?:điểm\s+)?([A-Z])(?![\p{L}'′])\s+(?:kẻ|vẽ|dựng)\s+(?:một\s+)?đường\s*thẳng\s+(song\s*song|vuông\s*góc)\s+(?:với\s+)?(?:đường\s*thẳng\s+)?([A-Z]{2})(?![A-Z])` +
    String.raw`\s*,?\s*(?:và\s+)?cắt\s+(?:lại\s+)?` + CIRCLE + AT_2ND +
    String.raw`(?:\s*(?:\([^)]{0,20}\)\s*)?(?:,|và)\s*cắt\s+(?:lại\s+)?` + CIRCLE + AT_2ND + ')?',
  'gu',
);
const PREFILTER = /(?:[Qq]ua|[Tt]ừ)\s+(?:điểm\s+)?[A-Z][^.]{0,40}?(?:song\s*song|vuông\s*góc)[^.]{0,30}?cắt\s+(?:lại\s+)?(?:(?:nửa\s+)?đường\s*tròn\s*)?\(/u;

export const lineThroughPointCutsCircleRule: LanguageRule = {
  id: 'lineThroughPointCutsCircle',
  priority: 59, // trên parallelPerp(58)/lineCircleIntersection(47)
  languages: ['vi'],
  patterns: [PREFILTER],
  match(ctx) {
    const out: RuleMatch[] = [];
    const norm = (s: string) => s.replace(/′/g, "'");
    for (const c of ctx.clauses) {
      RE.lastIndex = 0;
      for (const m of c.text.matchAll(RE)) {
        const p = m[1];
        const song = /song/u.test(m[2]);
        const to = m[3];
        if (song && to.includes(p)) continue;
        const name = (song ? 'par' : 'prp') + p;
        const intents = [drawLine(name, song ? 'parallelThrough' : 'perpThrough', { through: p, to })];
        const giao: Array<[string, string]> = [[norm(m[4]), m[5]]];
        if (m[6] && m[7]) giao.push([norm(m[6]), m[7]]);
        let ok = true;
        for (const [circle, q] of giao) {
          if (q === p || to.includes(q)) ok = false;
          intents.push(addPoint(q, { kind: 'secondIntersection', line: name, circle, other: p }));
        }
        if (!ok) continue;
        out.push({ ruleId: 'lineThroughPointCutsCircle', clauseIds: [c.id], intents });
      }
    }
    return out;
  },
};
