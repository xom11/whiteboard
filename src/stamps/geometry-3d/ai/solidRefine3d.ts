// solidRefine3d — đọc các điều kiện đề đặt lên KHỐI (đáy vuông tại B, SA ⊥ (ABC), hình chiếu
// của S là trọng tâm tam giác ABD, (SAB) ⊥ đáy + SAB đều, lăng trụ đứng/đều, chiếu của A' là
// trung điểm BC, OA/OB/OC đôi một ⊥, tứ diện đều, lập phương …) → `SolidRefine` để layout3d
// dựng toạ độ ĐÚNG các điều kiện đó ("thà thiếu còn hơn sai": trước đây đáy "vuông tại B" vẽ
// bằng tam giác thường, "SA ⊥ (ABC)" không có chữ "đáy" thì S đặt trên tâm …).
//
// Hàm THUẦN (text → dữ liệu). Không có điều kiện nào ⇒ trả undefined ⇒ layout y như cũ.
// `consumed` = các đoạn văn bản đã được hình tôn trọng — rule `solidFacts3d` dùng để claim mệnh đề.

/** Điểm trong mặt đáy, biểu diễn qua đỉnh đáy (tính ở layout, hệ toạ độ 2D của đáy). */
export type PSpec =
  | string
  | { mid: [PSpec, PSpec] }
  | { cen: PSpec[] }
  | { at: [PSpec, PSpec, number] }               // P1 + t·(P2 − P1)
  | { meet: [PSpec, PSpec, PSpec, PSpec] }       // giao 2 đường (P1P2) ∩ (P3P4)
  | { circ: PSpec[] }                             // tâm đường tròn qua ≥3 điểm
  | { perpBis: [PSpec, PSpec] };                 // hình chiếu TÂM ĐÁY lên trung trực đoạn

export type BaseShape =
  | { kind: 'right-tri'; at: string; iso?: boolean }
  | { kind: 'iso-tri'; at: string }
  | { kind: 'equi-tri' }
  | { kind: 'square' }
  | { kind: 'right-trap'; at: [string, string] }   // 2 đỉnh KỀ vuông, đáy lớn ở đỉnh đầu
  | { kind: 'trap'; long: [string, string] }       // cạnh đáy lớn (∥ cạnh đối)
  | { kind: 'half-hex'; long: [string, string] }   // nửa lục giác đều, đáy lớn = đường kính
  | { kind: 'rhombus'; angleAt0: number }          // góc tại đỉnh đầu (độ)
  | { kind: 'general-quad' };                      // tứ giác lồi KHÔNG có cặp cạnh ∥ (AB ∩ CD, AD ∩ BC có thật)

export type HeightRule =
  | { kind: 'tri'; x: string; y: string; prop: 'equi' | 'riso-apex' | 'right-apex' | 'riso-x' }
  | { kind: 'reg-tetra' }
  | { kind: 'corner' }
  | { kind: 'cube' };

export interface SolidRefine {
  baseShape?: BaseShape;
  apexFoot?: PSpec;
  height?: HeightRule;
  /** Lăng trụ xiên: hình chiếu của đỉnh trên `vertex` (nhãn đỉnh-trên) xuống đáy là `foot`. */
  topFoot?: { vertex: string; foot: PSpec };
  /** Tứ diện: đổi vai đỉnh/đáy (vd "AB ⊥ (BCD)" ⇒ đỉnh A, đáy BCD). */
  reorder?: { apex: string; base: string[] };
}

export interface RefineResult { refine?: SolidRefine; consumed: string[] }

export interface SolidHeadInfo {
  flavor: 'pyramid' | 'tetrahedron' | 'prism' | 'box';
  base: string[];
  apex?: string;
  top?: string[];
}

const L1 = "[A-Z](?:['′’])?";
const norm = (s: string) => s.replace(/[′’´]/gu, "'");
const labelsOf = (s: string) => (s.match(new RegExp(L1, 'gu')) ?? []).map(norm);

// "(ABCD)" | "đáy" | "mặt đáy" | "mặt phẳng đáy" | "mặt phẳng ABCD" | "(ABC)" — trả nhãn hoặc 'đáy'.
const PLANE = `(?:mặt\\s*phẳng\\s*|mp\\s*)?(?:\\(((?:${L1}){3,})\\)|(?:mặt\\s+)?(đáy)(?:\\s*\\(?[A-Z]{3,}\\)?)?|((?:${L1}){3,})(?![\\p{L}']))`;

function isBasePlane(tok: string | undefined, day: string | undefined, bare: string | undefined, base: string[]): boolean {
  if (day) return true;
  const L = labelsOf(tok ?? bare ?? '');
  if (L.length < 3) return false;
  // ≥ 3 nhãn thuộc đáy (dung nạp lỗi gõ "(ABCD)" cho chóp S.ABC — 3 điểm vẫn xác định đúng mặt đáy)
  return L.filter((x) => base.includes(x)).length >= 3 && !L.some((x) => !base.includes(x) && L.length === 3);
}

