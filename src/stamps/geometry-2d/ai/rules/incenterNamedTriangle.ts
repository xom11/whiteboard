// src/stamps/geometry-2d/ai/rules/incenterNamedTriangle.ts
//
// Tâm đường tròn NỘI TIẾP (incenter) cho tam giác NÊU TƯỜNG MINH trong clause —
// hai dạng mà rule `centers` punt:
//
//   1. PHÂN PHỐI (distributive):
//        "I, K (tương ứng|lần lượt) là tâm (các) (đường tròn) nội tiếp
//         tam giác ABH và (tam giác) ACH"
//      → I = incenter(A,B,H), K = incenter(A,C,H). Zip 1-1 hai tên với hai
//        tam giác theo thứ tự xuất hiện.
//
//   2. ĐƠN, tam giác tường minh TRONG clause:
//        "I là tâm (các) (đường tròn) nội tiếp tam giác ABH"
//      → I = incenter(A,B,H). Vì tam giác nêu ngay trong clause nên KHÔNG nhập
//        nhằng dù toàn đề có nhiều tam giác — đây là chỗ `centers` bỏ qua.
//
// Ràng buộc an toàn (escalate thay vì đoán):
//   - Tam giác phải là ĐÚNG 3 ký tự HOA, phân biệt, nêu trong clause.
//   - Dạng phân phối: số tên == số tam giác (zip 1-1) thì mới emit.
//   - Không bịa tên / không fallback tam giác toàn đề (để `centers` lo dạng đó).
//
// Intent trùng với `centers` (nếu có) đều bị dedup downstream theo JSON → vô hại.
import type { LanguageRule, RuleMatch } from './_types';
import { addPoint } from './_shared';
import { CIRCLE_KW } from './_shared';

// "nội tiếp" — không khớp quanh ký tự Việt nên dùng lookaround \p{L}.
const INSCRIBE_KW = /(?<!\p{L})nội\s*tiếp(?!\p{L})/u;
// "ngoại tiếp" — clause có cụm này là circumcenter, KHÔNG phải việc của rule này.
const CIRCUM_KW = /(?<!\p{L})ngoại\s*tiếp(?!\p{L})/u;

// Cụm từ khoá "tâm (các)? (đường tròn)? nội tiếp" — tới trước danh sách tam giác.
const CENTER_INSCRIBE =
  new RegExp(
    `tâm\\s+(?:các\\s+)?(?:${CIRCLE_KW}\\s+)?nội\\s*tiếp`,
    'u',
  );

// Một tam giác: "tam giác ABH" → ['A','B','H']. Quét toàn cục trong đoạn.
const TRI_G = /tam giác\s+([A-Z])([A-Z])([A-Z])(?![A-Z])/gu;

function trianglesIn(text: string): string[][] {
  const out: string[][] = [];
  TRI_G.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = TRI_G.exec(text)) !== null) {
    out.push([m[1], m[2], m[3]]);
  }
  return out;
}

/** Tam giác hợp lệ = đúng 3 ký tự HOA phân biệt. */
function validTri(tri: string[]): boolean {
  return tri.length === 3 && new Set(tri).size === 3;
}

// Danh sách tên điểm đứng TRƯỚC cụm "(tương ứng|lần lượt)? là tâm ... nội tiếp".
// Dạng phân phối: "I, K tương ứng là …" → ['I','K']. Dạng đơn: "I là …" → ['I'].
const NAMES_BEFORE =
  /(?<!\p{L})([A-Z](?:\s*,\s*[A-Z])*)\s+(?:tương\s+ứng\s+|lần\s+lượt\s+)?là\s+tâm(?!\p{L})/u;

function namesBefore(text: string): string[] | undefined {
  const m = NAMES_BEFORE.exec(text);
  if (!m) return undefined;
  const names = m[1]
    .split(',')
    .map((s) => s.trim())
    .filter((s) => /^[A-Z]$/u.test(s));
  return names.length > 0 ? names : undefined;
}

/**
 * Incenter cho tam giác tường minh trong clause (dạng phân phối + đơn). Mỗi
 * clause sinh tối đa min(số tên, số tam giác) intent (zip 1-1). Bỏ qua nếu
 * thiếu tên / thiếu tam giác / tam giác không hợp lệ.
 */
export const incenterNamedTriangleRule: LanguageRule = {
  id: 'incenterNamedTriangle',
  priority: 70,
  languages: ['vi'],
  patterns: [INSCRIBE_KW],
  match(ctx) {
    const out: RuleMatch[] = [];
    for (const c of ctx.clauses) {
      // Chỉ xử lý clause nói về "tâm … nội tiếp"; bỏ "ngoại tiếp" (circumcenter).
      if (CIRCUM_KW.test(c.text)) continue;
      if (!CENTER_INSCRIBE.test(c.text)) continue;

      const names = namesBefore(c.text);
      if (!names) continue;

      // Tam giác đứng SAU cụm từ khoá nội tiếp (vùng "tam giác ABH và tam giác ACH").
      const kw = CENTER_INSCRIBE.exec(c.text);
      const tail = kw ? c.text.slice(kw.index + kw[0].length) : c.text;
      const tris = trianglesIn(tail).filter(validTri);
      if (tris.length === 0) continue;

      // Zip 1-1 tên ↔ tam giác theo thứ tự. Số lượng phải khớp để không đoán mù:
      //   - 1 tên + 1 tam giác (dạng đơn) → OK.
      //   - n tên + n tam giác (phân phối) → OK.
      // Lệch số → bỏ qua (escalate).
      if (names.length !== tris.length) continue;

      const intents = names.map((name, idx) =>
        addPoint(name, { kind: 'incenter', of: tris[idx] }),
      );
      out.push({ ruleId: 'incenterNamedTriangle', clauseIds: [c.id], intents });
    }
    return out;
  },
};
