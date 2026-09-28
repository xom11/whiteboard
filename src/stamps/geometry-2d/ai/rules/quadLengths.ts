// src/stamps/geometry-2d/ai/rules/quadLengths.ts
//
// Đặt toạ độ hình chữ nhật / bình hành / thoi / thang vuông THEO SỐ ĐO đề cho, thay
// hình mẫu cố định (cùng tinh thần triangleLengths):
//   "hình chữ nhật ABCD có AB = 3, AD = 4"         → AD dài hơn AB đúng tỉ lệ
//   "hình bình hành ABCD có AB = 4, AD = 2, góc BAD = 60°"
//   "hình thoi ABCD cạnh a, góc BAD = 60°"          → góc A = 60° (tam giác ABD đều)
//   "hình thoi ABCD có AC = 6, BD = 8"              → hai đường chéo 6 : 8
//   "hình thang ABCD vuông tại A và D, AB = 2a, AD = DC = a"
// Đỉnh theo thứ tự tên hình A→B→C→D (ngược chiều kim đồng hồ, AB nằm ngang dưới),
// cỡ chuẩn: kích thước lớn nhất = 5 như tam giác.
//
// Góc "góc BAD"/"góc A" chỉ nhận khi là góc TRONG của tứ giác (hai cạnh kề); "góc
// BAC" (góc với đường chéo) bỏ qua. Không đủ / mâu thuẫn → undefined (giữ hình mẫu).
import { doCanhDeCho, GOC } from './triangleLengths';

type Pt = readonly [number, number];
const DEG = Math.PI / 180;
const CO_CHUAN = 5;
const key = (p: string, q: string) => [p, q].sort().join('');

/** Góc TRONG theo đỉnh (độ) của tứ giác `L` (A→B→C→D). */
export function gocTuGiac(problem: string, L: readonly string[]): Map<string, number> {
  const out = new Map<string, number>();
  const ke = (v: string) => {
    const i = L.indexOf(v);
    return new Set([L[(i + 1) % 4], L[(i + 3) % 4]]);
  };
  for (const m of problem.matchAll(GOC)) {
    const v = m[4] ?? m[2];
    if (!L.includes(v)) continue;
    if (!m[4]) {
      const k = ke(v);
      if (!k.has(m[1]) || !k.has(m[3]) || m[1] === m[3]) continue;
    }
    const deg = Number(m[5].replace(',', '.'));
    if (!(deg > 0 && deg < 180)) continue;
    if (out.has(v) && Math.abs(out.get(v)! - deg) > 1e-9) return new Map(); // mâu thuẫn
    out.set(v, deg);
  }
  return out;
}

