// src/stamps/geometry-2d/ai/rules/centers.ts
//
// Tâm tam giác: trọng tâm (centroid), trực tâm (orthocenter), tâm đường tròn
// ngoại tiếp (circumcenter), tâm đường tròn nội tiếp (incenter).
//
// Mọi kind này cần bộ 3 đỉnh of=[A,B,C]. Bind theo tam giác NÊU TRONG CÙNG
// CLAUSE với cụm từ khoá (vd "trọng tâm tam giác DEF" → of=[D,E,F]) — KHÔNG lấy
// tam giác đầu đề. Chỉ fallback tam giác toàn đề khi clause không nêu tam giác
// nào VÀ đề có ĐÚNG 1 tam giác. Nhập nhằng (clause không nêu, đề >1 tam giác)
// → bỏ qua (escalate). Không có tam giác nào → bỏ qua (escalate).
// Tên điểm phải trích được (HOA ngay sau cụm từ khoá, hoặc "X là <từ khoá>");
// nếu không → bỏ qua, KHÔNG bịa tên.
import type { LanguageRule, RuleMatch } from './_types';
import { addPoint } from './_shared';

// Tam giác (global): quét mọi tam giác nêu trong một đoạn text.
const TRI_G = /tam giác\s+(?:(?:cân|vuông|đều|nhọn|tù)(?:\s+(?:tại|ở|đỉnh|có\s+ba\s+góc))?\s+)*(?:[^\s,.;:()]*\s+){0,2}?([A-Z])([A-Z])([A-Z])(?![A-Z])/gu;

// === EN (issue #46 group B) =================================================
// Tam giác tiếng Anh: "triangle ABC" (first-letter case flex [Tt], KHÔNG cờ 'i'
// — sẽ phá [A-Z] nhãn). Nhãn = ĐÚNG 3 ký tự HOA liền, neo (?![A-Z]). ADDITIVE:
// quét THÊM cùng TRI_G; merge theo vị trí TEXT để VN behavior giữ nguyên.
const TRI_EN_G = /[Tt]riangle\s+([A-Z])([A-Z])([A-Z])(?![A-Z])/gu;

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

// === EN keyword (issue #46 group B) =========================================
// Từ khoá tâm tiếng Anh. First-letter case flex ([Cc], [Oo]…) — KHÔNG cờ 'i'
// (sẽ phá [A-Z] nhãn). British spelling -centre cũng nhận. Neo (?![A-Za-z]) để
// không khớp giữa từ dài hơn. centroid → centroid; orthocenter/-centre →
// orthocenter; circumcenter/-centre → circumcenter; incenter/-centre → incenter.
const CENTROID_KW_EN = /(?<![A-Za-z])[Cc]entroid(?![A-Za-z])/u;
const ORTHO_KW_EN = /(?<![A-Za-z])[Oo]rthocent(?:er|re)(?![A-Za-z])/u;
const CIRCUM_KW_EN = /(?<![A-Za-z])[Cc]ircumcent(?:er|re)(?![A-Za-z])/u;
const INCENTER_KW_EN = /(?<![A-Za-z])[Ii]ncent(?:er|re)(?![A-Za-z])/u;

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

// --- EN name resolution (issue #46 group B) ---------------------------------
// Tên điểm đứng TRƯỚC cụm từ khoá EN qua "is/be the": "G is the centroid",
// "Let H be the orthocenter". Tên = ký tự HOA NGAY TRƯỚC "is/be the <kw>"
// (cục bộ, KHÔNG quét lời dẫn toàn clause). KHÔNG cờ 'i' (giữ [A-Z]).
function nameBeforeEn(text: string, kw: RegExp): string | undefined {
  const m = kw.exec(text);
  if (!m) return undefined;
  const before = text.slice(0, m.index);
  // "...<HOA> (is|be) the " ngay trước từ khoá.
  const mm = /(?<![A-Za-z])([A-Z])\s+(?:is|be)\s+the\s+$/u.exec(before);
  return mm ? mm[1] : undefined;
}

