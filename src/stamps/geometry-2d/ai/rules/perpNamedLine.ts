// src/stamps/geometry-2d/ai/rules/perpNamedLine.ts
//
// Đường thẳng ĐẶT TÊN (token tia <HOA><thường>: Ax, Od, By) vuông góc với một
// đường, qua gốc = chữ đầu token, có thể có chân:
//   "Từ A kẻ Ax ⊥ MN tại K"      → line Ax = perpThrough(A, MN) + K=perpFoot(A,MN)
//   "Vẽ đường thẳng Od ⊥ OA tại O" → line Od = perpThrough(O, OA) (O ∈ OA: không foot)
//
// Tạo đường ĐÚNG TÊN trong đề để clause sau ("Tia BI cắt Ax tại C") tham chiếu
// được (vao10:11 — clause sau đã parse nhưng Ax chưa dựng → cascade fail).
//
// KHÁC parallelPerp (đặt tên synth "prpA", không foot) + perpFoot ("Kẻ AH ⊥ BC"
// cặp HOA): ở đây token là <HOA><thường> (tên tia) nên không nhầm.
//
// GOTCHA \b: ký tự Việt → cờ 'u'.
import type { LanguageRule, RuleMatch } from './_types';
import type { IntentT } from '../intent';
import { addPoint, drawLine } from './_shared';

const PREFILTER = /(?:[Kk]ẻ|[Vv]ẽ|[Dd]ựng)\s+(?:đường\s*thẳng\s+|tia\s+)?[A-Z][a-z]\s*(?:⊥|vuông\s*góc)/u;

// "(Từ/Qua <X>)? (kẻ|vẽ|dựng) (đường thẳng|tia)? <Token><thường> (⊥|vuông góc với)
//  <LINE> (, cắt <LINE>)? (tại <K>)?". group1=token(2 ký tự Ax), group2=LINE,
//  group3=K. Cho phép "(, cắt LINE2)?" xen giữa ⊥ và "tại K" (vao10:206 "Ax ⊥ MN,
//  cắt MN tại K" — chân K nằm trên LINE chứ không phải đầu mút).
const RE = new RegExp(
  // `⊥\\s*` (KHÔNG `\\s+`): OCR hay dính "Ax⊥MN" (vao10:11). Dạng chữ giữ `\\s+`.
  '(?:[Kk]ẻ|[Vv]ẽ|[Dd]ựng)\\s+(?:đường\\s*thẳng\\s+|tia\\s+)?([A-Z][a-z])(?![A-Za-z])\\s*' +
    '(?:⊥\\s*|vuông\\s*góc(?:\\s+với)?\\s+)(?:với\\s+)?(?:đường\\s*thẳng\\s+|cạnh\\s+|đoạn\\s+)?' +
    '([A-Z]{1,2})(?![A-Z])(?:\\s*,?\\s*cắt\\s+[A-Z]{1,2})?(?:\\s+(?:tại|ở)\\s+(?:điểm\\s+)?([A-Z])(?![A-Za-z]))?',
  'gu',
);

export const perpNamedLineRule: LanguageRule = {
  id: 'perp-named-line',
  priority: 60,
  languages: ['vi'],
  patterns: [PREFILTER],
  match(ctx) {
    const out: RuleMatch[] = [];
    for (const c of ctx.clauses) {
      RE.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = RE.exec(c.text)) !== null) {
        const token = m[1]; // "Ax"
        const anchor = token[0]; // gốc = chữ đầu HOA
        const line = m[2];
        const foot = m[3];
        if (line.includes(anchor) && !foot) continue; // gốc ∈ line + không chân → degenerate
        const intents: IntentT[] = [
          drawLine(token, 'perpThrough', { through: anchor, to: line }),
        ];
        // Chân chỉ khi K ≠ gốc và K ∉ đầu mút LINE (else trùng điểm đã có).
        if (foot && foot !== anchor && !line.includes(foot)) {
          intents.push(addPoint(foot, { kind: 'perpFoot', from: anchor, onLine: line }));
        }
        out.push({ ruleId: 'perp-named-line', clauseIds: [c.id], intents });
      }
    }
    return out;
  },
};
