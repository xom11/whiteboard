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

// === EN patterns (issue #46 group B) ========================================
// MULTI-MATCH như VN: cờ 'g'. leadMod ĐỨNG TRƯỚC "triangle" (mirror "tam giác đều
// DEF"): "equilateral triangle ABC", "right triangle ABC", "isosceles triangle
// ABC". First-letter case flexibility ([Tt], [Ee]…) — KHÔNG cờ 'i' (sẽ phá [A-Z]
// nhãn). Nhãn = ĐÚNG 3 ký tự HOA liền, neo (?![A-Z]).
const TRI_EN_G =
  /(?:([Ee]quilateral|[Rr]ight-angled|[Rr]ight|[Ii]sosceles)\s+)?[Tt]riangle\s+([A-Z])([A-Z])([A-Z])(?![A-Z])/gu;
// Window modifiers (đứng SAU nhãn): "right angle at A" / "right-angled at A".
const RIGHT_AT_EN = /[Rr]ight(?:\s+angle|-angled)\s+at\s+([A-Z])(?![A-Za-z])/u;
// "with apex A" / "apex at A" / "apex A". CHỈ nhận khi ngữ cảnh cân (isosceles).
const APEX_AT_EN = /apex\s+(?:at\s+)?([A-Z])(?![A-Za-z])/u;
// "... is equilateral" / "equilateral triangle …" trong window riêng tam giác này.
const EQUILATERAL_EN = /(?<![A-Za-z])[Ee]quilateral(?![A-Za-z])/u;
const ISOSCELES_EN = /(?<![A-Za-z])[Ii]sosceles(?![A-Za-z])/u;

/** Chuẩn hoá leadMod EN về token canonical: 'equilateral'|'right'|'isosceles'. */
function normLeadEn(lead: string | undefined): string | undefined {
  if (!lead) return undefined;
  const l = lead.toLowerCase();
  if (l === 'equilateral') return 'equilateral';
  if (l === 'right' || l === 'right-angled') return 'right';
  if (l === 'isosceles') return 'isosceles';
  return undefined;
}

interface TriHit {
  labels: string[];
  /** leadMod đứng ngay trước bộ 3 đỉnh, hoặc undefined. */
  lead?: string;
  /** ngôn ngữ của hit — quyết định dùng window VN hay EN khi suy variant. */
  lang: 'vi' | 'en';
  /** offset bắt đầu match (để sắp xếp + tính window theo thứ tự text). */
  start: number;
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
  return hit.lang === 'en' ? variantForEn(hit, window) : variantForVi(hit, window);
}

function variantForVi(hit: TriHit, window: string): string {
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
 * EN variant — mirror VN POSITIONAL semantics. leadMod canonical ('equilateral'/
 * 'right'/'isosceles') + WINDOW riêng tam giác này. "right triangle ABC" KHÔNG có
 * "right angle at X" → 'any' (đủ thông tin loại nhưng không biết đỉnh, fail-safe
 * như VN "tam giác vuông ABC"). "isosceles" không "apex X" → 'any'. apex/right-at
 * CHỈ áp nếu đỉnh ∈ labels (tránh bind nhầm / đỉnh ngoài tam giác).
 */
function variantForEn(hit: TriHit, window: string): string {
  const { labels, lead } = hit;
  if (lead === 'equilateral' || EQUILATERAL_EN.test(window)) return 'equilateral';

  // "right angle at A" / "right-angled at A" → positional. CHỈ trong window
  // (không vơ modifier của tam giác kế).
  const ra = RIGHT_AT_EN.exec(window);
  if (ra) {
    const i = labels.indexOf(ra[1]);
    if (i >= 0) return RIGHT_BY_IDX[i];
  }

  // Apex CHỈ có nghĩa trong ngữ cảnh cân: leadMod 'isosceles' HOẶC từ "isosceles"
  // trong window. "with apex A" → isoceles theo INDEX của A trong labels.
  const isoCtx = lead === 'isosceles' || ISOSCELES_EN.test(window);
  if (isoCtx) {
    const ap = APEX_AT_EN.exec(window);
    if (ap) {
      const i = labels.indexOf(ap[1]);
      if (i >= 0) return ISO_BY_IDX[i];
    }
  }

  return 'any';
}

/**
 * "tam giác ABC" / "triangle ABC" → draw-shape triangle. NHIỀU tam giác / clause
 * → emit-all (mỗi tam giác 1 intent), variant bind theo cú pháp gần (leadMod +
 * window) để KHÔNG mis-render (vd không gán "đều"/"equilateral" của DEF cho ABC).
 *
 * EN ADDITIVE (issue #46 group B): quét THÊM TRI_EN_G. Hit VN+EN gom chung, sắp
 * theo vị trí TEXT; window mỗi hit = từ sau nhãn tới START của hit KẾ (modifier
 * tiền-vị của tam giác kế KHÔNG lọt vào window hit hiện tại). VN behavior giữ
 * nguyên: với chỉ-VN, start hit kế = vị trí "tam giác" kế ≡ logic indexOf cũ.
 */
export const triangleRule: LanguageRule = {
  id: 'triangle',
  priority: 100,
  languages: ['vi', 'en'],
  patterns: [TRI_G, TRI_EN_G],
  match(ctx) {
    const out: RuleMatch[] = [];
    for (const c of ctx.clauses) {
      const hits: TriHit[] = [];

      TRI_G.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = TRI_G.exec(c.text)) !== null) {
        hits.push({
          lead: m[1],
          lang: 'vi',
          labels: [m[2], m[3], m[4]],
          start: m.index,
          end: m.index + m[0].length,
        });
      }

      TRI_EN_G.lastIndex = 0;
      while ((m = TRI_EN_G.exec(c.text)) !== null) {
        hits.push({
          lead: normLeadEn(m[1]),
          lang: 'en',
          labels: [m[2], m[3], m[4]],
          start: m.index,
          end: m.index + m[0].length,
        });
      }

      if (hits.length === 0) continue;

      // Sắp theo vị trí TEXT để window mỗi hit kết thúc ở START hit kế (gồm cả
      // modifier tiền-vị của hit kế) → không leak modifier giữa các tam giác.
      hits.sort((a, b) => a.start - b.start);

      const intents = hits.map((hit, idx) => {
        const next = hits[idx + 1];
        const windowEnd = next ? next.start : c.text.length;
        const window = c.text.slice(hit.end, windowEnd);
        return drawShape('triangle', hit.labels, variantFor(hit, window));
      });

      out.push({ ruleId: 'triangle', clauseIds: [c.id], intents });
    }
    return out;
  },
};
