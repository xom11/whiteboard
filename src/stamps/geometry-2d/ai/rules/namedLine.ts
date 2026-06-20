// src/stamps/geometry-2d/ai/rules/namedLine.ts
//
// Đường thẳng ĐẶT TÊN bằng CHỮ THƯỜNG (d, a, xy, d1, Δ…) có RÀNG BUỘC hình học
// → dựng thành shape referenceable để clause sau ("d cắt AB tại E", "Trên d lấy
// điểm M", "OH ⊥ d") tham chiếu được (tránh UNKNOWN_REF cascade fail):
//
//   "Vẽ đường thẳng d ⊥ OA tại A"        → line d = perpThrough(A, OA)
//   "Cho đường thẳng d vuông góc BC tại H" → line d = perpThrough(H, BC)
//   "Vẽ đường thẳng d // BC qua A"        → line d = parallelThrough(A, BC)
//   "đường thẳng d đi qua A và B"          → line d = lineThrough([A,B])
//
// KHÁC perpNamedLine (token <HOA><thường> "Ax"/"Od" — TÊN TIA, gốc = chữ HOA đầu)
// + tangentLineNamedAtPoint (tiếp tuyến chữ thường — tangentAt circle). Ở đây token
// là CHỮ THƯỜNG THUẦN (d, a, xy) → KHÔNG có gốc-điểm nội tại, phải lấy anchor từ
// "tại/qua <P>".
//
// FREE_DECL — khai báo đường thẳng TỰ DO KHÔNG ràng buộc ("Cho/Vẽ (một)? đường
// thẳng d") DỰNG được khi "d" được THAM CHIẾU sau (perpFoot "OH ⊥ d", onSegment
// "M thuộc d", "d cắt …") → d = lineThrough qua 2 ĐIỂM TỰ DO (d_p1, d_p2). Guard
// referenced để KHÔNG dựng đường thừa khi "d" chỉ là tên trơ (vao10:93). KHÔNG
// match nếu clause cùng câu có ràng buộc ⊥/∥/qua (PERP/PARA/THRU thắng — seen).
//
// GOTCHA token chữ thường: `[a-z]{1,2}[0-9]?` + NEO (?!\p{L}) — KHÔNG `[a-z]*`
// (nuốt "vuông"→"vu" vì 'ô' không trong [a-z] ASCII; cờ 'u' bắt buộc cho ký tự Việt).
import type { LanguageRule, RuleMatch } from './_types';
import type { IntentT } from '../intent';
import { addPoint, drawLine, DUONG_KW, escapeRe } from './_shared';

// Token tên đường chữ thường: 1-2 ký tự thường + tối đa 1 chữ số ("d","xy","d1"),
// NEO (?!\p{L}) để không nuốt từ tiếng Việt ("vuông"/"song").
const LC = String.raw`([a-z]{1,2}[0-9]?)(?!\p{L})`;
// Đường tham chiếu = cặp đỉnh HOA (cho space giữa "O A"), tiền tố loại optional.
const REF = String.raw`(?:${DUONG_KW}\s*thẳng\s+|đoạn(?:\s+thẳng)?\s+|cạnh\s+|tia\s+)?([A-Z]\s*[A-Z])(?![A-Z])`;
// Điểm HOA đơn.
const PT = String.raw`([A-Z])(?![A-Za-z])`;

const VERB = String.raw`(?:[Cc]ho|[Vv]ẽ|[Kk]ẻ|[Dd]ựng)\s+(?:một\s+)?${DUONG_KW}\s*thẳng\s+`;
// Khai báo đường thẳng KHÔNG bắt buộc verb: "… và một đường thẳng d ⊥ AC" (verb
// "Cho" đứng xa, ngăn bởi "ba điểm A,B,C…"). Ràng buộc ⊥/∥ NGAY SAU đủ đặc thù.
const DECL = String.raw`(?:(?:và|[Cc]ho|[Vv]ẽ|[Kk]ẻ|[Dd]ựng)\s+)?(?:một\s+)?${DUONG_KW}\s*thẳng\s+`;

// "(Cho|Vẽ|Kẻ|Dựng) (một)? đường thẳng <d> ⊥/vuông góc (với)? <REF> (, cắt <REF2>)?
//  (tại|ở) <P>" — đường tên <d> ⊥ REF, anchor = P (điểm qua). `⊥\s*` (KHÔNG \s+):
//  OCR hay dính "d ⊥OA" (vao10:123).
const PERP = new RegExp(
  DECL + LC + String.raw`\s*(?:⊥\s*|vuông\s*góc(?:\s+với)?\s+)(?:với\s+)?` +
    REF + String.raw`(?:\s*,?\s*cắt\s+[A-Z]{2})?\s+(?:tại|ở)\s+(?:điểm\s+)?` + PT,
  'gu',
);

