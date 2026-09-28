// src/stamps/geometry-2d/ai/rules/quadLayout.ts
//
// Đặt toạ độ TỨ GIÁC ĐẶC BIỆT theo dữ kiện đề, thay vì hình mẫu cố định (lớp 8):
//   "hình thang ABCD (AD // BC)"            → đáy là AD, BC (hình mẫu vẽ AB // CD = SAI đề)
//   "hình thang ABCD (AB // CD) có AB < CD"  → đáy AB ngắn hơn CD
//   "hình thang vuông ABCD, góc A = góc B = 90°" → cạnh bên AB vuông góc hai đáy
//   "hình thang cân ABCD có AB = 4 cm, CD = 10 cm, AD = 5 cm"
//   "hình thoi ABCD có góc A = 60°" / "có AC = 6 cm, BD = 8 cm"
//   "hình bình hành ABCD có AB = 2AD, góc A = 120°"
//   "hình chữ nhật ABCD có AB = 8 cm, BC = 6 cm" / "AB = 2AD"
//
// Chỉ TỈ LỆ quan trọng: hình được co về cỡ chuẩn (kích thước lớn nhất = 5) như
// tam giác mẫu. Dữ kiện đọc được: chuỗi bằng nhau độ dài giữa các cạnh/đường chéo
// của CHÍNH tứ giác ("AB = AD = CD/2", "AB = 2AD", "AC = 6 cm"), số đo góc tại đỉnh
// ("góc A = góc D = 90°", "góc BAD = 60°"), cặp đáy ("AD // BC", "đáy AD, BC",
// "đáy lớn CD") và so sánh đáy ("AB < CD").
//
// "Thà thiếu còn hơn sai": sau khi dựng, KIỂM LẠI mọi dữ kiện đã đọc — lệch (dữ kiện
// mâu thuẫn, dạng chưa hiểu) ⇒ undefined, rule giữ hành vi cũ. Không có dữ kiện nào
// ⇒ undefined (giữ nguyên hình mẫu — không đổi hình các đề đang đúng).
type Pt = readonly [number, number];

