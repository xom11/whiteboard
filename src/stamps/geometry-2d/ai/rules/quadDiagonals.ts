// src/stamps/geometry-2d/ai/rules/quadDiagonals.ts
//
// Tứ giác + GIAO ĐIỂM hai đường chéo:
//   "Cho ABCD là tứ giác với các đường chéo AC và BD vuông góc và cắt nhau tại E"
//      (t02:VD26)
//   "Tứ giác ABCD có hai đường chéo AC và BD cắt nhau tại O"
//
// quadRule sở hữu dạng "tứ giác ABCD" (tên hình ĐỨNG TRƯỚC 4 đỉnh). Dạng "ABCD
// là tứ giác" (đỉnh TRƯỚC tên hình) KHÔNG được quad bắt → no-match. Rule này phủ
// dạng đó: vẽ tứ giác 4 đỉnh + nối 2 đường chéo + giao điểm E = AC ∩ BD.
//
// CHỈ lo giao điểm 2 đường chéo (intersection rule cũng có thể bắt "cắt nhau tại
// E" nhưng cần hình tứ giác được dựng trước — rule này emit cả hai để self-
// contained). KHÔNG cố giải ràng buộc "vuông góc" (partial OK — hình tứ giác +
// 2 đường chéo + giao điểm là đủ rời NONE).
//
// GOTCHA \b: ký tự Việt → cờ 'u' + lookaround (?!\p{L}).
import type { LanguageRule, RuleMatch } from './_types';
import { drawShape, addPoint, connect } from './_shared';

const PREFILTER = /[A-Z]{4}\s+là\s+(?:một\s+)?tứ\s*giác|tứ\s*giác\s+[A-Z]{4}[^.]{0,60}?đường\s*chéo/u;

// "ABCD là (một)? tứ giác" — 4 đỉnh HOA TRƯỚC "là tứ giác".
const QUAD_DECL = /([A-Z])([A-Z])([A-Z])([A-Z])(?![A-Z])\s+là\s+(?:một\s+)?tứ\s*giác/u;

// "(hai)? đường chéo AC và BD … cắt nhau (tại|ở) E" — 2 chéo cho bởi cặp đỉnh +
// tên giao điểm SAU. Blob `[^.]{0,40}?` cho "vuông góc và" xen giữa.
const DIAGONALS = new RegExp(
  '(?:hai\\s+|các\\s+)?đường\\s*chéo\\s+([A-Z]{2})\\s+(?:và|,)\\s+([A-Z]{2})' +
    '[^.]{0,40}?cắt\\s+nhau\\s+(?:tại|ở)\\s+(?:điểm\\s+)?([A-Z])(?![A-Z])',
  'u',
);

export const quadDiagonalsRule: LanguageRule = {
  id: 'quad-diagonals',
  priority: 99, // ~quad (100): vẽ tứ giác sớm; intersection (45) dựng E sau.
  languages: ['vi'],
  patterns: [PREFILTER],
  match(ctx) {
    const out: RuleMatch[] = [];
    for (const c of ctx.clauses) {
      const q = QUAD_DECL.exec(c.text);
      if (!q) continue;
      const labels = [q[1], q[2], q[3], q[4]];
      if (new Set(labels).size !== 4) continue;

      const intents = [drawShape('quadrilateral', labels, 'any')];

      const d = DIAGONALS.exec(c.text);
      if (d) {
        const diag1 = d[1];
        const diag2 = d[2];
        const e = d[3];
        const ends = [diag1[0], diag1[1], diag2[0], diag2[1]];
        // 2 đường chéo phải có 4 đầu mút phân biệt ⊆ đỉnh tứ giác, E ∉ đỉnh.
        const okDiag =
          new Set(ends).size === 4 &&
          ends.every((x) => labels.includes(x)) &&
          !labels.includes(e);
        if (okDiag) {
          intents.push(connect(diag1[0], diag1[1], 'segment'));
          intents.push(connect(diag2[0], diag2[1], 'segment'));
          intents.push(addPoint(e, { kind: 'intersection', of: [diag1, diag2] }));
        }
      }
      out.push({ ruleId: 'quad-diagonals', clauseIds: [c.id], intents });
    }
    return out;
  },
};
