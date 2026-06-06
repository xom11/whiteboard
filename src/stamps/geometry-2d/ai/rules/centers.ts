// src/stamps/geometry-2d/ai/rules/centers.ts
//
// Tâm tam giác: trọng tâm (centroid), trực tâm (orthocenter), tâm đường tròn
// ngoại tiếp (circumcenter), tâm đường tròn nội tiếp (incenter).
//
// Mọi kind này cần bộ 3 đỉnh of=[A,B,C] lấy từ tam giác trong toàn đề
// (ctx.problem). Không có tam giác → không thể dựng → bỏ qua (escalate AI).
// Tên điểm phải trích được (HOA ngay sau cụm từ khoá, hoặc "X là <từ khoá>");
// nếu không → bỏ qua, KHÔNG bịa tên.
import type { LanguageRule, RuleMatch } from './_types';
import { addPoint } from './_shared';

// Tam giác trong toàn đề → 3 đỉnh.
const TRI = /tam giác\s+([A-Z])([A-Z])([A-Z])/u;

// Từ khoá tâm. \b không khớp quanh ký tự Việt nên dùng lookaround \p{L}.
// "trọng tâm" — chặn nhầm với "trung tâm" bằng cách yêu cầu đúng "trọng".
const CENTROID_KW = /(?<!\p{L})trọng\s*tâm(?!\p{L})/u;
// "trực tâm" — chặn nhầm với "trung trực" (kết thúc bằng "trực", không phải "trực tâm").
const ORTHO_KW = /(?<!\p{L})trực\s*tâm(?!\p{L})/u;
// "ngoại tiếp" → circumcenter.
const CIRCUM_KW = /(?<!\p{L})ngoại\s*tiếp(?!\p{L})/u;
// "nội tiếp" → incenter (chỉ khi nói về TÂM, không phải "tam giác nội tiếp đường tròn").
const INSCRIBE_KW = /(?<!\p{L})nội\s*tiếp(?!\p{L})/u;
// Tên tâm đứng trước "tâm" qua "là": "O là tâm", "Gọi O là tâm (đường tròn)…".
const NAME_BEFORE_TAM = /(?<!\p{L})([A-Z])\s+là\s+tâm(?!\p{L})/u;

// Tên điểm đứng NGAY SAU cụm từ khoá: "trọng tâm G", "tâm (đường tròn) ngoại tiếp O".
function nameAfter(text: string, kw: RegExp): string | undefined {
  const m = kw.exec(text);
  if (!m) return undefined;
  const rest = text.slice(m.index + m[0].length);
  // bỏ qua các từ chêm phổ biến ("của", "là", "tam giác", "đường tròn", dấu câu)
  const after = /^[\s,:của là]*?(?:tam\s*giác\s+)?([A-Z])(?!\p{L})/u.exec(rest);
  return after ? after[1] : undefined;
}

// Tên điểm đứng TRƯỚC cụm từ khoá: "G là trọng tâm", "H là trực tâm".
function nameBefore(text: string, kw: RegExp): string | undefined {
  const m = kw.exec(text);
  if (!m) return undefined;
  const before = text.slice(0, m.index);
  // "...<HOA> (là)? " ngay trước từ khoá
  const mm = /(?<!\p{L})([A-Z])\s+(?:là\s+)?$/u.exec(before);
  return mm ? mm[1] : undefined;
}

function resolveName(text: string, kw: RegExp): string | undefined {
  return nameBefore(text, kw) ?? nameAfter(text, kw);
}

// Tâm đường tròn ngoại/nội tiếp: tên đứng trước "tâm" (qua "là") — vd "Gọi O là
// tâm đường tròn ngoại tiếp" — hoặc sau cụm từ khoá — vd "ngoại tiếp O".
function resolveCenterName(text: string, kw: RegExp): string | undefined {
  const before = NAME_BEFORE_TAM.exec(text);
  if (before) return before[1];
  return nameAfter(text, kw);
}

/**
 * Tâm tam giác → add-point với of=[A,B,C]. Một clause có thể nêu nhiều tâm
 * (vd "trọng tâm G và trực tâm H"); emit từng intent, cùng claim clause.
 */
export const centersRule: LanguageRule = {
  id: 'centers',
  priority: 70,
  languages: ['vi'],
  patterns: [CENTROID_KW, ORTHO_KW, CIRCUM_KW, INSCRIBE_KW],
  match(ctx) {
    const tri = TRI.exec(ctx.problem);
    if (!tri) return []; // không có tam giác → không dựng được → escalate
    const of = [tri[1], tri[2], tri[3]];

    const out: RuleMatch[] = [];
    for (const c of ctx.clauses) {
      const intents = [];

      if (CENTROID_KW.test(c.text)) {
        const name = resolveName(c.text, CENTROID_KW);
        if (name) intents.push(addPoint(name, { kind: 'centroid', of }));
      }
      if (ORTHO_KW.test(c.text)) {
        const name = resolveName(c.text, ORTHO_KW);
        if (name) intents.push(addPoint(name, { kind: 'orthocenter', of }));
      }
      // circumcenter: "ngoại tiếp". incenter: "nội tiếp" nhưng KHÔNG khi clause
      // cũng có "ngoại tiếp" (cùng cụm gây nhập nhằng) — ưu tiên ngoại tiếp.
      if (CIRCUM_KW.test(c.text)) {
        const name = resolveCenterName(c.text, CIRCUM_KW);
        if (name) intents.push(addPoint(name, { kind: 'circumcenter', of }));
      } else if (INSCRIBE_KW.test(c.text)) {
        const name = resolveCenterName(c.text, INSCRIBE_KW);
        if (name) intents.push(addPoint(name, { kind: 'incenter', of }));
      }

      if (intents.length > 0) {
        out.push({ ruleId: 'centers', clauseIds: [c.id], intents });
      }
    }
    return out;
  },
};
