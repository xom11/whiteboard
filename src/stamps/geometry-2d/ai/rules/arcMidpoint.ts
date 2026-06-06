// src/stamps/geometry-2d/ai/rules/arcMidpoint.ts
//
// Điểm chính giữa cung: "Gọi M là điểm chính giữa cung BC (không chứa A)".
//   → add-point M {kind:'arcMidpoint', circle:'O', a:'B', b:'C', notContaining:'A'}
//
// circle lấy từ toàn đề ("(O)" / "đường tròn (tâm) O"); KHÔNG có circle → bỏ qua
// (escalate AI — không thể dựng cung mà không biết đường tròn).
//
// notContaining:
//   - "không chứa X"               → X
//   - không nêu nhưng có tam giác  → đỉnh thứ 3 (đỉnh tam giác không thuộc cặp cung)
//   - cả hai đều không suy được    → bỏ qua (escalate)
//
// Tên điểm qua extractPointName / ký tự HOA trước "(là) điểm chính giữa"; không
// trích được tên → bỏ qua (đừng bịa tên).
//
// GOTCHA \b: \b của JS dựa ASCII word-char nên KHÔNG khớp quanh ký tự Việt
// ("đ","ề","ạ"…). Mọi regex chứa ký tự Việt dùng cờ 'u' + lookaround \p{L}.
import type { LanguageRule, RuleMatch } from './_types';
import { addPoint, extractPointName, pairFromToken } from './_shared';

// Prefilter toàn đề: "chính giữa cung" hoặc "trung điểm cung".
const ARC_MID = /(?:chính\s+giữa|trung\s*điểm)\s+(?:của\s+)?cung/u;

// Cụm cung + cặp đỉnh: "điểm chính giữa cung (nhỏ|lớn) BC".
// "nhỏ|lớn" optional; "của" optional. Cặp đỉnh = 2 ký tự HOA liền.
const ARC_PAIR =
  /(?:chính\s+giữa|trung\s*điểm)\s+(?:của\s+)?cung\s+(?:nhỏ\s+|lớn\s+)?([A-Z])([A-Z])/u;

// Tên điểm đứng TRƯỚC cụm: "M (là) (điểm) (chính giữa|trung điểm) cung".
const NAME_BEFORE =
  /([A-Z])(?:['′]?)\s+(?:là\s+)?(?:điểm\s+)?(?:chính\s+giữa|trung\s*điểm)\s+(?:của\s+)?cung/u;

// "không chứa X" → X.
const NOT_CONTAINING = /không\s+chứa\s+([A-Z])/u;

// Tam giác trong toàn đề → 3 đỉnh (dùng suy notContaining khi đề không nêu).
const TRI = /tam giác\s+([A-Z])([A-Z])([A-Z])/u;

// Tên đường tròn trong toàn đề: "đường tròn (tâm) O" / "(O)".
//   - "đường tròn tâm O" / "đường tròn O"  → O
//   - "(O)" đứng riêng (1 ký tự HOA trong ngoặc, không phải cặp đỉnh / số)
const CIRCLE_WORDS = /đường\s*tròn\s*(?:\(\s*)?(?:tâm\s+)?([A-Z])(?![A-Z])/u;
const CIRCLE_PAREN = /\(\s*([A-Z])\s*\)/u;

/** Tên đường tròn từ toàn đề; undefined nếu không tìm thấy. */
function resolveCircle(problem: string): string | undefined {
  const w = CIRCLE_WORDS.exec(problem);
  if (w) return w[1];
  const p = CIRCLE_PAREN.exec(problem);
  if (p) return p[1];
  return undefined;
}

/**
 * "Gọi M là điểm chính giữa cung nhỏ BC không chứa A" → add-point M
 * {kind:'arcMidpoint', circle, a:'B', b:'C', notContaining:'A'}.
 *
 * Một clause khớp khi: trích được tên điểm, cặp đỉnh cung, đường tròn, và
 * notContaining (nêu "không chứa X" hoặc suy từ đỉnh thứ 3 của tam giác). Thiếu
 * bất kỳ thành phần nào → bỏ qua clause (escalate AI thay vì đoán sai).
 */
export const arcMidpointRule: LanguageRule = {
  id: 'arcMidpoint',
  priority: 60,
  languages: ['vi'],
  patterns: [ARC_MID],
  match(ctx) {
    const circle = resolveCircle(ctx.problem);
    if (!circle) return []; // không có đường tròn → escalate

    const tri = TRI.exec(ctx.problem);

    const out: RuleMatch[] = [];
    for (const c of ctx.clauses) {
      if (!ARC_MID.test(c.text)) continue;

      const pairM = ARC_PAIR.exec(c.text);
      if (!pairM) continue;
      const pair = pairFromToken(pairM[1] + pairM[2]);
      if (pair.length !== 2) continue;
      const [a, b] = pair;

      // Tên điểm: lời dẫn "Gọi/Lấy X là …" ưu tiên, fallback HOA trước cụm.
      const before = NAME_BEFORE.exec(c.text);
      const name = extractPointName(c.text) ?? (before ? before[1] : undefined);
      if (!name) continue; // không trích được tên → bỏ qua

      // notContaining: "không chứa X" hoặc đỉnh thứ 3 của tam giác.
      let notContaining: string | undefined;
      const nc = NOT_CONTAINING.exec(c.text);
      if (nc) {
        notContaining = nc[1];
      } else if (tri) {
        const verts = [tri[1], tri[2], tri[3]];
        notContaining = verts.find((v) => v !== a && v !== b);
      }
      if (!notContaining) continue; // không suy được → bỏ qua

      out.push({
        ruleId: 'arcMidpoint',
        clauseIds: [c.id],
        intents: [addPoint(name, { kind: 'arcMidpoint', circle, a, b, notContaining })],
      });
    }
    return out;
  },
};
