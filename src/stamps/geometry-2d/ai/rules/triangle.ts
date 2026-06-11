// src/stamps/geometry-2d/ai/rules/triangle.ts
import type { LanguageRule, RuleMatch } from './_types';
import type { IntentT } from '../intent';
import { drawShape, addPoint, drawCircle, markShape } from './_shared';

// MULTI-MATCH: 1 clause có thể chứa NHIỀU tam giác ("tam giác ABC và tam giác
// ABD vuông tại A", "tam giác đều DEF nội tiếp tam giác ABC"). Bắt MỌI tam giác
// (cờ 'g'), variant bind từ TEXT WINDOW giữa tam giác này và tam giác KẾ — KHÔNG
// vơ chữ "đều"/"vuông tại X" của tam giác khác.
//
// leadMod = từ bổ nghĩa ĐỨNG TRƯỚC bộ 3 đỉnh ("tam giác đều DEF", "tam giác
// vuông ABC", "tam giác cân ABC"). leadMod "đều" → equilateral ngay; "vuông"/
// "cân" leadMod (không có "tại X") không đủ thông tin chọn đỉnh → để window xử lý.
// leadMod gồm cả "nhọn"/"tù" (acute/obtuse) — KHÔNG ngụ ý variant (→ 'any') nhưng
// PHẢI nuốt để bộ 3 đỉnh khớp ("tam giác nhọn ABC"). variantForVi bỏ qua chúng.
// leadMod (group 1) = tính từ variant ĐẦU TIÊN (đều/vuông/cân/nhọn/tù). Sau đó
// một CHUỖI tính từ phụ (đứng trước bộ 3 đỉnh) được NUỐT không-bắt: "không cân/đều/
// vuông" (phủ định → 'any') + lặp lại các tính từ trên, ngăn bằng dấu phẩy/khoảng
// trắng. Phủ "tam giác nhọn, không cân ABC" / "tam giác không cân ABC" (olympiad).
// (?!\p{L}) thay \b quanh ký tự Việt.
const TRI_G =
  /tam giác\s+(?:(đều|vuông|cân|nhọn|tù)(?!\p{L})\s*,?\s*)?(?:(?:không\s+(?:cân|đều|vuông)|đều|vuông|cân|nhọn|tù)(?!\p{L})\s*,?\s*)*([A-Z])([A-Z])([A-Z])(?![A-Z])/gu;
// Tên ĐỨNG TRƯỚC: "ABC là tam giác (vuông|cân|đều)? …" — variant suy từ window
// SAU "tam giác" (vd "ABC là tam giác vuông tại A" → window "vuông tại A").
const TRI_BEFORE_G = /(?<![A-Z])([A-Z])([A-Z])([A-Z])(?![A-Z])\s+là\s+tam\s*giác/gu;
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

// === Thales: tam giác VUÔNG nội tiếp đường tròn → đường kính + glider ===========
// Vuông tại A nội tiếp (O) ⟺ BC là ĐƯỜNG KÍNH (góc nội tiếp chắn nửa đường tròn).
// Dựng RÀNG BUỘC (kéo vẫn vuông): 2 đầu mút đường kính free + tâm O = trung điểm +
// đường tròn centerThrough (bán kính theo đầu mút) + apex là glider onCircle.
// → góc vuông tại apex luôn đúng; AB<AC chọn bằng vị trí đầu mút cạnh ngắn (bên trái).
//
// CHỈ kích hoạt khi tam giác VUÔNG + có ngữ cảnh "nội tiếp đường tròn/(O)" SAU nhãn
// (window). "đường tròn nội tiếp tam giác" (incircle) đứng TRƯỚC nhãn → KHÔNG ở
// trong window → không kích hoạt (đúng: incircle không liên quan góc vuông).
const THALES_R = 4;
const THALES_THETA = 2.3; // ~131° (góc phần tư II) → apex gần đầu mút TRÁI = cạnh ngắn

// "nội tiếp (trong)? (đường tròn (O)/tâm O)? | (O)" — circumcircle tam giác inscribed.
const TRI_INSCRIBED =
  /nội\s*tiếp\s+(?:trong\s+)?(?:đường\s*tròn\s*(?:\(\s*([A-Z])\s*\)|tâm\s+([A-Z]))?|\(\s*([A-Z])\s*\))/u;
// Bất đẳng thức cạnh "AB < AC" / "AC > AB" (2 cạnh chia sẻ đỉnh vuông).
const INEQ = /([A-Z])([A-Z])\s*([<>])\s*([A-Z])([A-Z])/u;