const CO_CHUAN = 5;
const EPS = 1e-6;
const rad = (d: number) => (d * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;
const key = (p: string, q: string) => [p, q].sort().join('');

// ---------------------------------------------------------------------------
// Đọc dữ kiện
// ---------------------------------------------------------------------------

// Một vế độ dài: "2AD", "AD", "CD/2", "1/2 CD", "½CD", "6 cm", "6".
const NUM = String.raw`\d+(?:[.,]\d+)?`;
const TERM = String.raw`(?:(?:${NUM}\s*\/\s*${NUM}|${NUM}|½)\s*)?[A-Z]{2}(?![A-Z])(?:\s*\/\s*${NUM})?|${NUM}\s*(?:cm|dm|mm|m)?(?![\p{L}\d])`;
const CHAIN = new RegExp(String.raw`(?<![A-Z\d.,+\-·×*/²])(?:${TERM})(?:\s*=\s*(?:${TERM}))+`, 'gu');

interface Ve { k?: string; he: number; so?: number }

function num(s: string): number {
  return Number(s.replace(',', '.'));
}

function docVe(t: string): Ve | null {
  const s = t.trim();
  let m = /^(?:(\d+(?:[.,]\d+)?)\s*\/\s*(\d+(?:[.,]\d+)?)|(\d+(?:[.,]\d+)?)|(½))?\s*([A-Z])([A-Z])(?:\s*\/\s*(\d+(?:[.,]\d+)?))?$/u.exec(s);
  if (m) {
    let he = 1;
    if (m[1]) he = num(m[1]) / num(m[2]);
    else if (m[3]) he = num(m[3]);
    else if (m[4]) he = 0.5;
    if (m[7]) he /= num(m[7]);
    if (!(he > 0) || m[5] === m[6]) return null;
    return { k: key(m[5], m[6]), he };
  }
  m = /^(\d+(?:[.,]\d+)?)\s*(?:cm|dm|mm|m)?$/u.exec(s);
  if (m && num(m[1]) > 0) return { he: 1, so: num(m[1]) };
  return null;
}

/** Quan hệ độ dài: val(a) = r·val(b), hoặc val(a) = so (b vắng). */
interface QuanHe { a: string; b?: string; r: number }

function docQuanHe(text: string, laCanh: (k: string) => boolean): QuanHe[] {
  const out: QuanHe[] = [];
  for (const m of text.matchAll(CHAIN)) {
    const end = (m.index ?? 0) + m[0].length;
    // Tích / tổng / luỹ thừa ngay sau chuỗi ("AD² = DM.BN", "AB = AD + DC") → bỏ.
    // Dấu chấm câu ". Gọi …" KHÔNG phải tích: tích là ".BN"/"·BN" (2 chữ HOA rồi hết chữ).
    if (/^\s*(?:[.·×*]\s*[A-Z]{2}(?![\p{L}])|[+\-]\s*[A-Z\d(]|²)/u.test(text.slice(end))) continue;
    const ves = m[0].split('=').map(docVe);
    if (ves.some((v) => !v)) continue;
    const vs = ves as Ve[];
    if (vs.some((v) => v.k && !laCanh(v.k))) continue; // có đoạn ngoài tứ giác → bỏ cả chuỗi
    if (vs.filter((v) => v.so !== undefined).length > 1) continue;
    const goc = vs.find((v) => v.k)!;
    if (!goc) continue;
    for (const v of vs) {
      if (v === goc) continue;
      // he_goc·goc = he_v·v
      if (v.k) out.push({ a: v.k, b: goc.k, r: goc.he / v.he });
      else out.push({ a: goc.k!, r: v.so! / goc.he });
    }
  }
  return out;
}

/** Giải hệ tỉ lệ: trả giá trị (theo "đơn vị" chung) cho từng cạnh, mỗi thành phần liên thông một thang. */
function giaiDoDai(qh: QuanHe[]): { val: Map<string, number>; comp: Map<string, number> } | null {
  const adj = new Map<string, { to: string; r: number }[]>();
  const add = (a: string, b: string, r: number) => {
    adj.set(a, [...(adj.get(a) ?? []), { to: b, r }]);
  };
  for (const q of qh) {
    const b = q.b ?? '#';
    add(q.a, b, q.r); // val(a) = r·val(b)
    add(b, q.a, 1 / q.r);
  }
  const val = new Map<string, number>();
  const comp = new Map<string, number>();
  let c = 0;
  const nodes = ['#', ...[...adj.keys()].filter((k) => k !== '#')];
  for (const start of nodes) {
    if (!adj.has(start) || val.has(start)) continue;
    val.set(start, 1);
    comp.set(start, c);
    const st = [start];
    while (st.length) {
      const u = st.pop()!;
      for (const { to, r } of adj.get(u) ?? []) {
        // val(u) = r·val(to) ⇒ val(to) = val(u)/r
        const v = val.get(u)! / r;
        if (val.has(to)) {
          if (Math.abs(val.get(to)! - v) > 1e-6 * Math.max(1, v)) return null; // mâu thuẫn
        } else {
          val.set(to, v);
          comp.set(to, c);
          st.push(to);
        }
      }
    }
    c++;
  }
  val.delete('#');
  return { val, comp };
}

/** Góc tại đỉnh (độ), từ "góc A = 60°", "góc BAD = 60°", "góc A = góc D = 90°", "Â = 60°". */
function docGoc(text: string, labels: readonly string[]): Map<string, number> | null {
  const out = new Map<string, number>();
  const GOC = String.raw`(?:[Gg]óc\s+([A-Z]{3}|[A-Z]\d?)(?![A-Z\d])|([A-Z])̂)`;
  const re = new RegExp(String.raw`${GOC}(?:\s*=\s*${GOC})*\s*=\s*(\d+(?:[.,]\d+)?)\s*(?:°|độ|o(?![\p{L}]))`, 'gu');
  for (const m of text.matchAll(re)) {
    const v = num(m[m.length - 1]);
    for (const g of m[0].matchAll(new RegExp(GOC, 'gu'))) {
      const ten = g[1] ?? g[2];
      let dinh: string | undefined;
      if (ten.length === 1) dinh = ten;
      else if (ten.length === 3) {
        const i = labels.indexOf(ten[1]);
        if (i < 0) continue;
        const ke = [labels[(i + 1) % 4], labels[(i + 3) % 4]];
        if (!(ke.includes(ten[0]) && ke.includes(ten[2]) && ten[0] !== ten[2])) continue;
        dinh = ten[1];
      }
      if (!dinh || !labels.includes(dinh)) continue;
      if (out.has(dinh) && Math.abs(out.get(dinh)! - v) > EPS) return null;
      out.set(dinh, v);
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Dựng
// ---------------------------------------------------------------------------

export interface TuGiacTheoDe {
  coords: Record<string, Pt>;
  variant: string;
}

/**
 * Toạ độ 4 đỉnh theo dữ kiện đề, hoặc undefined (giữ hình mẫu).
 * shape ∈ trapezoid|parallelogram|rectangle|rhombus (square/tứ giác chung: undefined).
 */
export function toaDoTuGiacTheoDe(
  problem: string,
  shape: string,
  variant: string,
  labels: readonly string[],
): TuGiacTheoDe | undefined {
  if (labels.length !== 4 || new Set(labels).size !== 4) return undefined;
  const [A, B, C, D] = labels;
  const canh = new Set([key(A, B), key(B, C), key(C, D), key(D, A)]);
  const cheo = new Set([key(A, C), key(B, D)]);
  const qh = docQuanHe(problem, (k) => canh.has(k) || cheo.has(k));
  const goc = docGoc(problem, labels);
  if (!goc) return undefined;
  if (shape === 'trapezoid') {
    // "hình thang ABCD vuông tại A và D" ⇒ góc A = góc D = 90°.
    const m = /vuông\s+(?:tại|ở)\s+([A-Z])\s*(?:và|,)\s*([A-Z])(?![A-Z])/u.exec(problem);
    if (m && labels.includes(m[1]) && labels.includes(m[2])) for (const d of [m[1], m[2]]) {
      if (goc.has(d) && Math.abs(goc.get(d)! - 90) > EPS) return undefined;
      goc.set(d, 90);
    }
  }
  const giai = giaiDoDai(qh);
  if (!giai) return undefined;

  let kq: TuGiacTheoDe | undefined;
  switch (shape) {
    case 'trapezoid': kq = hinhThang(problem, variant, labels, giai, goc); break;
    case 'parallelogram': kq = binhHanh(labels, giai, goc); break;
    case 'rectangle': kq = chuNhat(labels, giai, goc); break;
    case 'rhombus': kq = hinhThoi(labels, giai, goc); break;
    default: return undefined;
  }
  if (!kq) return undefined;
  // Kiểm lại: mọi quan hệ độ dài + góc đọc được phải đúng trên hình.
  const P = kq.coords;
  const len = (k: string) => Math.hypot(P[k[0]][0] - P[k[1]][0], P[k[0]][1] - P[k[1]][1]);
  const donVi = new Map<number, number>();
  for (const [k, v] of giai.val) {
    const c = giai.comp.get(k)!;
    const u = len(k) / v;
    if (!donVi.has(c)) donVi.set(c, u);
    else if (Math.abs(donVi.get(c)! - u) > 1e-6 * u) return undefined;
  }
  // Thành phần chứa số đo tuyệt đối ('#') chỉ cần tỉ lệ đúng — đã kiểm ở trên.
  for (const [d, v] of goc) {
    const i = labels.indexOf(d);
    const p = P[d];
    const q1 = P[labels[(i + 1) % 4]];
    const q2 = P[labels[(i + 3) % 4]];
    const a1 = Math.atan2(q1[1] - p[1], q1[0] - p[0]);
    const a2 = Math.atan2(q2[1] - p[1], q2[0] - p[0]);
    let g = Math.abs(deg(a1 - a2));
    if (g > 180) g = 360 - g;
    if (Math.abs(g - v) > 1e-6) return undefined;
  }
  return { ...kq, coords: coChuan(kq.coords) };
}

function coChuan(P: Record<string, Pt>): Record<string, Pt> {
  const xs = Object.values(P).map((p) => p[0]);
  const ys = Object.values(P).map((p) => p[1]);
  const [x0, y0] = [Math.min(...xs), Math.min(...ys)];
  const k = CO_CHUAN / Math.max(Math.max(...xs) - x0, Math.max(...ys) - y0);
  return Object.fromEntries(Object.entries(P).map(([n, p]) => [n, [(p[0] - x0) * k, (p[1] - y0) * k] as Pt]));
}

type Giai = { val: Map<string, number>; comp: Map<string, number> };

/** Tỉ số val(k1)/val(k2) nếu cùng thành phần. */
function tiSo(g: Giai, k1: string, k2: string): number | undefined {
  if (!g.val.has(k1) || !g.val.has(k2) || g.comp.get(k1) !== g.comp.get(k2)) return undefined;
  return g.val.get(k1)! / g.val.get(k2)!;
}

/** Góc (độ) tại đỉnh d; với hình bình hành/thoi, góc đối bằng nhau, góc kề bù. */
function gocHbh(labels: readonly string[], goc: Map<string, number>): number | undefined {
  const [A, B, C, D] = labels;
  const vals: number[] = [];
  for (const [d, v] of goc) vals.push(d === A || d === C ? v : 180 - v);
  if (vals.some((v) => Math.abs(v - vals[0]) > EPS)) return undefined; // mâu thuẫn → verify sẽ loại
  void B; void D;
  return vals[0];
}

function binhHanh(labels: readonly string[], g: Giai, goc: Map<string, number>): TuGiacTheoDe | undefined {
  const [A, B, C, D] = labels;
  const ab = [key(A, B), key(C, D)];
  const ad = [key(A, D), key(B, C)];
  let tl: number | undefined; // AD/AB
  for (const x of ab) for (const y of ad) tl ??= tiSo(g, y, x);
  const alpha = goc.size ? gocHbh(labels, goc) : undefined;
  if (tl === undefined && alpha === undefined) return undefined;
  if (alpha !== undefined && (alpha <= 0 || alpha >= 180)) return undefined;
  const a = 4;
  const d = a * (tl ?? Math.sqrt(10) / 4);
  const t = rad(alpha ?? deg(Math.atan2(3, 1)));
  const pD: Pt = [d * Math.cos(t), d * Math.sin(t)];
  return { variant: 'standard', coords: { [A]: [0, 0], [B]: [a, 0], [C]: [a + pD[0], pD[1]], [D]: pD } };
}

function chuNhat(labels: readonly string[], g: Giai, goc: Map<string, number>): TuGiacTheoDe | undefined {
  const [A, B, C, D] = labels;
  if ([...goc.values()].some((v) => Math.abs(v - 90) > EPS)) return undefined;
  const ab = [key(A, B), key(C, D)];
  const ad = [key(A, D), key(B, C)];
  const ch = [key(A, C), key(B, D)];
  let tl: number | undefined; // AD/AB
  for (const x of ab) for (const y of ad) tl ??= tiSo(g, y, x);
  if (tl === undefined) {
    // cạnh + đường chéo
    for (const c of ch) {
      for (const x of ab) {
        const r = tiSo(g, c, x); // chéo/AB
        if (r !== undefined && r > 1) tl ??= Math.sqrt(r * r - 1);
      }
      for (const y of ad) {
        const r = tiSo(g, c, y); // chéo/AD
        if (r !== undefined && r > 1) tl ??= 1 / Math.sqrt(r * r - 1);
      }
    }
  }
  if (tl === undefined) return undefined;
  const a = 4;
  const d = a * tl;
  return { variant: 'wide', coords: { [A]: [0, 0], [B]: [a, 0], [C]: [a, d], [D]: [0, d] } };
}

function hinhThoi(labels: readonly string[], g: Giai, goc: Map<string, number>): TuGiacTheoDe | undefined {
  const [A, B, C, D] = labels;
  const ac = key(A, C);
  const bd = key(B, D);
  const canh = [key(A, B), key(B, C), key(C, D), key(D, A)];
  let half: number | undefined; // nửa góc A (rad)
  const alpha = goc.size ? gocHbh(labels, goc) : undefined;
  if (alpha !== undefined) {
    if (alpha <= 0 || alpha >= 180) return undefined;
    half = rad(alpha / 2);
  } else {
    const r = tiSo(g, bd, ac);
    if (r !== undefined) half = Math.atan(r);
    for (const s of canh) {
      const rA = tiSo(g, ac, s); // AC/cạnh = 2cos(half)
      if (half === undefined && rA !== undefined && rA < 2) half = Math.acos(rA / 2);
      const rB = tiSo(g, bd, s); // BD/cạnh = 2sin(half)
      if (half === undefined && rB !== undefined && rB < 2) half = Math.asin(rB / 2);
    }
  }
  if (half === undefined) return undefined;
  const p = 2 * Math.cos(half);
  const q = 2 * Math.sin(half);
  return { variant: 'standard', coords: { [A]: [-p, 0], [B]: [0, -q], [C]: [p, 0], [D]: [0, q] } };
}

// --- Hình thang --------------------------------------------------------------

const DAY_SS = /(?<![A-Z])([A-Z])([A-Z])\s*(?:\/\/|∥|song\s+song\s+(?:với\s+)?)\s*([A-Z])([A-Z])(?![A-Z])/gu;
const HAI_DAY = /(?:hai\s+)?đáy\s+(?:là\s+)?([A-Z])([A-Z])\s*(?:,|và)\s*([A-Z])([A-Z])(?![A-Z])/gu;
const DAY_LON_NHO = /đáy\s+(lớn|nhỏ|bé)\s+(?:là\s+)?([A-Z])([A-Z])(?![A-Z])/gu;
const SO_SANH = /(?<![A-Z])([A-Z])([A-Z])\s*([<>])\s*([A-Z])([A-Z])(?![A-Z])/gu;

/**
 * Vị trí mẫu p0..p3 (chu trình): p0p1 = đáy DƯỚI (a), p3p2 = đáy TRÊN (b), cạnh bên
 * p0p3 và p1p2. Ánh xạ nhãn → vị trí là một phép quay/đối xứng của chu trình ABCD.
 */
function anhXa(labels: readonly string[]): string[][] {
  const out: string[][] = [];
  for (let r = 0; r < 4; r++) {
    out.push([0, 1, 2, 3].map((i) => labels[(r + i) % 4]));
    out.push([0, 1, 2, 3].map((i) => labels[(r + 1 - i + 8) % 4]));
  }
  return out;
}

function hinhThang(
  problem: string,
  variant: string,
  labels: readonly string[],
  g: Giai,
  goc: Map<string, number>,
): TuGiacTheoDe | undefined {
  const [A, B, C, D] = labels;
  const canhSet = new Set([key(A, B), key(B, C), key(C, D), key(D, A)]);
  const doiDien = (k1: string, k2: string) =>
    canhSet.has(k1) && canhSet.has(k2) && new Set([...k1, ...k2]).size === 4;

  // Cặp đáy khai báo.
  const cap: Set<string> = new Set();
  const themCap = (k1: string, k2: string) => {
    if (doiDien(k1, k2)) cap.add([k1, k2].sort().join('|'));
  };
  for (const m of problem.matchAll(DAY_SS)) themCap(key(m[1], m[2]), key(m[3], m[4]));
  for (const m of problem.matchAll(HAI_DAY)) themCap(key(m[1], m[2]), key(m[3], m[4]));
  let dayLon: string | undefined;
  let dayNho: string | undefined;
  for (const m of problem.matchAll(DAY_LON_NHO)) {
    const k = key(m[2], m[3]);
    if (!canhSet.has(k)) continue;
    if (m[1] === 'lớn') dayLon = k;
    else dayNho = k;
  }
  const doiCua = (k: string) => [...canhSet].find((x) => doiDien(k, x))!;
  if (dayLon && !dayNho) dayNho = doiCua(dayLon);
  if (dayNho && !dayLon) dayLon = doiCua(dayNho);
  if (dayLon) themCap(dayLon, dayNho!);
  for (const m of problem.matchAll(SO_SANH)) {
    const [k1, k2] = [key(m[1], m[2]), key(m[4], m[5])];
    if (!doiDien(k1, k2)) continue;
    const [lon, nho] = m[3] === '>' ? [k1, k2] : [k2, k1];
    if ((dayLon && dayLon !== lon) || (dayNho && dayNho !== nho)) return undefined;
    [dayLon, dayNho] = [lon, nho];
    themCap(lon, nho);
  }

  // Góc vuông ⇒ hình thang vuông; hai đỉnh vuông kề nhau xác định cạnh bên ⊥ đáy.
  const vuong = [...goc].filter(([, v]) => Math.abs(v - 90) < EPS).map(([d]) => d);
  let v2 = variant;
  if (vuong.length > 0 && variant === 'general') v2 = 'right';
  if (v2 === 'isoceles' && vuong.length > 0) return undefined;
  if (vuong.length > 2) return undefined; // hình chữ nhật, không phải hình thang
  if (vuong.length === 2) {
    const k = key(vuong[0], vuong[1]);
    if (!canhSet.has(k)) return undefined;
    // cạnh bên = k ⇒ đáy = hai cạnh còn lại
    const con = [...canhSet].filter((x) => x !== k && doiDien(k, x) === false && x !== doiCua(k));
    if (con.length !== 2) return undefined;
    themCap(con[0], con[1]);
  }
  if (cap.size > 1) return undefined; // hai cặp song song = hình bình hành
  const [d1, d2] = cap.size ? [...cap][0].split('|') : [key(A, B), key(C, D)];
  if (cap.size === 0 && vuong.length === 0 && !g.val.size && !goc.size) return undefined;

  // Độ dài hai đáy (tỉ lệ).
  const a = 5;
  let b = v2 === 'general' ? 2.5 : 3; // như hình mẫu
  let lon = dayLon ?? d1;
  const r = tiSo(g, d2, d1); // d2/d1
  if (r !== undefined) {
    lon = r > 1 ? d2 : d1;
    if (dayLon && dayLon !== lon) return undefined;
    b = a * (r > 1 ? 1 / r : r);
    if (Math.abs(r - 1) < EPS) return undefined; // hai đáy bằng nhau = hình bình hành
  } else if (!dayLon && g.val.has(d2) && !g.val.has(d1)) {
    lon = d1;
  }
  const nho = lon === d1 ? d2 : d1;

  // Chọn ánh xạ: p0p1 = đáy lớn, đỉnh vuông ∈ {p0, p3}.
  // Ưu tiên đỉnh đầu (A) nằm bên TRÁI (p0 dưới-trái / p3 trên-trái) — dáng quen trong sách.
  const hopLe = anhXa(labels).filter((m) => {
    if (key(m[0], m[1]) !== lon || key(m[2], m[3]) !== nho) return false;
    return vuong.every((d) => d === m[0] || d === m[3]);
  });
  const map = hopLe.find((m) => m[0] === A || m[3] === A) ?? hopLe[0];
  if (!map) return undefined;
  const [p0, p1, p2, p3] = map;

  // Đơn vị: nếu biết độ dài đáy lớn theo thang, quy các đoạn khác cùng thang.
  const theoDayLon = (k: string): number | undefined => {
    const t = tiSo(g, k, lon);
    return t === undefined ? undefined : t * a;
  };
  const l0 = theoDayLon(key(p0, p3));
  const l1 = theoDayLon(key(p1, p2));
  const gocTai = (d: string) => goc.get(d);
  let a0 = gocTai(p0) ?? (gocTai(p3) !== undefined ? 180 - gocTai(p3)! : undefined);
  let a1 = gocTai(p1) ?? (gocTai(p2) !== undefined ? 180 - gocTai(p2)! : undefined);
  if (v2 === 'isoceles') {
    a0 ??= a1;
    a1 ??= a0;
  }
  const cot = (x: number) => 1 / Math.tan(rad(x));

  let s: number | undefined;
  let h: number | undefined;
  if (v2 === 'right') s = 0;
  if (v2 === 'isoceles' && r !== undefined) s = (a - b) / 2;
  if (s !== undefined) {
    if (v2 === 'right' && l0 !== undefined) h = l0;
    else if (l0 !== undefined && l0 > Math.abs(s)) h = Math.sqrt(l0 * l0 - s * s);
    else if (l1 !== undefined && l1 > Math.abs(a - s - b)) h = Math.sqrt(l1 * l1 - (a - s - b) ** 2);
    else if (a0 !== undefined && s > 0) h = s * Math.tan(rad(a0));
    else if (a1 !== undefined && a - s - b > 0) h = (a - s - b) * Math.tan(rad(a1));
    else if (v2 === 'isoceles' && a0 !== undefined) {
      // hai đáy chưa rõ tỉ lệ: giữ đáy nhỏ mặc định
      h = s * Math.tan(rad(a0));
    } else h = 3;
  } else if (v2 === 'isoceles') {
    // tỉ lệ đáy chưa biết
    if (l0 !== undefined && a0 !== undefined) {
      s = l0 * Math.cos(rad(a0));
      h = l0 * Math.sin(rad(a0));
      b = a - 2 * s;
    } else if (a0 !== undefined) {
      s = (a - b) / 2;
      h = s * Math.tan(rad(a0));
    } else if (l0 !== undefined && l0 > (a - b) / 2) {
      s = (a - b) / 2;
      h = Math.sqrt(l0 * l0 - s * s);
    } else {
      s = (a - b) / 2;
      h = 3;
    }
  } else if (a0 !== undefined && a1 !== undefined && r !== undefined) {
    h = (a - b) / (cot(a0) + cot(a1));
    s = h * cot(a0);
  } else if (a0 !== undefined && l0 !== undefined) {
    s = l0 * Math.cos(rad(a0));
    h = l0 * Math.sin(rad(a0));
  } else if (a1 !== undefined && l1 !== undefined) {
    h = l1 * Math.sin(rad(a1));
    s = a - b - l1 * Math.cos(rad(a1));
  } else if (l0 !== undefined && l1 !== undefined) {
    // tam giác cạnh (a−b), l0, l1
    const e = a - b;
    const x = (l0 * l0 - l1 * l1 + e * e) / (2 * e);
    if (l0 * l0 - x * x <= 0) return undefined;
    s = x;
    h = Math.sqrt(l0 * l0 - x * x);
  } else if (a0 !== undefined) {
    h = 3;
    s = h * cot(a0);
  } else if (a1 !== undefined) {
    h = 3;
    s = a - b - h * cot(a1);
  } else if (l0 !== undefined) {
    const t = Math.atan2(3, 1);
    s = l0 * Math.cos(t);
    h = l0 * Math.sin(t);
  } else if (l1 !== undefined) {
    const t = Math.atan2(3, 1.5);
    h = l1 * Math.sin(t);
    s = a - b - l1 * Math.cos(t);
  } else {
    s = (a - b) * 0.4;
    h = 3;
  }
  if (!(h! > 0) || !(b > 0) || !Number.isFinite(s!)) return undefined;
  return {
    variant: v2,
    coords: { [p0]: [0, 0], [p1]: [a, 0], [p2]: [s! + b, h!], [p3]: [s!, h!] },
  };
}
