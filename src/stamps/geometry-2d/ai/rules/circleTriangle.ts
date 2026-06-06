// src/stamps/geometry-2d/ai/rules/circleTriangle.ts
//
// Đường tròn nội/ngoại tiếp tam giác:
//   "đường tròn ngoại tiếp tam giác ABC" → circumcircle → drawCircle through3
//   "đường tròn nội tiếp tam giác ABC"   → incircle     → drawCircle inscribedIn
//
// LƯU Ý disambiguate "nội tiếp" có 2 nghĩa ngược nhau tuỳ ngữ cảnh:
//   - "ĐƯỜNG TRÒN nội tiếp tam giác" → incircle (inscribedIn)
//   - "TAM GIÁC nội tiếp đường tròn" → circumcircle (through3) — tam giác nội
//     tiếp tức đường tròn NGOẠI tiếp tam giác.
// "ngoại tiếp" (đường tròn ngoại tiếp tam giác) luôn là circumcircle.
//
// QUAN TRỌNG (chống mis-render):
//   - "đường tròn ngoại/nội tiếp" PHẢI theo sau bởi "tam giác <XYZ>" (token "tam
//     giác" bắt buộc). Nếu theo sau là "tứ giác"/"hình ..." (vd "đường tròn
//     ngoại tiếp tứ giác BCEF") → CHƯA hỗ trợ → KHÔNG claim để escalate AI, KHÔNG
//     được vơ tam giác đầu đề (mis-render circle qua 3 đỉnh khác).
//   - Bind tam giác từ cụm ngay SAU từ khoá trong clause (không phải tam giác
//     đầu tiên trong đề). Nhiều cấu trúc / clause → emit-all (matchAll cờ 'g').
import type { LanguageRule, RuleMatch } from './_types';
import { drawCircle } from './_shared';

// \b của JS dựa trên ASCII word-char nên KHÔNG khớp quanh ký tự Việt
// ("đ","ề","ạ"…). Dùng lookaround \p{L} + cờ 'u'.
const HAS_INSCRIBE = /(?<!\p{L})(?:nội|ngoại)\s*tiếp(?!\p{L})/iu;

// Tên tâm tuỳ chọn xen giữa "đường tròn" và "ngoại/nội tiếp": "(O)" hoặc "tâm O".
// (?:...)? để có thể vắng. Cờ 'i' an toàn ở cụm từ khoá; ([A-Z]) vẫn HOA-only.
const CENTER = '(?:\\(\\s*([A-Z])\\s*\\)|tâm\\s+([A-Z]))?';

// "đường tròn [ (O)/tâm O ] ngoại tiếp tam giác XYZ" → circumcircle (through3).
// Token "tam giác" + 3 đỉnh HOA BẮT BUỘC ngay sau "ngoại tiếp". Cờ 'g' để bắt
// MỌI cấu trúc trong clause; 'i' để hoa đầu câu ("Đường"/"Ngoại"/"Tam") cũng
// khớp — nhưng group đỉnh ([A-Z]) KHÔNG dùng 'i' (regex 'i' không tác động lên
// lớp ký tự đã chỉ định HOA → vẫn chỉ khớp HOA, tránh nuốt chữ thường).
const CIRCUM_TRI = new RegExp(
  'đường\\s*tròn\\s*' +
    CENTER +
    '\\s*ngoại\\s*tiếp\\s+tam\\s*giác\\s+([A-Z])([A-Z])([A-Z])(?![A-Z])',
  'giu',
);

// "đường tròn [ (I)/tâm I ] nội tiếp tam giác XYZ" → incircle (inscribedIn).
const INCIRCLE_TRI = new RegExp(
  'đường\\s*tròn\\s*' +
    CENTER +
    '\\s*nội\\s*tiếp\\s+tam\\s*giác\\s+([A-Z])([A-Z])([A-Z])(?![A-Z])',
  'giu',
);

// "tam giác XYZ nội tiếp (trong) đường tròn [ (O)/tâm O ]" → circumcircle.
// Tam giác đứng TRƯỚC, đường tròn đứng SAU. Center (nếu có) đứng sau "đường tròn".
const TRI_INSCRIBED_IN_CIRCLE = new RegExp(
  'tam\\s*giác\\s+([A-Z])([A-Z])([A-Z])(?![A-Z])[^.]{0,40}?nội\\s*tiếp\\s+(?:trong\\s+)?đường\\s*tròn\\s*' +
    CENTER,
  'giu',
);