// "(Cho|Vẽ…) (một)? đường thẳng <d> //|song song (với)? <REF> (đi)? qua <P>" hoặc
//  "Qua <P> ... đường thẳng <d> //|song song <REF>" (anchor TRƯỚC). Lấy cả 2 thứ tự.
const PARA_AFTER = new RegExp(
  VERB + LC + String.raw`\s*(?://\s*|song\s*song(?:\s+với)?\s+)(?:với\s+)?` +
    REF + String.raw`\s+(?:đi\s+)?qua\s+(?:điểm\s+)?` + PT,
  'gu',
);
const PARA_BEFORE = new RegExp(
  String.raw`(?:[Qq]ua|[Tt]ừ)\s+(?:điểm\s+)?` + PT +
    String.raw`[^.]{0,12}?` + VERB + LC +
    String.raw`\s*(?://\s*|song\s*song(?:\s+với)?\s+)(?:với\s+)?` + REF,
  'gu',
);

// "(Cho|Vẽ…) (một)? đường thẳng <d> (đi)? qua (hai điểm)? <A> và <B>" — qua 2 điểm
//  ĐÃ CÓ → lineThrough. KHÔNG nuốt "qua A vuông góc/song song" (đã bắt ở PERP/PARA
//  TRƯỚC; ở đây yêu cầu "và <B>" thứ 2 nên dạng có ⊥/∥ không khớp).
const THRU_TWO = new RegExp(
  VERB + LC + String.raw`\s+(?:đi\s+)?qua\s+(?:hai\s+điểm\s+)?` + PT +
    String.raw`\s+và\s+(?:điểm\s+)?` + PT,
  'gu',
);

// "(một)? đường thẳng <d> (không qua O)? cắt (đường tròn)? (O)? tại (2|hai điểm)?
//  <A> và <B>" — cát tuyến ĐẶT TÊN d đi qua 2 giao điểm A,B (secant rule dựng A,B
//  on-circle). d = lineThrough([A,B]) → clause sau "Trên d lấy điểm C" tham chiếu
//  được (httcd:245). Blob `[^.]{0,30}?` cho "không qua O cắt đường tròn (O)" xen.
const SECANT_LINE = new RegExp(
  DECL + LC +
    String.raw`[^.]{0,40}?cắt[^.]{0,30}?(?:tại|ở)\s+(?:2\s+|hai\s+)?(?:điểm\s+)?` +
    PT + String.raw`\s+và\s+(?:điểm\s+)?` + PT,
  'gu',
);

// FREE_DECL: "(Cho|Vẽ|Kẻ|Dựng) (một)? đường thẳng <d>" — khai báo TỰ DO. KHÔNG
//  có ràng buộc NGAY SAU (⊥/∥/qua/đi qua/cắt …): theo sau token là ranh giới câu
//  ("." / "và" / cuối). Negative-lookahead loại dạng ràng buộc (sẽ do PERP/PARA/
//  THRU/SECANT claim trước). `d` ở group1.
const FREE_DECL = new RegExp(
  String.raw`(?:[Cc]ho|[Vv]ẽ|[Kk]ẻ|[Dd]ựng)\s+(?:một\s+)?${DUONG_KW}\s*thẳng\s+` +
    LC +
    // KHÔNG theo sau bởi ràng buộc: ⊥/vuông góc, //|song song, (đi)?qua, cắt,
    // tiếp xúc. Cho phép ranh giới câu / "và" / "," / "(".
    String.raw`(?!\s*(?:⊥|//|vuông\s*góc|song\s*song|(?:đi\s+)?qua|cắt|tiếp\s*xúc|tại|ở)\b)`,
  'gu',
);

// "d" được THAM CHIẾU như ĐƯỜNG ở chỗ khác trong đề (ngoài khai báo): "⊥ d",
//  "thuộc d", "trên d", "d cắt", "d tại", "nằm trên d". Token neo (?<![\p{L}\d])
//  + (?![\p{L}\d]) để "d" độc lập (không nuốt "do"/"đó"). Dùng làm guard tránh
//  dựng đường thừa cho tên trơ.
function lineReferenced(problem: string, name: string): boolean {
  const esc = escapeRe(name);
  const N = String.raw`(?<![\p{L}\d])${esc}(?![\p{L}\d])`;
  const REFS = [
    // trước "d": "⊥ d", "song song d", "thuộc/trên/nằm trên d", "cắt … d", "của d"
    new RegExp(String.raw`(?:⊥|vuông\s*góc(?:\s+với)?|//|song\s*song(?:\s+với)?|thuộc|trên|cắt|tiếp\s*tuyến\s+(?:của|với)?)\s+(?:${N})`, 'u'),
    // sau "d": "d cắt", "d tại", "d lấy", "d, "
    new RegExp(N + String.raw`\s+(?:cắt|tại|ở|lấy)`, 'u'),
  ];
  return REFS.some((re) => re.test(problem));
}