// ───── mô tả điểm → PSpec ─────

interface Ctx { problem: string; base: string[]; depth: number }

function defOfLabel(X: string, ctx: Ctx): PSpec | null {
  if (ctx.base.includes(X)) return X;
  if (ctx.depth > 4) return null;
  const c: Ctx = { ...ctx, depth: ctx.depth + 1 };
  const p = ctx.problem;
  const x = X.replace(/'/gu, "['′’]");
  const tries: RegExp[] = [
    new RegExp(`(?<![\\p{L}])${x}\\s+là\\s+((?:trung\\s+điểm|trọng\\s+tâm|giao\\s+điểm|tâm)[^.;]{0,60})`, 'u'),
    new RegExp(`((?:trung\\s+điểm|trọng\\s+tâm|giao\\s+điểm)\\s+${x}\\s+[^.;]{0,50})`, 'u'),
  ];
  for (const re of tries) {
    const m = re.exec(p);
    if (m) {
      const r = descToSpec(m[1].replace(new RegExp(`^((?:trung\\s+điểm|trọng\\s+tâm|giao\\s+điểm))\\s+${x}\\s+`, 'u'), '$1 '), c);
      if (r) return r;
    }
  }
  // "AC ∩ BD = O" | "O = AC ∩ BD"
  let m = new RegExp(`([A-Z])([A-Z])\\s*∩\\s*([A-Z])([A-Z])\\s*=\\s*${x}(?![\\p{L}'])`, 'u').exec(p)
    ?? new RegExp(`(?<![\\p{L}])${x}\\s*=\\s*([A-Z])([A-Z])\\s*∩\\s*([A-Z])([A-Z])`, 'u').exec(p);
  if (m) {
    const s = [m[1], m[2], m[3], m[4]].map((y) => defOfLabel(y, c));
    if (s.every(Boolean)) return { meet: s as [PSpec, PSpec, PSpec, PSpec] };
  }
  // "(hai đường thẳng)? AC và BD cắt nhau tại O"
  m = new RegExp(`([A-Z])([A-Z])\\s+và\\s+([A-Z])([A-Z])\\s+cắt\\s+nhau\\s+tại\\s+(?:điểm\\s+)?${x}(?![\\p{L}'])`, 'u').exec(p);
  if (m) {
    const s4 = [m[1], m[2], m[3], m[4]].map((y) => defOfLabel(y, c));
    if (s4.every(Boolean)) return { meet: s4 as [PSpec, PSpec, PSpec, PSpec] };
  }
  // "hình vuông/chữ nhật/thoi/bình hành (ABCD)? tâm O" | "đáy … tâm O"
  m = new RegExp(`(?:hình\\s+(?:vuông|chữ\\s+nhật|thoi|bình\\s+hành)|đáy)[^.;]{0,40}?(?:có\\s+)?tâm\\s+(?:là\\s+)?${x}(?![\\p{L}'])`, 'u').exec(p);
  if (m && ctx.base.length === 4) return { mid: [ctx.base[0], ctx.base[2]] };
  // "X thuộc/∈/trên (cạnh) YZ sao cho XY = kXZ"
  m = new RegExp(`(?<![\\p{L}])${x}\\s*(?:thuộc|∈|trên|nằm\\s+trên)\\s*(?:cạnh\\s+|đoạn\\s+)?([A-Z])([A-Z])(?![A-Z])\\s*(?:sao\\s+cho|thỏa\\s+mãn|với)?\\s*([A-Z])([A-Z])\\s*=\\s*(\\d+)\\s*([A-Z])([A-Z])(?![A-Z])`, 'u').exec(p);
  if (m) return ratioSpec(X, m[1], m[2], [m[3], m[4]], Number(m[5]), [m[6], m[7]], c);
  return null;
}

function ratioSpec(X: string, a: string, b: string, lhs: string[], k: number, rhs: string[], c: Ctx): PSpec | null {
  if (!lhs.includes(X) || !rhs.includes(X) || !(k > 0)) return null;
  const P1 = lhs.find((y) => y !== X)!, P2 = rhs.find((y) => y !== X)!;
  if (![a, b].includes(P1) || ![a, b].includes(P2) || P1 === P2) return null;
  const s1 = defOfLabel(P1, c), s2 = defOfLabel(P2, c);
  if (!s1 || !s2) return null;
  // |XP1| = k|XP2| ⇒ X = P1 + k/(k+1)·(P2 − P1)
  return { at: [s1, s2, k / (k + 1)] };
}

