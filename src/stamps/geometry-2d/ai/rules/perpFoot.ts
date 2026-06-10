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
import { addPoint, connect, DUONG_KW } from './_shared';

// LƯU Ý: \b của JS dựa ASCII word-char nên KHÔNG khớp quanh ký tự Việt. Mọi
// regex chứa ký tự Việt dùng cờ 'u' + tránh \b.

// Prefilter toàn đề: "hình chiếu" / "chân đường (cao|vuông góc)" / ký hiệu ⊥ /
// "vuông góc" (cho dạng "Kẻ AH ⊥ BC tại H"). "vuông góc" rộng nhưng match() chỉ
// emit khi pattern khớp thật → an toàn.
const PREFILTER = new RegExp(
  'hình\\s*chiếu|chân\\s+(?:của\\s+)?' +
    DUONG_KW +
    '\\s+(?:cao|vuông\\s*góc)|' +
    DUONG_KW +
    '\\s*cao|⊥|vuông\\s*góc',
  'u',
);
// EN prefilter (issue #46 group B). runRules prefilter theo `patterns` (BỎ QUA
// field `languages`) → BẮT BUỘC có 1 EN regex thì match() mới chạy cho đề EN
// thuần. Rộng nhưng match() chỉ emit khi core khớp thật → an toàn.
const PREFILTER_EN = /projection|perpendicular|foot\s+of/i;

// onLine token: tên đường 1 ký tự HOA HOẶC cặp đỉnh 2 ký tự HOA (vd 'BC'). Chấp
// nhận tiền tố "đường thẳng" / "cạnh" / "đoạn" trước token.
const LINE = '(?:' + DUONG_KW + '\\s*thẳng\\s+|cạnh\\s+|đoạn\\s+)?([A-Z]{1,2})(?![A-Z])';
const PREP = '(?:trên|lên|xuống|đến|tới)';

// "hình chiếu (vuông góc)? (của)? (điểm)? X PREP [cạnh|đường thẳng] LINE"
const PROJ_CORE = `hình\\s*chiếu\\s+(?:vuông\\s*góc\\s+)?(?:của\\s+)?(?:điểm\\s+)?([A-Z])\\s+${PREP}\\s+${LINE}`;
// "chân đường (vuông góc|cao) (hạ|kẻ|vẽ|dựng)? (từ)? (điểm)? X PREP LINE"
const FOOT_CORE = `chân\\s+(?:của\\s+)?${DUONG_KW}\\s+(?:vuông\\s*góc|cao)\\s*(?:hạ\\s+|kẻ\\s+|vẽ\\s+|dựng\\s+)?(?:từ\\s+)?(?:điểm\\s+)?([A-Z])\\s+${PREP}\\s+${LINE}`;

// Phân phối "X, Y lần lượt là <core của FROM1 ... LINE1> và (của|từ)? FROM2 PREP LINE2".
//   groups: 1=name1 2=name2 | PROJ: 3=from1 4=line1 | FOOT: 5=from1 6=line1 | tail: 7=from2 8=line2
const LANLUOT = new RegExp(
  `([A-Z])(?:[′'])?\\s*,\\s*([A-Z])(?:[′'])?\\s+lần\\s+lượt\\s+là\\s+(?:${PROJ_CORE}|${FOOT_CORE})\\s+và\\s+(?:của\\s+|từ\\s+)?([A-Z])\\s+${PREP}\\s+${LINE}`,
  'gu',
);

// Một foot đơn (projection hoặc chân đường).
//   groups: PROJ 1=from 2=line | FOOT 3=from 4=line
const SINGLE = new RegExp(`(?:${PROJ_CORE})|(?:${FOOT_CORE})`, 'gu');