/** Tên đường tròn ngoại tiếp từ window; undefined nếu không có "nội tiếp …". */
function inscribedCircleName(window: string): string | undefined {
  const m = TRI_INSCRIBED.exec(window);
  if (!m) return undefined;
  return m[1] ?? m[2] ?? m[3] ?? ''; // '' → caller default 'O'
}

/** Đầu mút (≠ apex) của cạnh NGẮN hơn theo "AB < AC"; default others[0]. */
function shorterLegEnd(window: string, apex: string, others: string[]): string {
  const m = INEQ.exec(window);
  if (m) {
    const op = m[3];
    const o1 = m[1] === apex ? m[2] : m[2] === apex ? m[1] : undefined; // cạnh 1 (≠apex)
    const o2 = m[4] === apex ? m[5] : m[5] === apex ? m[4] : undefined; // cạnh 2 (≠apex)
    if (o1 && o2 && others.includes(o1) && others.includes(o2)) {
      return op === '<' ? o1 : o2; // '<' → cạnh 1 ngắn; '>' → cạnh 2 ngắn
    }
  }
  return others[0];
}

/**
 * Dựng Thales cho tam giác vuông (apex tại index `apexIdx`) nội tiếp đường tròn
 * `circleNameRaw`. Trả null nếu tên tâm đụng nhãn đỉnh (fail-safe → drawShape).
 */
function thalesIntents(
  labels: string[],
  apexIdx: number,
  circleNameRaw: string,
  window: string,
): IntentT[] | null {
  const apex = labels[apexIdx];
  const others = labels.filter((_, i) => i !== apexIdx); // 2 đầu mút đường kính
  const cn = circleNameRaw || 'O';
  if (labels.includes(cn)) return null; // tên tâm trùng đỉnh → bỏ Thales (an toàn)
  const shortEnd = shorterLegEnd(window, apex, others);
  const longEnd = others[0] === shortEnd ? others[1] : others[0];
  return [
    addPoint(shortEnd, { kind: 'free', at: [-THALES_R, 0] }), // cạnh ngắn: đầu mút TRÁI
    addPoint(longEnd, { kind: 'free', at: [THALES_R, 0] }),
    addPoint(cn, { kind: 'midpoint', of: shortEnd + longEnd }), // tâm O = trung điểm đường kính
    drawCircle(cn, 'centerThrough', { center: cn, through: shortEnd }),
    addPoint(apex, { kind: 'onCircle', circle: cn, theta: THALES_THETA }), // apex glider (gần TRÁI)
    markShape('triangle', labels),
  ];
}

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
  patterns: [TRI_G, TRI_EN_G, TRI_BEFORE_G],
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

      // Name-before: "ABC là tam giác …" (variant từ window sau "tam giác").
      TRI_BEFORE_G.lastIndex = 0;
      while ((m = TRI_BEFORE_G.exec(c.text)) !== null) {
        hits.push({
          lead: undefined,
          lang: 'vi',
          labels: [m[1], m[2], m[3]],
          start: m.index,
          end: m.index + m[0].length,
        });
      }

      if (hits.length === 0) continue;

      // Sắp theo vị trí TEXT để window mỗi hit kết thúc ở START hit kế (gồm cả
      // modifier tiền-vị của hit kế) → không leak modifier giữa các tam giác.
      hits.sort((a, b) => a.start - b.start);

      const intents = hits.flatMap((hit, idx) => {
        const next = hits[idx + 1];
        const windowEnd = next ? next.start : c.text.length;
        const window = c.text.slice(hit.end, windowEnd);
        const variant = variantFor(hit, window);
        // Thales: tam giác VUÔNG + nội tiếp đường tròn (window) → dựng ràng buộc
        // (đường kính + apex glider) thay draw-shape free (free chỉ "may mắn" vuông,
        // kéo là vỡ + không thoả AB<AC). circle3 của circleTriangle bị idempotent
        // loại (cùng tên → centerThrough của triangle prio 100 thắng).
        const rightIdx = RIGHT_BY_IDX.indexOf(variant);
        if (rightIdx >= 0) {
          const circleName = inscribedCircleName(window);
          if (circleName !== undefined) {
            const thales = thalesIntents(hit.labels, rightIdx, circleName, window);
            if (thales) return thales;
          }
        }
        return [drawShape('triangle', hit.labels, variant)];
      });

      out.push({ ruleId: 'triangle', clauseIds: [c.id], intents });
    }
    return out;
  },
};
