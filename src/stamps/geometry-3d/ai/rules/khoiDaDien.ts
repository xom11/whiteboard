// Khối đa diện lớp 12 — đọc ĐẦU KHỐI + các DỮ KIỆN HÌNH DẠNG của đề thể tích
// (chóp có cạnh bên ⊥ đáy, chóp đều, mặt bên ⊥ đáy, lăng trụ đứng/đều/xiên, hộp chữ nhật,
// lập phương, tứ diện vuông) → một SolidSpec3D cho layout3d.
//
// Nguyên tắc "thà thiếu còn hơn sai": chỉ những dữ kiện HÌNH DẠNG (góc vuông, đều, cân,
// chân đường cao) được giữ đúng; độ dài/số đo góc KHÔNG vẽ theo tỉ lệ (hình minh hoạ SGK).
// Dữ kiện đọc được nhưng KHÔNG dựng đúng được (vd chân đường cao là tâm đáy hình thang)
// ⟹ trả `null` để solidRule giữ hành vi cũ / clause không được claim (escalate).
import type { SolidSpec3D, BaseVariant, ApexVariant, HeightMode } from '../intent';
import type { RuleContext3D } from './_types';
import { segmentClauses3D } from '../deterministic/coverage3d';
import { chuanHoaDe3d } from '../deterministic/chuanHoa3d';