// "MN = 2MQ", "AB = 2AD", "BC = 3/2 AB" — tỉ số giữa hai cạnh.
const TI_SO = /(?<![A-Z])([A-Z])([A-Z])\s*=\s*(\d+(?:[.,]\d+)?(?:\s*\/\s*\d+)?)\s*([A-Z])([A-Z])(?![A-Z'′])/gu;

/**
 * Hai kích thước (ngang = AB|CD, xiên/đứng = AD|BC) từ số đo + tỉ số giữa chúng.
 * Chỉ biết tỉ số ⇒ lấy ngang = 1.
 */
function haiCanh(problem: string, L: readonly string[], lens: Map<string, number>): [number | undefined, number | undefined] {
  const [A, B, C, D] = L;
  const ngang = new Set([key(A, B), key(C, D)]);
  const doc = new Set([key(A, D), key(B, C)]);
  let w = lens.get(key(A, B)) ?? lens.get(key(C, D));
  let h = lens.get(key(A, D)) ?? lens.get(key(B, C));
  for (const m of problem.matchAll(TI_SO)) {
    const [p, q] = [key(m[1], m[2]), key(m[4], m[5])];
    const [x, y] = m[3].split('/').map((t) => Number(t.trim().replace(',', '.')));
    const k = y ? x / y : x;
    if (!(k > 0)) continue;
    if (ngang.has(p) && doc.has(q)) {
      if (w === undefined && h === undefined) h = 1;
      if (w === undefined && h !== undefined) w = k * h;
      else if (h === undefined && w !== undefined) h = w / k;
    } else if (doc.has(p) && ngang.has(q)) {
      if (w === undefined && h === undefined) w = 1;
      if (h === undefined && w !== undefined) h = k * w;
      else if (w === undefined && h !== undefined) w = h / k;
    }
  }
  return [w, h];
}

function co(pts: Pt[]): Pt[] {
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const s = CO_CHUAN / Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
  return pts.map(([x, y]) => [x * s, y * s] as Pt);
}

/**
 * Toạ độ 4 đỉnh theo số đo, hoặc undefined. shape/variant như quad.ts
 * ('rectangle' | 'parallelogram' | 'rhombus' | 'trapezoid' + 'right').
 */
export function toaDoTuGiacTheoSoDo(
  shape: string,
  variant: string,
  labels: readonly [string, string, string, string],
  problem: string,
): Record<string, Pt> | undefined {
  const [A, B, C, D] = labels;
  const lens = doCanhDeCho(problem, labels);
  const len = (p: string, q: string) => lens.get(key(p, q));
  const G = gocTuGiac(problem, labels);
  // Góc tại A suy từ bất kỳ đỉnh nào (hình bình hành: đối bằng nhau, kề bù).
  const gocA = (): number | undefined => {
    const cands = [G.get(A), G.get(C), G.get(B) !== undefined ? 180 - G.get(B)! : undefined, G.get(D) !== undefined ? 180 - G.get(D)! : undefined]
      .filter((x): x is number => x !== undefined);
    if (cands.some((x) => Math.abs(x - cands[0]) > 1e-9)) return NaN;
    return cands[0];
  };
  const dat = (pts: Pt[]) => {
    const c = co(pts);
    return { [A]: c[0], [B]: c[1], [C]: c[2], [D]: c[3] };
  };

  if (shape === 'rectangle') {
    if (G.size) return undefined; // hình chữ nhật không cần góc — đề cho góc là góc khác
    let [w, h] = haiCanh(problem, labels, lens);
    const d = len(A, C) ?? len(B, D);
    if (w && !h && d && d > w) h = Math.sqrt(d * d - w * w);
    if (h && !w && d && d > h) w = Math.sqrt(d * d - h * h);
    if (!w || !h) return undefined;
    return dat([[0, 0], [w, 0], [w, h], [0, h]]);
  }

  if (shape === 'parallelogram' || shape === 'rhombus') {
    const g = gocA();
    if (Number.isNaN(g)) return undefined;
    if (shape === 'rhombus') {
      const p = len(A, C);
      const q = len(B, D);
      let half: [number, number] | undefined;
      if (g !== undefined) half = [Math.cos((g / 2) * DEG), Math.sin((g / 2) * DEG)];
      else if (p && q) half = [p / 2, q / 2];
      if (!half) return undefined;
      // Như hình mẫu: A trái, B dưới, C phải, D trên.
      const [x, y] = half;
      return dat([[-x, 0], [0, -y], [x, 0], [0, y]]);
    }
    let [a, b] = haiCanh(problem, labels, lens);
    if (g === undefined && !(a && b)) return undefined;
    if (!a && !b) { a = 4; b = Math.sqrt(10); }
    else if (!a) a = b! * 4 / Math.sqrt(10);
    else if (!b) b = a * Math.sqrt(10) / 4;
    const t = (g ?? Math.atan2(3, 1) / DEG) * DEG; // hình mẫu: AD = (1, 3) ⇒ ≈ 71,6°
    const dx = b! * Math.cos(t);
    const dy = b! * Math.sin(t);
    return dat([[0, 0], [a!, 0], [a! + dx, dy], [dx, dy]]);
  }

  if (shape === 'trapezoid' && variant === 'right') {
    // Vuông tại A và D (hình mẫu): AB đáy dưới, AD chiều cao, DC đáy trên.
    const ab = len(A, B);
    const dc = len(C, D);
    const ad = len(A, D);
    if (!ab || !dc || !ad) return undefined;
    return dat([[0, 0], [ab, 0], [dc, ad], [0, ad]]);
  }
  return undefined;
}
