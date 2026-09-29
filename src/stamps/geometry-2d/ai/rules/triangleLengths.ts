// src/stamps/geometry-2d/ai/rules/triangleLengths.ts
//
// Đặt toạ độ tam giác THEO SỐ ĐO đề cho, thay vì tam giác mẫu cố định:
//   "Cho tam giác ABC có AB = 4 cm, AC = 8 cm"  → AC dài gấp đôi AB trên hình.
// Tam giác mẫu ([0,0],[5,0],[2,3]) có AB > AC ⇒ học sinh nhìn hình thấy ngay "sai
// đề" (đúng lời phàn nàn khi test tay). Chỉ TỈ LỆ là quan trọng: hình được co về
// cỡ chuẩn (cạnh dài nhất = 5 đơn vị) như tam giác mẫu.
//
//   3 cạnh (đề cho, hoặc suy từ cân)          → dựng chính xác (định lý cos)
//   2 cạnh + vuông tại đỉnh chung / huyền     → chính xác
//   2 cạnh chung đỉnh, không biết góc         → góc 70° (tránh 60°/90°: hình không
//                                                được gợi ý tính chất đề không cho)
//   góc đề cho ("góc A = 60°", "góc BAC = 120°", "Â = 60°") → giải tam giác bằng
//   định lý cos/sin (hệ thức lượng lớp 10) — xem toaDoTamGiacTheoCanh.
// Không đủ dữ kiện / vi phạm bất đẳng thức tam giác → undefined (giữ tam giác mẫu).
type Pt = readonly [number, number];