// Distributive SHARED-FROM: "X, Y, Z lần lượt là hình chiếu (vuông góc)? của D
// trên BC, CA, AB" → zip tên↔cạnh, MỘT `from` (D) chung. KHÁC LANLUOT (2 chân,
// mỗi chân from riêng, nối "và"): ở đây 1 from + DANH SÁCH cạnh ngăn phẩy (≥2).
// Số tên PHẢI bằng số cạnh (else bỏ → escalate, không đoán lệch).
//   groups: 1=names blob (≥2, phẩy) | 2=from | 3=lines blob (≥2, phẩy)
const NAMES_BLOB = "((?:[A-Z](?:['′]?)\\s*,\\s*)+[A-Z](?:['′]?))";
const LINES_BLOB = '((?:[A-Z]{1,2}\\s*,\\s*)+[A-Z]{1,2})(?!\\p{L})';
// Tiền tố trước DANH SÁCH cạnh: "(các)? (đường thẳng|cạnh|đoạn)?".
const LINES_PREFIX = '(?:các\\s+)?(?:đường\\s*thẳng\\s+|cạnh\\s+|đoạn\\s+)?';
// "lần lượt" optional → bắt cả "X, Y là các hình chiếu của F trên L1, L2".
const DISTRIB_PROJ = new RegExp(
  NAMES_BLOB +
    '\\s+(?:lần\\s*lượt\\s+)?(?:là\\s+)?(?:các\\s+)?hình\\s*chiếu\\s+(?:vuông\\s*góc\\s+)?(?:của\\s+)?(?:điểm\\s+)?([A-Z])(?!\\p{L})' +
    '\\s+(?:trên|lên|xuống|đến)\\s+' +
    LINES_PREFIX +
    LINES_BLOB,
  'gu',
);
const DISTRIB_FOOT = new RegExp(
  NAMES_BLOB +
    '\\s+(?:lần\\s*lượt\\s+)?(?:là\\s+)?(?:các\\s+)?chân\\s+(?:của\\s+)?đường\\s+(?:vuông\\s*góc|cao)\\s*(?:hạ\\s+|kẻ\\s+|vẽ\\s+|dựng\\s+)?(?:từ\\s+)?(?:điểm\\s+)?([A-Z])(?!\\p{L})' +
    '\\s+(?:đến|xuống|trên|tới)\\s+' +
    LINES_PREFIX +
    LINES_BLOB,
  'gu',
);

// "từ M kẻ MP, MQ vuông góc với các cạnh AB, AC" → P=foot(M,AB), Q=foot(M,AC).
// Cặp MP/MQ phải cùng chữ đầu với điểm from. Số pair/line cố định 2 vì đây là
// dạng đề lớp 9 phổ biến; zip nhiều hơn đã có DISTRIB_PROJ/FOOT theo tên điểm.
const FROM_DRAW_DISTRIB = new RegExp(
  'từ\\s+([A-Z])(?!\\p{L})\\s+kẻ\\s+([A-Z]{2})\\s*,\\s*([A-Z]{2})\\s+vuông\\s*góc\\s+với\\s+các\\s+cạnh\\s+([A-Z]{2})\\s*,\\s*([A-Z]{2})(?![A-Z])',
  'gu',
);

