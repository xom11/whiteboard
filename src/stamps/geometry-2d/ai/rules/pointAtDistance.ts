// src/stamps/geometry-2d/ai/rules/pointAtDistance.ts
//
// Constraint METRIC: điểm trên tia kéo dài, cách mốc một khoảng cho trước.
//   C = through + d · unit(through − from)   (xem spec 2026-06-06-point-at-distance)
//
// Phrasing phủ:
//   - "trên tia đối của tia BA, lấy (điểm)? C sao cho BC = R"
//       tia đối của tia BA = tia từ B ngược hướng A ⇒ hướng A→B kéo dài.
//       ⇒ from = A, through = B, điểm mới C nằm NGOÀI B.
//   - "kéo dài AB (về phía B) lấy C sao cho BC = R"
//       ⇒ from = A, through = B.
//   - EN (issue #46 group B):
//       "On ray XY extended beyond Y, take D such that YD = …" ⇒ from=X, through=Y.
//       "Extend XY beyond Y to D such that YD = …"            ⇒ from=X, through=Y.
//       "On the opposite ray of ray XY, take D such that XD …" ⇒ from=Y, through=X.
//
// Hướng suy từ thứ tự token (from→through), KHÔNG cần field thừa. Điểm mốc đo
// khoảng cách (through) trùng đỉnh đầu của cụm "YZ = ..." (Y = through, Z = tên
// điểm mới). Ta dùng chính cặp này để chốt hướng + nguồn distance.
//
// distance (3 nguồn — discriminated union):
//   "= R" / "= bán kính" / "= bán kính (O)"   → {kind:'circleRadius', circle}
//   "= AB" / "= MN" (2 ký tự HOA)             → {kind:'segmentLength', p1, p2}
//   "= 3" / "= 2,5" / "= 2 cm"                → {kind:'literal', value}
//
// GOTCHA \b: \b của JS dựa ASCII word-char nên KHÔNG khớp quanh ký tự Việt.
// Mọi regex chứa ký tự Việt dùng cờ 'u' + lookaround \p{L}.
import type { LanguageRule, RuleMatch } from './_types';
import { addPoint } from './_shared';

// LƯU Ý: KHÔNG dùng cờ 'i' — nó làm [A-Z] khớp cả chữ thường, hỏng việc trích
// tên điểm (đỉnh là CHỮ HOA). Clause có thể bắt đầu bằng chữ HOA ("Kéo dài…",
// "Trên tia đối…") nên chữ cái đầu từ-khoá tiếng Việt dùng alternation [Kk]/[Tt].
// --- Prefilter (toàn đề) ------------------------------------------------------
const KEYWORD = /(?:[Kk]éo\s*dài|tia\s*đối)/u;

// --- Trigger trên clause ------------------------------------------------------
// "trên tia đối của tia BA" → cặp [B, A] (B = gốc tia, A = hướng cũ). Hướng kéo
// dài là tia đối ⇒ from = A, through = B.
const TIA_DOI =
  /tia\s*đối\s+của\s+tia\s+([A-Z])([A-Z])(?![A-Z])/u;
// "kéo dài AB" → cặp [A, B]. Mặc định lấy điểm về phía B (đỉnh cuối) ⇒ from = A,
// through = B. ("về phía A" hiếm + cần re-map; defer → bỏ qua để escalate.)
const KEO_DAI =
  /[Kk]éo\s*dài\s+(?:(?:đoạn|cạnh|tia)\s+)?([A-Z])([A-Z])(?![A-Z])/u;

