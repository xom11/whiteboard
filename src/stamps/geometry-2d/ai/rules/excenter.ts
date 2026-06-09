// src/stamps/geometry-2d/ai/rules/excenter.ts
//
// Tâm đường tròn bàng tiếp (excenter): "J là tâm bàng tiếp góc A".
//   → add-point J {kind:'excenter', of:['A','B','C'], opposite:'A'}
//
// excenter cần BỘ 3 đỉnh tam giác (of) + ĐỈNH ĐỐI DIỆN (opposite — góc mà đường
// tròn bàng tiếp ứng với). DSL/intent/render đã support; rule này chỉ lo NLU.
//
// Tam giác: nêu trong clause → lấy; else tam giác DUY NHẤT toàn đề; nhập nhằng /
// không có → bỏ qua (escalate). Đỉnh đối PHẢI thuộc tam giác (else escalate).
//
// Tên tâm: ký tự HOA đứng TRƯỚC "(là) tâm (đường tròn)? bàng tiếp" (cục bộ, KHÔNG
// quét lời dẫn toàn clause). Không trích được tên → bỏ qua (đừng bịa).
//
// KHÔNG dùng extractPointName (_shared) ở đây: NAME_LA của nó dùng `là\b` (ASCII
// \b sau 'à' không khớp) nên không bắt được "X là …". Rule tự neo qua NAME_BEFORE.
//
// GOTCHA \b: \b của JS theo ASCII nên KHÔNG khớp quanh ký tự Việt. Regex chứa ký
// tự Việt dùng cờ 'u' + lookaround (?!\p{L}).
//
// Chỉ dựng ĐIỂM tâm (excenter). "Vẽ đường tròn bàng tiếp" (excircle) chưa có
// intent path → clause không đặt tên tâm sẽ KHÔNG match → escalate (an toàn).
import type { LanguageRule, RuleMatch } from './_types';
import { addPoint } from './_shared';

// Prefilter toàn đề.
const EXCENTER_KW = /bàng\s*tiếp/u;

// Tam giác (1 lần) trong 1 đoạn text.
const TRI = /tam\s*giác\s+([A-Z])([A-Z])([A-Z])/u;
const TRI_G = /tam\s*giác\s+([A-Z])([A-Z])([A-Z])/gu;

// Đỉnh đối diện: "bàng tiếp (trong)? (góc|đỉnh|ứng với (đỉnh)?|đối diện (đỉnh)?) X".
const OPPOSITE =
  /bàng\s*tiếp\s+(?:trong\s+)?(?:góc|đỉnh|ứng\s+với(?:\s+đỉnh)?|đối\s+diện(?:\s+đỉnh)?)\s+([A-Z])(?!\p{L})/u;

// Tên tâm đứng TRƯỚC: "J (là)? tâm (của)? (đường tròn)? bàng tiếp".
const NAME_BEFORE =
  /([A-Z])(?:['′]?)\s+(?:là\s+)?(?:tâm\s+)?(?:(?:của\s+)?đường\s*tròn\s+)?bàng\s*tiếp/u;

/**
 * of=[A,B,C] cho 1 clause: ưu tiên tam giác nêu trong clause; else tam giác DUY
 * NHẤT toàn đề (dedup theo bộ đỉnh). Nhiều tam giác khác nhau / không có →
 * undefined (escalate).
 */
function resolveTriangleOf(clauseText: string, problem: string): string[] | undefined {
  const inClause = TRI.exec(clauseText);
  if (inClause) return [inClause[1], inClause[2], inClause[3]];
  TRI_G.lastIndex = 0;
  const all: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = TRI_G.exec(problem)) !== null) all.push(m[1] + m[2] + m[3]);
  const distinct = new Set(all);
  if (distinct.size === 1) {
    const t = all[0];
    return [t[0], t[1], t[2]];
  }
  return undefined;
}

/**
 * "J là tâm bàng tiếp góc A" → add-point J {kind:'excenter', of:[A,B,C], opposite:'A'}.
 * Thiếu đỉnh đối / tam giác / tên → bỏ qua clause (escalate AI thay vì đoán sai).
 */
export const excenterRule: LanguageRule = {
  id: 'excenter',
  priority: 60,
  languages: ['vi'],
  patterns: [EXCENTER_KW],
  match(ctx) {
    const out: RuleMatch[] = [];
    for (const c of ctx.clauses) {
      if (!EXCENTER_KW.test(c.text)) continue;

      const oppM = OPPOSITE.exec(c.text);
      if (!oppM) continue; // không xác định đỉnh đối → escalate
      const opposite = oppM[1];

      const of = resolveTriangleOf(c.text, ctx.problem);
      if (!of) continue; // không có/nhập nhằng tam giác → escalate
      if (!of.includes(opposite)) continue; // đỉnh đối phải thuộc tam giác

      const nameM = NAME_BEFORE.exec(c.text);
      const name = nameM ? nameM[1] : undefined;
      if (!name) continue; // không trích được tên → bỏ qua (đừng bịa)

      out.push({
        ruleId: 'excenter',
        clauseIds: [c.id],
        intents: [addPoint(name, { kind: 'excenter', of, opposite })],
      });
    }
    return out;
  },
};
