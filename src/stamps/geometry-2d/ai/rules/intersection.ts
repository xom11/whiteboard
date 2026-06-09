// src/stamps/geometry-2d/ai/rules/intersection.ts
//
// Giao điểm GENERIC của 2 đường thẳng/đoạn cho bởi CẶP ĐỈNH (2 ký tự HOA):
//   "D là giao điểm của AB và CE"        → tên TRƯỚC ("X là …")
//   "AM cắt CN tại K"                     → tên SAU ("… tại D")
//   "AC và BD cắt nhau tại O"             → tên SAU, dạng "cắt nhau"
// → add-point D {kind:'intersection', of:['AB','CE']} (builder ensure 2 segment
//   rồi lấy giao). Mỗi ref = 1 đường qua 2 điểm đã có; thiếu điểm → transpile-fail
//   → escalate (fail-safe).
//
// CHỈ nhận ref CẶP ĐỈNH "AB" (2 ký tự HOA). KHÔNG nhận:
//   - giao 2 ĐƯỜNG TRÒN "(O) và (O')" → kind circleIntersection (rule khác/defer);
//     ref "(O)" có ngoặc nên [A-Z]{2} không khớp → tự loại.
//   - line∩circle "AB cắt (O) tại M" → secondIntersection (defer); "(O)" không
//     phải cặp đỉnh → tự loại.
//   - "đôi một cắt nhau" (diameterCirclePairwise) → "đôi một" chen giữa cặp đỉnh
//     và "cắt nhau" phá khớp dạng C; dạng dùng dấu phẩy (không "và") cũng không khớp.
//
// Guard degenerate (fail-safe — thà escalate còn hơn dựng điểm vô nghĩa):
//   - 4 đầu mút phải PHÂN BIỆT: chia sẻ đỉnh → 2 đường gặp tại đỉnh chung (không
//     phải điểm mới) → bỏ qua.
//   - tên điểm cần dựng KHÔNG được nằm trong ref (định nghĩa vòng) → bỏ qua.
//
// GOTCHA \b: \b của JS theo ASCII nên KHÔNG khớp quanh ký tự Việt. Regex chứa ký
// tự Việt dùng cờ 'u' + lookaround (?!\p{L}).
import type { LanguageRule, RuleMatch } from './_types';
import type { IntentT } from '../intent';
import { addPoint } from './_shared';

// Ref = cặp đỉnh "AB" (đúng 2 ký tự HOA, neo (?![A-Z]) chặn cụm 3+). Tiền tố
// "đường thẳng|đoạn|tia|cạnh" optional.
const REF =
  '(?:đường\\s*thẳng\\s+|đoạn(?:\\s+thẳng)?\\s+|tia\\s+|cạnh\\s+)?([A-Z]{2})(?![A-Z])';
const CONN = '(?:và|với)';

// A: "giao điểm (của)? REF1 (và|với) REF2" — tên đứng TRƯỚC qua "X là".
const GIAO_DIEM = new RegExp(`giao\\s*điểm\\s+(?:của\\s+)?${REF}\\s*${CONN}\\s*${REF}`, 'gu');
// B: "REF1 cắt REF2 tại D" — tên SAU.
const CAT_TAI = new RegExp(`${REF}\\s+cắt\\s+${REF}\\s+tại\\s+([A-Z])(?![A-Z])`, 'gu');
// C: "REF1 (và|với) REF2 (cắt|giao) nhau tại D" — tên SAU. REF2 NGAY trước "cắt
//    nhau" → "đôi một" (diameterCirclePairwise) chen vào sẽ phá khớp.
const CAT_NHAU = new RegExp(
  `${REF}\\s*${CONN}\\s*${REF}\\s+(?:cắt|giao)\\s+nhau\\s+tại\\s+([A-Z])(?![A-Z])`,
  'gu',
);

// Tên điểm đứng TRƯỚC (pattern A): "X là " NGAY TRƯỚC "giao điểm".
const NAME_BEFORE = /([A-Z])(?:['′]?)\s+là\s+$/u;

// Prefilter toàn đề.
const PREFILTER = /giao\s*điểm|cắt|giao\s+nhau/u;

/**
 * Build intent intersection nếu hợp lệ: 4 đầu mút phân biệt (không chia sẻ đỉnh)
 * + tên không nằm trong ref. Ngược lại trả null (escalate).
 */
function makeIntent(name: string, ref1: string, ref2: string): IntentT | null {
  const ends = [ref1[0], ref1[1], ref2[0], ref2[1]];
  if (new Set(ends).size !== 4) return null; // chia sẻ đỉnh / ref trùng → degenerate
  if (ends.includes(name)) return null; // ref chứa chính điểm cần dựng → vô nghĩa
  return addPoint(name, { kind: 'intersection', of: [ref1, ref2] });
}

export const intersectionRule: LanguageRule = {
  id: 'intersection',
  // THẤP HƠN mọi rule tạo điểm (midpoint=50 thấp nhất, perpFoot/cevian/center…
  // đều ≥50): intentsToDsl xử lý intent THEO THỨ TỰ priority DESC (không topo-sort)
  // → các điểm đầu mút (vd M,N trung điểm trong "AM cắt CN tại K") phải được dựng
  // TRƯỚC khi intersection tham chiếu chúng. Đặt 45 (>connect 40) để chạy sau cùng.
  priority: 45,
  languages: ['vi'],
  patterns: [PREFILTER],
  match(ctx) {
    const out: RuleMatch[] = [];
    for (const c of ctx.clauses) {
      const seen = new Set<string>(); // tên đã claim trong clause (tránh trùng tên)
      const emit = (name: string, ref1: string, ref2: string) => {
        if (seen.has(name)) return;
        const intent = makeIntent(name, ref1, ref2);
        if (!intent) return;
        seen.add(name);
        out.push({ ruleId: 'intersection', clauseIds: [c.id], intents: [intent] });
      };

      // A: tên TRƯỚC — "X là giao điểm của REF1 và REF2".
      GIAO_DIEM.lastIndex = 0;
      for (const m of c.text.matchAll(GIAO_DIEM)) {
        const nm = NAME_BEFORE.exec(c.text.slice(0, m.index));
        if (nm) emit(nm[1], m[1], m[2]);
      }
      // B: "REF1 cắt REF2 tại D".
      CAT_TAI.lastIndex = 0;
      for (const m of c.text.matchAll(CAT_TAI)) emit(m[3], m[1], m[2]);
      // C: "REF1 và REF2 cắt nhau tại D".
      CAT_NHAU.lastIndex = 0;
      for (const m of c.text.matchAll(CAT_NHAU)) emit(m[3], m[1], m[2]);
    }
    return out;
  },
};