// (Không import _shared: _shared gọi ngược module này — tránh vòng import.)
function splitVertexToken(token: string): string[] {
  return [...token.matchAll(/[A-Z](?:['′]|[₀-₉0-9])?/gu)].map((m) => m[0]);
}

export interface KhoiDaDien {
  spec: SolidSpec3D;
  /** Tâm đáy được gọi tên (vd "O là tâm hình vuông", SO ⊥ đáy) → rule vẽ thêm điểm centroid. */
  center?: string;
  /** Clause chứa dữ kiện đã dùng (claim để coverage đủ). */
  clauseIds: number[];
}

export { chuanHoaDe3d };

const L1 = "[A-Z](?:')?";                // một nhãn đỉnh (có thể kèm phẩy)
const QUAL = '(?:\\s+(?:tam|tứ|lục)\\s+giác)?(?:\\s+đều)?';

// ── Đầu khối (nhãn HOA strict, từ khoá không phân biệt hoa/thường ở chữ đầu) ──
const HEAD_PYRAMID = new RegExp(`(?:[Hh]ình|[Kk]hối)\\s+chóp${QUAL}\\s+([A-Z])\\.([A-Z]{3,})(?![A-Z'])`, 'u');
const HEAD_TETRA = /(?:[Hh]ình\s+|[Kk]hối\s+)?[Tt]ứ\s+diện(\s+đều)?\s+([A-Z]{4})(?![\p{L}'])/u;
const HEAD_PRISM = new RegExp(
  `(?:[Hh]ình|[Kk]hối)\\s+lăng\\s+trụ((?:\\s+(?:đứng|đều|tam\\s+giác|tứ\\s+giác|lục\\s+giác|xiên))*)\\s+([A-Z]{3,4})\\.((?:[A-Z]')+)`,
  'u',
);
const HEAD_BOX = /(?:[Hh]ình|[Kk]hối)\s+(hộp(?:\s+chữ\s+nhật|\s+đứng)?|lập\s+phương)\s+([A-Z]{4})\.((?:[A-Z]')+)/u;

export interface KhoiHead {
  flavor: SolidSpec3D['flavor'];
  base: string[];
  apex?: string;
  top?: string[];
  qualifier: string; // chữ giữa từ khoá và nhãn (đều/đứng/tam giác…) + tên khối (hộp/lập phương)
}

/** Nhận đầu khối lớp 12 (dung nạp "khối", "Hình", "tứ giác đều", "lăng trụ đứng"…). */
export function parseKhoiHead(problemRaw: string): KhoiHead | null {
  const p = chuanHoaDe3d(problemRaw);
  let m: RegExpExecArray | null;
  if ((m = HEAD_PYRAMID.exec(p))) {
    const base = splitVertexToken(m[2]);
    if (base.length < 3 || base.length > 6 || base.includes(m[1])) return null;
    return { flavor: 'pyramid', apex: m[1], base, qualifier: m[0] };
  }
  if ((m = HEAD_BOX.exec(p))) {
    const base = splitVertexToken(m[2]);
    const top = splitVertexToken(m[3]);
    if (base.length !== 4 || top.length !== 4) return null;
    return { flavor: 'box', base, top, qualifier: m[1] };
  }
  if ((m = HEAD_PRISM.exec(p))) {
    const base = splitVertexToken(m[2]);
    const top = splitVertexToken(m[3]);
    if (top.length !== base.length) return null;
    return { flavor: 'prism', base, top, qualifier: m[1] ?? '' };
  }
  if ((m = HEAD_TETRA.exec(p))) {
    const v = splitVertexToken(m[2]);
    if (new Set(v).size !== 4) return null;
    return { flavor: 'tetrahedron', base: v.slice(0, 3), apex: v[3], qualifier: m[1] ?? '' };
  }
  return null;
}

// ─────────────────────────── dữ kiện ───────────────────────────

const PERP = '(?:⊥|vuông\\s+góc(?:\\s+với)?)';
const MP = '(?:mặt\\s+phẳng\\s+|mp\\s*|mặt\\s+)?';

function esc(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * "(ABC)"/"(ABCD)"/"đáy"/"mặt đáy"/"mặt phẳng đáy" trỏ tới MẶT ĐÁY của khối.
 * Token mặt chứa ≥ 3 đỉnh đáy ⟹ chính là mặt đáy (3 điểm không thẳng hàng xác định mặt) — dung
 * nạp lỗi đánh máy "SA ⊥ (ABCD)" trong chóp S.ABC.
 */
function baseRef(base: string[]): string {
  const letters = base.map(esc).join('');
  const triples: string[] = [];
  for (let i = 0; i < base.length; i++) for (let j = i + 1; j < base.length; j++) for (let k = j + 1; k < base.length; k++) {
    triples.push([base[i], base[j], base[k]].map((x) => `(?=[A-Z]{0,3}${esc(x)})`).join(''));
  }
  const tok = `(?:${triples.join('|')})[A-Z]{3,4}`;
  return `(?:\\((?:${tok})\\)|(?:[Mm]ặt\\s+)?[Đđ]áy(?:\\s*\\((?:${tok})\\))?|(?<=với\\s+(?:mặt\\s+phẳng\\s+)?)[${letters}]{3,4}(?![\\p{L}']))`;
}

interface Fact { clauseId: number }

/** Vùng chữ đã được một dữ kiện "giải thích" (clauseId → [start,end)) — cho catch-all. */
type Spans = Map<number, Array<[number, number]>>;
let SPANS: Spans = new Map();

function eachClause<T>(ctx: RuleContext3D, re: RegExp, f: (m: RegExpExecArray, cid: number) => T | null): Array<T & Fact> {
  const out: Array<T & Fact> = [];
  for (const c of ctx.clauses) {
    const t = chuanHoaDe3d(c.text);
    const g = new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g');
    let m: RegExpExecArray | null;
    while ((m = g.exec(t))) {
      const v = f(m, c.id);
      if (v) {
        out.push({ ...v, clauseId: c.id });
        const arr = SPANS.get(c.id) ?? [];
        arr.push([m.index, m.index + m[0].length]);
        SPANS.set(c.id, arr);
      }
    }
  }
  return out;
}

/**
 * Catch-all "thà thiếu còn hơn sai": mọi dấu hiệu vuông góc ràng buộc VỊ TRÍ khối (cạnh bên ⊥,
 * mặt ⊥ đáy, hai cạnh ⊥ nhau, hình chiếu của đỉnh) mà KHÔNG dữ kiện nào giải thích ⟹ true.
 */
function coManhMoiChuaHieu(ctx: RuleContext3D, cues: RegExp[]): boolean {
  for (const c of ctx.clauses) {
    const t = chuanHoaDe3d(c.text);
    const spans = SPANS.get(c.id) ?? [];
    for (const cue of cues) {
      const g = new RegExp(cue.source, cue.flags.includes('g') ? cue.flags : cue.flags + 'g');
      let m: RegExpExecArray | null;
      while ((m = g.exec(t))) {
        const [i, j] = [m.index, m.index + m[0].length];
        if (!spans.some(([a, b]) => i < b && a < j)) return true;
      }
    }
  }
  return false;
}

function sameSet(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((x) => b.includes(x));
}

// ── Đáy ──
/** Đáy được mô tả nhưng layout không dựng đúng được → cả khối trả null (không vẽ sai). */
const UNKNOWN = 'unknown' as BaseVariant;
/** "tam giác ABC cân" chưa rõ đỉnh — chỉ dùng được khi ghép với góc vuông đã biết (vuông tại B ⟹ cân tại B). */
const CAN_CHUA_RO = 'can-chua-ro' as BaseVariant;

/** Gộp các mô tả đáy tương thích: vuông tại Y + cân (chưa rõ/tại Y) ⟹ vuông cân tại Y. */
function gopDay<T extends { variant: BaseVariant; anchor?: string }>(bf: T[], firstLabel: string): T[] {
  const right = bf.find((f) => f.variant === 'right-triangle' || f.variant === 'right-isosceles-triangle');
  // "tam giác ABC cân" không nói đỉnh: mọi đỉnh đều là một trường hợp hợp lệ → cân tại đỉnh đầu (quy ước ABC cân tại A)
  if (!right) return bf.map((f) => (f.variant === CAN_CHUA_RO ? { ...f, variant: 'isosceles-triangle' as BaseVariant, anchor: firstLabel } : f));
  const iso = bf.some((f) => f.variant === CAN_CHUA_RO || f.variant === 'right-isosceles-triangle'
    || (f.variant === 'isosceles-triangle' && f.anchor === right.anchor));
  const merged = bf.map((f) => {
    if (f.variant === CAN_CHUA_RO || f.variant === 'right-triangle' || f.variant === 'right-isosceles-triangle'
      || (f.variant === 'isosceles-triangle' && f.anchor === right.anchor)) {
      return { ...f, variant: (iso ? 'right-isosceles-triangle' : 'right-triangle') as BaseVariant, anchor: right.anchor };
    }
    return f;
  });
  return merged;
}
interface BaseFact { variant: BaseVariant; anchor?: string }

function baseFacts(ctx: RuleContext3D, base: string[]): Array<BaseFact & Fact> {
  const n = base.length;
  const out: Array<BaseFact & Fact> = [];
  if (n === 3) {
    // "đáy (ABC)? là tam giác vuông cân tại B" | "tam giác ABC vuông tại A" | "ABC là tam giác đều"
    const tri = /(?:[Đđ]áy(?:\s+(?:là\s+)?([A-Z]{3}))?\s+(?:là\s+)?(?:một\s+)?(?:tam\s+giác|△|∆)(?:\s+([A-Z]{3}))?|(?:tam\s+giác|△|∆)\s+([A-Z]{3})|(?<![\p{L}.'])([A-Z]{3})\s+là\s+(?:một\s+)?tam\s+giác)\s+(vuông\s+cân|vuông|cân|đều)(?:\s+tại\s*([A-Z])(?![\p{L}']))?/u;
    out.push(...eachClause(ctx, tri, (m) => {
      const tok = m[1] ?? m[2] ?? m[3] ?? m[4];
      const isBaseCue = /^[Đđ]áy/u.test(m[0]);
      if (tok ? !sameSet(splitVertexToken(tok), base) : !isBaseCue) return null;
      const kind = m[5].replace(/\s+/gu, ' ');
      const at = m[6];
      if (kind === 'đều') return { variant: 'equilateral-triangle' as BaseVariant };
      if (!at && kind !== 'vuông') {
        // "vuông cân AB = BC" / "cân, AB = AC": đỉnh = chung của hai cạnh bằng nhau
        const eq = new RegExp(`(?<![\\p{L}'])([${base.join('')}])([${base.join('')}])\\s*=\\s*([${base.join('')}])([${base.join('')}])(?![\\p{L}'])`, 'u').exec(chuanHoaDe3d(ctx.problem));
        const common = eq ? [eq[1], eq[2]].filter((x) => [eq[3], eq[4]].includes(x)) : [];
        if (common.length === 1) return { variant: (kind === 'vuông cân' ? 'right-isosceles-triangle' : 'isosceles-triangle') as BaseVariant, anchor: common[0] };
        if (kind === 'cân') return { variant: CAN_CHUA_RO }; // gopDay: ghép với góc vuông, hoặc cân tại đỉnh đầu
      }
      if (!at || !base.includes(at)) return { variant: UNKNOWN }; // "vuông" không rõ đỉnh → không đoán
      if (kind === 'vuông cân') return { variant: 'right-isosceles-triangle' as BaseVariant, anchor: at };
      if (kind === 'vuông') return { variant: 'right-triangle' as BaseVariant, anchor: at };
      return { variant: 'isosceles-triangle' as BaseVariant, anchor: at };
    }));
  }
  if (n === 3) {
    // "SA, AB, BC đôi một vuông góc" ⟹ vuông tại B (và SA ⊥ đáy — xem apexFacts)
    out.push(...eachClause(ctx, /(?<![\p{L}'])[A-Z]([A-Z])\s*,\s*\1([A-Z])\s*(?:,|và)\s*\2([A-Z])\s+(?:đôi\s+một|từng\s+đôi\s+một)\s+vuông\s+góc/u, (m) =>
      (base.includes(m[1]) && base.includes(m[2]) && base.includes(m[3]) ? { variant: 'right-triangle' as BaseVariant, anchor: m[2] } : null)));
  }
  if (n === 4) {
    const quad = /(?:[Đđ]áy(?:\s+([A-Z]{4}))?|(?<![\p{L}.'])([A-Z]{4}))\s*(?:là\s+)?(?:một\s+)?(hình\s+vuông|hình\s+chữ\s+nhật|hình\s+thoi|hình\s+bình\s+hành|hình\s+thang\s+vuông|hình\s+thang\s+cân|hình\s+thang|nửa\s+lục\s+giác)(?:\s+tại\s+([A-Z])\s*(?:và|,)\s*([A-Z])(?![\p{L}']))?/u;
    out.push(...eachClause(ctx, quad, (m) => {
      const tok = m[1] ?? m[2];
      if (tok && !sameSet(splitVertexToken(tok), base)) return null;
      const kind = m[3].replace(/\s+/gu, ' ');
      switch (kind) {
        case 'hình vuông': return { variant: 'square' as BaseVariant };
        case 'hình chữ nhật': return { variant: 'rectangle' as BaseVariant };
        case 'hình thoi': return { variant: 'rhombus' as BaseVariant };
        case 'hình bình hành': return { variant: 'parallelogram' as BaseVariant };
        case 'hình thang cân':
        case 'hình thang': return { variant: 'trapezoid' as BaseVariant }; // hình thang cân = trường hợp riêng hợp lệ
        case 'hình thang vuông': {
          const [x, y] = [m[4], m[5]];
          if (!x || !y || !base.includes(x) || !base.includes(y)) return { variant: UNKNOWN };
          const ix = base.indexOf(x), iy = base.indexOf(y);
          if ((ix + 1) % 4 !== iy && (iy + 1) % 4 !== ix) return { variant: UNKNOWN }; // phải là 2 đỉnh KỀ
          return { variant: 'right-trapezoid' as BaseVariant, anchor: x + y };
        }
        case 'nửa lục giác': {
          // đường kính (cạnh = 2 lần cạnh kia): "đường kính AD", "AD = 2a", "AB = BC = CD = a"
          const p = chuanHoaDe3d(ctx.problem);
          const V = `[${base.join('')}]`;
          let pair: string | null = null;
          const dk = new RegExp(`đường\\s*(?:√\\s*)?kính\\s+(${V})(${V})(?![\\p{L}'])`, 'u').exec(p)
            ?? new RegExp(`(?<![\\p{L}'])(${V})(${V})\\s*=\\s*2\\s*[a-z](?![\\p{L}])`, 'u').exec(p);
          if (dk) pair = dk[1] + dk[2];
          else {
            const eq3 = new RegExp(`(${V})(${V})\\s*=\\s*(${V})(${V})\\s*=\\s*(${V})(${V})(?![\\p{L}'])`, 'u').exec(p);
            if (eq3) {
              const sides = [eq3[1] + eq3[2], eq3[3] + eq3[4], eq3[5] + eq3[6]];
              const rest = base.map((v, i) => v + base[(i + 1) % 4]).filter((e) => !sides.some((sd) => sameSet(splitVertexToken(sd), splitVertexToken(e))));
              if (rest.length === 1) pair = rest[0];
            }
          }
          if (!pair) return { variant: UNKNOWN };
          const [x, y] = [pair[0], pair[1]];
          const ix = base.indexOf(x), iy = base.indexOf(y);
          if ((ix + 1) % 4 !== iy && (iy + 1) % 4 !== ix) return { variant: UNKNOWN };
          return { variant: 'half-hexagon' as BaseVariant, anchor: x + y };
        }
        default: return { variant: UNKNOWN };
      }
    }));
  }
  return out;
}

// ── Chân đường cao ──
interface ApexFact {
  variant: ApexVariant | 'unknown'; anchor?: string; height?: HeightMode; weights?: Record<string, number>;
  weak?: boolean;          // "cạnh bên bằng nhau" — chỉ dùng khi không có dữ kiện mạnh
  facePerp?: string;       // (SXY) ⊥ đáy — cần ghép với hình dạng tam giác SXY
}
type FaceShape = { edge: string; shape: 'đều' | 'vuông cân' | 'cân' | 'vuông S' | 'vuông tại' | 'khác'; at?: string };

function apexFacts(ctx: RuleContext3D, apex: string, base: string[], bVar: BaseVariant): Array<ApexFact & Fact> {
  const A = esc(apex);
  const B = baseRef(base);
  const V = `[${base.map(esc).join('')}]`;
  const out: Array<ApexFact & Fact> = [];

  // (1) SA ⊥ đáy | cạnh bên SA vuông góc với mặt phẳng (ABCD)
  out.push(...eachClause(ctx, new RegExp(`(?<![\\p{L}])${A}(${V})\\s*${PERP}\\s*${MP}${B}`, 'u'), (m) =>
    ({ variant: 'over-vertex' as ApexVariant, anchor: m[1] })));
  // (1') lỏng: "SA vuông góc với 3 đáy (ABC)" (rác OCR/PDF chen giữa ≤12 ký tự, không qua dấu câu)
  out.push(...eachClause(ctx, new RegExp(`(?<![\\p{L}])${A}(${V})\\s*${PERP}[^.;,()]{0,20}?${B}`, 'u'), (m) =>
    ({ variant: 'over-vertex' as ApexVariant, anchor: m[1] })));
  // (1'') "SA, AB, BC đôi một vuông góc" → SA ⊥ (ABC)
  out.push(...eachClause(ctx, new RegExp(`(?<![\\p{L}'])${A}(${V})\\s*,\\s*\\1(${V})\\s*(?:,|và)\\s*\\2(${V})\\s+(?:đôi\\s+một|từng\\s+đôi\\s+một)\\s+vuông\\s+góc`, 'u'), (m) =>
    ({ variant: 'over-vertex' as ApexVariant, anchor: m[1] })));
  // (1b) hai mặt phẳng (SAB) và (SAD) cùng vuông góc với đáy → SA ⊥ đáy
  out.push(...eachClause(ctx, new RegExp(`\\(?${A}(${V})(${V})\\)?\\s*(?:và|,)\\s*(?:mặt\\s+phẳng\\s+)?\\(?${A}(${V})(${V})\\)?\\s*(?:cùng\\s+)?${PERP}\\s*(?:với\\s+)?${MP}${B}`, 'u'), (m) => {
    const s1 = [m[1], m[2]], s2 = [m[3], m[4]];
    const common = s1.filter((x) => s2.includes(x));
    return common.length === 1 ? { variant: 'over-vertex' as ApexVariant, anchor: common[0] } : null;
  }));
  // (1c) SH ⊥ đáy với H KHÔNG phải đỉnh đáy → H phải được định nghĩa (trung điểm / tâm / trọng tâm).
  out.push(...eachClause(ctx, new RegExp(`(?<![\\p{L}])${A}([A-Z])(?!['\\p{L}])\\s*${PERP}\\s*${MP}${B}`, 'u'), (m) => {
    const h = m[1];
    if (base.includes(h) || h === apex) return null;
    const f = laTam(footFact(diemTheoTen(h, ctx.problem, base, bVar, 0)), base);
    // Tâm đáy được gọi tên (O) không rule nào khác vẽ → solidRule vẽ thêm điểm centroid.
    return f.variant === 'regular' ? { ...f, anchor: `center:${h}` } : f;
  }));
  // (2) (SXY) ⊥ đáy | mặt bên SXY nằm trong mặt phẳng vuông góc với đáy
  out.push(...eachClause(ctx, new RegExp(`(?:\\(${A}(${V})(${V})\\)|(?<=mặt\\s+phẳng\\s+)${A}(${V})(${V})(?![\\p{L}']))\\s*${PERP}\\s*${MP}${B}`, 'u'), (m) =>
    ({ variant: 'unknown' as const, facePerp: (m[1] ?? m[3]) + (m[2] ?? m[4]) })));
  out.push(...eachClause(ctx, new RegExp(
    `(?:(?:[Mm]ặt\\s+bên|[Tt]am\\s+giác|[Mm]ặt\\s+phẳng|[Cc]ạnh\\s+bên|△|∆)\\s*)?(?<![\\p{L}'])\\(?${A}(${V})(${V})\\)?[^.;]{0,60}?(?:nằm\\s+trong|thuộc)\\s+(?:một\\s+)?mặt\\s+phẳng\\s+${PERP}\\s*${MP}${B}`, 'u'), (m) =>
    ({ variant: 'unknown' as const, facePerp: m[1] + m[2] })));
  out.push(...eachClause(ctx, new RegExp(`\\(?${A}(${V})(${V})\\)?\\s*(?:và|,)\\s*(?:mặt\\s+phẳng\\s+)?\\(?[${base.map(esc).join('')}]{3,4}\\)?\\s*vuông\\s+góc(?:\\s+với\\s+nhau)?`, 'u'), (m) =>
    ({ variant: 'unknown' as const, facePerp: m[1] + m[2] })));
  // (3') các mặt bên cùng tạo với đáy một góc → chân = tâm nội tiếp đáy; các cạnh bên … → tâm ngoại tiếp
  out.push(...eachClause(ctx, /(?:[Cc]ác\s+mặt\s+bên|[Mm]ặt\s+bên\s+(?:đều|cùng))[^.;]{0,40}?(?:cùng\s+)?(?:tạo|hợp)\s+với\s+(?:mặt\s+)?(?:phẳng\s+)?đáy/u, () =>
    ({ variant: 'over-incenter' as ApexVariant })));
  out.push(...eachClause(ctx, /(?:[Cc]ác\s+cạnh\s+bên|[Cc]ạnh\s+bên\s+(?:đều|cùng))[^.;]{0,20}?(?:cùng\s+)?(?:tạo|hợp)\s+với\s+(?:mặt\s+)?(?:phẳng\s+)?đáy/u, () =>
    ({ variant: 'over-circumcenter' as ApexVariant, weak: true })));
  // (3) hình chiếu (vuông góc) của S lên/trên (mặt phẳng) đáy là|trùng với <mô tả điểm>
  const proj = new RegExp(
    `[Hh]ình\\s+chiếu(?:\\s+vuông\\s+góc)?\\s+của\\s+(?:điểm\\s+|đỉnh\\s+)?${A}\\s+(?:lên|trên|xuống)\\s+${MP}${B}\\s+(?:là|trùng\\s+với)\\s+([^.;]*)`,
    'u',
  );
  out.push(...eachClause(ctx, proj, (m) => laTam(footFact(moTaDiem(m[1], ctx.problem, base, bVar)), base)));
  // (4) cạnh bên bằng nhau / SA = SB = SC → chân = tâm ngoại tiếp đáy (yếu)
  const eqLat = new RegExp(`(?:các\\s+cạnh\\s+bên\\s+(?:đều\\s+)?bằng\\s+nhau|${A}(${V})\\s*=\\s*${A}(${V})\\s*=\\s*${A}(${V}))`, 'u');
  out.push(...eachClause(ctx, eqLat, (m) => {
    const tri = m[1] ? [m[1], m[2], m[3]] : null;
    if (tri && new Set(tri).size === 3 && !sameSet(tri, base) && base.length === 4) {
      return { variant: 'over-circumcenter' as ApexVariant, anchor: tri.join('') }; // tâm ngoại tiếp tam giác con (mạnh)
    }
    return { variant: 'over-circumcenter' as ApexVariant, weak: true };
  }));

  // Ghép (SXY) ⊥ đáy với hình dạng tam giác SXY.
  const shapes = faceShapes(ctx, apex, V);
  const resolved: Array<ApexFact & Fact> = [];
  for (const f of out) {
    if (!f.facePerp) { resolved.push(f); continue; }
    const [x, y] = [f.facePerp[0], f.facePerp[1]];
    const sh = shapes.filter((s) => sameSet(splitVertexToken(s.edge), [x, y]));
    const eqSides = new RegExp(`${A}${x}\\s*=\\s*${A}${y}|${A}${y}\\s*=\\s*${A}${x}`, 'u').test(chuanHoaDe3d(ctx.problem));
    const kinds = new Set(sh.map((s) => s.shape + (s.at ?? '')));
    if (kinds.size > 1) { resolved.push({ variant: 'unknown', clauseId: f.clauseId }); continue; }
    const s0 = sh[0];
    let r: ApexFact;
    // Tam giác SXY được nhắc tới mà không đọc được hình dạng → không đoán.
    const mentioned = new RegExp(`(?:[Tt]am\\s+giác|△|∆)\\s*(?:${A}${x}${y}|${A}${y}${x}|${x}${A}${y}|${y}${A}${x}|${x}${y}${A}|${y}${x}${A})(?![\\p{L}'])`, 'u').test(chuanHoaDe3d(ctx.problem));
    if (!s0 && eqSides) r = { variant: 'over-edge-mid', anchor: x + y };
    else if (!s0 && mentioned) r = { variant: 'unknown' };
    else if (!s0) r = { variant: 'over-edge-mid', anchor: x + y };   // chân bất kỳ trên XY: trung điểm hợp lệ
    else if (s0.shape === 'đều') r = { variant: 'over-edge-mid', anchor: x + y, height: 'face-equilateral' };
    else if (s0.shape === 'vuông cân' || s0.shape === 'vuông S') r = { variant: 'over-edge-mid', anchor: x + y, height: 'face-right-isosceles' };
    else if (s0.shape === 'cân') r = { variant: 'over-edge-mid', anchor: x + y };
    else if (s0.shape === 'vuông tại' && (s0.at === x || s0.at === y)) r = { variant: 'over-vertex', anchor: s0.at };  // vuông tại X: SX ⊥ XY ⟹ SX ⊥ đáy
    else r = { variant: 'unknown' };
    resolved.push({ ...r, clauseId: f.clauseId });
    for (const s of sh) resolved.push({ ...r, clauseId: s.clauseId });
  }
  return resolved;
}

/** Hình dạng tam giác mặt bên SXY: "tam giác SAB đều", "SAB là tam giác vuông cân tại S"… */
function faceShapes(ctx: RuleContext3D, apex: string, V: string): Array<FaceShape & Fact> {
  const A = esc(apex);
  const re = new RegExp(
    `(?:(?:[Tt]am\\s+giác|[Mm]ặt\\s+bên|△|∆)\\s*(?:${A}(${V})(${V})|(${V})${A}(${V})|(${V})(${V})${A})|(?<![\\p{L}])(?:${A}(${V})(${V}))\\s+là\\s+(?:một\\s+)?tam\\s+giác)` +
    `\\s+(?:là\\s+(?:một\\s+)?tam\\s+giác\\s+)?(đều|vuông\\s+cân|cân|vuông)(?:\\s+(?:tại|đỉnh)\\s*([A-Z])(?![\\p{L}']))?(?![\\p{L}])`,
    'u',
  );
  return eachClause(ctx, re, (m) => {
    const edge = (m[1] && m[2]) ? m[1] + m[2] : (m[3] && m[4]) ? m[3] + m[4] : (m[5] && m[6]) ? m[5] + m[6] : (m[7] ?? '') + (m[8] ?? '');
    if (edge.length !== 2) return null;
    const k = m[9].replace(/\s+/gu, ' ');
    const at = m[10];
    if (k === 'đều') return { edge, shape: 'đều' as const };
    if (k === 'vuông cân') return at === apex ? { edge, shape: 'vuông cân' as const } : { edge, shape: 'khác' as const };
    if (k === 'cân') return at === apex ? { edge, shape: 'cân' as const } : { edge, shape: 'khác' as const };
    if (!at) return { edge, shape: 'khác' as const };
    if (at === apex) return { edge, shape: 'vuông S' as const };
    return { edge, shape: 'vuông tại' as const, at };
  });
}

// ── Điểm trên đáy dưới dạng TỔ HỢP TRỌNG SỐ các đỉnh đáy (chân đường cao / hình chiếu) ──
type TrongSo = Record<string, number> | 'unknown';
const PARA: ReadonlySet<BaseVariant> = new Set(['square', 'rectangle', 'rhombus', 'rhombus-60', 'parallelogram']);

function tb(...ws: TrongSo[]): TrongSo {
  if (ws.some((w) => w === 'unknown')) return 'unknown';
  const out: Record<string, number> = {};
  for (const w of ws as Array<Record<string, number>>) for (const [k, v] of Object.entries(w)) out[k] = (out[k] ?? 0) + v / ws.length;
  return out;
}

function tamDay(base: string[], bVar: BaseVariant): TrongSo {
  if (PARA.has(bVar) || (base.length === 3 && bVar === 'equilateral-triangle')) {
    return Object.fromEntries(base.map((v) => [v, 1 / base.length]));
  }
  return 'unknown'; // "tâm" đáy khác (hình thang, tam giác thường) → không đoán
}

/** Mô tả điểm sau "là|trùng với": "trung điểm của cạnh OA", "trọng tâm H của tam giác ABD", "điểm H thuộc AB sao cho HA = 2HB"… */
function moTaDiem(desc: string, problem: string, base: string[], bVar: BaseVariant, depth = 0): TrongSo {
  const d = desc.trim();
  let m: RegExpExecArray | null;
  if ((m = /^trung\s+điểm(?:\s+[A-Z](?![\p{L}']))?\s+(?:của\s+)?(?:cạnh\s+|đoạn(?:\s+thẳng)?\s+)?([A-Z])([A-Z])(?![\p{L}'])/u.exec(d))) {
    return tb(diemTheoTen(m[1], problem, base, bVar, depth + 1), diemTheoTen(m[2], problem, base, bVar, depth + 1));
  }
  if ((m = /^trọng\s+tâm(?:\s+[A-Z](?![\p{L}']))?\s+(?:của\s+)?(?:tam\s+giác\s+(?:đều\s+)?)?([A-Z])([A-Z])([A-Z])(?![\p{L}'])/u.exec(d))) {
    return tb(...[m[1], m[2], m[3]].map((x) => diemTheoTen(x, problem, base, bVar, depth + 1)));
  }
  if (/^(?:tâm|giao\s+điểm)(?![\p{L}])/u.test(d)) {
    if (/^tâm\s+(?:[A-Z]\s+)?(?:của\s+)?(?:đường\s+tròn|mặt)/u.test(d)) return 'unknown';
    const g = /^giao\s+điểm(?:\s+[A-Z](?![\p{L}']))?\s+(?:của\s+)?(?:hai\s+đường\s+chéo\s+)?(?:([A-Z]{2})\s+và\s+([A-Z]{2}))?/u.exec(d);
    if (g && g[1] && base.length === 4) {
      const diag = (t: string) => sameSet(splitVertexToken(t), [base[0], base[2]]) || sameSet(splitVertexToken(t), [base[1], base[3]]);
      if (!(diag(g[1]) && diag(g[2]) && g[1] !== g[2])) return 'unknown';
    }
    return tamDay(base, bVar);
  }
  if ((m = /^(?:điểm\s+)?([A-Z])\s*(?:thuộc|∈|nằm\s+trên|trên)\s*(?:cạnh\s+|đoạn(?:\s+thẳng)?\s+)?([A-Z])([A-Z])\s+sao\s+cho\s+(.*)$/u.exec(d))) {
    return chiaDoan(m[1], m[2], m[3], m[4], problem, base, bVar, depth);
  }
  if ((m = /^(?:điểm\s+)?([A-Z])(?![\p{L}'])/u.exec(d))) return diemTheoTen(m[1], problem, base, bVar, depth + 1);
  return 'unknown';
}

/** H chia đoạn XY theo "HX = kHY" | "XH = kHY" | "HY = k.HX"… */
function chiaDoan(h: string, x: string, y: string, cond: string, problem: string, base: string[], bVar: BaseVariant, depth: number): TrongSo {
  const seg = (t: string) => t.replace(h, '');
  const r = new RegExp(`^(${h}[${x}${y}]|[${x}${y}]${h})\\s*=\\s*(\\d+(?:[.,]\\d+)?)\\s*\\.?\\s*(${h}[${x}${y}]|[${x}${y}]${h})(?![\\p{L}'])`, 'u').exec(cond.trim());
  if (!r) return 'unknown';
  const p = seg(r[1]), q = seg(r[3]), k = Number(r[2].replace(',', '.'));
  if (p === q || !(k > 0)) return 'unknown';
  // |HP| = k|HQ| ⟹ H = (P + kQ)/(1+k)
  const P = diemTheoTen(p, problem, base, bVar, depth + 1), Q = diemTheoTen(q, problem, base, bVar, depth + 1);
  if (P === 'unknown' || Q === 'unknown') return 'unknown';
  const out: Record<string, number> = {};
  for (const [kk, v] of Object.entries(P)) out[kk] = (out[kk] ?? 0) + v / (1 + k);
  for (const [kk, v] of Object.entries(Q)) out[kk] = (out[kk] ?? 0) + (v * k) / (1 + k);
  return out;
}

/** Điểm được gọi tên H: đỉnh đáy, hoặc tra định nghĩa H trong đề. */
function diemTheoTen(h: string, problemRaw: string, base: string[], bVar: BaseVariant, depth: number): TrongSo {
  if (base.includes(h)) return { [h]: 1 };
  if (depth > 3) return 'unknown';
  const p = chuanHoaDe3d(problemRaw);
  const H = esc(h);
  let m: RegExpExecArray | null;
  if ((m = new RegExp(`(?<![\\p{L}])${H}\\s+là\\s+(trung\\s+điểm[^.;,]*|trọng\\s+tâm[^.;,]*|tâm[^.;,]*|giao\\s+điểm[^.;,]*)`, 'u').exec(p))) {
    return moTaDiem(m[1], p, base, bVar, depth);
  }
  if ((m = new RegExp(`(trung\\s+điểm|trọng\\s+tâm|giao\\s+điểm)\\s+${H}\\s+(của[^.;,]*)`, 'u').exec(p))) {
    return moTaDiem(`${m[1]} ${m[2]}`, p, base, bVar, depth);
  }
  if (new RegExp(`(?:[Đđ]áy|hình\\s+(?:vuông|chữ\\s+nhật|thoi|bình\\s+hành)|tam\\s+giác\\s+đều|${base.join('')})[^.;]{0,30}?tâm\\s+${H}(?![\\p{L}'])`, 'u').test(p)) {
    return tamDay(base, bVar);
  }
  if ((m = new RegExp(`(?<![\\p{L}])(?:điểm\\s+)?${H}\\s*(?:thuộc|∈|nằm\\s+trên)\\s*(?:cạnh\\s+|đoạn(?:\\s+thẳng)?\\s+)?([A-Z])([A-Z])\\s+sao\\s+cho\\s+([^.;]*)`, 'u').exec(p))) {
    return chiaDoan(h, m[1], m[2], m[3], p, base, bVar, depth);
  }
  return 'unknown';
}

/** Trọng số đều trên MỌI đỉnh đáy ≡ tâm (trọng tâm) đáy → 'regular'. */
function laTam(f: ApexFact, base: string[]): ApexFact {
  if (f.variant !== 'over-weights' || !f.weights) return f;
  const e = Object.entries(f.weights);
  if (e.length === base.length && e.every(([k, v]) => base.includes(k) && Math.abs(v - 1 / base.length) < 1e-9)) return { variant: 'regular' };
  return f;
}

/** Trọng số → ApexFact (quy về biến thể có sẵn khi trùng: đỉnh / trung điểm / tâm). */
function footFact(w: TrongSo): ApexFact {
  if (w === 'unknown') return { variant: 'unknown' };
  const e = Object.entries(w).filter(([, v]) => Math.abs(v) > 1e-9);
  if (e.length === 1 && Math.abs(e[0][1] - 1) < 1e-9) return { variant: 'over-vertex', anchor: e[0][0] };
  if (e.length === 2 && e.every(([, v]) => Math.abs(v - 0.5) < 1e-9)) return { variant: 'over-edge-mid', anchor: e[0][0] + e[1][0] };
  return { variant: 'over-weights', weights: Object.fromEntries(e) };
}

// ── Lăng trụ xiên: hình chiếu của A' lên (ABC) ──
function prismProjFacts(ctx: RuleContext3D, base: string[], top: string[], bVar: BaseVariant): Array<{ projOf: string } & ApexFact & Fact> {
  const T = `(${top.map((t) => esc(t)).join('|')})`;
  const V = `[${base.map(esc).join('')}]`;
  const B = baseRef(base);
  const re = new RegExp(
    `[Hh]ình\\s+chiếu(?:\\s+vuông\\s+góc)?\\s+của\\s+(?:điểm\\s+|đỉnh\\s+)?${T}\\s+(?:lên|trên|xuống)\\s+${MP}${B}\\s+(?:là|trùng\\s+với)\\s+([^.;]*)`,
    'u',
  );
  // "A'A = A'B = A'C" → hình chiếu của A' là tâm ngoại tiếp đáy
  const eq = new RegExp(`${T}(${V})\\s*=\\s*\\1(${V})\\s*=\\s*\\1(${V})(?![\\p{L}'])`, 'u');
  const eqs = eachClause(ctx, eq, (m) => ({ projOf: m[1], variant: 'over-circumcenter' as ApexVariant }));
  return [...eqs, ...eachClause(ctx, re, (m) => ({ projOf: m[1], ...footFact(moTaDiem(m[2], ctx.problem, base, bVar)) }))];
}

// Mọi cạnh bằng nhau (đáy đều + cạnh bên = cạnh đáy) | chỉ cạnh bên = cạnh đáy.
const ALL_EDGES_EQ = /(?:tất\s+cả\s+(?:các\s+)?cạnh(?:\s+đều)?(?:\s+có\s+độ\s+dài)?(?:\s+đều)?\s+bằng|(?:có\s+)?các\s+cạnh\s+đều\s+bằng)/u;
const LAT_EQ_BASE = /(?:cạnh\s+bên\s+bằng\s+cạnh\s+đáy|cạnh\s+đáy\s+và\s+cạnh\s+bên\s+(?:đều\s+)?bằng|cạnh\s+đáy\s+bằng\s+cạnh\s+bên)/u;

function claimsOf(...xs: Array<Array<Fact>>): number[] {
  return [...new Set(xs.flat().map((f) => f.clauseId))];
}

/** Đề có đầu khối nhưng dữ kiện mâu thuẫn / chưa dựng đúng được → KHÔNG vẽ theo đường mới. */
export interface KhoiTuChoi { refused: string }

export function isRefused(k: KhoiDaDien | KhoiTuChoi | null): k is KhoiTuChoi {
  return !!k && 'refused' in k;
}

// Hình thoi có góc 60°/120° cho trước: "BAD = 60°", "góc ABC bằng 120°", "A = 60°".
function rhombusAcute(p: string, base: string[]): string | null | 'khác' {
  const V = `[${base.map(esc).join('')}]`;
  const re = new RegExp(`(?:[Gg]óc\\s+)?(?:\\\\widehat\\s*\\{?)?(?<![\\p{L}'])(?:(${V})(${V})(${V})|(${V}))\\}?(?![\\p{L}'])\\s*(?:=|bằng)\\s*(\\d{2,3})\\s*(?:°|độ)`, 'u');
  const m = re.exec(p);
  if (!m) return null;
  const at = m[2] ?? m[4];
  if (m[1] && m[3]) {
    const i = base.indexOf(at), n = base.length;
    const nb = [base[(i + 1) % n], base[(i + n - 1) % n]];
    if (!sameSet([m[1], m[3]], nb)) return 'khác'; // góc không phải góc của hình thoi (vd BAC)
  }
  const deg = Number(m[5]);
  if (deg === 60) return at;
  if (deg === 120) return base[(base.indexOf(at) + 1) % base.length];
  return 'khác';
}

/**
 * Dựng SolidSpec3D lớp 12. null = không nhận ra đầu khối (solidRule dùng đường cũ);
 * {refused} = có đầu khối nhưng dữ kiện không dựng ĐÚNG được (mâu thuẫn / chưa hiểu).
 */
export function parseKhoiDaDien(ctx: RuleContext3D): KhoiDaDien | KhoiTuChoi | null {
  SPANS = new Map();
  const p = chuanHoaDe3d(ctx.problem);
  const head = parseKhoiHead(p);
  if (!head) return null;
  const refuse = (why: string): KhoiTuChoi => ({ refused: why });
  if (head.base.length > 4) return refuse('đáy > 4 đỉnh');
  const q = head.qualifier;
  const allEq = ALL_EDGES_EQ.test(p);
  const latEq = LAT_EQ_BASE.test(p);
  const isRegular = /đều/u.test(q) && head.flavor !== 'box';
  const all4 = head.apex ? [...head.base, head.apex] : head.base;

  // Tứ diện/chóp có góc tam diện vuông: "OA, OB, OC đôi một vuông góc".
  if (head.flavor === 'pyramid' || head.flavor === 'tetrahedron') {
    const tri = /(?<![\p{L}])([A-Z])([A-Z])\s*,\s*\1([A-Z])\s*(?:,|và)\s*\1([A-Z])\s+(?:đôi\s+một|từng\s+đôi\s+một)\s+vuông\s+góc/u.exec(p);
    if (tri && head.base.length === 3 && sameSet([tri[1], tri[2], tri[3], tri[4]], all4)) {
      if (isRegular) return refuse('đều + tam diện vuông');
      const corner = tri[1];
      const cid = ctx.clauses.find((c) => /đôi\s+một\s+vuông\s+góc/u.test(c.text))?.id;
      return {
        spec: {
          flavor: 'tetrahedron', baseLabels: [corner, tri[2], tri[3]], baseVariant: 'right-triangle', baseAnchor: corner,
          apex: tri[4], apexVariant: 'over-vertex', apexAnchor: corner,
        },
        clauseIds: cid !== undefined ? [cid] : [],
      };
    }
  }

  // Vai đáy/đỉnh của tứ diện: "DA ⊥ (ABC)", "AB ⊥ (BCD)", "(ABC) ⊥ (BCD)".
  let apex = head.apex;
  let baseLabels = head.base;
  if (head.flavor === 'tetrahedron' && !isRegular) {
    // "tứ diện DABC, đáy ABC là…" → đáy = ABC, đỉnh = D
    const day = /[Đđ]áy\s+(?:là\s+)?(?:tam\s+giác\s+)?([A-Z]{3})(?![A-Z'])/u.exec(p);
    if (day) {
      const f = splitVertexToken(day[1]);
      const other = all4.filter((v) => !f.includes(v));
      if (other.length === 1 && f.every((v) => all4.includes(v))) { apex = other[0]; baseLabels = f; }
    }
    const edge = /(?<![\p{L}])([A-Z])([A-Z])\s*(?:⊥|vuông\s+góc(?:\s+với)?)\s*(?:mặt\s+phẳng\s+|mp\s*)?\(([A-Z]{3})\)/u.exec(p);
    const faces = /(?<![\p{L}])\(?([A-Z]{3})\)?\s*(?:(?:và|,)\s*\(?([A-Z]{3})\)?\s*vuông\s+góc|(?:⊥|vuông\s+góc\s+với)\s*(?:mặt\s+phẳng\s+)?\(([A-Z]{3})\))/u.exec(p);
    if (edge) {
      const face = splitVertexToken(edge[3]);
      const [x, y] = [edge[1], edge[2]];
      if (sameSet([...face, x], all4) && face.includes(y)) { apex = x; baseLabels = face; }
      else if (sameSet([...face, y], all4) && face.includes(x)) { apex = y; baseLabels = face; }
    } else if (faces) {
      const f1 = splitVertexToken(faces[1]), f2 = splitVertexToken(faces[2] ?? faces[3]);
      const other = f1.filter((v) => !f2.includes(v));
      if (other.length === 1 && sameSet([...f2, other[0]], all4)) { apex = other[0]; baseLabels = f2; }
    }
  }

  const bf = gopDay(baseFacts(ctx, baseLabels), baseLabels[0]);
  if (bf.some((f) => f.variant === UNKNOWN || f.variant === CAN_CHUA_RO)) return refuse('đáy chưa hiểu');
  if (new Set(bf.map((f) => `${f.variant}|${f.anchor ?? ''}`)).size > 1) return refuse('hai mô tả đáy');
  const n = baseLabels.length;
  let bVar: BaseVariant = n === 3 ? 'triangle' : 'square';
  let bAnc: string | undefined;
  if (bf.length) { bVar = bf[0].variant; bAnc = bf[0].anchor; }
  // Đáy được tả hình dạng ("đáy ABCD là tam giác đều", "đáy là hình thang vuông…") mà không đọc ra → không đoán.
  if (!bf.length && /[Đđ]áy[^.;,]{0,14}?(?:tam\s+giác(?:\s+[A-Z]{3,4})?\s+(?:đều|vuông|cân)|hình\s+(?:vuông|chữ\s+nhật|thoi|bình\s+hành|thang)|lục\s+giác)/u.test(p)) {
    return refuse('đáy tả hình dạng nhưng chưa đọc được');
  }
  // Mô tả đáy có mặt nhưng không đọc được (lục giác, "đáy là S √ hình…") → không đoán.
  if (!bf.length && new RegExp(`[Đđ]áy(?:\\s+[A-Z]{3,})?\\s+(?:là\\s+)?(?:một\\s+)?(?:lục|ngũ|đa|nửa)\\s+giác`, 'u').test(p)) return refuse('đáy đa giác');
  if (isRegular) {
    const want: BaseVariant = n === 3 ? 'equilateral-triangle' : 'square';
    if (bf.length && bVar !== want) return refuse('đều nhưng đáy khác');
    bVar = want; bAnc = undefined;
  }
  if (allEq && head.flavor !== 'box') {
    if (n === 3) {
      if (bf.length && bVar !== 'equilateral-triangle') return refuse('mọi cạnh bằng nhau nhưng đáy khác');
      bVar = 'equilateral-triangle'; bAnc = undefined;
    } else if (head.flavor === 'pyramid') {
      if (bf.length && !['square', 'rhombus'].includes(bVar)) return refuse('mọi cạnh bằng nhau nhưng đáy khác');
      bVar = 'square';
    } else if (!bf.length) {
      bVar = 'rhombus';
    } else if (!['square', 'rhombus'].includes(bVar)) return refuse('mọi cạnh bằng nhau nhưng đáy khác');
  }
  if (bVar === 'rhombus') {
    const acute = rhombusAcute(p, baseLabels);
    if (acute && acute !== 'khác') { bVar = 'rhombus-60'; bAnc = acute; }
  }

  // ── Hộp / lập phương ──
  if (head.flavor === 'box') {
    const cube = /lập\s+phương/u.test(q) || allEq;
    const spec: SolidSpec3D = {
      flavor: 'box', baseLabels, topLabels: head.top,
      baseVariant: cube ? 'square' : (bf.length ? bVar : 'rectangle'),
      apexVariant: 'free',
      ...(cube ? { heightMode: 'lateral-eq-base' as HeightMode } : {}),
      ...(!cube && bAnc ? { baseAnchor: bAnc } : {}),
    };
    if (!['square', 'rectangle', 'rhombus', 'rhombus-60', 'parallelogram'].includes(spec.baseVariant)) return refuse('đáy hộp');
    if (cube && bf.length && bVar !== 'square') return refuse('lập phương nhưng đáy khác');
    return { spec, clauseIds: claimsOf(bf) };
  }

  // ── Lăng trụ ──
  if (head.flavor === 'prism') {
    const top = head.top ?? [];
    const pf = prismProjFacts(ctx, baseLabels, top, bVar);
    if (pf.some((f) => f.variant === 'unknown')) return refuse('hình chiếu chưa hiểu');
    if (new Set(pf.map((f) => `${f.projOf}|${f.variant}|${f.anchor ?? ''}|${JSON.stringify(f.weights ?? {})}`)).size > 1) return refuse('hai hình chiếu');
    const oblique = pf.length > 0;
    if (oblique && /đứng|đều/u.test(q)) return refuse('đứng/đều mà xiên');
    if (coManhMoiChuaHieu(ctx, [
      /(?<!là\s)[Hh]ình\s+chiếu(?:\s+vuông\s+góc)?\s+của\s+(?:điểm\s+|đỉnh\s+)?[A-Z]'[^.;]{0,50}?\s(?:là|trùng|và)\s/u,
      /(?:nằm\s+trong|thuộc)\s+(?:một\s+)?mặt\s+phẳng\s+vuông\s+góc/u,
      /(?<![\p{L}])[A-Z]'[A-Z]'?\s*=\s*[A-Z]'[A-Z]'?\s*=/u,
    ])) return refuse('dữ kiện lăng trụ chưa hiểu');
    const spec: SolidSpec3D = {
      flavor: 'prism', baseLabels, topLabels: top, baseVariant: bVar, apexVariant: 'free',
      ...(bAnc ? { baseAnchor: bAnc } : {}),
    };
    if (oblique) {
      const f = pf[0];
      if (f.variant === 'over-circumcenter' && !(n === 3 || ['square', 'rectangle'].includes(bVar))) return refuse('đáy không nội tiếp');
      if (f.variant === 'unknown') return refuse('hình chiếu chưa hiểu');
      spec.projOf = f.projOf;
      spec.apexVariant = f.variant;
      if (f.anchor) spec.apexAnchor = f.anchor;
      if (f.weights) spec.apexWeights = f.weights;
    } else if (allEq || (latEq && isRegular)) {
      spec.heightMode = 'lateral-eq-base';
    }
    return { spec, clauseIds: claimsOf(bf, pf) };
  }

  // ── Chóp / tứ diện ──
  apex = apex!;
  const isTetraReg = head.flavor === 'tetrahedron' && isRegular;
  const af = apexFacts(ctx, apex, baseLabels, bVar);
  const A = esc(apex);
  const verts = [apex, ...baseLabels].map(esc).join('');
  if (coManhMoiChuaHieu(ctx, [
    new RegExp(`(?<![\\p{L}])${A}[A-Z]'?\\s*(?:⊥|vuông\\s+góc)`, 'u'),
    new RegExp(`\\(${A}[A-Z]{2}\\)\\s*(?:⊥|vuông\\s+góc|và\\s*\\([A-Z]{3}\\)\\s*(?:cùng\\s+)?vuông\\s+góc)`, 'u'),
    new RegExp(`(?<![\\p{L}'])\\(?${A}[A-Z]{2}\\)?\\s+vuông(?:\\s+góc)?(?:\\s+với)?\\s+(?:mặt\\s+phẳng\\s+)?\\(?[A-Z]{3,4}\\)?`, 'u'),
    /(?:nằm\s+trong|thuộc)\s+(?:một\s+)?mặt\s+phẳng\s+vuông\s+góc/u,
    // "hình chiếu của S lên đáy LÀ/TRÙNG …" (ràng buộc) — KHÔNG phải "H là hình chiếu của S…" (định nghĩa H)
    new RegExp(`(?<!là\\s)[Hh]ình\\s+chiếu(?:\\s+vuông\\s+góc)?\\s+của\\s+(?:điểm\\s+|đỉnh\\s+)?${A}(?![\\p{L}'])[^.;]{0,50}?\\s(?:là|trùng|và)\\s`, 'u'),
    new RegExp(`(?<![\\p{L}'])[${verts}][${verts}]\\s*(?:⊥|vuông\\s+góc(?:\\s+với)?)\\s*(?:đường\\s+thẳng\\s+|cạnh\\s+)?[${verts}][${verts}](?![\\p{L}'(])`, 'u'),
    /đôi\s+một\s+vuông\s+góc/u,
    new RegExp(`(?<![\\p{L}'])(?![${verts}]{2})[A-Z][A-Z]'?\\s*(?:⊥|vuông\\s+góc)(?:\\s+với)?\\s*(?:mặt\\s+phẳng\\s+)?(?:mặt\\s+)?đáy`, 'u'),
    /(?:hai\s+mặt\s+phẳng|\(?[A-Z]{3,4}\)?\s*(?:và|,)\s*\(?[A-Z]{3,4}\)?)[^.;]{0,20}?(?:cùng\s+)?vuông\s+góc/u,
    /mặt\s+phẳng\s*\(?[A-Z]{3,4}\)?\s*(?:⊥|vuông\s+góc\s+với)\s*(?:mặt\s+phẳng\s*)?(?:\(?[A-Z]{3,4}\)?|(?:mặt\s+)?đáy)/u,
    /(?:(?:[Cc]ác|[Mm]ọi)\s+(?:mặt|cạnh)\s+bên|(?:mặt|cạnh)\s+bên\s+(?:đều|cùng))[^.;]{0,40}?(?:tạo|hợp)\s+với\s+(?:mặt\s+)?(?:phẳng\s+)?đáy/u,
  ])) return refuse('dữ kiện vuông góc chưa hiểu');

  if (af.some((f) => f.variant === 'unknown')) return refuse('chân đường cao chưa hiểu');
  const strong = af.filter((f) => !f.weak);
  if (new Set(strong.map((f) => `${f.variant}|${f.anchor ?? ''}|${f.height ?? ''}|${JSON.stringify(f.weights ?? {})}`)).size > 1) return refuse('hai chân đường cao');

  const spec: SolidSpec3D = {
    flavor: head.flavor, baseLabels, baseVariant: bVar, apex, apexVariant: 'regular',
    ...(bAnc ? { baseAnchor: bAnc } : {}),
  };
  const cyclic = n === 3 || ['square', 'rectangle', 'trapezoid', 'half-hexagon'].includes(bVar);
  const parallelogramFamily = ['square', 'rectangle', 'rhombus', 'rhombus-60', 'parallelogram'].includes(bVar);
  let center: string | undefined;
  if (strong.length) {
    const f = strong[0];
    if (f.variant === 'unknown') return refuse('chân đường cao chưa hiểu');
    if ((isRegular || isTetraReg || allEq) && f.variant === 'over-incenter') f.variant = 'regular'; // chóp đều: tâm nội tiếp ≡ tâm
    if ((isRegular || isTetraReg || allEq) && f.variant !== 'regular') return refuse('đều mà chân không ở tâm');
    if (f.variant === 'over-incenter' && !(n === 3 || ['square', 'rhombus', 'rhombus-60'].includes(bVar))) return refuse('đáy không có đường tròn nội tiếp');
    spec.apexVariant = f.variant;
    if (f.anchor?.startsWith('center:')) {
      center = f.anchor.slice(7);
      if (n === 3 && bVar !== 'equilateral-triangle') return refuse('tâm tam giác thường mơ hồ');
    } else if (f.anchor) spec.apexAnchor = f.anchor;
    if (f.weights) spec.apexWeights = f.weights;
    if (f.height) spec.heightMode = f.height;
    if (f.variant === 'regular' && !(n === 3 || parallelogramFamily)) return refuse('tâm đáy hình thang');
  } else if (af.some((f) => f.weak) || allEq) {
    if (!cyclic) return refuse('cạnh bên bằng nhau, đáy không nội tiếp');
    spec.apexVariant = 'over-circumcenter';
  }
  if (isRegular || isTetraReg || allEq) {
    spec.apexVariant = spec.apexVariant === 'over-circumcenter' || n === 3 || bVar === 'square' ? spec.apexVariant : 'regular';
    if (allEq || isTetraReg || (latEq && isRegular)) spec.heightMode = 'lateral-eq-base';
  }
  return { spec, clauseIds: claimsOf(bf, af), ...(center ? { center } : {}) };
}

/** parseKhoiDaDien chỉ từ đề (tự tách clause) — cho _shared.solidRuleDraws / parseSolidHead3D. */
export function khoiDaDienFromProblem(problem: string): KhoiDaDien | KhoiTuChoi | null {
  const clauses = segmentClauses3D(problem).filter((c) => c.hasGeometry);
  return parseKhoiDaDien({ problem, clauses });
}
