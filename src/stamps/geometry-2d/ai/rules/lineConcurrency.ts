// src/stamps/geometry-2d/ai/rules/lineConcurrency.ts
//
// Điểm ĐỒNG QUY của một bộ đường trong tam giác. Đường cao / phân giác trong /
// trung trực / trung tuyến của tam giác đồng quy tại 1 điểm; engine chỉ cần
// "lấy 2 đường giao nhau" — mà các center kind (orthocenter/incenter/
// circumcenter/centroid) ĐÃ render đúng như vậy (dựng 2 đường ẩn → intersection)
// và chỉ cần tam giác + tên điểm (KHÔNG cần đặt tên đoạn).
//
//   "Ba đường cao của tam giác ABC đồng quy tại H"      → H = orthocenter ΔABC
//   "Ba đường phân giác … cắt nhau tại I"               → I = incenter
//   "Ba đường trung trực … cắt nhau tại O"              → O = circumcenter
//   "Ba đường trung tuyến … đồng quy tại G"             → G = centroid
//
// GUARD (giữ path cũ byte-identical): với cao/phân giác/trung tuyến, nếu clause
// đã đặt tên ≥2 đoạn (vd "AD, BE, CF") thì rule `intersection`/`perpFoot`/`cevian`
// cũ đã dựng điểm giao của 2 đoạn THẬT → rule này KHÔNG emit (nhường). Trung trực
// miễn guard (đường trung trực không đặt tên cặp-đỉnh nên `intersection` generic
// không bắt → luôn emit circumcenter).
//
// Regex tiếng Việt: cờ 'u' + lookaround (?!\p{L}) thay \b (ASCII \b không khớp
// quanh ký tự Việt). Keyword có thể HOA đầu câu ([Đđ]ường, [Bb]a, [Cc]ác).
import type { LanguageRule, RuleMatch } from './_types';
import { addPoint } from './_shared';

type CenterKind = 'orthocenter' | 'incenter' | 'circumcenter' | 'centroid';

// TYPE đường → center kind. `kw` khớp cụm danh từ loại đường (lookaround Việt).
// `guarded`: bật guard named-skip (cao/phân giác/trung tuyến). Trung trực = false.
interface LineType {
  kind: CenterKind;
  kw: RegExp;
  guarded: boolean;
}

const LINE_TYPES: readonly LineType[] = [
  // "đường cao" (luôn có "đường"). "cao" trần quá generic nên bắt buộc "đường".
  { kind: 'orthocenter', kw: /(?<!\p{L})[Đđ]ường\s+cao(?!\p{L})/u, guarded: true },
  // "(đường|tia)? phân giác (trong)?" — KHÔNG nhận "phân giác ngoài" (excenter, defer).
  { kind: 'incenter', kw: /(?<!\p{L})phân\s*giác(?!\s+ngoài)(?!\p{L})/u, guarded: true },
  // "(đường)? trung trực".
  { kind: 'circumcenter', kw: /(?<!\p{L})trung\s*trực(?!\p{L})/u, guarded: false },
  // "(đường)? trung tuyến".
  { kind: 'centroid', kw: /(?<!\p{L})trung\s*tuyến(?!\p{L})/u, guarded: true },
];

// Động từ đồng quy + tên điểm: "cắt nhau / đồng quy / gặp nhau / cùng đi qua"
// (tại|qua)? (điểm)? <X HOA>.
const CONCURRENCY =
  /(?:cắt\s+nhau|đồng\s*quy|gặp\s+nhau|cùng\s+đi\s+qua)\s+(?:tại\s+|qua\s+)?(?:điểm\s+)?([A-Z])(?!\p{L})/u;

