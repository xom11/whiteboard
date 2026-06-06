// src/stamps/geometry-2d/ai/rules/triangle.ts
import type { LanguageRule, RuleMatch } from './_types';
import { drawShape } from './_shared';

// MULTI-MATCH: 1 clause có thể chứa NHIỀU tam giác ("tam giác ABC và tam giác
// ABD vuông tại A", "tam giác đều DEF nội tiếp tam giác ABC"). Bắt MỌI tam giác
// (cờ 'g'), variant bind từ TEXT WINDOW giữa tam giác này và tam giác KẾ — KHÔNG
// vơ chữ "đều"/"vuông tại X" của tam giác khác.
//
// leadMod = từ bổ nghĩa ĐỨNG TRƯỚC bộ 3 đỉnh ("tam giác đều DEF", "tam giác
// vuông ABC", "tam giác cân ABC"). leadMod "đều" → equilateral ngay; "vuông"/
// "cân" leadMod (không có "tại X") không đủ thông tin chọn đỉnh → để window xử lý.
const TRI_G = /tam giác\s+(?:(đều|vuông|cân)\s+)?([A-Z])([A-Z])([A-Z])(?![A-Z])/gu;
const RIGHT_AT = /vuông\s+tại\s+([A-Z])(?![A-Za-z])/u;
const ISO_AT = /cân\s+tại\s+([A-Z])(?![A-Za-z])/u;
// LƯU Ý: \b của JS dựa trên ASCII word-char nên KHÔNG khớp quanh ký tự Việt
// ("đ","ề"…). Dùng lookaround \p{L} để chặn match giữa từ dài hơn.
const EQUILATERAL = /(?<!\p{L})đều(?!\p{L})/u;

interface TriHit {
  labels: string[];
  /** leadMod đứng ngay trước bộ 3 đỉnh, hoặc undefined. */
  lead?: string;
  /** vị trí ngay sau match (đầu window). */
  end: number;
}

/**
 * Suy variant cho 1 tam giác từ: leadMod ("tam giác đều DEF") + WINDOW text
 * (đoạn từ ngay sau bộ 3 đỉnh tới đầu tam giác kế / hết clause). "vuông tại X" /
 * "cân tại X" CHỈ áp nếu X ∈ labels của tam giác NÀY (tránh bind nhầm sang tam
 * giác khác cùng clause). Quy ước enum (xem TriangleVariantZ): cân tại A ⇒
 * isoceles-BC (đáy CYCLIC: apex A→BC, B→CA, C→AB); vuông tại A ⇒ right-at-A.
 */
// Variant enum là POSITIONAL theo INDEX đỉnh đặc biệt trong labels (builder
// triangleCanonical: isoceles-BC ⇒ apex = vertex[0], right-at-A ⇒ vertex[0]
// vuông). KHÔNG dùng chữ-cái-nhãn: tam giác [A,C,D] "cân tại A" (apex idx 0) →
// isoceles-BC (positional), KHÔNG phải "isoceles-CD". Với nhãn ABC chuẩn,
// positional trùng label nên tương thích ngược.
const RIGHT_BY_IDX = ['right-at-A', 'right-at-B', 'right-at-C'];
const ISO_BY_IDX = ['isoceles-BC', 'isoceles-CA', 'isoceles-AB'];

function variantFor(hit: TriHit, window: string): string {
  const { labels, lead } = hit;
  // "tam giác đều DEF" hoặc chữ "đều" trong window riêng của tam giác này.
  if (lead === 'đều' || EQUILATERAL.test(window)) return 'equilateral';

  const ra = RIGHT_AT.exec(window);
  if (ra) {
    const i = labels.indexOf(ra[1]);
    if (i >= 0) return RIGHT_BY_IDX[i];
  }

  const iso = ISO_AT.exec(window);
  if (iso) {
    const i = labels.indexOf(iso[1]);
    if (i >= 0) return ISO_BY_IDX[i];
  }

  return 'any';
}

/**
 * "tam giác ABC" → draw-shape triangle. NHIỀU tam giác / clause → emit-all (mỗi
 * tam giác 1 intent), variant bind theo cú pháp gần (leadMod + window) để KHÔNG
 * mis-render (vd không gán "đều" của DEF cho ABC).
 */
export const triangleRule: LanguageRule = {
  id: 'triangle',
  priority: 100,
  languages: ['vi'],
  patterns: [TRI_G],
  match(ctx) {
    const out: RuleMatch[] = [];
    for (const c of ctx.clauses) {
      const hits: TriHit[] = [];
      TRI_G.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = TRI_G.exec(c.text)) !== null) {
        hits.push({
          lead: m[1],
          labels: [m[2], m[3], m[4]],
          end: m.index + m[0].length,
        });
      }
      if (hits.length === 0) continue;

      const intents = hits.map((hit, idx) => {
        // Window: từ ngay sau tam giác này tới đầu tam giác kế (regex lastIndex
        // của hit kế nằm sau leadMod; ta dùng vị trí "tam giác" kế qua next.end −
        // độ dài, nhưng đơn giản & an toàn: tới đầu match kế). Tính start match kế
        // bằng cách lùi từ hit kế: dùng indexOf "tam giác" sau hit hiện tại.
        const next = hits[idx + 1];
        const windowEnd = next
          ? c.text.indexOf('tam giác', hit.end)
          : c.text.length;
        const window = c.text.slice(hit.end, windowEnd >= 0 ? windowEnd : c.text.length);
        return drawShape('triangle', hit.labels, variantFor(hit, window));
      });

      out.push({ ruleId: 'triangle', clauseIds: [c.id], intents });
    }
    return out;
  },
};