// "lấy (điểm)? C sao cho" / "lấy C" / "lấy C′" → tên điểm mới (CAPTURE prime).
// Issue #46 nhóm A: prime (' U+0027 / ′ U+2032) là PHẦN của tên — giữ lại để
// "C′" ≠ đỉnh "C" (tránh addPoint dedup drop → escalate). Group 2 = prime char.
const TAKE_POINT =
  /lấy\s+(?:điểm\s+)?([A-Z])(['′]?)(?![A-Z])/u;

// Normalize prime về 1 dạng: ′ (U+2032) → ' (U+0027). NameZ/serialize NAME_REGEX
// cho phép ' nhưng KHÔNG cho phép ′ → chuẩn hoá để name "C'" chảy qua DSL/render
// (label) không cần đổi schema. Trả về tên đầy đủ (chữ + prime đã normalize).
function normalizePointName(letter: string, prime: string): string {
  return prime ? `${letter}'` : letter;
}

// "về phía X": hướng kéo dài. Mặc định through = đỉnh cuối cụm. Nếu "về phía X"
// mà X KHÁC through (vd "kéo dài AB về phía A") → hướng đảo, rule không xử lý
// đúng (defer) → skip để escalate.
const VE_PHIA = /về\s+phía\s+([A-Z])(?![A-Za-z])/u;

// === EN (issue #46 group B) ==================================================
// Additive — KHÔNG đụng building block VN ở trên. Nhãn STRICT [A-Z] (KHÔNG cờ
// 'i' — sẽ nuốt chữ thường); first-letter flex của verb bằng [Ee]/[Tt]/[Mm]/…
//
// EN prefilter (runRules tests `patterns` against whole problem, IGNORING the
// `languages` field — so an EN regex is REQUIRED here for EN-only problems to
// reach match()). Broad but match() validates precisely → safe.
const PREFILTER_EN = /beyond|opposite\s+ray/i;

// "ray XY extended beyond Z" → ray X→Y extended past Z. from=X, through=Y;
// require Z===Y (you extend past the FAR endpoint). Comma before "extended" ok.
const RAY_EXTENDED_EN =
  /ray\s+([A-Z])([A-Z])(?![A-Z])\s*,?\s*extended\s+beyond\s+([A-Z])(?![A-Z])/u;
// "extend(ed)? (segment|line|side)? XY beyond Z" (no "ray"). from=X, through=Y;
// require Z===Y.
const EXTEND_SEG_EN =
  /[Ee]xtend(?:ed)?\s+(?:segment\s+|line\s+|side\s+)?([A-Z])([A-Z])(?![A-Z])\s+beyond\s+([A-Z])(?![A-Z])/u;
// "opposite ray of ray XY" → mirror VN tia đối: from=Y(2nd), through=X(1st).
const OPPOSITE_RAY_EN =
  /opposite\s+ray\s+of\s+ray\s+([A-Z])([A-Z])(?![A-Z])/u;

// New-point name (EN). "take/mark/choose/pick D" or "to D" (phrasing "extend AB
// beyond B TO D"). Lookbehind (?<![A-Za-z]) stops "to" matching inside words
// (into, photo). NO `i` flag — capture is [A-Z]; first-letter flex per verb.
// group 1 = letter, group 2 = prime (mirror VN TAKE_POINT).
const TAKE_POINT_EN =
  /(?<![A-Za-z])(?:[Tt]ake|[Mm]ark|[Cc]hoose|[Pp]ick|to)\s+(?:a\s+|the\s+)?(?:point\s+)?([A-Z])(['′]?)(?![A-Z])/u;

// Cụm chốt mốc + khoảng cách: "BC = R" / "BC = AB" / "BC = 3" / "BC = 2,5 cm".
// Đỉnh đầu (m[1]) = mốc đo (through); đỉnh sau (m[2]) = điểm mới (Z); m[3] = prime
// của điểm mới (CAPTURE — phải khớp tên điểm mới ở TAKE_POINT). Issue #46 nhóm A:
// điểm mới có thể mang dấu phẩy/prime ("BC′ = R"); giữ prime để chốt mốc đúng.
// Phần sau dấu "=" (m[4]) gom thô để parse riêng (radius / segment / số). KHÔNG
// kết thúc trên ',' — dấu phẩy có thể là phân tách thập phân ("2,5"); clause đã
// được segmentClauses tách trên dấu chấm/'; nên gom tới hết clause là an toàn.
const DIST_CLAUSE =
  /(?:sao\s+cho\s+)?([A-Z])([A-Z])(['′]?)(?![A-Z])\s*=\s*(.+?)\s*(?:[.;]|$)/u;

// --- Distance parsing ---------------------------------------------------------
const RADIUS_WORD = /(?<!\p{L})(?:R|bán\s*kính)(?!\p{L})/u;
const CIRCLE_OF_RADIUS = /bán\s*kính\s*(?:\(\s*)?([A-Z])\s*\)?/u;
const SEGMENT_PAIR = /^\s*([A-Z])([A-Z])(?![A-Z])\s*$/u;
const NUMBER = /(\d+(?:[.,]\d+)?)/u;

// Tâm đường tròn trong đề: "(O;" / "(O)" / "đường tròn tâm O" → tên circle.
const CIRCLE_NAME_PAREN = /\(\s*([A-Z])\s*[;,)]/u;
const CIRCLE_NAME_WORDS = /đường\s*tròn\s*(?:tâm\s+)?([A-Z])(?![A-Z])/u;

function parseNum(raw: string): number {
  return Number(raw.replace(',', '.'));
}

/** Tên circle để gắn radius. Suy từ đề (ctx.problem); mặc định 'O'. */
function resolveCircleName(problem: string): string {
  const w = CIRCLE_NAME_WORDS.exec(problem);
  if (w) return w[1];
  const p = CIRCLE_NAME_PAREN.exec(problem);
  if (p) return p[1];
  return 'O';
}

type DistanceBase =
  | { kind: 'circleRadius'; circle: string }
  | { kind: 'segmentLength'; p1: string; p2: string }
  | { kind: 'literal'; value: number };

type Distance = DistanceBase & { scale?: number; offset?: number };

// --- Hệ số/bội/offset (Issue #46 nhóm C) -------------------------------------
// Tách "<scale>·base ± offset". scale = số đứng TRƯỚC base (qua dấu nhân ·/./×/*
// hoặc dán liền "2AB"/"2R" hoặc cách "2 AB"). offset = "± số" đứng SAU base.
//   "2R"      → scale 2, base R
//   "2·AB"    → scale 2, base AB
//   "R + 1"   → base R, offset +1
//   "2R + 1"  → scale 2, base R, offset +1
// base có thể là R/bán kính, cặp đỉnh (AB), hoặc số literal.
//
// Hệ số đứng trước base: "2", "2·", "2.", "2×", "2*", "2 " (số rồi base).
const COEF_PREFIX = /^(\d+(?:[.,]\d+)?)\s*[·.×*]?\s*(?=[A-Z]|bán)/u;
// Offset đứng cuối: "± số" (chỉ số literal, không nhân thêm đại lượng).
const OFFSET_SUFFIX = /([+-])\s*(\d+(?:[.,]\d+)?)\s*$/u;
// Dấu nhân CHỈ giữa 2 đại lượng (vd "R·AB", "AB·MN"): tích 2 đại lượng → mơ hồ.
// Phát hiện: có dấu nhân mà 2 BÊN đều KHÔNG phải số → reject.
const MUL_TWO_QUANTITIES = /[A-Z](?:\s*['′])?\s*[·×*]\s*[A-Z]/u;

/** Parse phần sau dấu "=" → DistanceSpec hoặc undefined (không nhận dạng được). */
function parseDistance(raw: string, problem: string): Distance | undefined {
  let text = raw.trim();

  // 0. TỪ CHỐI ngay các biểu thức KHÔNG xử lý được:
  if (/\//u.test(text)) return undefined; // chia: "AB/2", "1/2 AB" → defer
  if (/\blần\b/u.test(text)) return undefined; // "2 lần bán kính" → defer
  if (MUL_TWO_QUANTITIES.test(text)) return undefined; // tích 2 đại lượng "R·AB"
  // '-' đứng đầu (giá trị âm trực tiếp "-3") → defer. ('-' offset xử lý ở dưới.)
  if (/^-/u.test(text)) return undefined;

  // 1. Tách offset "± số" ở cuối (literal). Không nhân thêm đại lượng.
  let offset: number | undefined;
  const off = OFFSET_SUFFIX.exec(text);
  if (off) {
    const sign = off[1] === '-' ? -1 : 1;
    offset = sign * parseNum(off[2]);
    text = text.slice(0, off.index).trim();
  }
  // Sau khi bóc offset, KHÔNG còn được phép có toán tử +/- (vd "1 + 2 + R" lạ).
  if (/[+]/u.test(text)) return undefined;
  if (/-\s*\d/u.test(text)) return undefined;

  // 2. Tách hệ số (scale) đứng trước base. Chỉ nhận khi PHÍA SAU là base
  //    (đỉnh HOA / "bán"). "3" đơn lẻ KHÔNG khớp (→ literal value).
  let scale: number | undefined;
  const coef = COEF_PREFIX.exec(text);
  if (coef) {
    scale = parseNum(coef[1]);
    if (!(Number.isFinite(scale) && scale > 0)) return undefined;
    text = text.slice(coef[0].length).trim();
  }

  // Còn sót dấu nhân lẻ (vd "·R" do tách lỗi) → mơ hồ.
  if (/[·×*]/u.test(text)) return undefined;

  const withCoef = (base: DistanceBase): Distance => {
    const d: Distance = { ...base };
    if (scale !== undefined) d.scale = scale;
    if (offset !== undefined) d.offset = offset;
    return d;
  };

  // 3. base = bán kính: "R" / "bán kính" / "bán kính (O)".
  if (RADIUS_WORD.test(text)) {
    const co = CIRCLE_OF_RADIUS.exec(text);
    const circle = co ? co[1] : resolveCircleName(problem);
    return withCoef({ kind: 'circleRadius', circle });
  }
  // 4. base = đoạn = 2 ký tự HOA liền ("AB", "MN").
  const seg = SEGMENT_PAIR.exec(text);
  if (seg) return withCoef({ kind: 'segmentLength', p1: seg[1], p2: seg[2] });
  // 5. base = số literal (board units). "2 cm" → 2 (cm-mapping defer).
  //    Lưu ý: nếu đã tách scale thì KHÔNG còn base số (scale·số vô nghĩa) → defer.
  if (scale === undefined) {
    const num = NUMBER.exec(text);
    if (num) {
      const value = parseNum(num[1]);
      if (Number.isFinite(value) && value > 0) return withCoef({ kind: 'literal', value });
    }
  }
  return undefined;
}

/**
 * "kéo dài AB lấy C sao cho BC = R" / "trên tia đối của tia BA, lấy C sao cho
 * BC = R" → add-point C kind:pointAtDistance. Hướng (from→through) suy từ token
 * cặp + mốc đo (đỉnh đầu cụm "YZ = …"). Không parse đủ (thiếu tên điểm mới /
 * distance không nhận dạng / mốc không khớp) → bỏ qua để escalate AI.
 *
 * EN (issue #46 group B) — mirror VN, chỉ chạy khi VN không xác định được hướng:
 *   "ray XY extended beyond Y, take D such that YD = …"  → from=X, through=Y
 *   "extend XY beyond Y to D such that YD = …"           → from=X, through=Y
 *   "opposite ray of ray XY, take D such that XD = …"    → from=Y, through=X
 */
export const pointAtDistanceRule: LanguageRule = {
  id: 'pointAtDistance',
  priority: 55,
  languages: ['vi', 'en'],
  patterns: [KEYWORD, PREFILTER_EN],
  match(ctx) {
    const out: RuleMatch[] = [];
    for (const c of ctx.clauses) {
      let from: string | undefined;
      let through: string | undefined;
      let name: string | undefined;
      let isEn = false;

      // --- Hướng VN (from → through) ---
      const doi = TIA_DOI.exec(c.text);
      if (doi) {
        // tia đối của tia BA: B = gốc, A = hướng cũ ⇒ kéo dài về B ⇒ from=A, through=B.
        from = doi[2];
        through = doi[1];
      } else {
        const kd = KEO_DAI.exec(c.text);
        if (kd) {
          // kéo dài AB (về phía B mặc định) ⇒ from=A, through=B.
          from = kd[1];
          through = kd[2];
        }
      }

      if (from && through) {
        // VN name (GIỮ prime, normalize ′→').
        const take = TAKE_POINT.exec(c.text);
        name = take ? normalizePointName(take[1], take[2]) : undefined;
      } else {
        // --- EN direction (additive; chỉ khi VN không xác định được hướng) ---
        const opp = OPPOSITE_RAY_EN.exec(c.text);
        const ray = RAY_EXTENDED_EN.exec(c.text);
        const ext = EXTEND_SEG_EN.exec(c.text);
        if (opp) {
          // opposite ray of ray XY → mirror VN tia đối: from=Y, through=X.
          from = opp[2];
          through = opp[1];
        } else if (ray && ray[3] === ray[2]) {
          // ray XY extended beyond Z (Z must = Y): from=X, through=Y.
          from = ray[1];
          through = ray[2];
        } else if (ext && ext[3] === ext[2]) {
          // extend XY beyond Z (Z must = Y): from=X, through=Y.
          from = ext[1];
          through = ext[2];
        }
        if (from && through) {
          isEn = true;
          const takeEn = TAKE_POINT_EN.exec(c.text);
          name = takeEn ? normalizePointName(takeEn[1], takeEn[2]) : undefined;
        }
      }

      if (!from || !through || !name) continue;

      // VE_PHIA: chỉ VN (EN không có "về phía"). Giữ outcome VN byte-identical.
      if (!isEn) {
        const vp = VE_PHIA.exec(c.text);
        if (vp && vp[1] !== through) continue;
      }

      // --- Mốc đo + khoảng cách ("YZ = …") — language-agnostic (DIST_CLAUSE) ---
      const dc = DIST_CLAUSE.exec(c.text);
      if (!dc) continue;
      const anchor = dc[1]; // Y = mốc đo (phải trùng through; đỉnh đơn)
      const newPt = normalizePointName(dc[2], dc[3]); // Z = điểm mới (phải trùng name)
      // Mốc đo phải là through; đỉnh sau là điểm mới ta vừa lấy (so theo tên đã
      // normalize ⇒ "BC′" khớp điểm "C'", "BD′" KHÔNG khớp điểm "C'").
      if (anchor !== through || newPt !== name) continue;

      const distance = parseDistance(dc[4], ctx.problem);
      if (!distance) continue;

      out.push({
        ruleId: 'pointAtDistance',
        clauseIds: [c.id],
        intents: [addPoint(name, { kind: 'pointAtDistance', from, through, distance })],
      });
    }
    return out;
  },
};