// Đề có "đường thẳng <chữ thường>" (token tên đường) — đủ hẹp để prefilter.
const PREFILTER = new RegExp(
  String.raw`${DUONG_KW}\s*thẳng\s+[a-z]{1,2}[0-9]?(?![\p{L}])`,
  'u',
);

export const namedLineRule: LanguageRule = {
  id: 'named-line',
  // Cao (63) như tangentLineNamedAtPoint — đường <d> phải dựng TRƯỚC điểm-trên-d
  // / intersection tham chiếu d.
  priority: 63,
  languages: ['vi'],
  patterns: [PREFILTER],
  match(ctx) {
    const out: RuleMatch[] = [];
    const push = (clauseId: number, intents: IntentT[]) => {
      out.push({ ruleId: 'named-line', clauseIds: [clauseId], intents });
    };
    for (const c of ctx.clauses) {
      const seen = new Set<string>(); // tên đường đã claim trong clause

      // PERP: "đường thẳng d ⊥ OA tại A" → perpThrough(A, OA). anchor ∈ REF OK
      // (perpendicular qua điểm trên đường vẫn hợp lệ — vd A∈OA).
      PERP.lastIndex = 0;
      for (const m of c.text.matchAll(PERP)) {
        const line = m[1];
        const to = m[2].replace(/\s+/g, '');
        const anchor = m[3];
        if (seen.has(line)) continue;
        seen.add(line);
        push(c.id, [drawLine(line, 'perpThrough', { through: anchor, to })]);
      }

      // PARA (anchor SAU): "đường thẳng d // BC qua A" → parallelThrough(A, BC).
      PARA_AFTER.lastIndex = 0;
      for (const m of c.text.matchAll(PARA_AFTER)) {
        const line = m[1];
        const to = m[2].replace(/\s+/g, '');
        const anchor = m[3];
        if (seen.has(line) || to.includes(anchor)) continue; // anchor ∈ ref song song → suy biến
        seen.add(line);
        push(c.id, [drawLine(line, 'parallelThrough', { through: anchor, to })]);
      }
      // PARA (anchor TRƯỚC): "Qua A vẽ đường thẳng d // BC".
      PARA_BEFORE.lastIndex = 0;
      for (const m of c.text.matchAll(PARA_BEFORE)) {
        const anchor = m[1];
        const line = m[2];
        const to = m[3].replace(/\s+/g, '');
        if (seen.has(line) || to.includes(anchor)) continue;
        seen.add(line);
        push(c.id, [drawLine(line, 'parallelThrough', { through: anchor, to })]);
      }

      // THRU_TWO: "đường thẳng d qua A và B" → lineThrough([A,B]).
      THRU_TWO.lastIndex = 0;
      for (const m of c.text.matchAll(THRU_TWO)) {
        const line = m[1];
        const a = m[2];
        const b = m[3];
        if (seen.has(line) || a === b) continue;
        seen.add(line);
        push(c.id, [drawLine(line, 'lineThrough', { points: [a, b] })]);
      }

      // SECANT_LINE: "đường thẳng d ... cắt ... tại A và B" → d = lineThrough([A,B])
      //  (A,B = giao điểm do secant dựng on-circle). KHÔNG claim coverage clause
      //  này (intents RỖNG cho coverage path) — chỉ DỰNG d; secant đã claim clause.
      SECANT_LINE.lastIndex = 0;
      for (const m of c.text.matchAll(SECANT_LINE)) {
        const line = m[1];
        const a = m[2];
        const b = m[3];
        if (seen.has(line) || a === b) continue;
        seen.add(line);
        push(c.id, [drawLine(line, 'lineThrough', { points: [a, b] })]);
      }

      // FREE_DECL: "Cho/Vẽ (một)? đường thẳng d" trơ → d = lineThrough qua 2 điểm
      //  tự do (d_p1, d_p2). CHỈ khi (a) chưa claim ràng buộc trong clause này,
      //  (b) "d" được tham chiếu như đường ở chỗ khác (tránh đường thừa). KHÔNG
      //  claim coverage (intents có dựng nhưng clause "Cho đường thẳng d" thường
      //  cũng nêu đường tròn → để rule khác claim; ở đây chỉ DỰNG d).
      FREE_DECL.lastIndex = 0;
      for (const m of c.text.matchAll(FREE_DECL)) {
        const line = m[1];
        if (seen.has(line) || !lineReferenced(ctx.problem, line)) continue;
        seen.add(line);
        const p1 = `${line}_p1`;
        const p2 = `${line}_p2`;
        push(c.id, [
          addPoint(p1, { kind: 'free' }),
          addPoint(p2, { kind: 'free' }),
          drawLine(line, 'lineThrough', { points: [p1, p2] }),
        ]);
      }
    }
    return out;
  },
};