// "tam giác XYZ ngoại tiếp đường tròn [ (I)/tâm I ]" → incircle (inscribedIn).
// Tam giác NGOẠI tiếp (circumscribes) đường tròn = đường tròn NỘI tiếp tam giác.
// "đường tròn" BẮT BUỘC NGAY sau "ngoại tiếp" (KHÔNG optional) để phân biệt với
// "đường tròn ngoại tiếp tam giác" (circumcircle — đường tròn đứng TRƯỚC, "ngoại
// tiếp" theo sau bởi "tam giác"). [^.]{0,40}? không vượt dấu '.' (không nhảy câu).
const TRI_CIRCUMSCRIBES_CIRCLE = new RegExp(
  'tam\\s*giác\\s+([A-Z])([A-Z])([A-Z])(?![A-Z])[^.]{0,40}?ngoại\\s*tiếp\\s+đường\\s*tròn\\s*' +
    CENTER,
  'giu',
);

// --- Ký hiệu ngoặc "(O; R)" quét TOÀN ĐỀ (segmenter cắt ';') ------------------
// "(đường tròn)? (O; R) ngoại/nội tiếp tam giác XYZ" — circle ĐỨNG TRƯỚC. R là
// CHỮ (bán kính ký hiệu) nên circleRadius bỏ qua (cần \d). Guard
// (?![^)]*[A-Z]\s*[;,]) chặn paren méo nhiều dấu chấm phẩy "(A; B; C)".
const PAREN_CENTER =
  '(?:đường\\s*tròn\\s*)?\\(\\s*([A-Z])\\s*[;,]\\s*(?![^)]*[A-Z]\\s*[;,])[^()]*?\\)\\s*';
const CIRCUM_TRI_PAREN = new RegExp(
  PAREN_CENTER + 'ngoại\\s*tiếp\\s+tam\\s*giác\\s+([A-Z])([A-Z])([A-Z])(?![A-Z])',
  'giu',
);
const INCIRCLE_TRI_PAREN = new RegExp(
  PAREN_CENTER + 'nội\\s*tiếp\\s+tam\\s*giác\\s+([A-Z])([A-Z])([A-Z])(?![A-Z])',
  'giu',
);

interface CircHit {
  index: number;
  spec: 'through3' | 'inscribedIn';
  tri: [string, string, string];
  /** tên tâm; '' nếu không khai báo (default 'O' khi emit). */
  center: string;
}

function pushAll(
  text: string,
  re: RegExp,
  spec: 'through3' | 'inscribedIn',
  // index của 3 group đỉnh trong match; center luôn group 1+2.
  triStart: number,
  out: CircHit[],
): void {
  re.lastIndex = 0;
  for (const m of text.matchAll(re)) {
    const center = m[1] ?? m[2] ?? '';
    out.push({
      index: m.index ?? 0,
      spec,
      tri: [m[triStart], m[triStart + 1], m[triStart + 2]],
      center,
    });
  }
}

/**
 * Quét MỌI cấu trúc "(đường tròn) ngoại/nội tiếp tam giác XYZ" trong 1 clause.
 * Vùng text [start,end) đã thuộc 1 cấu trúc thì cấu trúc khác bỏ qua (tránh
 * trùng — "tam giác XYZ nội tiếp đường tròn" KHÔNG bị INCIRCLE_TRI quét lại).
 */
function scanClause(text: string): CircHit[] {
  const hits: CircHit[] = [];
  // CIRCUM_TRI / INCIRCLE_TRI: center là group 1|2, đỉnh là group 3,4,5.
  pushAll(text, CIRCUM_TRI, 'through3', 3, hits);
  pushAll(text, INCIRCLE_TRI, 'inscribedIn', 3, hits);
  // TRI_INSCRIBED_IN_CIRCLE: đỉnh là group 1,2,3, center là group 4|5.
  TRI_INSCRIBED_IN_CIRCLE.lastIndex = 0;
  for (const m of text.matchAll(TRI_INSCRIBED_IN_CIRCLE)) {
    hits.push({
      index: m.index ?? 0,
      spec: 'through3',
      tri: [m[1], m[2], m[3]],
      center: m[4] ?? m[5] ?? '',
    });
  }
  // TRI_CIRCUMSCRIBES_CIRCLE: tam giác ngoại tiếp đường tròn → incircle (inscribedIn).
  TRI_CIRCUMSCRIBES_CIRCLE.lastIndex = 0;
  for (const m of text.matchAll(TRI_CIRCUMSCRIBES_CIRCLE)) {
    hits.push({
      index: m.index ?? 0,
      spec: 'inscribedIn',
      tri: [m[1], m[2], m[3]],
      center: m[4] ?? m[5] ?? '',
    });
  }
  // Khử trùng: 2 hit cùng 3 đỉnh + cùng spec → giữ 1 (vd câu vừa khớp
  // CIRCUM_TRI lẫn TRI_INSCRIBED_IN_CIRCLE hiếm khi xảy ra, nhưng an toàn).
  const seen = new Set<string>();
  const dedup: CircHit[] = [];
  hits.sort((a, b) => a.index - b.index);
  for (const h of hits) {
    const key = `${h.spec}:${h.tri.join('')}`;
    if (seen.has(key)) continue;
    seen.add(key);
    dedup.push(h);
  }
  return dedup;
}