// Số đo độ dài: "5", "2,5", "3√2", "√3", "2a", "a√3", "a√3/2", kèm đơn vị cm/dm/mm/m.
// Tham số "a" (đề cho cạnh theo a) chỉ dùng được khi MỌI số đo cùng theo a —
// trộn số thuần với "a" thì không biết tỉ lệ ⇒ bỏ hết (xem doCanhDeCho).
const NUM = String.raw`(\d+(?:[.,]\d+)?)?\s*(a(?![\p{L}\d]))?\s*(?:√\s*(\d+(?:[.,]\d+)?))?\s*(a(?![\p{L}\d]))?\s*(?:\/\s*(\d+))?\s*(?:cm|dm|mm|m)?(?![\p{L}\d])`;
// Chuỗi "AB = AC = 5" → mọi cặp đỉnh trước số đo đều nhận số đo đó.
const LEN = new RegExp(String.raw`(?<![A-Z])((?:[A-Z][A-Z]\s*=\s*)+)` + NUM, 'gu');
const LAN_LUOT = /(?<![A-Z])((?:[A-Z]{2}\s*(?:,|và)\s*)+[A-Z]{2})(?![A-Z])\s+(?:lần\s*lượt|theo\s+thứ\s+tự)\s+(?:là|bằng)\s+((?:\d+(?:,\d+)?(?:\s*(?:,\s+|;|và)\s*))+\d+(?:,\d+)?)(?![\d,])/gu;
// Ký hiệu cạnh chuẩn của tam giác ABC: a = BC, b = CA, c = AB ("a = 7, b = 8, c = 5").
const SIDE_ABC = new RegExp(String.raw`(?<![\p{L}\d])([abc])\s*=\s*` + NUM, 'gu');
// Số đo góc: "góc A = 60°", "góc BAC = 120°", "∠B = 45°", "Â = 60°", "góc C bằng 30 độ".
export const GOC = /(?:(?<!\p{L})[Gg]óc|∠)\s*(?:([A-Z])([A-Z])([A-Z])|([A-Z]))(?![A-Z'′\p{Ll}])\s*(?:=|bằng)\s*(\d+(?:[.,]\d+)?)\s*(?:°|º|˚|độ(?!\p{L}))/gu;
const GOC_MU = /(?<!\p{L})(Â|Ê|Ô|[A-Z]̂)\s*=\s*(\d+(?:[.,]\d+)?)\s*(?:°|º|˚|độ(?!\p{L}))/gu;
const TU_GIAC = /(?:tứ\s+giác|hình\s+(?:vuông|chữ\s+nhật|bình\s+hành|thoi|thang)(?:\s+(?:cân|vuông))?|[Ll]ục\s+giác|ngũ\s+giác)\s+([A-Z]{4,6})(?![A-Z])/gu;
const GOC_KHONG_RO = (70 * Math.PI) / 180;
const CO_CHUAN = 5;
const DEG = Math.PI / 180;

const key = (p: string, q: string) => [p, q].sort().join('');
const so = (x: string) => Number(x.replace(',', '.'));

/** Giá trị số đo từ các nhóm của NUM; undefined nếu nhóm rỗng. unit = 'a' | ''. */
function giaTri(g: (string | undefined)[]): { v: number; unit: string } | undefined {
  const [coef, a1, can, a2, mau] = g;
  if (!coef && !a1 && !can && !a2) return undefined;
  if (a1 && a2) return undefined;
  const v = (coef ? so(coef) : 1) * (can ? Math.sqrt(so(can)) : 1) / (mau ? so(mau) : 1);
  if (!(v > 0) || !Number.isFinite(v)) return undefined;
  return { v, unit: a1 || a2 ? 'a' : '' };
}

/** Số đo các cạnh của tam giác `labels` đề cho ("AB = 4 cm", "BC = 10", "AB = a√3"). */
export function doCanhDeCho(problem: string, labels: readonly string[]): Map<string, number> {
  const raw: { k: string; v: number; unit: string }[] = [];
  const tap = new Set(labels);
  for (const m of problem.matchAll(LEN)) {
    const gt = giaTri(m.slice(2, 7));
    if (!gt) continue;
    for (const cap of m[1].match(/[A-Z][A-Z]/gu) ?? []) {
      if (!tap.has(cap[0]) || !tap.has(cap[1]) || cap[0] === cap[1]) continue;
      raw.push({ k: key(cap[0], cap[1]), ...gt });
    }
  }
  // "độ dài ba cạnh AB, BC, CA lần lượt là 15, 18, 27" — zip 1-1 (số thập phân "3,5"
  // không có khoảng trắng sau dấu phẩy nên tách được bằng ", " / ";" / "và").
  for (const m of problem.matchAll(LAN_LUOT)) {
    const caps = m[1].split(/\s*,\s*|\s+và\s+/u);
    const vals = m[2].trim().split(/,\s+|\s*;\s*|\s+và\s+/u).map((x) => so(x.trim()));
    if (caps.length !== vals.length || vals.some((v) => !(v > 0))) continue;
    caps.forEach((cap, i) => {
      if (tap.has(cap[0]) && tap.has(cap[1]) && cap[0] !== cap[1]) raw.push({ k: key(cap[0], cap[1]), v: vals[i], unit: '' });
    });
  }
  if (tap.size === 3 && ['A', 'B', 'C'].every((x) => tap.has(x))) {
    const doi: Record<string, string> = { a: 'BC', b: 'AC', c: 'AB' };
    for (const m of problem.matchAll(SIDE_ABC)) {
      const gt = giaTri(m.slice(2, 7));
      if (gt) raw.push({ k: doi[m[1]], ...gt });
    }
  }
  const out = new Map<string, number>();
  if (new Set(raw.map((r) => r.unit)).size > 1) return out;
  for (const r of raw) out.set(r.k, r.v);
  // Đường cao từ đỉnh X: "đường cao AH = 3 cm" / "chiều cao AH = 3 cm" / "đường cao AH …
  // AH = 3 cm" → khoá 'h:A' (dùng cho tam giác cân: cạnh bên từ đáy + chiều cao).
  for (const m of problem.matchAll(/(?:[Đđ]ường|[Cc]hiều)\s*cao\s+([A-Z])([A-Z])(?![A-Z])/gu)) {
    const [X, H] = [m[1], m[2]];
    if (!tap.has(X) || tap.has(H)) continue;
    const v = new RegExp(`(?<![A-Z])(?:${X}${H}|${H}${X})\\s*=\\s*(\\d+(?:[.,]\\d+)?)`, 'u').exec(problem);
    if (v && Number(v[1].replace(',', '.')) > 0) out.set(`h:${X}`, Number(v[1].replace(',', '.')));
    // Chân H chia cạnh đáy: "BH = 16 cm, CH = 9 cm" → khoá 'f:B', 'f:C'.
    for (const Y of labels) {
      if (Y === X) continue;
      const f = new RegExp(`(?<![A-Z])(?:${Y}${H}|${H}${Y})\\s*=\\s*(\\d+(?:[.,]\\d+)?)`, 'u').exec(problem);
      if (f && Number(f[1].replace(',', '.')) > 0) out.set(`f:${Y}`, Number(f[1].replace(',', '.')));
    }
  }
  return out;
}

/**
 * Số đo góc TRONG của tam giác `labels` đề cho, theo đỉnh (độ). "góc BAC" chỉ nhận
 * khi hai cạnh của góc là hai cạnh của chính tam giác này. Một đỉnh bị cho hai số
 * đo khác nhau ⇒ bỏ đỉnh đó (không đoán).
 */
export function doGocDeCho(problem: string, labels: readonly string[]): Map<string, number> {
  const out = new Map<string, number>();
  const hong = new Set<string>();
  const tap = new Set(labels);
  const ghi = (v: string, deg: number) => {
    if (!tap.has(v) || !(deg > 0 && deg < 180)) return;
    const cu = out.get(v);
    if (cu !== undefined && Math.abs(cu - deg) > 1e-9) hong.add(v);
    out.set(v, deg);
  };
  // "góc A" trần khi A còn là đỉnh của tứ giác/đa giác trong đề ("hình thoi ABCD có
  // góc A = 60°") là góc của HÌNH ĐÓ, không phải của tam giác này ⇒ bỏ.
  const dinhHinhKhac = new Set<string>();
  for (const m of problem.matchAll(TU_GIAC)) for (const ch of m[1]) dinhHinhKhac.add(ch);
  for (const m of problem.matchAll(GOC)) {
    if (m[4]) {
      if (!dinhHinhKhac.has(m[4])) ghi(m[4], so(m[5]));
    }
    else if (m[1] !== m[3] && tap.has(m[1]) && tap.has(m[3]) && m[1] !== m[2] && m[3] !== m[2]) ghi(m[2], so(m[5]));
  }
  for (const m of problem.matchAll(GOC_MU)) {
    const v = m[1] === 'Â' ? 'A' : m[1] === 'Ê' ? 'E' : m[1] === 'Ô' ? 'O' : m[1][0];
    if (!dinhHinhKhac.has(v)) ghi(v, so(m[2]));
  }
  for (const v of hong) out.delete(v);
  return out;
}

/**
 * Độ dài ĐƯỜNG TRUNG TUYẾN đề cho, theo đỉnh: "trung tuyến AM = 8" (M ngoài tam
 * giác), hoặc "M là trung điểm (của) BC" + "AM = 8" ở đâu đó trong đề.
 */
export function doTrungTuyenDeCho(problem: string, labels: readonly string[]): Map<string, number> {
  const out = new Map<string, number>();
  const tap = new Set(labels);
  const doDai = (a: string, b: string): number | undefined => {
    for (const m of problem.matchAll(LEN)) {
      const caps = m[1].match(/[A-Z][A-Z]/gu) ?? [];
      if (!caps.some((c) => (c[0] === a && c[1] === b) || (c[0] === b && c[1] === a))) continue;
      const gt = giaTri(m.slice(2, 7));
      if (gt && gt.unit === '') return gt.v;
    }
    return undefined;
  };
  for (const m of problem.matchAll(/trung\s*tuyến\s+([A-Z])([A-Z])(?![A-Z'′])/gu)) {
    if (tap.has(m[1]) && !tap.has(m[2])) {
      const v = doDai(m[1], m[2]);
      if (v) out.set(m[1], v);
    }
  }
  for (const m of problem.matchAll(/(?<![A-Z])([A-Z])(?![A-Z'′])\s+là\s+trung\s*điểm\s+(?:của\s+)?(?:cạnh\s+|đoạn\s+)?([A-Z])([A-Z])(?![A-Z'′])/gu)) {
    if (tap.has(m[1]) || !tap.has(m[2]) || !tap.has(m[3]) || m[2] === m[3]) continue;
    const V = labels.find((x) => x !== m[2] && x !== m[3])!;
    const v = doDai(V, m[1]);
    if (v && !out.has(V)) out.set(V, v);
  }
  return out;
}

/**
 * Toạ độ 3 đỉnh [A, B, C] theo số đo, hoặc undefined nếu không đủ dữ kiện.
 * variant: 'right-at-X' | 'isoceles-XY' (đáy XY) | 'equilateral' | 'any'.
 * angles: số đo góc đề cho theo đỉnh (độ) — xem doGocDeCho.
 *
 *   3 cạnh / 2 cạnh + góc xen giữa / 1 cạnh + 2 góc  → chính xác (định lý cos, sin)
 *   2 cạnh + góc không xen giữa                     → nghiệm đầu (góc đối nhọn)
 *   chỉ biết đủ 3 góc (kể cả suy từ cân/vuông)      → đúng hình dạng (tỉ lệ tuỳ ý)
 *   chỉ biết 1 góc                                  → góc đó đúng, hai cạnh kề 1 : 1,3
 * Dữ kiện mâu thuẫn (tổng góc ≥ 180°, trái định lý sin/cos) → undefined.
 */
export function toaDoTamGiacTheoCanh(
  labels: readonly [string, string, string],
  variant: string,
  lens: Map<string, number>,
  angles: Map<string, number> = new Map(),
  medians: Map<string, number> = new Map(),
): Record<string, Pt> | undefined {
  if ((lens.size === 0 && angles.size === 0) || variant === 'equilateral') return undefined;
  const [A, B, C] = labels;
  // Đường cao từ V + hai đoạn chân H chia cạnh đối ("AH = 12, BH = 16, CH = 9"): H nằm
  // giữa hai đỉnh kia ⇒ dựng thẳng (đề Pythagore lớp 8 — tam giác vuông ẩn trong số đo).
  for (const V of labels) {
    const h = lens.get(`h:${V}`);
    const [P, Q] = labels.filter((x) => x !== V);
    const fp = lens.get(`f:${P}`);
    const fq = lens.get(`f:${Q}`);
    if (h && fp && fq) {
      const k = CO_CHUAN / Math.max(fp + fq, h);
      return { [V]: [fp * k, h * k], [P]: [0, 0], [Q]: [(fp + fq) * k, 0] };
    }
  }
  const L = new Map(lens);
  const G = new Map(angles);
  const len = (p: string, q: string) => L.get(key(p, q));
  const doi = (v: string) => {
    const [x, y] = labels.filter((t) => t !== v);
    return key(x, y);
  };

  // Cân: hai cạnh bên bằng nhau, hai góc đáy bằng nhau (đáy XY ⇒ đỉnh là đỉnh còn lại).
  const can = /^isoceles-([ABC])([ABC])$/.exec(variant);
  if (can) {
    const idx = (ch: string) => 'ABC'.indexOf(ch);
    const [b1, b2] = [labels[idx(can[1])], labels[idx(can[2])]];
    const apex = labels.find((x) => x !== b1 && x !== b2)!;
    const l1 = len(apex, b1);
    const l2 = len(apex, b2);
    if (l1 && !l2) L.set(key(apex, b2), l1);
    if (l2 && !l1) L.set(key(apex, b1), l2);
    // Chiều cao từ đỉnh cân h + đáy ⇒ cạnh bên (Pythagore); h + cạnh bên ⇒ đáy.
    const h = L.get(`h:${apex}`);
    const dayLen = len(b1, b2);
    const ben = len(apex, b1);
    if (h && dayLen && !ben) {
      L.set(key(apex, b1), Math.hypot(h, dayLen / 2));
      L.set(key(apex, b2), Math.hypot(h, dayLen / 2));
    } else if (h && ben && !dayLen && ben > h) {
      L.set(key(b1, b2), 2 * Math.sqrt(ben * ben - h * h));
    }
    const g1 = G.get(b1);
    const g2 = G.get(b2);
    if (g1 !== undefined && g2 !== undefined && Math.abs(g1 - g2) > 1e-9) return undefined;
    const day = g1 ?? g2;
    if (day !== undefined) {
      G.set(b1, day);
      G.set(b2, day);
    } else if (G.has(apex)) {
      const d = (180 - G.get(apex)!) / 2;
      G.set(b1, d);
      G.set(b2, d);
    }
  }

  // Vuông tại V: góc V = 90°; suy cạnh thứ ba bằng Pythagore.
  const vuong = /^right-at-([ABC])$/.exec(variant);
  const V = vuong ? labels['ABC'.indexOf(vuong[1])] : undefined;
  if (V) {
    if (G.has(V) && Math.abs(G.get(V)! - 90) > 1e-9) return undefined;
    if (G.size > 0) G.set(V, 90);
    const [X, Y] = labels.filter((x) => x !== V);
    const a = len(V, X);
    const b = len(V, Y);
    const h = len(X, Y);
    if (a && b && !h) L.set(key(X, Y), Math.hypot(a, b));
    else if (a && h && !b && h > a) L.set(key(V, Y), Math.sqrt(h * h - a * a));
    else if (b && h && !a && h > b) L.set(key(V, X), Math.sqrt(h * h - b * b));
  }

  // Trung tuyến m_V (công thức 4m² = 2b² + 2c² − a², a = cạnh đối V): biết 3 trong
  // 4 đại lượng ⇒ suy đại lượng còn lại. Chỉ dùng khi ĐỦ 3 (không đoán).
  for (const [Vm, m] of medians) {
    if (!labels.includes(Vm)) continue;
    const [X, Y] = labels.filter((x) => x !== Vm);
    const a = len(X, Y);
    const b = len(Vm, X);
    const c = len(Vm, Y);
    const bp = (v: number | undefined) => (v === undefined ? undefined : v * v);
    if (a && b && !c) {
      const c2 = (4 * m * m + a * a - 2 * b * b) / 2;
      if (!(c2 > 0)) return undefined;
      L.set(key(Vm, Y), Math.sqrt(c2));
    } else if (a && c && !b) {
      const b2 = (4 * m * m + a * a - 2 * c * c) / 2;
      if (!(b2 > 0)) return undefined;
      L.set(key(Vm, X), Math.sqrt(b2));
    } else if (b && c && !a) {
      const a2 = 2 * bp(b)! + 2 * bp(c)! - 4 * m * m;
      if (!(a2 > 0)) return undefined;
      L.set(key(X, Y), Math.sqrt(a2));
    } else if (a && b && c && Math.abs(4 * m * m - (2 * b * b + 2 * c * c - a * a)) > 0.02 * 4 * m * m) {
      return undefined; // mâu thuẫn
    }
  }

  // Hai góc ⇒ góc thứ ba.
  if (G.size === 2) {
    const thieu = labels.find((x) => !G.has(x))!;
    G.set(thieu, 180 - [...G.values()].reduce((s, x) => s + x, 0));
  }
  if ([...G.values()].some((g) => !(g > 1e-9 && g < 180))) return undefined;
  if (G.size === 3 && Math.abs([...G.values()].reduce((s, x) => s + x, 0) - 180) > 1e-6) return undefined;

  const canh = () => labels.map((v) => L.get(doi(v)));
  let soCanh = canh().filter(Boolean).length;

  if (G.size === 3) {
    // Hình dạng xác định: cạnh tỉ lệ sin góc đối (định lý sin).
    const sinDoi = labels.map((v) => Math.sin(G.get(v)! * DEG));
    const biet = labels.findIndex((v) => L.has(doi(v)));
    const k = biet >= 0 ? L.get(doi(labels[biet]))! / sinDoi[biet] : 1;
    for (let i = 0; i < 3; i++) {
      const tinh = k * sinDoi[i];
      const cho = L.get(doi(labels[i]));
      if (cho !== undefined && Math.abs(cho - tinh) > 0.02 * Math.max(cho, tinh)) return undefined;
      L.set(doi(labels[i]), tinh);
    }
    soCanh = 3;
  } else if (G.size === 1 && soCanh < 3) {
    const [Vg, g] = [...G][0];
    const [X, Y] = labels.filter((x) => x !== Vg);
    const kx = len(Vg, X);
    const ky = len(Vg, Y);
    const dd = len(X, Y);
    const cosLaw = (x: number, y: number) => Math.sqrt(x * x + y * y - 2 * x * y * Math.cos(g * DEG));
    if (kx && ky) {
      L.set(key(X, Y), cosLaw(kx, ky)); // c.g.c
    } else if (dd && (kx || ky)) {
      // c.c.g (góc không xen giữa): sin(góc đối cạnh kề) = kề·sin(g)/đối.
      const ke = (kx ?? ky)!;
      const s = (ke * Math.sin(g * DEG)) / dd;
      if (s > 1 + 1e-12) return undefined;
      const t = Math.asin(Math.min(1, s)) / DEG;
      if (g + t >= 180) return undefined;
      const conLai = 180 - g - t; // góc tại đỉnh kề đã biết cạnh
      L.set(kx ? key(Vg, Y) : key(Vg, X), (dd * Math.sin(conLai * DEG)) / Math.sin(g * DEG));
    } else {
      // Chỉ biết góc: hai cạnh kề 1 : 1,3 (tránh gợi ý cân).
      const x = kx ?? ky ?? 1;
      L.set(key(Vg, X), kx ?? (ky ? x * 1.3 : 1));
      L.set(key(Vg, Y), ky ?? (kx ? x * 1.3 : 1.3));
      L.set(key(X, Y), cosLaw(L.get(key(Vg, X))!, L.get(key(Vg, Y))!));
    }
    soCanh = 3;
  } else if (G.size === 1 && soCanh === 3) {
    // Đủ 3 cạnh: góc đề cho phải khớp (định lý cos), không thì không tin số liệu.
    const [Vg, g] = [...G][0];
    const [X, Y] = labels.filter((x) => x !== Vg);
    const [x, y, z] = [len(Vg, X)!, len(Vg, Y)!, len(X, Y)!];
    const cos = (x * x + y * y - z * z) / (2 * x * y);
    if (Math.abs(Math.acos(Math.max(-1, Math.min(1, cos))) / DEG - g) > 1) return undefined;
  }

  let ab = len(A, B);
  let ac = len(A, C);
  let bc = len(B, C);
  if (soCanh === 2) {
    // Hai cạnh chung một đỉnh, góc không rõ ⇒ 70°.
    const g = GOC_KHONG_RO;
    const thu3 = (x: number, y: number) => Math.sqrt(x * x + y * y - 2 * x * y * Math.cos(g));
    if (ab && ac) bc = thu3(ab, ac);
    else if (ab && bc) ac = thu3(ab, bc);
    else if (ac && bc) ab = thu3(ac, bc);
  } else if (soCanh < 2) {
    return undefined;
  }
  if (!ab || !ac || !bc) return undefined;
  if (ab + ac <= bc + 1e-9 || ab + bc <= ac + 1e-9 || ac + bc <= ab + 1e-9) return undefined;

  // B gốc, C trên trục hoành, A phía trên (dáng quen trong sách: đỉnh A ở trên).
  const x = (ab * ab + bc * bc - ac * ac) / (2 * bc);
  const y = Math.sqrt(Math.max(ab * ab - x * x, 0));
  const k = CO_CHUAN / Math.max(ab, ac, bc);
  return {
    [A]: [x * k, y * k],
    [B]: [0, 0],
    [C]: [bc * k, 0],
  };
}

// "Đường trung trực của AB (và AC) cắt CẠNH BC" chỉ xảy ra khi góc đối diện BC TÙ:
// tam giác mẫu nhọn ⇒ giao điểm rơi ra NGOÀI cạnh BC (test tay: N không hiện).
const TRUNG_TRUC_CAT_CANH = /trung\s*trực[^.]{0,60}?cắt\s+(?:các\s+)?cạnh\s+([A-Z])([A-Z])(?![A-Z])/u;

/** Toạ độ tam giác tù tại đỉnh đối diện cạnh bị trung trực cắt, hoặc undefined. */
export function toaDoTamGiacTuKhiTrungTrucCatCanh(
  problem: string,
  labels: readonly [string, string, string],
): Record<string, Pt> | undefined {
  const m = TRUNG_TRUC_CAT_CANH.exec(problem);
  if (!m) return undefined;
  const [P, Q] = [m[1], m[2]];
  if (!labels.includes(P) || !labels.includes(Q) || P === Q) return undefined;
  const V = labels.find((x) => x !== P && x !== Q)!;
  // Góc V ≈ 118° (tù rõ nhưng không dẹt); cạnh PQ nằm ngang.
  return { [P]: [0, 0], [Q]: [6, 0], [V]: [2.6, 1.4] };
}
