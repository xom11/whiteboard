// src/stamps/geometry-2d/ai/rules/twoThroughLinesMeet.ts
//
// Giao của HAI đường thẳng "qua điểm, song song/vuông góc với đoạn" nêu trong cùng
// một mệnh đề:
//   "Đường thẳng qua A song song với BC cắt đường thẳng qua C song song với AB ở D"
//   "Qua D kẻ đường thẳng song song với AB, qua B kẻ đường thẳng song song với AD,
//    hai đường thẳng này cắt nhau tại E"
//
// → D = giao(parA, parC). Tên đường theo quy ước parallelPerp (par/prp + điểm qua)
// để hai rule dựng CÙNG một đường (intent trùng được khử).
//
// Thà thiếu còn hơn sai: đúng HAI cụm "qua P … song song/vuông góc (với) XY" trong
// mệnh đề, hai điểm qua khác nhau, và câu nói rõ chúng cắt nhau tại một tên điểm.
import type { LanguageRule, RuleMatch } from './_types';
import { addPoint, drawLine } from './_shared';

const QUA = /(?:[Qq]ua|[Tt]ừ)\s+(?:điểm\s+)?([A-Z])(?![\p{L}\d'′])[^.,]{0,24}?(song\s*song|vuông\s*góc)\s+(?:với\s+)?(?:cạnh\s+|đoạn\s*(?:thẳng\s+)?|đường\s*thẳng\s+)?([A-Z])([A-Z])(?![\p{L}\d'′])/gu;
const CAT_NHAU = /(?:cắt\s+nhau|giao\s+nhau)\s+(?:tại|ở)\s+(?:điểm\s+)?([A-Z])(?![\p{L}\d'′])/u;
const CAT_DUONG = /cắt\s+đường\s*thẳng\s+qua\s+[A-Z][^.,]*?(?:tại|ở)\s+(?:điểm\s+)?([A-Z])(?![\p{L}\d'′])/u;

export const twoThroughLinesMeetRule: LanguageRule = {
  id: 'twoThroughLinesMeet',
  priority: 58,
  languages: ['vi'],
  patterns: [/[Qq]ua\s+(?:điểm\s+)?[A-Z][^.]*[Qq]ua\s+(?:điểm\s+)?[A-Z]/u],
  match(ctx) {
    const out: RuleMatch[] = [];
    for (const c of ctx.clauses) {
      const hits = [...c.text.matchAll(QUA)];
      if (hits.length !== 2) continue;
      const ten = (CAT_NHAU.exec(c.text) ?? CAT_DUONG.exec(c.text))?.[1];
      if (!ten) continue;
      const lines = hits.map((m) => {
        const song = /song/u.test(m[2]);
        return { name: (song ? 'par' : 'prp') + m[1], through: m[1], song, to: m[3] + m[4] };
      });
      if (lines[0].through === lines[1].through) continue;
      if (lines.some((l) => l.through === ten || l.to.includes(ten) || (l.song && l.to.includes(l.through)))) continue;
      // hai đường song song với cùng một đoạn → không cắt nhau
      if (lines[0].song && lines[1].song && [...lines[0].to].sort().join() === [...lines[1].to].sort().join()) continue;
      out.push({
        ruleId: 'twoThroughLinesMeet',
        clauseIds: [c.id],
        intents: [
          ...lines.map((l) => drawLine(l.name, l.song ? 'parallelThrough' : 'perpThrough', { through: l.through, to: l.to })),
          addPoint(ten, { kind: 'intersection', of: [lines[0].name, lines[1].name] }),
        ],
      });
    }
    return out;
  },
};
