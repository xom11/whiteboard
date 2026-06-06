// src/stamps/geometry-2d/ai/rules/triangle.ts
import type { LanguageRule, RuleMatch } from './_types';
import { drawShape } from './_shared';

const TRI = /tam giác\s+([A-Z])([A-Z])([A-Z])/u;
const RIGHT_AT = /vuông\s+tại\s+([A-Z])/u;
const ISO_AT = /cân\s+tại\s+([A-Z])/u;
// LƯU Ý: \b của JS dựa trên ASCII word-char nên KHÔNG khớp quanh ký tự Việt
// ("đ","ề"…). Dùng lookaround \p{L} để chặn match giữa từ dài hơn.
const EQUILATERAL = /(?<!\p{L})đều(?!\p{L})/u;

/**
 * "tam giác ABC" → draw-shape triangle. Variant suy từ "vuông tại X" / "cân tại X"
 * / "đều". Quy ước enum (xem TriangleVariantZ): cân tại A ⇒ isoceles-BC (đáy là 2
 * đỉnh còn lại); vuông tại A ⇒ right-at-A.
 */
export const triangleRule: LanguageRule = {
  id: 'triangle',
  priority: 100,
  languages: ['vi'],
  patterns: [TRI],
  match(ctx) {
    const out: RuleMatch[] = [];
    for (const c of ctx.clauses) {
      const m = TRI.exec(c.text);
      if (!m) continue;
      const labels = [m[1], m[2], m[3]];
      let variant = 'any';
      const ra = RIGHT_AT.exec(c.text);
      const iso = ISO_AT.exec(c.text);
      if (EQUILATERAL.test(c.text)) {
        variant = 'equilateral';
      } else if (ra && labels.includes(ra[1])) {
        variant = `right-at-${ra[1]}`;
      } else if (iso && labels.includes(iso[1])) {
        // Enum dùng cặp đáy theo THỨ TỰ CYCLIC (AB|BC|CA), KHÔNG phải label-sorted:
        // apex A→BC, apex B→CA, apex C→AB. Lấy 2 đỉnh kế tiếp apex theo vòng.
        const i = labels.indexOf(iso[1]);
        variant = `isoceles-${labels[(i + 1) % 3]}${labels[(i + 2) % 3]}`;
      }
      out.push({
        ruleId: 'triangle',
        clauseIds: [c.id],
        intents: [drawShape('triangle', labels, variant)],
      });
    }
    return out;
  },
};