interface ParenHit {
  spec: 'through3' | 'inscribedIn';
  tri: [string, string, string];
  center: string;
  /** text khớp trên TOÀN đề (để gán clauseId qua substring-inclusion). */
  matchedText: string;
}

/**
 * Quét TOÀN đề cho ký hiệu ngoặc "(O; R) ngoại/nội tiếp tam giác XYZ" — dạng bị
 * segmenter cắt ngang ';' nên per-clause không bắt được. circle ĐỨNG TRƯỚC.
 */
function scanProblemParen(problem: string): ParenHit[] {
  const out: ParenHit[] = [];
  const push = (re: RegExp, spec: 'through3' | 'inscribedIn') => {
    re.lastIndex = 0;
    for (const m of problem.matchAll(re)) {
      out.push({
        spec,
        tri: [m[2], m[3], m[4]],
        center: m[1] ?? '',
        matchedText: m[0],
      });
    }
  };
  push(CIRCUM_TRI_PAREN, 'through3');
  push(INCIRCLE_TRI_PAREN, 'inscribedIn');
  return out;
}

function intentFor(spec: 'through3' | 'inscribedIn', tri: string[], center: string) {
  const name = center || 'O';
  return spec === 'inscribedIn'
    ? drawCircle(name, 'inscribedIn', { triangle: tri })
    : drawCircle(name, 'through3', { points: tri });
}

/**
 * Mỗi clause: quét emit-all các "(đường tròn) nội/ngoại tiếp tam giác XYZ".
 *   - circumcircle (through3): "đường tròn ngoại tiếp tam giác ABC",
 *     "tam giác ABC nội tiếp đường tròn (O)".
 *   - incircle (inscribedIn): "đường tròn nội tiếp tam giác ABC",
 *     "tam giác ABC ngoại tiếp đường tròn (I)".
 * Cộng nhánh TOÀN đề cho ký hiệu "(O; R) ngoại/nội tiếp tam giác" (bị cắt ';').
 * "ngoại/nội tiếp" mà KHÔNG có "tam giác XYZ" ngay sau (vd "tứ giác", "hình
 * ...", hoặc "nội tiếp" trần) → KHÔNG claim → escalate AI.
 */
export const circleTriangleRule: LanguageRule = {
  id: 'circleTriangle',
  priority: 72,
  languages: ['vi'],
  patterns: [HAS_INSCRIBE],
  match(ctx) {
    const out: RuleMatch[] = [];
    const emitted = new Set<string>(); // "spec:tri" — dedup cross per-clause/paren.

    // 1) Per-clause (giữ nguyên hành vi cũ).
    for (const c of ctx.clauses) {
      if (!HAS_INSCRIBE.test(c.text)) continue;
      const hits = scanClause(c.text);
      if (hits.length === 0) continue; // có "ngoại/nội tiếp" nhưng không tam giác
      for (const h of hits) emitted.add(`${h.spec}:${h.tri.join('')}`);
      out.push({
        ruleId: 'circleTriangle',
        clauseIds: [c.id],
        intents: hits.map((h) => intentFor(h.spec, h.tri, h.center)),
      });
    }

    // 2) Toàn đề: ký hiệu "(O; R)" (segmenter cắt ';'). Bỏ qua nếu (spec:tri) đã
    //    emit ở per-clause. clauseId = mọi clause là substring của đoạn khớp
    //    (đoạn này trải qua nhiều clause do bị cắt) → coverage tính phủ cả 2.
    for (const h of scanProblemParen(ctx.problem)) {
      const key = `${h.spec}:${h.tri.join('')}`;
      if (emitted.has(key)) continue;
      emitted.add(key);
      const clauseIds = ctx.clauses
        .filter((c) => h.matchedText.includes(c.text))
        .map((c) => c.id);
      out.push({
        ruleId: 'circleTriangle',
        clauseIds,
        intents: [intentFor(h.spec, h.tri, h.center)],
      });
    }
    return out;
  },
};