// Tên điểm đứng NGAY SAU cụm từ khoá EN: "centroid G", "orthocenter H".
// Bỏ qua từ chêm "of"/"the" KHÔNG được phép ở đây — nếu sau từ khoá là "of …"
// (vd "centroid of triangle ABC") thì KHÔNG có tên điểm → undefined (fail-safe,
// KHÔNG bịa tên).
function nameAfterEn(text: string, kw: RegExp): string | undefined {
  const m = kw.exec(text);
  if (!m) return undefined;
  const rest = text.slice(m.index + m[0].length);
  const after = /^\s+([A-Z])(?![A-Za-z])/u.exec(rest);
  return after ? after[1] : undefined;
}

function resolveNameEn(text: string, kw: RegExp): string | undefined {
  return nameBeforeEn(text, kw) ?? nameAfterEn(text, kw);
}

/** Một tam giác phát hiện trong text: bộ 3 đỉnh + offset bắt đầu match. */
interface TriHit {
  tri: string[];
  index: number;
}

/**
 * Tập tam giác (bộ 3 đỉnh + vị trí) nêu trong một đoạn text, gồm CẢ VN
 * ("tam giác ABC") VÀ EN ("triangle ABC"), sắp theo vị trí TEXT. ADDITIVE:
 * với đề thuần VN, chỉ TRI_G khớp ⇒ kết quả identical với hành vi cũ.
 */
function triangleHits(text: string): TriHit[] {
  const hits: TriHit[] = [];
  TRI_G.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = TRI_G.exec(text)) !== null) {
    hits.push({ tri: [m[1], m[2], m[3]], index: m.index });
  }
  TRI_EN_G.lastIndex = 0;
  while ((m = TRI_EN_G.exec(text)) !== null) {
    hits.push({ tri: [m[1], m[2], m[3]], index: m.index });
  }
  hits.sort((a, b) => a.index - b.index);
  return hits;
}

/**
 * Tập tam giác (mỗi tam giác = bộ 3 đỉnh) nêu trong một đoạn text. Trùng (cùng
 * 3 chữ liền) được giữ theo lượt xuất hiện; caller dedup nếu cần.
 */
function trianglesIn(text: string): string[][] {
  return triangleHits(text).map((h) => h.tri);
}

/**
 * Tam giác để bind 'of' cho 1 clause:
 *  1. Ưu tiên tam giác nêu NGAY TRONG clause (gần cụm từ khoá nhất theo index).
 *  2. Nếu clause không nêu tam giác nào → fallback tam giác toàn đề CHỈ KHI đề
 *     có duy nhất 1 tam giác (theo bộ đỉnh, dedup). Nhiều tam giác → undefined
 *     (nhập nhằng, escalate). Không có tam giác → undefined.
 */
function resolveTriangle(
  clauseText: string,
  kwIndex: number,
  uniqueProblemTri: string[] | undefined,
): string[] | undefined {
  const inClause = triangleHits(clauseText);
  if (inClause.length > 0) {
    // chọn tam giác gần cụm từ khoá nhất (ưu tiên đứng SAU; nếu không có thì lấy
    // tam giác gần nhất bất kể phía). Gồm cả tam giác VN lẫn EN trong clause.
    let best: { tri: string[]; dist: number } | undefined;
    for (const h of inClause) {
      const idx = h.index;
      // khoảng cách: ưu tiên tam giác đứng sau từ khoá (idx >= kwIndex).
      const after = idx >= kwIndex;
      const dist = Math.abs(idx - kwIndex) + (after ? 0 : 1_000);
      if (!best || dist < best.dist) best = { tri: h.tri, dist };
    }
    return best?.tri;
  }
  return uniqueProblemTri;
}

/**
 * Tâm tam giác → add-point với of=[A,B,C]. Một clause có thể nêu nhiều tâm
 * (vd "trọng tâm G và trực tâm H"); emit từng intent, cùng claim clause.
 */
