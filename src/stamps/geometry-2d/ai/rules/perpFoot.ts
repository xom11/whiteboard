// src/stamps/geometry-2d/ai/rules/perpFoot.ts
//
// Hình chiếu vuông góc / chân đường vuông góc (đường cao):
//   "Gọi H là hình chiếu (vuông góc) của A trên/lên/xuống (đường thẳng|cạnh)? BC"
//   "Gọi H là chân đường vuông góc (hạ|kẻ) từ A (đến|xuống) BC"
//   "H, K lần lượt là hình chiếu của B trên AC và của C trên AB" → 2 foot
// → addPoint('H', { kind:'perpFoot', from:'A', onLine:'BC' })
//
// onLine giữ nguyên token sau giới từ (pair 'BC' hoặc tên đường 1 ký tự 'd').
//
// Tên foot bind CỤC BỘ (ký tự HOA + "là" NGAY TRƯỚC cụm "hình chiếu"/"chân đường"),
// KHÔNG lấy lời dẫn đầu clause — tránh gán nhầm cho "Gọi N là điểm bất kỳ, H là …".
// Match GLOBAL để dựng đủ nhiều foot trong cùng clause.
//
// SKIP (để pipeline escalate AI thay vì đoán sai):
//   - không trích được tên foot cục bộ;
//   - modifier "trung điểm (của)? hình chiếu …" — đổi nghĩa, foot không còn là điểm cần dựng.
import type { LanguageRule, RuleMatch } from './_types';
import { addPoint, connect } from './_shared';

// LƯU Ý: \b của JS dựa ASCII word-char nên KHÔNG khớp quanh ký tự Việt. Mọi
// regex chứa ký tự Việt dùng cờ 'u' + tránh \b.

// Prefilter toàn đề: "hình chiếu" / "chân đường (cao|vuông góc)" / ký hiệu ⊥ /
// "vuông góc" (cho dạng "Kẻ AH ⊥ BC tại H"). "vuông góc" rộng nhưng match() chỉ
// emit khi pattern khớp thật → an toàn.
const PREFILTER = /hình\s*chiếu|chân\s+(?:của\s+)?đường\s+(?:cao|vuông\s*góc)|⊥|vuông\s*góc/u;
// EN prefilter (issue #46 group B). runRules prefilter theo `patterns` (BỎ QUA
// field `languages`) → BẮT BUỘC có 1 EN regex thì match() mới chạy cho đề EN
// thuần. Rộng nhưng match() chỉ emit khi core khớp thật → an toàn.
const PREFILTER_EN = /projection|perpendicular|foot\s+of/i;

// onLine token: tên đường 1 ký tự HOA HOẶC cặp đỉnh 2 ký tự HOA (vd 'BC'). Chấp
// nhận tiền tố "đường thẳng" / "cạnh" / "đoạn" trước token.
const LINE = '(?:đường\\s*thẳng\\s+|cạnh\\s+|đoạn\\s+)?([A-Z]{1,2})(?![A-Z])';
const PREP = '(?:trên|lên|xuống|đến|tới)';

// "hình chiếu (vuông góc)? (của)? X PREP [cạnh|đường thẳng] LINE"
const PROJ_CORE = `hình\\s*chiếu\\s+(?:vuông\\s*góc\\s+)?(?:của\\s+)?([A-Z])\\s+${PREP}\\s+${LINE}`;
// "chân đường (vuông góc|cao) (hạ|kẻ|vẽ|dựng)? (từ)? X PREP LINE"
const FOOT_CORE = `chân\\s+(?:của\\s+)?đường\\s+(?:vuông\\s*góc|cao)\\s*(?:hạ\\s+|kẻ\\s+|vẽ\\s+|dựng\\s+)?(?:từ\\s+)?([A-Z])\\s+${PREP}\\s+${LINE}`;

// Phân phối "X, Y lần lượt là <core của FROM1 ... LINE1> và (của|từ)? FROM2 PREP LINE2".
//   groups: 1=name1 2=name2 | PROJ: 3=from1 4=line1 | FOOT: 5=from1 6=line1 | tail: 7=from2 8=line2
const LANLUOT = new RegExp(
  `([A-Z])(?:[′'])?\\s*,\\s*([A-Z])(?:[′'])?\\s+lần\\s+lượt\\s+là\\s+(?:${PROJ_CORE}|${FOOT_CORE})\\s+và\\s+(?:của\\s+|từ\\s+)?([A-Z])\\s+${PREP}\\s+${LINE}`,
  'gu',
);

// Một foot đơn (projection hoặc chân đường).
//   groups: PROJ 1=from 2=line | FOOT 3=from 4=line
const SINGLE = new RegExp(`(?:${PROJ_CORE})|(?:${FOOT_CORE})`, 'gu');

