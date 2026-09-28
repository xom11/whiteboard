// src/stamps/geometry-2d/ai/rules/triangleAngles.ts
//
// Đặt toạ độ tam giác THEO SỐ ĐO GÓC và BẤT ĐẲNG THỨC CẠNH đề cho. Trước đây mọi
// tam giác không có độ dài cạnh đều dùng tam giác mẫu, nên:
//   "tam giác ABC có góc A = 90°; góc B = 60°"   → vẽ tam giác thường (sai, KHÔNG vuông)
//   "tam giác ABC cân tại A, có góc A = 50°"     → góc đỉnh ≈ 67°
//   "góc BAC là góc tù"                          → góc A ≈ 56°
//   "tam giác ABC (AB < AC)"                     → mẫu có AB > AC (ngược đề) — kéo theo
//       "Trên cạnh AC lấy E sao cho AE = AB" rơi RA NGOÀI cạnh.
// Hình vẫn "full" nhưng sai đề — đúng loại lỗi người xem thấy ngay.
//
// Góc: "góc A = 90°", "góc BAC = 120°", "góc B bằng 60°", "góc X là góc tù/nhọn".
// Kết hợp với variant (vuông tại X ⇒ X = 90°; cân tại X ⇒ hai góc đáy bằng nhau).
//   ≥2 góc biết              → góc thứ ba = 180° − tổng (phải > 0)
//   1 góc + cân              → suy nốt
//   1 góc, không gì thêm     → chia phần còn lại 45% / 55% (tránh vô tình cân)
// Bất đẳng thức "AB < AC", "AB > BC" (cạnh của tam giác này): chọn hoán vị toạ độ
// mẫu thoả mọi bất đẳng thức mà vẫn giữ đúng variant; hình dựng theo góc thì chỉ
// KIỂM (không thoả → bỏ, giữ mẫu).
// Không nhất quán (tổng ≥ 180°, góc vuông mâu thuẫn variant…) → undefined.
type Pt = readonly [number, number];

const DEG = Math.PI / 180;
const CO = 5;

function soDo(s: string): number {
  return Number(s.replace(',', '.'));
}

