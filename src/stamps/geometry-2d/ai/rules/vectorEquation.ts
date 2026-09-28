// src/stamps/geometry-2d/ai/rules/vectorEquation.ts
//
// Đọc ĐẲNG THỨC VECTƠ / HỆ THỨC ĐỘ DÀI theo tỉ số (Toán 10, chương Vectơ) thành
// dạng tuyến tính — thuần, không phụ thuộc engine, để pointRatio dựng điểm chính xác.
//
// Quy ước viết đề (docs/datasets/lop10-2026-09.sources.md): "vectơ MA" = \vec{MA},
// "vectơ 0" = vectơ-không, hệ số đứng trước: "2 vectơ MB", "-3 vectơ MC",
// "1/3 vectơ AB", "1/2(vectơ AB + vectơ AC)". Biến thể "véc tơ", "vecto", "vec-tơ"
// được chuẩn hoá bằng chuanHoaVecto.
//
// Vectơ XY = Y − X. Đẳng thức Σcᵢ·vectơ(UᵢVᵢ) = Σdⱼ·vectơ(…) chuyển vế thành
// Σ w_Q·Q = 0 (Σ w_Q = 0 luôn đúng). Điểm cần dựng P có w_P ≠ 0 ⇒
//   P = Σ_{Q≠P} α_Q·Q,  α_Q = −w_Q / w_P,  Σα_Q = 1  (tổ hợp affine).

export type Lin = Map<string, number>;

/** "véc tơ" / "vecto" / "vec-tơ" / "Vectơ" → "vectơ"; dấu trừ Unicode → "-". */
export function chuanHoaVecto(s: string): string {
  return s
    .replace(/[Vv][eé]c\s*-?\s*t[ơo](?!\p{L})/gu, 'vectơ')
    .replace(/[−–]/gu, '-');
}

type Tok =
  | { t: 'num'; v: number }
  | { t: 'vec'; from: string; to: string }
  | { t: 'zero' }
  | { t: '+' | '-' | '(' | ')' | '=' | '*' };

const TOKS: [RegExp, (m: RegExpExecArray) => Tok][] = [
  [/^vectơ\s*0(?![\d])/u, () => ({ t: 'zero' })],
  [/^vectơ\s*([A-Z]['′]?)([A-Z]['′]?)(?![A-Z\d])/u, (m) => ({ t: 'vec', from: m[1].replace('′', "'"), to: m[2].replace('′', "'") })],
  [/^(\d+(?:[.,]\d+)?)\s*\/\s*(\d+(?:[.,]\d+)?)(?![\d])/u, (m) => ({ t: 'num', v: num(m[1]) / num(m[2]) })],
  [/^\d+(?:[.,]\d+)?(?![\d])/u, (m) => ({ t: 'num', v: num(m[0]) })],
  [/^[+]/u, () => ({ t: '+' })],
  [/^-/u, () => ({ t: '-' })],
  [/^\(/u, () => ({ t: '(' })],
  [/^\)/u, () => ({ t: ')' })],
  [/^=/u, () => ({ t: '=' })],
  [/^[.·×*]/u, () => ({ t: '*' })],
];

function num(s: string): number {
  return Number(s.replace(',', '.'));
}

/** Tách token từ đầu `s` cho tới ký tự đầu tiên không thuộc ngữ pháp. */
function tokenize(s: string): Tok[] {
  const out: Tok[] = [];
  let rest = s;
  for (;;) {
    rest = rest.replace(/^\s+/u, '');
    if (!rest) break;
    let hit = false;
    for (const [re, mk] of TOKS) {
      const m = re.exec(rest);
      if (m) {
        out.push(mk(m));
        rest = rest.slice(m[0].length);
        hit = true;
        break;
      }
    }
    if (!hit) break;
  }
  return out;
}

const add = (a: Lin, b: Lin, k = 1): Lin => {
  const r = new Map(a);
  for (const [p, w] of b) r.set(p, (r.get(p) ?? 0) + k * w);
  return r;
};

