// src/stamps/geometry-2d/ai/rules/perpChordAtFoot.ts
//
// Dây vuông góc với một đường (thường là đường kính), MỘT đầu mút ĐÃ có:
//   "Kẻ dây DE ⊥ AB tại H"  (D là tiếp điểm/điểm đã dựng trước)
//     → E = reflectLine(D qua AB)   (E đối xứng D qua AB → cũng trên đường tròn
//        khi AB là đường kính)
//       H = perpFoot(D trên AB)     (chân vuông góc = giao DE với AB)
//       + đoạn DE (dây).
//
// Quy ước: đầu mút THỨ NHẤT (D) là điểm neo đã tồn tại (tiếp điểm, điểm trên
// đường tròn…); đầu mút thứ hai (E) suy ra bằng đối xứng. KHÁC perpChordThroughPoint
// ("Qua M kẻ dây DE ⊥ AB" — chord qua điểm M cho trước, 2 đầu mút là giao
// đường⊥∩đường tròn). Ở đây chord neo bởi đầu mút có sẵn.
//
// GOTCHA \b: ký tự Việt → cờ 'u'; ⊥ hoặc "vuông góc với".
import type { LanguageRule, RuleMatch } from './_types';
import { addPoint, connect } from './_shared';

// "(Kẻ)? dây (cung)? DE (⊥|vuông góc với) AB (tại H)?" — g1g2=dây DE, g3=đường
// AB (1-2 ký tự), g4=H (optional, chân).
const RE = new RegExp(
  String.raw`(?:[Kk]ẻ|[Vv]ẽ|[Dd]ựng)?\s*dây\s*(?:cung\s+)?([A-Z])([A-Z])(?![A-Z])\s*(?:⊥|vuông\s*góc(?:\s+với)?)\s+(?:đường\s*thẳng\s+|cạnh\s+|đoạn\s+)?([A-Z]{1,2})(?![A-Z])(?:\s+tại\s+([A-Z])(?![A-Z]))?`,
  'gu',
);

export const perpChordAtFootRule: LanguageRule = {
  id: 'perpChordAtFoot',
  priority: 49,
  languages: ['vi'],
  patterns: [/dây[^.]{0,12}?(?:⊥|vuông\s*góc)/u],
  match(ctx) {
    const out: RuleMatch[] = [];
    for (const c of ctx.clauses) {
      RE.lastIndex = 0;
      for (const m of c.text.matchAll(RE)) {
        const d = m[1]; // đầu mút neo (đã có)
        const e = m[2]; // đầu mút suy ra
        const line = m[3];
        const h = m[4];
        if (new Set([d, e]).size !== 2 || line.includes(d) || line.includes(e)) continue;
        const intents = [
          addPoint(e, { kind: 'reflectLine', of: d, through: line }),
          connect(d, e, 'segment'),
        ];
        if (h && h !== d && h !== e && !line.includes(h)) {
          intents.push(addPoint(h, { kind: 'perpFoot', from: d, onLine: line }));
        }
        out.push({ ruleId: 'perpChordAtFoot', clauseIds: [c.id], intents });
      }
    }
    return out;
  },
};