export const centersRule: LanguageRule = {
  id: 'centers',
  priority: 70,
  languages: ['vi', 'en'],
  patterns: [
    CENTROID_KW,
    ORTHO_KW,
    CIRCUM_KW,
    INSCRIBE_KW,
    CENTROID_KW_EN,
    ORTHO_KW_EN,
    CIRCUM_KW_EN,
    INCENTER_KW_EN,
  ],
  match(ctx) {
    // Tam giác duy nhất toàn đề (dedup theo bộ đỉnh) — dùng làm fallback khi
    // clause KHÔNG tự nêu tam giác. Nhiều tam giác khác nhau → undefined (nhập
    // nhằng → escalate). Không có → undefined (không dựng được → escalate).
    const allTri = trianglesIn(ctx.problem);
    const distinct = new Set(allTri.map((t) => t.join('')));
    const uniqueProblemTri = distinct.size === 1 ? allTri[0] : undefined;

    // helper: bind 'of' cho 1 cụm từ khoá tại vị trí kwIndex trong clause.
    const ofFor = (text: string, kw: RegExp): string[] | undefined => {
      const m = kw.exec(text);
      const kwIndex = m ? m.index : 0;
      return resolveTriangle(text, kwIndex, uniqueProblemTri);
    };

    const out: RuleMatch[] = [];
    for (const c of ctx.clauses) {
      const intents = [];

      if (CENTROID_KW.test(c.text)) {
        const name = resolveName(c.text, CENTROID_KW);
        const of = ofFor(c.text, CENTROID_KW);
        if (name && of) intents.push(addPoint(name, { kind: 'centroid', of }));
      }
      if (ORTHO_KW.test(c.text)) {
        const name = resolveName(c.text, ORTHO_KW);
        const of = ofFor(c.text, ORTHO_KW);
        if (name && of) intents.push(addPoint(name, { kind: 'orthocenter', of }));
      }
      // circumcenter: "ngoại tiếp". incenter: "nội tiếp" nhưng KHÔNG khi clause
      // cũng có "ngoại tiếp" (cùng cụm gây nhập nhằng) — ưu tiên ngoại tiếp.
      if (CIRCUM_KW.test(c.text)) {
        const name = resolveCenterName(c.text, CIRCUM_KW);
        const of = ofFor(c.text, CIRCUM_KW);
        if (name && of) intents.push(addPoint(name, { kind: 'circumcenter', of }));
      } else if (INSCRIBE_KW.test(c.text)) {
        const name = resolveCenterName(c.text, INSCRIBE_KW);
        const of = ofFor(c.text, INSCRIBE_KW);
        if (name && of) intents.push(addPoint(name, { kind: 'incenter', of }));
      }

      // --- EN (issue #46 group B) — mirror VN semantics, mỗi từ khoá độc lập --
      // Các danh từ tâm EN là chính tả riêng biệt (centroid/orthocenter/
      // circumcenter/incenter) nên KHÔNG nhập nhằng lẫn nhau như "ngoại/nội
      // tiếp" VN — xử lý từng cái độc lập. Tên + of giải qua helper EN; thiếu
      // tên HOẶC of không bind được → bỏ qua (escalate, KHÔNG bịa).
      if (CENTROID_KW_EN.test(c.text)) {
        const name = resolveNameEn(c.text, CENTROID_KW_EN);
        const of = ofFor(c.text, CENTROID_KW_EN);
        if (name && of) intents.push(addPoint(name, { kind: 'centroid', of }));
      }
      if (ORTHO_KW_EN.test(c.text)) {
        const name = resolveNameEn(c.text, ORTHO_KW_EN);
        const of = ofFor(c.text, ORTHO_KW_EN);
        if (name && of) intents.push(addPoint(name, { kind: 'orthocenter', of }));
      }
      if (CIRCUM_KW_EN.test(c.text)) {
        const name = resolveNameEn(c.text, CIRCUM_KW_EN);
        const of = ofFor(c.text, CIRCUM_KW_EN);
        if (name && of) intents.push(addPoint(name, { kind: 'circumcenter', of }));
      }
      if (INCENTER_KW_EN.test(c.text)) {
        const name = resolveNameEn(c.text, INCENTER_KW_EN);
        const of = ofFor(c.text, INCENTER_KW_EN);
        if (name && of) intents.push(addPoint(name, { kind: 'incenter', of }));
      }

      if (intents.length > 0) {
        out.push({ ruleId: 'centers', clauseIds: [c.id], intents });
      }
    }
    return out;
  },
};