// "Kẻ/Vẽ/Dựng XY (⊥|vuông góc với?) [cạnh|đường thẳng]? LINE (tại Z)?"
//   "Kẻ AH ⊥ BC tại H" | "Vẽ AH vuông góc với BC" | "Dựng AH vuông góc cạnh BC"
// Tên foot = chữ thứ 2 của cặp XY (g2); from = g1; onLine = g3. "tại Z" (g4) nếu
// có PHẢI trùng foot (else xung đột → skip). connect.ts (SEG_KW "Kẻ AH") đã lo
// đoạn AH → rule này CHỈ emit add-point, KHÔNG connect (tránh double).
//   groups: 1=from 2=foot 3=onLine 4=tại-point(optional)
const PERP_DRAW = new RegExp(
  `(?:[Kk]ẻ|[Vv]ẽ|[Dd]ựng)\\s+([A-Z])([A-Z])(?![A-Z])\\s+(?:⊥|vuông\\s*góc(?:\\s+với)?)\\s+(?:với\\s+)?(?:đường\\s*thẳng\\s+|cạnh\\s+|đoạn\\s+)?([A-Z]{1,2})(?![A-Z])(?:\\s+tại\\s+([A-Z]))?`,
  'gu',
);

// modifier "trung điểm (của)?" NGAY TRƯỚC cụm → đổi nghĩa, không dựng foot.
const MID_BEFORE = /trung\s+điểm(?:\s+của)?\s*$/u;
// Tên foot cục bộ: ký tự HOA + "là" NGAY TRƯỚC cụm (vd "Gọi H là ", "… , H là ").
const NAME_BEFORE = /([A-Z])(?:[′'])?\s+là\s+$/u;

// === EN (issue #46 group B) ==================================================
// Additive — KHÔNG đụng building block VN ở trên. Nhãn STRICT [A-Z] (KHÔNG cờ
// 'i' — sẽ nuốt chữ thường); first-letter flex của verb bằng [Dd]/[Cc].
//
// onLine token EN: tiền tố "line "/"side "/"segment " optional + 1-2 ký tự HOA,
// neo (?![A-Z]) để chặn cụm 3+ ký tự.
const LINE_EN = '(?:line\\s+|side\\s+|segment\\s+)?([A-Z]{1,2})(?![A-Z])';

// Form A — "(orthogonal)? projection of X (onto|on|to) LINE"
//   groups: 1=from 2=line
const PROJ_CORE_EN = `(?:orthogonal\\s+)?projection\\s+of\\s+([A-Z])\\s+(?:onto|on|to)\\s+${LINE_EN}`;
// Form B — "foot of (the)? (perpendicular|altitude) from X (to|onto|on) LINE"
//   groups: 1=from 2=line
const FOOT_CORE_EN = `foot\\s+of\\s+(?:the\\s+)?(?:perpendicular|altitude)\\s+from\\s+([A-Z])\\s+(?:to|onto|on)\\s+${LINE_EN}`;

// Single EN core (projection HOẶC foot-of). Ghép 2 group block → group dịch:
//   PROJ: 1=from 2=line | FOOT: 3=from 4=line  → đọc bằng m[1]??m[3], m[2]??m[4].
const SINGLE_EN = new RegExp(`(?:${PROJ_CORE_EN})|(?:${FOOT_CORE_EN})`, 'gu');

// Form C draw — "Draw|Construct|Drop XY perpendicular to (line|side|segment)? LINE (at Z)?"
//   "Draw AH perpendicular to BC at H" | "Construct AH perpendicular to BC"
// foot = chữ thứ 2 cặp XY (g2); from = g1; onLine = g3; at = g4 (optional).
// "Draw the perpendicular bisector …" KHÔNG khớp: sau "Draw" là "the" (chữ
// thường) chứ không phải cặp HOA → perpBisector territory, không double-emit.
//   groups: 1=from 2=foot 3=onLine 4=at(optional)
const PERP_DRAW_EN = new RegExp(
  `(?:[Dd]raw|[Cc]onstruct|[Dd]rop)\\s+([A-Z])([A-Z])(?![A-Z])\\s+perpendicular\\s+to\\s+(?:line\\s+|side\\s+|segment\\s+)?([A-Z]{1,2})(?![A-Z])(?:\\s+at\\s+([A-Z]))?`,
  'gu',
);

// Tên foot ĐỨNG TRƯỚC core qua "Let X be the …" / "X is the …".
//   "Let H be the projection …" | "K is the orthogonal projection …"
const NAME_BEFORE_EN = /([A-Z])(?:[′'])?\s+(?:be|is)\s+(?:the\s+)?$/u;

interface Foot {
  name: string;
  from: string;
  onLine: string;
  /** Form C (EN draw) chỉ: cần emit connect(from, foot) vì connect.ts VN-only.
   *  VN feet KHÔNG set → behavior VN byte-identical. */
  withSegment?: boolean;
}

/** Parse mọi foot trong 1 clause. Trả [] nếu không bind được tên / bị skip. */
function parseFeet(text: string): Foot[] {
  const out: Foot[] = [];
  const consumed: Array<[number, number]> = [];

  // 1) "X, Y lần lượt là … và …" → 2 foot (name bind sẵn trong cú pháp).
  LANLUOT.lastIndex = 0;
  let lm: RegExpExecArray | null;
  while ((lm = LANLUOT.exec(text)) !== null) {
    if (MID_BEFORE.test(text.slice(0, lm.index))) continue; // "trung điểm của …" → skip
    const from1 = lm[3] ?? lm[5];
    const line1 = lm[4] ?? lm[6];
    out.push({ name: lm[1], from: from1, onLine: line1 });
    out.push({ name: lm[2], from: lm[7], onLine: lm[8] });
    consumed.push([lm.index, lm.index + lm[0].length]);
  }

  // 2) foot đơn — bind tên CỤC BỘ. Bỏ qua nếu nằm trong span "lần lượt" đã xử lý.
  SINGLE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = SINGLE.exec(text)) !== null) {
    const start = m.index;
    if (consumed.some(([a, b]) => start >= a && start < b)) continue;
    const before = text.slice(0, start);
    if (MID_BEFORE.test(before)) continue; // "trung điểm của hình chiếu …" → đổi nghĩa
    const nm = NAME_BEFORE.exec(before);
    if (!nm) continue; // không có tên cục bộ → escalate AI
    out.push({ name: nm[1], from: m[1] ?? m[3], onLine: m[2] ?? m[4] });
  }

  // 3) "Kẻ XY ⊥ LINE (tại Z)" — tên foot lấy từ cặp XY (không cần "X là").
  PERP_DRAW.lastIndex = 0;
  let pm: RegExpExecArray | null;
  while ((pm = PERP_DRAW.exec(text)) !== null) {
    const from = pm[1];
    const foot = pm[2];
    const onLine = pm[3];
    const at = pm[4]; // "tại Z" (optional)
    if (at && at !== foot) continue; // "tại K" ≠ chân H → xung đột → escalate
    if (onLine.includes(foot)) continue; // chân trùng đỉnh của đường → degenerate
    out.push({ name: foot, from, onLine });
  }

  // 4) EN projection / foot-of — tên bind ĐỨNG TRƯỚC qua "Let X be the …"/"X is
  //    the …". Không có tên-trước → escalate (fail-safe). "trung điểm" KHÔNG
  //    áp dụng EN; MID_BEFORE giữ nguyên VN, ở đây không cần.
  SINGLE_EN.lastIndex = 0;
  let em: RegExpExecArray | null;
  while ((em = SINGLE_EN.exec(text)) !== null) {
    const before = text.slice(0, em.index);
    const nm = NAME_BEFORE_EN.exec(before);
    if (!nm) continue; // không có "X be/is the" → escalate AI
    const from = em[1] ?? em[3];
    const onLine = em[2] ?? em[4];
    out.push({ name: nm[1], from, onLine });
  }

  // 5) EN draw form "Draw XY perpendicular to LINE (at Z)" — foot = chữ 2 cặp XY.
  //    connect.ts VN-only → tự emit connect(from, foot) để vẽ đoạn (parity VN).
  PERP_DRAW_EN.lastIndex = 0;
  let dm: RegExpExecArray | null;
  while ((dm = PERP_DRAW_EN.exec(text)) !== null) {
    const from = dm[1];
    const foot = dm[2];
    const onLine = dm[3];
    const at = dm[4]; // "at Z" (optional)
    if (at && at !== foot) continue; // "at K" ≠ chân H → xung đột → escalate
    if (onLine.includes(foot)) continue; // chân trùng đỉnh đường → degenerate
    out.push({ name: foot, from, onLine, withSegment: true });
  }
  return out;
}

/**
 * Mỗi clause → 0..n add-point perpFoot. Tên foot bind cục bộ theo cú pháp gần,
 * match global để dựng đủ (vd "H, K lần lượt …" = 2 foot).
 */
export const perpFootRule: LanguageRule = {
  id: 'perpFoot',
  priority: 65,
  languages: ['vi', 'en'],
  patterns: [PREFILTER, PREFILTER_EN],
  match(ctx) {
    const out: RuleMatch[] = [];
    for (const c of ctx.clauses) {
      const feet = parseFeet(c.text);
      if (feet.length === 0) continue;
      // Foot add-point TRƯỚC; với EN draw form (withSegment) push THÊM connect
      // NGAY SAU add-point của foot đó (H phải tồn tại trước khi connect tham
      // chiếu). VN feet không set withSegment → byte-identical.
      const intents = feet.flatMap((f) => {
        const add = addPoint(f.name, { kind: 'perpFoot', from: f.from, onLine: f.onLine });
        return f.withSegment ? [add, connect(f.from, f.name, 'segment')] : [add];
      });
      out.push({ ruleId: 'perpFoot', clauseIds: [c.id], intents });
    }
    return out;
  },
};