/** Góc tại từng đỉnh đề cho, theo độ. */
export function gocDeCho(problem: string, labels: readonly string[]): Map<string, number> | null {
  const tap = new Set(labels);
  const out = new Map<string, number>();
  const set = (v: string, deg: number) => {
    if (!tap.has(v) || !(deg > 0 && deg < 180)) return true;
    const cu = out.get(v);
    if (cu !== undefined && Math.abs(cu - deg) > 1e-9) return false;
    out.set(v, deg);
    return true;
  };
  const RE = /(?<!\p{L})góc\s+([A-Z])([A-Z])?([A-Z])?(?![\p{L}\d'′])\s*(?:=|bằng)\s*(\d{1,3}(?:[.,]\d+)?)\s*°/gu;
  for (const m of problem.matchAll(RE)) {
    const [, a, b, c, v] = m;
    let dinh: string | undefined;
    if (!b && !c) dinh = a;
    else if (b && c && tap.has(a) && tap.has(b) && tap.has(c) && new Set([a, b, c]).size === 3) dinh = b;
    else continue;
    if (!set(dinh, soDo(v))) return null;
  }
  const LOAI = /(?<!\p{L})góc\s+([A-Z])([A-Z])?([A-Z])?\s+là\s+góc\s+(tù|vuông)(?!\p{L})/gu;
  for (const m of problem.matchAll(LOAI)) {
    const [, a, b, c, loai] = m;
    const dinh = !b && !c ? a : b && c && tap.has(a) && tap.has(c) ? b : undefined;
    if (!dinh || out.has(dinh)) continue;
    if (!set(dinh, loai === 'vuông' ? 90 : 115)) return null;
  }
  return out;
}

/** Bất đẳng thức cạnh "AB < AC" giữa hai cạnh của tam giác: [nhỏ, lớn]. */
export function batDangThucCanh(problem: string, labels: readonly string[]): Array<[string, string]> {
  const tap = new Set(labels);
  const out: Array<[string, string]> = [];
  const RE = /(?<![A-Z])([A-Z])([A-Z])\s*([<>])\s*([A-Z])([A-Z])(?![\p{L}\d'′])/gu;
  for (const m of problem.matchAll(RE)) {
    const [, a, b, op, c, d] = m;
    if (![a, b, c, d].every((x) => tap.has(x)) || a === b || c === d) continue;
    const s1 = [a, b].sort().join('');
    const s2 = [c, d].sort().join('');
    if (s1 === s2) continue;
    out.push(op === '<' ? [s1, s2] : [s2, s1]);
  }
  return out;
}

function giaiGoc(labels: readonly string[], variant: string, known: Map<string, number>): number[] | null {
  const g: (number | undefined)[] = labels.map((l) => known.get(l));
  const right = /^right-at-([ABC])$/.exec(variant);
  if (right) {
    const i = 'ABC'.indexOf(right[1]);
    if (g[i] !== undefined && Math.abs(g[i]! - 90) > 1e-9) return null;
    g[i] = 90;
  }
  const iso = /^isoceles-([ABC])([ABC])$/.exec(variant);
  const apex = iso ? [0, 1, 2].find((i) => !iso[0].slice(9).includes('ABC'[i]))! : -1;
  if (variant === 'equilateral') return null; // đã đúng hình, số đo góc không đổi được gì
  const biet = () => g.filter((x) => x !== undefined).length;
  if (apex >= 0) {
    const [b1, b2] = [0, 1, 2].filter((i) => i !== apex);
    if (g[b1] !== undefined && g[b2] !== undefined && Math.abs(g[b1]! - g[b2]!) > 1e-9) return null;
    if (g[b1] !== undefined) g[b2] = g[b1];
    else if (g[b2] !== undefined) g[b1] = g[b2];
    if (g[apex] !== undefined && g[b1] === undefined) g[b1] = g[b2] = (180 - g[apex]!) / 2;
    if (g[apex] === undefined && g[b1] !== undefined) g[apex] = 180 - 2 * g[b1]!;
  }
  if (biet() === 0) return null;
  if (biet() === 2) {
    const i = g.findIndex((x) => x === undefined);
    g[i] = 180 - g.reduce<number>((s, x) => s + (x ?? 0), 0);
  } else if (biet() === 1) {
    const con = 180 - g.find((x) => x !== undefined)!;
    const idx = [0, 1, 2].filter((i) => g[i] === undefined);
    g[idx[0]] = con * 0.45;
    g[idx[1]] = con * 0.55;
  }
  if (g.some((x) => x === undefined || !(x > 0.5)) || Math.abs(g.reduce<number>((s, x) => s + x!, 0) - 180) > 1e-6) return null;
  return g as number[];
}

const len = (p: Pt, q: Pt) => Math.hypot(p[0] - q[0], p[1] - q[1]);

function thoa(coords: Record<string, Pt>, bdt: Array<[string, string]>): boolean {
  return bdt.every(([s, l]) => len(coords[s[0]], coords[s[1]]) < len(coords[l[0]], coords[l[1]]) - 1e-9);
}

/**
 * Toạ độ theo góc / bất đẳng thức cạnh; undefined = không có gì để áp (giữ mẫu)
 * hoặc dữ kiện mâu thuẫn.
 */
export function toaDoTamGiacTheoGoc(
  labels: readonly [string, string, string],
  variant: string,
  problem: string,
  mau: readonly [Pt, Pt, Pt],
): Record<string, Pt> | undefined {
  const known = gocDeCho(problem, labels);
  if (!known) return undefined;
  const bdt = batDangThucCanh(problem, labels);
  const goc = known.size > 0 ? giaiGoc(labels, variant, known) : null;
  if (goc) {
    // Cạnh đối đỉnh labels[0] nằm ngang: labels[1] tại gốc, labels[2] trên trục x.
    const [a, b, c] = goc.map((x) => x * DEG);
    const ab = (CO * Math.sin(c)) / Math.sin(a); // luật sin, BC = CO
    const P1: Pt = [0, 0];
    const P2: Pt = [CO, 0];
    const P0: Pt = [ab * Math.cos(b), ab * Math.sin(b)];
    // Góc đã xác định hình dạng; BĐT cạnh (nếu có) là hệ quả, không chỉnh thêm được.
    return { [labels[0]]: P0, [labels[1]]: P1, [labels[2]]: P2 };
  }
  if (bdt.length === 0) return undefined;
  // Hoán vị toạ độ mẫu giữ variant: any → mọi hoán vị; vuông/cân tại X → giữ X, đổi hai đỉnh kia.
  const perms: number[][] = [
    [0, 1, 2],
    [0, 2, 1],
    [1, 0, 2],
    [1, 2, 0],
    [2, 0, 1],
    [2, 1, 0],
  ];
  const giuDinh = /^(?:right-at-|isoceles-)/.test(variant)
    ? variant.startsWith('right')
      ? 'ABC'.indexOf(variant.slice(-1))
      : [0, 1, 2].find((i) => !variant.slice(9).includes('ABC'[i]))!
    : -1;
  for (const p of perms) {
    if (giuDinh >= 0 && p[giuDinh] !== giuDinh) continue;
    const coords: Record<string, Pt> = { [labels[0]]: mau[p[0]], [labels[1]]: mau[p[1]], [labels[2]]: mau[p[2]] };
    if (thoa(coords, bdt)) return p.every((x, i) => x === i) ? undefined : coords;
  }
  return undefined;
}

/**
 * Tỉ số hai cạnh đề cho ("AB = AC/2", "BC = 2AB", "AC = 2.AB") → độ dài tương đối
 * (khoá cặp đỉnh đã sắp xếp) để `toaDoTamGiacTheoCanh` dựng. Chỉ nhận MỘT tỉ số
 * giữa hai cạnh của tam giác; nhiều hơn/không rõ → rỗng.
 */
export function tiSoCanh(problem: string, labels: readonly string[]): Map<string, number> {
  const tap = new Set(labels);
  const RE = /(?<![A-Z\d])([A-Z])([A-Z])\s*=\s*(?:(\d+)\s*[.·]?\s*)?([A-Z])([A-Z])(?:\s*\/\s*(\d+))?(?![\p{L}\d'′])(?!\s*[+\-*])/gu;
  const out: Array<[string, string, number]> = [];
  for (const m of problem.matchAll(RE)) {
    const [, a, b, k, c, d, chia] = m;
    if (![a, b, c, d].every((x) => tap.has(x)) || a === b || c === d) continue;
    if (!k && !chia) continue; // "AB = AC" là cân, không phải tỉ số
    const r = (k ? Number(k) : 1) / (chia ? Number(chia) : 1);
    if (!(r > 0) || r === 1) continue;
    out.push([[a, b].sort().join(''), [c, d].sort().join(''), r]);
  }
  if (out.length !== 1 || out[0][0] === out[0][1]) return new Map();
  const [s1, s2, r] = out[0];
  return new Map([
    [s1, r],
    [s2, 1],
  ]);
}