/** "trung điểm (H)? (của)? (cạnh)? AB" | "trọng tâm … tam giác ABD" | "giao điểm của AC và BD" | "tâm (của) đáy" | "điểm H" | "H". */
export function descToSpec(desc: string, ctx: Ctx): PSpec | null {
  const d = desc.trim().replace(/^(?:với|là|chính\s+là)\s+/u, '');
  const c: Ctx = { ...ctx, depth: ctx.depth + 1 };
  if (ctx.depth > 5) return null;
  let m = new RegExp(`^(?:điểm\\s+)?trung\\s+điểm\\s+(?:${L1}\\s+)?(?:của\\s+)?(?:cạnh\\s+|đoạn\\s+(?:thẳng\\s+)?)?(${L1})(${L1})(?![A-Z'′’])`, 'u').exec(d);
  if (m) {
    const a = defOfLabel(norm(m[1]), c), b = defOfLabel(norm(m[2]), c);
    return a && b ? { mid: [a, b] } : null;
  }
  m = /^(?:điểm\s+)?trọng\s+tâm\s+(?:[A-Z]\s+)?(?:của\s+)?(?:tam\s+giác\s+|∆\s*|Δ\s*)?(?:đều\s+)?([A-Z])([A-Z])([A-Z])(?![A-Z])/u.exec(d);
  if (m) {
    const s = [m[1], m[2], m[3]].map((y) => defOfLabel(y, c));
    return s.every(Boolean) ? { cen: s as PSpec[] } : null;
  }
  m = /^(?:điểm\s+)?giao\s+điểm\s+(?:[A-Z]\s+)?(?:của\s+)?(?:hai\s+đường\s+chéo\s+)?([A-Z])([A-Z])\s+(?:và|với)\s+([A-Z])([A-Z])(?![A-Z])/u.exec(d);
  if (m) {
    const s = [m[1], m[2], m[3], m[4]].map((y) => defOfLabel(y, c));
    return s.every(Boolean) ? { meet: s as [PSpec, PSpec, PSpec, PSpec] } : null;
  }
  m = /^(?:điểm\s+)?tâm\s+(?:[A-Z]\s+)?(?:của\s+)?(?:mặt\s+)?(?:đáy|hình\s+(?:vuông|chữ\s+nhật|thoi|bình\s+hành))/u.exec(d);
  if (m && ctx.base.length === 4) return { mid: [ctx.base[0], ctx.base[2]] };
  m = /^(?:điểm\s+)?tâm\s+(?:[A-Z]\s+)?(?:của\s+)?đường\s+tròn\s+ngoại\s+tiếp\s+(?:tam\s+giác\s+)?([A-Z])([A-Z])([A-Z])(?![A-Z])/u.exec(d);
  if (m) {
    const s = [m[1], m[2], m[3]].map((y) => defOfLabel(y, c));
    return s.every(Boolean) ? { circ: s as PSpec[] } : null;
  }
  // "điểm H thuộc cạnh AB sao cho HB = 2HA"
  m = new RegExp(`^(?:điểm\\s+)?(${L1})\\s*(?:thuộc|∈|trên|nằm\\s+trên)\\s*(?:cạnh\\s+|đoạn\\s+)?([A-Z])([A-Z])(?![A-Z])\\s*(?:sao\\s+cho|thỏa\\s+mãn|với)?\\s*([A-Z])([A-Z])\\s*=\\s*(\\d+)\\s*([A-Z])([A-Z])(?![A-Z])`, 'u').exec(d);
  if (m) return ratioSpec(norm(m[1]), m[2], m[3], [m[4], m[5]], Number(m[6]), [m[7], m[8]], c);
  m = new RegExp(`^(?:điểm\\s+)?(${L1})(?![\\p{L}A-Z'′’])`, 'u').exec(d);
  if (m) return defOfLabel(norm(m[1]), c);
  return null;
}

// ───── đáy ─────