/** Parser đệ quy trên dãy token; trả null nếu sai ngữ pháp. */
class P {
  i = 0;
  constructor(private ts: Tok[]) {}
  peek(): Tok | undefined {
    return this.ts[this.i];
  }
  expr(): Lin | null {
    let acc: Lin = new Map();
    let sign = 1;
    let first = true;
    for (;;) {
      const tk = this.peek();
      if (tk?.t === '+' || tk?.t === '-') {
        sign = tk.t === '-' ? -1 : 1;
        this.i++;
      } else if (!first) {
        break;
      }
      const t = this.term();
      if (!t) return null;
      acc = add(acc, t, sign);
      sign = 1;
      first = false;
      const nx = this.peek();
      if (nx?.t !== '+' && nx?.t !== '-') break;
    }
    return acc;
  }
  term(): Lin | null {
    let k = 1;
    const tk = this.peek();
    if (tk?.t === 'num') {
      k = tk.v;
      this.i++;
      if (this.peek()?.t === '*') this.i++;
    }
    const a = this.peek();
    if (a?.t === 'vec') {
      this.i++;
      if (a.from === a.to) return new Map(); // vectơ AA = vectơ 0
      return new Map([[a.to, k], [a.from, -k]]);
    }
    if (a?.t === 'zero') {
      this.i++;
      return new Map();
    }
    if (a?.t === '(') {
      this.i++;
      const e = this.expr();
      if (!e || this.peek()?.t !== ')') return null;
      this.i++;
      return add(new Map(), e, k);
    }
    // "= 0" trần (vế phải là vectơ-không viết tắt).
    if (tk?.t === 'num' && tk.v === 0) return new Map();
    return null;
  }
}

/**
 * Đọc MỘT đẳng thức vectơ ở đầu `s` ("vectơ MA + 2 vectơ MB = vectơ 0 …").
 * null nếu không phải đẳng thức vectơ (phải có ít nhất một "vectơ XY").
 */
export function docDangThucVecto(s: string): Lin | null {
  const ts = tokenize(s);
  if (!ts.some((t) => t.t === 'vec')) return null;
  const p = new P(ts);
  const l = p.expr();
  if (!l || p.peek()?.t !== '=') return null;
  p.i++;
  const r = p.expr();
  if (!r) return null;
  const lin = add(l, r, -1);
  for (const [q, w] of lin) if (Math.abs(w) < 1e-12) lin.delete(q);
  return lin;
}