// Cặp đỉnh đặt tên (vd "AD"), neo để không nuốt bộ-3 "ABC". Prime tuỳ chọn.
const VERTEX_PAIR = /(?<!\p{L})[A-Z][A-Z](?:['′])?(?!\p{L})/gu;

// Tam giác toàn cục.
const TRI_G = /tam\s*giác\s+(?:(?:nhọn|cân|đều|vuông|tù)\s+)*([A-Z])([A-Z])([A-Z])(?![A-Z])/gu;

// Prefilter: bất kỳ loại đường nào trên toàn đề (đủ để chạy match; logic đầy đủ
// trong match). Non-global để .test() không lệch lastIndex.
const PREFILTER: readonly RegExp[] = LINE_TYPES.map((t) => t.kw);

function trianglesIn(text: string): string[][] {
  const out: string[][] = [];
  TRI_G.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = TRI_G.exec(text)) !== null) out.push([m[1], m[2], m[3]]);
  return out;
}

/** Tam giác duy nhất toàn đề (dedup theo bộ đỉnh), else undefined (nhập nhằng). */
function uniqueTriangle(problem: string): string[] | undefined {
  const all = trianglesIn(problem);
  const distinct = new Map(all.map((t) => [t.join(''), t]));
  return distinct.size === 1 ? [...distinct.values()][0] : undefined;
}

/** Đếm cặp đỉnh đặt tên trong 1 đoạn (vd "AD, BE, CF" → 3). */
function countPairs(slice: string): number {
  VERTEX_PAIR.lastIndex = 0;
  let n = 0;
  while (VERTEX_PAIR.exec(slice) !== null) n += 1;
  return n;
}

/**
 * Suy 3 đỉnh từ các cạnh nêu sau "trung trực" (vd "của AB, BC, CA" → A,B,C).
 * Union các đỉnh; đúng 3 đỉnh phân biệt → trả (sort ổn định). Khác → undefined.
 */
function triangleFromSides(slice: string): string[] | undefined {
  VERTEX_PAIR.lastIndex = 0;
  const verts = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = VERTEX_PAIR.exec(slice)) !== null) {
    verts.add(m[0][0]);
    verts.add(m[0][1]);
  }
  return verts.size === 3 ? [...verts].sort() : undefined;
}

/**
 * Bộ đường tam giác đồng quy → add-point center kind. Tam giác: in-clause →
 * unique-toàn-đề. Trung trực thêm suy-đỉnh-từ-cạnh khi không có tam giác.
 */
export const lineConcurrencyRule: LanguageRule = {
  id: 'lineConcurrency',
  priority: 69,
  languages: ['vi'],
  patterns: PREFILTER,
  match(ctx) {
    const fallbackTri = uniqueTriangle(ctx.problem);
    const out: RuleMatch[] = [];

    for (const c of ctx.clauses) {
      const conc = CONCURRENCY.exec(c.text);
      if (!conc) continue; // clause không có verb đồng quy → bỏ
      const pointName = conc[1];
      const verbIndex = conc.index;

      for (const lt of LINE_TYPES) {
        const km = lt.kw.exec(c.text);
        if (!km) continue;
        const kwEnd = km.index + km[0].length;
        if (kwEnd > verbIndex) continue; // keyword phải đứng TRƯỚC verb

        const between = c.text.slice(kwEnd, verbIndex);

        // Guard named-skip: cao/phân giác/trung tuyến đã đặt tên ≥2 đoạn → nhường
        // rule cũ (intersection/perpFoot/cevian). Trung trực miễn (guarded=false).
        if (lt.guarded && countPairs(between) >= 2) continue;

        // Tam giác: in-clause trước; trung trực có thể suy từ cạnh; fallback đề.
        const inClause = trianglesIn(c.text);
        const tri =
          (inClause.length > 0 ? inClause[0] : undefined) ??
          (!lt.guarded ? triangleFromSides(between) : undefined) ??
          fallbackTri;
        if (!tri) continue; // không suy được tam giác → escalate

        out.push({
          ruleId: 'lineConcurrency',
          clauseIds: [c.id],
          intents: [addPoint(pointName, { kind: lt.kind, of: tri })],
        });
        break; // 1 clause = 1 loại đường đồng quy
      }
    }
    return out;
  },
};