function baseDesc(problem: string, base: string[]): string | null {
  const B = base.join('');
  // "đáy (ABCD)? (là)? <mô tả>" | "(có)? ABCD là <mô tả>" | "tam giác ABC <mô tả>" (n=3)
  const res = [
    new RegExp(`đáy\\s*(?:\\(?${B}\\)?\\s*)?(?:là\\s+)?((?:một\\s+)?(?:hình|tam\\s+giác|nửa\\s+lục\\s+giác)[^.;]*)`, 'u'),
    new RegExp(`(?<![A-Z])${B}(?![A-Z'′])\\s+là\\s+((?:một\\s+)?(?:hình|tam\\s+giác|nửa\\s+lục\\s+giác)[^.;]*)`, 'u'),
    new RegExp(`(?:[Tt]am\\s+giác|∆|Δ)\\s*${B}(?![A-Z'′])\\s*((?:là\\s+tam\\s+giác\\s+)?(?:vuông|cân|đều)[^.;]*)`, 'u'),
  ];
  for (const re of res) {
    const m = re.exec(problem);
    if (m) {
      // cắt ở mệnh đề mới (", SA …", ", cạnh bên …", ", tam giác SAB …")
      return m[1].split(/,\s*(?=[A-Z]{2}\s*(?:⊥|vuông|=|\()|(?:cạnh\s+bên|hình\s+chiếu|mặt\s+bên|mặt\s+phẳng|hai\s+mặt|tam\s+giác\s+[A-Z]{3}|Gọi|gọi|biết|Biết|đường\s+thẳng|đường\s+cao|góc))/u)[0]
        .split(/\s+(?:và|,)\s+(?=(?:cạnh\s+bên|tam\s+giác\s+[A-Z]{3}|mặt\s+bên|hình\s+chiếu|[A-Z]{2}\s*(?:⊥|vuông)))/u)[0];
    }
  }
  return null;
}

function parseBaseShape(problem: string, head: SolidHeadInfo, regular: boolean): BaseShape | undefined {
  const B = head.base;
  const n = B.length;
  if (regular) return n === 3 ? { kind: 'equi-tri' } : n === 4 ? { kind: 'square' } : undefined;
  const d = baseDesc(problem, B);
  if (!d) return undefined;
  if (n === 3) {
    let m = /vuông\s+cân\s+(?:tại|ở)\s+([A-Z])(?![A-Z'])/u.exec(d);
    if (m && B.includes(m[1])) return { kind: 'right-tri', at: m[1], iso: true };
    m = /vuông\s+(?:tại|ở)\s+([A-Z])(?![A-Z'])/u.exec(d);
    if (m && B.includes(m[1])) return { kind: 'right-tri', at: m[1] };
    m = /cân\s+(?:tại|ở)\s+([A-Z])(?![A-Z'])/u.exec(d);
    if (m && B.includes(m[1])) return { kind: 'iso-tri', at: m[1] };
    if (/đều/u.test(d)) return { kind: 'equi-tri' };
    return undefined;
  }
  if (n !== 4) return undefined;
  let m = /hình\s+thang\s+vuông\s+(?:tại|ở)\s+([A-Z])\s*(?:và|,)\s*([A-Z])(?![A-Z'])/u.exec(d);
  if (m && B.includes(m[1]) && B.includes(m[2])) {
    const i = B.indexOf(m[1]), j = B.indexOf(m[2]);
    // 2 đỉnh phải KỀ nhau; sắp theo thứ tự vòng (X, Y=X+1)
    let x: string, y: string;
    if ((i + 1) % 4 === j) { x = m[1]; y = m[2]; } else if ((j + 1) % 4 === i) { x = m[2]; y = m[1]; } else return undefined;
    return { kind: 'right-trap', at: [x, y] };
  }
  if (/nửa\s+lục\s+giác\s+đều/u.test(d) || /nửa\s+lục\s+giác\s+đều/u.test(problem)) {
    const lm = /(?:đường\s+kính|đáy\s+lớn)\s+([A-Z])([A-Z])(?![A-Z])/u.exec(problem)
      ?? /(?<![A-Z])([A-Z])([A-Z])\s*=\s*2\s*a(?![\p{L}\d])/u.exec(problem);
    const long = lm && B.includes(lm[1]) && B.includes(lm[2]) ? [lm[1], lm[2]] as [string, string] : [B[0], B[3]] as [string, string];
    if (!adjacent(B, long)) return undefined;
    return { kind: 'half-hex', long };
  }
  if (/hình\s+thang/u.test(d)) {
    const pm = /([A-Z])([A-Z])\s*(?:\/\/|∥|song\s+song(?:\s+với)?)\s*([A-Z])([A-Z])(?![A-Z])/u.exec(problem);
    const lm = /đáy\s+lớn\s+(?:là\s+)?([A-Z])([A-Z])(?![A-Z])/u.exec(problem)
      ?? /(?:các\s+)?cạnh\s+đáy\s+(?:là\s+)?([A-Z])([A-Z])\s*(?:và|,)\s*[A-Z]{2}/u.exec(problem);
    let long: [string, string] | null = null;
    if (lm && B.includes(lm[1]) && B.includes(lm[2])) long = [lm[1], lm[2]];
    else if (pm && [pm[1], pm[2], pm[3], pm[4]].every((x) => B.includes(x))) {
      // "AD // BC, AD = 2BC" → AD dài; "BC = 2AD"?? hiếm → cạnh nêu trước là đáy lớn
      const k2 = new RegExp(`${pm[3]}${pm[4]}\\s*=\\s*2\\s*\\.?\\s*${pm[1]}${pm[2]}`, 'u').test(problem);
      long = k2 ? [pm[3], pm[4]] : [pm[1], pm[2]];
    }
    if (long && adjacent(B, long)) return { kind: 'trap', long };
    return undefined;
  }
  if (/hình\s+thoi/u.test(d)) {
    const ang = rhombusAngle(problem, B);
    return ang ? { kind: 'rhombus', angleAt0: ang } : undefined;
  }
  return undefined;
}

function adjacent(B: string[], e: [string, string]): boolean {
  const i = B.indexOf(e[0]), j = B.indexOf(e[1]);
  return i >= 0 && j >= 0 && ((i + 1) % B.length === j || (j + 1) % B.length === i);
}

function rhombusAngle(problem: string, B: string[]): number | null {
  const [A, Bv, C, D] = B;
  const deg = (s: string) => Number(s.replace(',', '.'));
  // "góc BAD = 120°" | "BAD = 60°" | "B AD=120°"
  let m = new RegExp(`(?:góc\\s+)?(?:${Bv}\\s*${A}\\s*${D}|${D}\\s*${A}\\s*${Bv})\\s*=\\s*(\\d+(?:[.,]\\d+)?)\\s*(?:°|◦|o|độ|0)`, 'u').exec(problem);
  if (m) return deg(m[1]);
  m = new RegExp(`(?:góc\\s+)?(?:${A}\\s*${Bv}\\s*${C}|${C}\\s*${Bv}\\s*${A})\\s*=\\s*(\\d+(?:[.,]\\d+)?)\\s*(?:°|◦|o|độ|0)`, 'u').exec(problem);
  if (m) return 180 - deg(m[1]);
  if (new RegExp(`(?:[Tt]am\\s+giác|∆|Δ)\\s*(?:${A}${Bv}${C}|${A}${C}${Bv}|${Bv}${A}${C})\\s+(?:là\\s+tam\\s+giác\\s+)?đều`, 'u').test(problem)) return 120;
  if (new RegExp(`(?:[Tt]am\\s+giác|∆|Δ)\\s*(?:${A}${Bv}${D}|${A}${D}${Bv}|${Bv}${A}${D})\\s+(?:là\\s+tam\\s+giác\\s+)?đều`, 'u').test(problem)) return 60;
  return null;
}

// ───── đỉnh ─────

function triProps(problem: string, S: string, x: string, y: string): { prop: string; at?: string; text: string } | null {
  const perms = [`${S}${x}${y}`, `${S}${y}${x}`, `${x}${S}${y}`, `${y}${S}${x}`, `${x}${y}${S}`, `${y}${x}${S}`];
  const re = new RegExp(`(?:[Tt]am\\s+giác|[Mm]ặt\\s+bên|∆|Δ)\\s*\\(?(?:${perms.join('|')})\\)?(?![A-Z'])\\s*(?:là\\s+(?:một\\s+)?(?:tam\\s+giác\\s+)?)?(vuông\\s+cân|vuông|cân|đều)(?:\\s+(?:tại|ở|đỉnh)\\s+([A-Z])(?![A-Z']))?`, 'u');
  const m = re.exec(problem);
  if (!m) return null;
  return { prop: m[1], at: m[2], text: m[0] };
}

function faceFoot(problem: string, S: string, x: string, y: string, base: string[]): { foot: PSpec; height?: HeightRule } {
  const t = triProps(problem, S, x, y);
  if (t) {
    if (t.prop === 'đều') return { foot: { mid: [x, y] }, height: { kind: 'tri', x, y, prop: 'equi' } };
    if (t.prop === 'cân' && t.at === S) return { foot: { mid: [x, y] } };
    if (t.prop === 'vuông cân' && t.at === S) return { foot: { mid: [x, y] }, height: { kind: 'tri', x, y, prop: 'riso-apex' } };
    if (t.prop === 'vuông' && t.at === S) return { foot: { at: [x, y, 1 / 3] }, height: { kind: 'tri', x, y, prop: 'right-apex' } };
    if ((t.prop === 'vuông' || t.prop === 'vuông cân') && (t.at === x || t.at === y)) {
      const other = t.at === x ? y : x;
      return t.prop === 'vuông cân'
        ? { foot: t.at!, height: { kind: 'tri', x: t.at!, y: other, prop: 'riso-x' } }
        : { foot: t.at! };
    }
  }
  void base;
  return { foot: { mid: [x, y] } };
}

export function refineSolid(problemRaw: string, head: SolidHeadInfo): RefineResult {
  const problem = problemRaw.replace(/\s+/gu, ' ');
  const consumed: string[] = [];
  const r: SolidRefine = {};
  let base = head.base.map(norm);
  let S = head.apex ? norm(head.apex) : undefined;
  const isPyr = head.flavor === 'pyramid' || head.flavor === 'tetrahedron';

  // Tứ diện: "XY ⊥ (PQR)" với X ∉ mặt ⇒ X là đỉnh, PQR là đáy.
  if (head.flavor === 'tetrahedron' && S) {
    const all = [...base, S];
    const re = new RegExp(`(?<![(\\p{L}'])([A-Z])([A-Z])\\s*(?:⊥|vuông\\s*góc(?:\\s+với)?)\\s*(?:mặt\\s*phẳng\\s*|mp\\s*)?\\(?([A-Z])([A-Z])([A-Z])\\)?(?![A-Z])`, 'u');
    const m = re.exec(problem);
    if (m) {
      const pl = [m[3], m[4], m[5]];
      // cạnh XY: một đầu NGOÀI mặt (đỉnh mới), đầu kia TRONG mặt (chân) — "OA ⊥ (OBC)" hay "AO ⊥ (OBC)"
      const [X, Y] = pl.includes(m[2]) && !pl.includes(m[1]) ? [m[1], m[2]] : [m[2], m[1]];
      if ([X, Y, ...pl].every((z) => all.includes(z)) && new Set(pl).size === 3 && !pl.includes(X) && pl.includes(Y) && X !== S) {
        const nb = all.filter((z) => z !== X);
        r.reorder = { apex: X, base: nb };
        base = nb; S = X;
      }
    }
  }
  const ctx: Ctx = { problem, base, depth: 0 };

  const regularPyr = isPyr && /chóp\s+(?:(?:tứ|tam|lục)\s*giác\s+)?đều|hình\s+chóp\s+đều/u.test(problem);
  const regularPrism = !isPyr && /lăng\s*trụ\s+(?:(?:tam|tứ|lục)\s+giác\s+)?đều/u.test(problem);
  const regTetra = head.flavor === 'tetrahedron' && /tứ\s+diện\s+đều/u.test(problem);
  const cube = head.flavor === 'box' && /lập\s+phương/u.test(problem);

  let shape = parseBaseShape(problem, { ...head, base }, regularPyr || regularPrism || regTetra);
  // Đáy tứ giác KHÔNG nêu hình dạng mà đề cắt 2 cạnh đối (AB ∩ CD, "AD cắt BC tại E", "AB, CD không
  // song song") ⇒ tứ giác thường; template vuông mặc định có AB ∥ CD ⇒ giao điểm không tồn tại.
  if (!shape && base.length === 4 && isPyr && !/đáy[^.;]{0,30}?(?:hình\s+(?:vuông|chữ\s+nhật|bình\s+hành|thoi|thang)|nửa\s+lục)/u.test(problem)) {
    const [A, B, C, D] = base;
    const opp = [[`${A}${B}`, `${C}${D}`], [`${A}${B}`, `${D}${C}`], [`${B}${A}`, `${C}${D}`], [`${A}${D}`, `${B}${C}`], [`${D}${A}`, `${B}${C}`], [`${A}${D}`, `${C}${B}`]];
    const cue = opp.some(([e, f]) => new RegExp(`${e}\\s*(?:∩|cắt|và)\\s*${f}|${f}\\s*(?:∩|cắt)\\s*${e}|${e}\\s*,\\s*${f}\\s+không\\s+song\\s+song`, 'u').test(problem));
    if (cue) shape = { kind: 'general-quad' };
  }
  if (shape) r.baseShape = shape;
  if (regTetra) r.height = { kind: 'reg-tetra' };
  if (cube) { r.baseShape = { kind: 'square' }; r.height = { kind: 'cube' }; }

  // ── đôi một vuông góc ──
  const pw = /((?:[A-Z]{2}\s*,\s*)+[A-Z]{2})\s+(?:(?:là\s+)?(?:ba\s+)?(?:đường\s+thẳng\s+)?)?đôi\s+một\s+vuông\s+góc(?:\s+với\s+nhau)?/u.exec(problem);
  if (pw && S && isPyr) {
    const segs = pw[1].split(/\s*,\s*/u).map((s) => [s[0], s[1]]);
    const all = [...base, S];
    if (segs.every((sg) => sg.every((z) => all.includes(z)))) {
      const apexSegs = segs.filter((sg) => sg.includes(S!));
      if (apexSegs.length >= 3) {
        r.baseShape = { kind: 'equi-tri' }; r.apexFoot = { cen: [...base] }; r.height = { kind: 'corner' };
        consumed.push(pw[0]);
      } else {
        // đỉnh chung của các cạnh đáy ⊥ nhau → góc vuông của đáy
        const baseSegs = segs.filter((sg) => !sg.includes(S!));
        let ok = true;
        for (let i = 0; i < baseSegs.length; i++) for (let j = i + 1; j < baseSegs.length; j++) {
          const common = baseSegs[i].find((z) => baseSegs[j].includes(z));
          if (common && base.length === 3) r.baseShape = { kind: 'right-tri', at: common };
          else ok = false;
        }
        // cạnh bên SX ⊥ ≥ 2 cạnh đáy ⇒ SX ⊥ đáy
        if (apexSegs.length === 1 && baseSegs.length >= 2) {
          const X = apexSegs[0].find((z) => z !== S)!;
          r.apexFoot = X;
        } else if (apexSegs.length === 2 && baseSegs.length === 1) {
          // SA ⊥ SB? hiếm — bỏ
          ok = false;
        } else if (apexSegs.length === 0 && baseSegs.length === 3) {
          ok = false;
        }
        // tứ diện OABC: OA, OB, OC (O ∈ đáy, C là đỉnh)
        if (apexSegs.length === 1 && baseSegs.length === 2) {
          const X = apexSegs[0].find((z) => z !== S)!;
          const common = baseSegs[0].find((z) => baseSegs[1].includes(z));
          if (common === X) r.apexFoot = X;
        }
        if (ok) consumed.push(pw[0]);
      }
    }
  }

  if (isPyr && S && !r.apexFoot && !regTetra) {
    const s = S;
    if (regularPyr) {
      r.apexFoot = { cen: [...base] };
    }
    // SX ⊥ (đáy)
    if (!r.apexFoot) {
      // "SX ⊥ …" hoặc "XS ⊥ …" (tứ diện đổi vai: "OA ⊥ (OBC)" với đỉnh A)
      const re = new RegExp(`(?<![(\\p{L}'])(?:${s}(${L1})|(${L1})${s})(?![A-Z'′’])\\s*(?:⊥|vuông\\s*góc(?:\\s+với)?)\\s*${PLANE}`, 'u');
      const m = re.exec(problem);
      if (m && isBasePlane(m[3], m[4], m[5], base)) {
        const f = defOfLabel(norm(m[1] ?? m[2]), ctx);
        if (f) { r.apexFoot = f; consumed.push(m[0]); }
      }
    }
    // "cạnh bên SB vuông góc với mặt phẳng đáy" đã phủ ở trên; "đường cao SX" | "SX là đường cao"
    if (!r.apexFoot) {
      const m = new RegExp(`đường\\s+cao\\s+${s}(${L1})(?![A-Z'′’])|(?<![\\p{L}])${s}(${L1})\\s+là\\s+đường\\s+cao`, 'u').exec(problem);
      if (m) {
        const f = defOfLabel(norm(m[1] ?? m[2]), ctx);
        if (f) { r.apexFoot = f; consumed.push(m[0]); }
      }
    }
    // hình chiếu (vuông góc) của S lên đáy là/trùng với <mô tả>
    if (!r.apexFoot) {
      const re = new RegExp(`[Hh]ình\\s+chiếu\\s+(?:vuông\\s+góc\\s+)?(?:của\\s+)?(?:đỉnh\\s+|điểm\\s+)?${s}\\s+(?:lên|trên|xuống)\\s+${PLANE}\\s*(?:là|trùng\\s+với|chính\\s+là)\\s+([^.;]{1,80})`, 'u');
      const m = re.exec(problem);
      if (m && isBasePlane(m[1], m[2], m[3], base)) {
        const f = descToSpec(m[4], ctx);
        if (f) { r.apexFoot = f; consumed.push(m[0]); }
      }
    }
    // (SXY) và (SZW) cùng vuông góc với đáy
    if (!r.apexFoot) {
      const re = new RegExp(`\\(?${s}([A-Z])([A-Z])\\)?\\s*(?:,|và)\\s*\\(?${s}([A-Z])([A-Z])\\)?\\s+(?:cùng|đều)\\s+(?:vuông\\s*góc|⊥)(?:\\s+với)?\\s*${PLANE}`, 'u');
      const m = re.exec(problem);
      if (m && isBasePlane(m[5], m[6], m[7], base)) {
        const e1 = [m[1], m[2]], e2 = [m[3], m[4]];
        const common = e1.find((z) => e2.includes(z));
        let f: PSpec | null = null;
        if (common && base.includes(common)) f = common;
        else {
          const sp = [...e1, ...e2].map((z) => defOfLabel(z, ctx));
          if (sp.every(Boolean)) f = { meet: sp as [PSpec, PSpec, PSpec, PSpec] };
        }
        if (f) { r.apexFoot = f; consumed.push(m[0]); }
      }
    }
    // mặt bên ⊥ đáy — gom MỌI mặt nêu ⊥ đáy (có đề viết tách "(SAB) ⊥ (ABCD), (SAD) ⊥ (ABCD)")
    if (!r.apexFoot) {
      const res = [
        new RegExp(`\\(${s}([A-Z])([A-Z])\\)\\s*(?:⊥|vuông\\s*góc(?:\\s+với)?)\\s*${PLANE}`, 'gu'),
        new RegExp(`(?:[Tt]am\\s+giác|[Mm]ặt\\s+bên|mặt\\s+phẳng)\\s*\\(?${s}([A-Z])([A-Z])\\)?(?![A-Z'])(?:(?!(?:[Tt]am\\s+giác|[Mm]ặt\\s+bên)\\s+[A-Z]{3})[^.;]){0,80}?(?:nằm\\s+trong|thuộc|nằm\\s+trên)\\s+(?:một\\s+)?mặt\\s*phẳng\\s+(?:vuông\\s*góc|⊥)(?:\\s+với)?\\s*${PLANE}`, 'gu'),
        new RegExp(`[Mm]ặt\\s+bên\\s*\\(?${s}([A-Z])([A-Z])\\)?(?![A-Z'])(?:(?!(?:[Tt]am\\s+giác|[Mm]ặt\\s+bên)\\s+[A-Z]{3})[^.;]){0,60}?(?:vuông\\s*góc|⊥)(?:\\s+với)?\\s*${PLANE}`, 'gu'),
        new RegExp(`hai\\s+mặt\\s+phẳng\\s*\\(${s}([A-Z])([A-Z])\\)\\s*(?:,|và)\\s*${PLANE}\\s*vuông\\s+góc`, 'gu'),
      ];
      const faces: Array<{ x: string; y: string; text: string }> = [];
      for (const re of res) for (const m of problem.matchAll(re)) {
        if (!base.includes(m[1]) || !base.includes(m[2])) continue;
        if (!isBasePlane(m[3], m[4], m[5], base)) continue;
        if (faces.some((f) => new Set([f.x, f.y, m[1], m[2]]).size === 2)) continue;
        faces.push({ x: m[1], y: m[2], text: m[0] });
      }
      if (faces.length >= 2) {
        // 2 mặt ⊥ đáy ⇒ giao tuyến (qua S) ⊥ đáy: chân = giao 2 cạnh đáy
        const [f1, f2] = faces;
        const common = [f1.x, f1.y].find((z) => [f2.x, f2.y].includes(z));
        r.apexFoot = common ?? { meet: [f1.x, f1.y, f2.x, f2.y] };
        consumed.push(f1.text, f2.text);
      } else if (faces.length === 1) {
        const { x, y, text } = faces[0];
        const ff = faceFoot(problem, s, x, y, base);
        r.apexFoot = ff.foot;
        if (ff.height && !r.height) r.height = ff.height;
        consumed.push(text);
        const tp = triProps(problem, s, x, y);
        if (tp) consumed.push(tp.text);
      }
    }
    // SA = SB = SC (= SD)
    if (!r.apexFoot) {
      const m = new RegExp(`${s}([A-Z])\\s*=\\s*${s}([A-Z])\\s*=\\s*${s}([A-Z])(?:\\s*=\\s*${s}([A-Z]))?(?![A-Z])`, 'u').exec(problem);
      if (m) {
        const pts = [m[1], m[2], m[3], m[4]].filter(Boolean) as string[];
        if (pts.every((z) => base.includes(z)) && new Set(pts).size === pts.length) {
          r.apexFoot = { circ: pts.slice(0, 3) };
          consumed.push(m[0]);
        }
      }
    }
  }

  // Chỉ biết một mặt bên SXY đều / cân tại S / vuông cân tại S (không nói chân đường cao):
  // chân đặt trên TRUNG TRỰC của XY (hình chiếu tâm đáy lên trung trực) ⇒ SX = SY thật.
  if (isPyr && S && !r.apexFoot && !regTetra && !r.height) {
    for (let i = 0; i < base.length && !r.apexFoot; i++) {
      const x = base[i], y = base[(i + 1) % base.length];
      const t = triProps(problem, S, x, y);
      if (!t || !(t.prop === 'đều' || ((t.prop === 'cân' || t.prop === 'vuông cân') && t.at === S))) continue;
      r.apexFoot = { perpBis: [x, y] };
    }
  }

  // Chiều cao theo tam giác mặt bên (đều / vuông cân tại S …).
  if (isPyr && S && !r.height) {
    for (let i = 0; i < base.length && !r.height; i++) for (let j = 0; j < base.length && !r.height; j++) {
      if (i === j) continue;
      const t = triProps(problem, S, base[i], base[j]);
      if (!t) continue;
      if (t.prop === 'đều') r.height = { kind: 'tri', x: base[i], y: base[j], prop: 'equi' };
      else if (t.prop === 'vuông cân' && t.at === S) r.height = { kind: 'tri', x: base[i], y: base[j], prop: 'riso-apex' };
      else if (t.prop === 'vuông cân' && (t.at === base[i] || t.at === base[j])) {
        const at = t.at!; const other = at === base[i] ? base[j] : base[i];
        r.height = { kind: 'tri', x: at, y: other, prop: 'riso-x' };
      } else if (t.prop === 'vuông' && t.at === S) r.height = { kind: 'tri', x: base[i], y: base[j], prop: 'right-apex' };
    }
  }

  // Lăng trụ xiên: hình chiếu của X' lên đáy là …
  if (!isPyr && head.top) {
    const top = head.top.map(norm);
    const re = new RegExp(`[Hh]ình\\s+chiếu\\s+(?:vuông\\s+góc\\s+)?(?:của\\s+)?(?:đỉnh\\s+|điểm\\s+)?(${L1})\\s+(?:lên|trên|xuống)\\s+${PLANE}\\s*(?:là|trùng\\s+với|chính\\s+là)\\s+([^.;]{1,80})`, 'u');
    const m = re.exec(problem);
    if (m && top.includes(norm(m[1])) && isBasePlane(m[2], m[3], m[4], base)) {
      const f = descToSpec(m[5], ctx);
      if (f) { r.topFoot = { vertex: norm(m[1]), foot: f }; consumed.push(m[0]); }
    }
  }

  return Object.keys(r).length ? { refine: r, consumed } : { consumed };
}
