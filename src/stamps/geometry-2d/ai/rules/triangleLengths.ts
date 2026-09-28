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
// Không đủ dữ kiện / vi phạm bất đẳng thức tam giác → undefined (giữ tam giác mẫu).
type Pt = readonly [number, number];

const LEN = /(?<![A-Z])([A-Z])([A-Z])\s*=\s*(\d+(?:[.,]\d+)?)\s*(?:cm|dm|mm|m)?(?![\p{L}\d])/gu;
const GOC_KHONG_RO = (70 * Math.PI) / 180;
const CO_CHUAN = 5;

const key = (p: string, q: string) => [p, q].sort().join('');

/** Số đo các cạnh của tam giác `labels` đề cho ("AB = 4 cm", "BC = 10"). */
export function doCanhDeCho(problem: string, labels: readonly string[]): Map<string, number> {
  const out = new Map<string, number>();
  const tap = new Set(labels);
  for (const m of problem.matchAll(LEN)) {
    if (!tap.has(m[1]) || !tap.has(m[2]) || m[1] === m[2]) continue;
    const v = Number(m[3].replace(',', '.'));
    if (v > 0) out.set(key(m[1], m[2]), v);
  }
  // Đường cao từ đỉnh X: "đường cao AH = 3 cm" / "chiều cao AH = 3 cm" / "đường cao AH …
  // AH = 3 cm" → khoá 'h:A' (dùng cho tam giác cân: cạnh bên từ đáy + chiều cao).
  for (const m of problem.matchAll(/(?:[Đđ]ường|[Cc]hiều)\s*cao\s+([A-Z])([A-Z])(?![A-Z])/gu)) {
    const [X, H] = [m[1], m[2]];
    if (!tap.has(X) || tap.has(H)) continue;
    const v = new RegExp(`(?<![A-Z])(?:${X}${H}|${H}${X})\\s*=\\s*(\\d+(?:[.,]\\d+)?)`, 'u').exec(problem);
    if (v && Number(v[1].replace(',', '.')) > 0) out.set(`h:${X}`, Number(v[1].replace(',', '.')));
  }
  return out;
}

/**
 * Toạ độ 3 đỉnh [A, B, C] theo số đo, hoặc undefined nếu không đủ dữ kiện.
 * variant: 'right-at-X' | 'isoceles-XY' (đáy XY) | 'equilateral' | 'any'.
 */
export function toaDoTamGiacTheoCanh(
  labels: readonly [string, string, string],
  variant: string,
  lens: Map<string, number>,
): Record<string, Pt> | undefined {
  if ([...lens.keys()].every((k) => k.startsWith('h:')) || variant === 'equilateral') return undefined;
  const [A, B, C] = labels;
  const L = new Map(lens);
  const len = (p: string, q: string) => L.get(key(p, q));

  // Cân: hai cạnh bên bằng nhau (đáy XY ⇒ đỉnh là đỉnh còn lại).
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
    const day = len(b1, b2);
    const ben = len(apex, b1);
    if (h && day && !ben) {
      L.set(key(apex, b1), Math.hypot(h, day / 2));
      L.set(key(apex, b2), Math.hypot(h, day / 2));
    } else if (h && ben && !day && ben > h) {
      L.set(key(b1, b2), 2 * Math.sqrt(ben * ben - h * h));
    }
  }

  // Vuông tại V: suy cạnh thứ ba bằng Pythagore.
  const vuong = /^right-at-([ABC])$/.exec(variant);
  const V = vuong ? labels['ABC'.indexOf(vuong[1])] : undefined;
  if (V) {
    const [X, Y] = labels.filter((x) => x !== V);
    const a = len(V, X);
    const b = len(V, Y);
    const h = len(X, Y);
    if (a && b && !h) L.set(key(X, Y), Math.hypot(a, b));
    else if (a && h && !b && h > a) L.set(key(V, Y), Math.sqrt(h * h - a * a));
    else if (b && h && !a && h > b) L.set(key(V, X), Math.sqrt(h * h - b * b));
  }

  let ab = len(A, B);
  let ac = len(A, C);
  let bc = len(B, C);
  const soCanh = [ab, ac, bc].filter(Boolean).length;
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