/** Mọi đẳng thức vectơ trong đoạn văn (quét từ mỗi vị trí có thể bắt đầu vế trái). */
export function moiDangThucVecto(text: string): Lin[] {
  const s = chuanHoaVecto(text);
  const out: Lin[] = [];
  const starts = /(?:^|[\s,:;(])(?=[-+]?\s*(?:\d+(?:[.,]\d+)?(?:\s*\/\s*\d+)?\s*[.·×*]?\s*)?(?:vectơ|\())/gu;
  let lastEnd = -1;
  for (const m of s.matchAll(starts)) {
    const at = m.index! + m[0].length;
    if (at <= lastEnd) continue;
    const seg = s.slice(at);
    const lin = docDangThucVecto(seg);
    if (!lin) continue;
    out.push(lin);
    // Bỏ qua phần đã đọc: tới dấu phẩy/"và" kế sau dấu "=".
    const eq = seg.indexOf('=');
    const stop = seg.slice(eq).search(/,|;|\svà\s/u);
    lastEnd = at + eq + (stop < 0 ? seg.length : stop);
  }
  return out;
}

/** Giải P từ Σ w_Q·Q = 0 ⇒ P = Σ α_Q·Q. undefined nếu w_P = 0 hoặc P không có mặt. */
export function giaiDiem(lin: Lin, P: string): Map<string, number> | undefined {
  const wP = lin.get(P);
  if (!wP || Math.abs(wP) < 1e-12) return undefined;
  const out = new Map<string, number>();
  for (const [q, w] of lin) if (q !== P) out.set(q, -w / wP);
  return out;
}

// ── Hệ thức ĐỘ DÀI theo tỉ số trên một đoạn ─────────────────────────────────────

/** Một vế "k·XY" / "XY/k" của hệ thức độ dài; cap = '' ⇒ vế là SỐ ĐO k (cm…). */
export interface VeDoDai {
  k: number;
  cap: string; // 2 ký tự đỉnh, hoặc '' cho số đo
}

const VE = /^\s*(?:(\d+(?:[.,]\d+)?(?:\s*\/\s*\d+(?:[.,]\d+)?)?)\s*[.·×*]?\s*)?([A-Z])([A-Z])(?![A-Z'′])(?:\s*\/\s*(\d+(?:[.,]\d+)?))?/u;
const VE_SO = /^\s*(\d+(?:[.,]\d+)?)(?!\s*[√\d/])\s*(?:cm|dm|mm|m)?(?![\p{L}\d])/u;

/** Chuỗi "BD = 2DC", "AM = 1/3 AB", "BM = MN = NC", "3MA = 2MB", "BD = 2 cm" ở đầu `s`. */
export function docChuoiDoDai(s: string): VeDoDai[] | null {
  const out: VeDoDai[] = [];
  let rest = s;
  for (;;) {
    const m = VE.exec(rest);
    const so = m ? null : VE_SO.exec(rest);
    if (!m && !so) return null;
    if (so) {
      const v = num(so[1]);
      if (!(v > 0)) return null;
      out.push({ k: v, cap: '' });
      rest = rest.slice(so[0].length);
    } else if (m) {
      let k = 1;
      if (m[1]) {
        const [a, b] = m[1].split('/').map((x) => num(x.trim()));
        k = b ? a / b : a;
      }
      if (m[4]) k /= num(m[4]);
      if (!(k > 0)) return null;
      out.push({ k, cap: m[2] + m[3] });
      rest = rest.slice(m[0].length);
    }
    const eq = /^\s*=/u.exec(rest);
    if (!eq) break;
    rest = rest.slice(eq[0].length);
  }
  return out.length >= 2 && out.some((v) => v.cap) ? out : null;
}

/** Đổi vế số đo thành bội của |XY| khi đề cho độ dài XY (len); không cho ⇒ null. */
export function quySoDo(chuoi: VeDoDai[], X: string, Y: string, len: number | undefined): VeDoDai[] | null {
  if (!chuoi.some((v) => !v.cap)) return chuoi;
  if (!len || !(len > 0)) return null;
  return chuoi.map((v) => (v.cap ? v : { k: v.k / len, cap: X + Y }));
}

/**
 * Vị trí t (P = X + t·(Y − X)) của điểm P trên ĐOẠN XY từ chuỗi độ dài chỉ dính
 * P, X, Y. Mỗi vế là k·(a + b·t)·|XY|: |PX| = t, |PY| = 1 − t, |XY| = 1.
 * undefined nếu chuỗi dính điểm khác, suy biến, mâu thuẫn hoặc t ∉ (0, 1).
 */
export function viTriTrenDoan(chuoi: VeDoDai[], P: string, X: string, Y: string): number | undefined {
  const tap = new Set([P, X, Y]);
  const affine: [number, number][] = [];
  for (const v of chuoi) {
    if (!tap.has(v.cap[0]) || !tap.has(v.cap[1]) || v.cap[0] === v.cap[1]) return undefined;
    const s = new Set(v.cap);
    if (s.has(P) && s.has(X)) affine.push([0, v.k]);
    else if (s.has(P) && s.has(Y)) affine.push([v.k, -v.k]);
    else affine.push([v.k, 0]);
  }
  let t: number | undefined;
  for (let i = 0; i + 1 < affine.length; i++) {
    const [a1, b1] = affine[i];
    const [a2, b2] = affine[i + 1];
    const db = b1 - b2;
    if (Math.abs(db) < 1e-12) {
      if (Math.abs(a1 - a2) > 1e-12) return undefined; // mâu thuẫn
      continue;
    }
    const ti = (a2 - a1) / db;
    if (t !== undefined && Math.abs(t - ti) > 1e-9) return undefined;
    t = ti;
  }
  if (t === undefined || !(t > 1e-9 && t < 1 - 1e-9)) return undefined;
  return t;
}

/**
 * Chuỗi CHIA ĐỀU "BM = MN = NC" (mọi hệ số bằng nhau, các cặp nối thành đường đi
 * X → P₁ → … → Y qua đúng các điểm mới) ⇒ Pᵢ = X + i/n·(Y − X).
 */
export function chiaDeu(chuoi: VeDoDai[], moi: readonly string[], X: string, Y: string): Map<string, number> | undefined {
  if (chuoi.length !== moi.length + 1) return undefined;
  if (chuoi.some((v) => Math.abs(v.k - chuoi[0].k) > 1e-12)) return undefined;
  const ke = new Map<string, string[]>();
  for (const v of chuoi) {
    const [a, b] = [v.cap[0], v.cap[1]];
    ke.set(a, [...(ke.get(a) ?? []), b]);
    ke.set(b, [...(ke.get(b) ?? []), a]);
  }
  const out = new Map<string, number>();
  let prev = '';
  let cur = X;
  for (let i = 1; i <= moi.length; i++) {
    const nx = (ke.get(cur) ?? []).filter((q) => q !== prev);
    if (nx.length !== 1 || !moi.includes(nx[0]) || out.has(nx[0])) return undefined;
    out.set(nx[0], i / (moi.length + 1));
    prev = cur;
    cur = nx[0];
  }
  const cuoi = (ke.get(cur) ?? []).filter((q) => q !== prev);
  if (cuoi.length !== 1 || cuoi[0] !== Y) return undefined;
  return out;
}