/** Tách blob tên distributive "X, Y, Z" → ['X','Y','Z'] (chuẩn hoá prime ′→'). */
function splitNames(blob: string): string[] {
  return blob
    .split(',')
    .map((s) => {
      const mm = /^([A-Z])(['′]?)/u.exec(s.trim());
      return mm ? (mm[2] ? `${mm[1]}'` : mm[1]) : '';
    })
    .filter(Boolean);
}

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

// "hai đường cao BE, CF cắt nhau tại H" / "Các đường cao AD, BE, CF của tam
// giác ABC cắt nhau tại H". Mỗi token XY: X là đỉnh, Y là chân đường cao; cạnh
// đối diện X được suy từ tam giác bind được. Nếu có "cắt nhau tại H" thì H là
// trực tâm. Chỉ nhận 2-3 đường cao để tránh vơ một đoạn rời.
// Separator giữa các token đường cao: dấu phẩy HOẶC "và" ("BD và CE", "AD, BE,
// CF"). parseAltitudeBundle split theo cùng pattern.
const ALTITUDE_BUNDLE = new RegExp(
  `(?:hai\\s+|ba\\s+|các\\s+)?${DUONG_KW}\\s+cao\\s+((?:[A-Z]{2}\\s*(?:,|và)\\s*){0,2}[A-Z]{2})(?![A-Z])(?:\\s+của\\s+tam\\s*giác\\s+([A-Z])([A-Z])([A-Z])(?![A-Z]))?[^.]{0,60}?cắt\\s+nhau\\s+tại\\s+([A-Z])`,
  'gu',
);
const TRI_G = /tam\s*giác\s+(?:(?:nhọn|cân|đều|vuông|tù)\s+)?([A-Z])([A-Z])([A-Z])(?![A-Z])/gu;

// "BE, CF là (hai)? đường cao" — token đường cao ĐỨNG TRƯỚC "là … đường cao"
// (KHÁC ALTITUDE_BUNDLE: token sau "đường cao"). Mỗi token XY: X=đỉnh, Y=chân
// trên cạnh đối X (suy từ tam giác). KHÔNG cần "cắt nhau tại H".
const ALTITUDE_BEFORE = new RegExp(
  `((?:[A-Z]{2}\\s*,\\s*)+[A-Z]{2})(?![A-Z])\\s+là\\s+(?:hai\\s+|ba\\s+)?${DUONG_KW}\\s+cao(?!\\s*[A-Z])`,
  'gu',
);

// Tên foot ĐỨNG TRƯỚC core qua "Let X be the …" / "X is the …".
//   "Let H be the projection …" | "K is the orthogonal projection …"
const NAME_BEFORE_EN = /([A-Z])(?:[′'])?\s+(?:be|is)\s+(?:the\s+)?$/u;

interface Foot {
  name: string;
  from: string;
  onLine: string;
  /** Emit thêm connect(from, foot) — đoạn vuông góc từ điểm tới chân. Dùng cho:
   *  Form C (EN draw "Draw AH ⊥ BC") + distributive VN "X,Y,Z hình chiếu của D…"
   *  (thể hiện hình chiếu DX/DY/DZ). Foot đơn VN KHÔNG set → byte-identical. */
  withSegment?: boolean;
}

function trianglesIn(text: string): string[][] {
  const out: string[][] = [];
  TRI_G.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = TRI_G.exec(text)) !== null) out.push([m[1], m[2], m[3]]);
  return out;
}

function uniqueTriangle(problem: string): string[] | undefined {
  const all = trianglesIn(problem);
  const distinct = new Map(all.map((t) => [t.join(''), t]));
  return distinct.size === 1 ? [...distinct.values()][0] : undefined;
}

function oppositeSide(vertex: string, tri: readonly string[]): string | undefined {
  if (!tri.includes(vertex)) return undefined;
  return tri.filter((p) => p !== vertex).join('');
}

function parseAltitudeBundle(text: string, fallbackTri: string[] | undefined): Foot[] {
  const out: Foot[] = [];
  ALTITUDE_BUNDLE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = ALTITUDE_BUNDLE.exec(text)) !== null) {
    const localTri = m[2] && m[3] && m[4] ? [m[2], m[3], m[4]] : fallbackTri;
    if (!localTri) continue;
    const tokens = m[1]
      .split(/,|và/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (tokens.length < 2 || tokens.length > 3) continue;
    let ok = true;
    const local: Foot[] = [];
    for (const token of tokens) {
      const from = token[0];
      const name = token[1];
      const onLine = oppositeSide(from, localTri);
      if (!onLine || localTri.includes(name)) {
        ok = false;
        break;
      }
      local.push({ name, from, onLine, withSegment: true });
    }
    if (ok) out.push(...local, { name: m[5], from: '', onLine: localTri.join('') });
  }
  return out;
}

/** Parse mọi foot trong 1 clause. Trả [] nếu không bind được tên / bị skip. */
function parseFeet(text: string, fallbackTri?: string[]): Foot[] {
  const out: Foot[] = [];
  const consumed: Array<[number, number]> = [];

  // -1) Bundle đường cao đề thi. Orthocenter được encode tạm bằng Foot sentinel
  // name=H/from='' để flatMap bên dưới emit addPoint orthocenter đúng thứ tự.
  const bundled = parseAltitudeBundle(text, fallbackTri);
  if (bundled.length > 0) return bundled;

  // -0.5) "BE, CF là (hai) đường cao" — token TRƯỚC, không cần "cắt nhau tại H".
  ALTITUDE_BEFORE.lastIndex = 0;
  for (const m of text.matchAll(ALTITUDE_BEFORE)) {
    if (!fallbackTri) continue;
    const tokens = m[1].split(',').map((s) => s.trim()).filter(Boolean);
    let ok = true;
    const local: Foot[] = [];
    for (const token of tokens) {
      const from = token[0];
      const name = token[1];
      const onLine = oppositeSide(from, fallbackTri);
      if (!onLine || fallbackTri.includes(name)) { ok = false; break; }
      local.push({ name, from, onLine, withSegment: true });
    }
    if (ok && local.length > 0) return local;
  }

  // 0) Distributive SHARED-FROM: "X, Y, Z lần lượt là hình chiếu/chân vuông góc
  //    của D trên BC, CA, AB" → zip tên↔cạnh (from D chung). Span đã khớp →
  //    consumed để SINGLE không xử lại. Zip lệch (số tên ≠ số cạnh) → bỏ.
  for (const re of [DISTRIB_PROJ, DISTRIB_FOOT]) {
    re.lastIndex = 0;
    for (const dm of text.matchAll(re)) {
      const names = splitNames(dm[1]);
      const from = dm[2];
      const lines = dm[3].split(',').map((s) => s.trim()).filter(Boolean);
      if (names.length < 2 || names.length !== lines.length) continue; // zip lệch → escalate
      // withSegment: vẽ kèm đoạn vuông góc from→foot (DX/DY/DZ) để THỂ HIỆN hình
      // chiếu (render perpFoot chỉ tạo điểm chân, không tự vẽ đường rớt vuông góc).
      names.forEach((name, i) => out.push({ name, from, onLine: lines[i], withSegment: true }));
      consumed.push([dm.index ?? 0, (dm.index ?? 0) + dm[0].length]);
    }
  }

  FROM_DRAW_DISTRIB.lastIndex = 0;
  for (const fm of text.matchAll(FROM_DRAW_DISTRIB)) {
    const from = fm[1];
    const pair1 = fm[2];
    const pair2 = fm[3];
    if (pair1[0] !== from || pair2[0] !== from) continue;
    const foot1 = pair1[1];
    const foot2 = pair2[1];
    const line1 = fm[4];
    const line2 = fm[5];
    if (line1.includes(foot1) || line2.includes(foot2) || foot1 === foot2) continue;
    out.push({ name: foot1, from, onLine: line1, withSegment: true });
    out.push({ name: foot2, from, onLine: line2, withSegment: true });
    consumed.push([fm.index ?? 0, (fm.index ?? 0) + fm[0].length]);
  }

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
    const fallbackTri = uniqueTriangle(ctx.problem);
    for (const c of ctx.clauses) {
      const feet = parseFeet(c.text, fallbackTri);
      if (feet.length === 0) continue;
      // Foot add-point TRƯỚC; với EN draw form (withSegment) push THÊM connect
      // NGAY SAU add-point của foot đó (H phải tồn tại trước khi connect tham
      // chiếu). VN feet không set withSegment → byte-identical.
      const intents = feet.flatMap((f) => {
        if (f.from === '') return [addPoint(f.name, { kind: 'orthocenter', of: f.onLine.split('') })];
        const add = addPoint(f.name, { kind: 'perpFoot', from: f.from, onLine: f.onLine });
        return f.withSegment ? [add, connect(f.from, f.name, 'segment')] : [add];
      });
      out.push({ ruleId: 'perpFoot', clauseIds: [c.id], intents });
    }
    return out;
  },
};
