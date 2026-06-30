// src/stamps/geometry-2d/ai/rules/inscribedSquare.ts
//
// HÌNH VUÔNG NỘI TIẾP TAM GIÁC VUÔNG (C112, C62).
//
//   C112: "Cho tam giác ABC vuông tại A. Kẻ hình vuông MNPQ với M∈AB, N∈AC,
//          P,Q∈BC."  → hình vuông có 1 cạnh (PQ) NẰM trên cạnh huyền BC, hai
//          đỉnh M,N hướng về đỉnh vuông A (M trên cạnh AB, N trên cạnh AC).
//   C62 : "Cho góc xAy vuông tại A, B∈Ax, C∈Ay. Dựng hình vuông MNPQ có M trên
//          AB, N trên AC và P,Q trên BC."  — tương đương: vuông tại A + 2 điểm
//          B,C trên 2 cạnh góc vuông (KHÔNG có chữ "tam giác").
//
// Cách dựng (đại số đóng, ĐÚNG cho mọi tam giác vuông tại A):
//   - Tam giác ABC vuông tại A canonical right-at-A: A=(0,0), B=(4,0), C=(0,3)
//     (builder triangleCanonical). 4 đỉnh hình vuông TÍNH TỪ 3 toạ độ này.
//   - cạnh s = a·h/(a+h) với a=|BC|, h = khoảng cách A→BC.
//   - PQ nằm trên BC (Q gần B, P gần C); M=Q+n·s, N=P+n·s (n = pháp tuyến hướng
//     vào A) → M∈AB, N∈AC. (Xem inscribedSquareCoords + unit test.)
//   - Toạ độ → THAM SỐ onSegment t∈[0,1] (inscribedSquareParams): mỗi đỉnh hình
//     vuông là điểm onSegment trên đúng 1 cạnh tam giác. Nhờ tham chiếu cạnh →
//     CÙNG component với tam giác → hình vuông NẰM TRONG (nội tiếp), không bị
//     layoutDisjointComponents tách rời (so với free point dùng explicitCoords).
//
// Self-contained: chỉ cần A,B,C (tam giác vuông tại A). KHÔNG phụ thuộc rule
// khác chạy trước — tự emit triangle right-at-A (idempotent: builder dedup theo
// tên nên trùng với triangleRule của C112 cũng vô hại).
//
// GOTCHA: cờ 'u' + (?!\p{L}) thay \b quanh ký tự Việt. escapeRe mọi tên nội suy
// (ở đây tên là [A-Z] cố định nên không nội suy runtime, vẫn giữ nguyên tắc).
import type { LanguageRule, RuleMatch } from './_types';
import type { IntentT } from '../intent';
import { addPoint, drawShape, markShape } from './_shared';
import { triangleCanonical } from '../intent-builders/shared';

type Pt = readonly [number, number];

function sub(p: Pt, q: Pt): Pt {
  return [p[0] - q[0], p[1] - q[1]];
}
function add(p: Pt, q: Pt): Pt {
  return [p[0] + q[0], p[1] + q[1]];
}
function mul(p: Pt, k: number): Pt {
  return [p[0] * k, p[1] * k];
}
function dot(p: Pt, q: Pt): number {
  return p[0] * q[0] + p[1] * q[1];
}
function cross(p: Pt, q: Pt): number {
  return p[0] * q[1] - p[1] * q[0];
}
function len(p: Pt): number {
  return Math.hypot(p[0], p[1]);
}
function norm(p: Pt): Pt {
  const l = len(p) || 1;
  return [p[0] / l, p[1] / l];
}

/**
 * 4 đỉnh hình vuông MNPQ nội tiếp tam giác vuông tại A (M∈AB, N∈AC, P,Q∈BC).
 * Toạ độ đóng (không lặp), đúng cho mọi tam giác vuông tại A bất kể hướng.
 * Thứ tự đỉnh M→N→P→Q (MN cạnh trên ∥ BC, PQ cạnh dưới trên BC).
 */
export function inscribedSquareCoords(
  A: Pt,
  B: Pt,
  C: Pt,
): { M: Pt; N: Pt; P: Pt; Q: Pt } {
  const u = norm(sub(C, B)); // hướng dọc BC (B→C)
  const a = len(sub(C, B)); // |BC|
  const tA = dot(sub(A, B), u);
  const foot = add(B, mul(u, tA)); // chân vuông góc A→BC
  const h = len(sub(A, foot)); // chiều cao tới BC
  const s = (a * h) / (a + h); // cạnh hình vuông nội tiếp (kết quả chuẩn)
  const n = norm(sub(A, foot)); // pháp tuyến hướng VÀO đỉnh A
  // M = B + u·q0 + n·s phải nằm trên đường AB: cross(M−A, B−A) = 0 → giải q0.
  const BA = sub(B, A);
  const q0 = -(s * cross(n, BA)) / cross(u, BA);
  const Q = add(B, mul(u, q0)); // đáy gần B
  const P = add(B, mul(u, q0 + s)); // đáy gần C
  const M = add(Q, mul(n, s)); // trên AB
  const N = add(P, mul(n, s)); // trên AC
  return { M, N, P, Q };
}

/** Tham số t = vị trí pt trên đoạn X→Y (pt = X + t·(Y−X)). */
function paramOn(pt: Pt, X: Pt, Y: Pt): number {
  const d = sub(Y, X);
  return dot(sub(pt, X), d) / (dot(d, d) || 1);
}

/**
 * Tham số onSegment (t∈[0,1]) cho 4 đỉnh hình vuông nội tiếp, theo HƯỚNG đoạn
 * builder dựng (resolveSegmentRef: 'AB'→A→B, 'BC'→B→C):
 *   tM trên AB (A→B), tN trên AC (A→C), tP & tQ trên BC (B→C).
 * Một nguồn duy nhất (inscribedSquareCoords) → không magic-number.
 */
export function inscribedSquareParams(
  A: Pt,
  B: Pt,
  C: Pt,
): { tM: number; tN: number; tP: number; tQ: number } {
  const { M, N, P, Q } = inscribedSquareCoords(A, B, C);
  return {
    tM: paramOn(M, A, B),
    tN: paramOn(N, A, C),
    tP: paramOn(P, B, C),
    tQ: paramOn(Q, B, C),
  };
}

// --- NLU --------------------------------------------------------------------

// Prefilter toàn đề: "hình vuông" + có cặp "(trên|∈|thuộc) BC" cho 2 điểm
// (cạnh huyền). Nhanh, loại sớm đề không liên quan.
const PREFILTER = /hình\s*vuông[^.]*?(?:trên|∈|thuộc|\bNe\b|\bEe\b)/iu;

// Nhãn 4 đỉnh hình vuông: "MNPQ" hoặc "MN PQ" (OCR chèn space). 4 chữ HOA, cho
// phép 1 khoảng trắng giữa.
const SQUARE_LABELS = /hình\s*vuông\s+([A-Z])\s*([A-Z])\s*([A-Z])\s*([A-Z])(?![A-Z])/u;

// "vuông tại A" — xác định đỉnh góc vuông (right-at-?). Dùng để chọn variant +
// để claim clause "góc … vuông tại A" của C62.
const RIGHT_AT = /vuông\s+tại\s+([A-Z])(?![A-Za-z])/u;

const RIGHT_BY_IDX = ['right-at-A', 'right-at-B', 'right-at-C'] as const;

/**
 * Một ràng buộc "thuộc cạnh": điểm `pt` nằm trên đoạn `side` (2 đỉnh HOA).
 * Bắt cả "M ∈ AB", "M trên AB", "M thuộc AB" và OCR-méo "Ne AC" (N∈AC → "Ne").
 * Liệt kê 2 điểm "P,Q ∈ BC" → 2 ràng buộc cùng side.
 */
interface SideMembership {
  pt: string;
  side: [string, string];
}

// "X(,Y)? (∈|trên|thuộc|Ne…) SIDE" — SIDE = cặp đỉnh HOA. Cho phép "P,Q ∈ BC".
// "Ne"/"Ee" là OCR của "N∈"/"E∈" (chữ điểm + ∈ dính). Bắt riêng vì điểm đã gộp.
const MEMBERSHIP_G =
  /(?:([A-Z])\s*(?:∈|trên|thuộc)|\b([A-Z])e\b)\s*([A-Z])([A-Z])(?![A-Z])/gu;
// Dạng list "P,Q ∈ BC" / "P, Q thuộc BC": 2 điểm phẩy-phân-cách rồi 1 side.
const LIST_MEMBERSHIP_G =
  /([A-Z])\s*,\s*([A-Z])\s*(?:∈|trên|thuộc)\s*([A-Z])([A-Z])(?![A-Z])/gu;

function parseMemberships(text: string): SideMembership[] {
  const out: SideMembership[] = [];
  let m: RegExpExecArray | null;

  LIST_MEMBERSHIP_G.lastIndex = 0;
  const listSpans: Array<[number, number]> = [];
  while ((m = LIST_MEMBERSHIP_G.exec(text)) !== null) {
    const side: [string, string] = [m[3], m[4]];
    out.push({ pt: m[1], side });
    out.push({ pt: m[2], side });
    listSpans.push([m.index, m.index + m[0].length]);
  }

  MEMBERSHIP_G.lastIndex = 0;
  while ((m = MEMBERSHIP_G.exec(text)) !== null) {
    // Bỏ qua match nằm TRONG một list-span (đã xử lý ở trên, tránh double).
    if (listSpans.some(([a, b]) => m!.index >= a && m!.index < b)) continue;
    const pt = m[1] ?? m[2];
    out.push({ pt, side: [m[3], m[4]] });
  }
  return out;
}

/**
 * "hình vuông MNPQ với M∈AB, N∈AC, P,Q∈BC" → tam giác vuông tại A + 4 điểm
 * onSegment (mỗi đỉnh trên 1 cạnh tam giác) + mark-shape polygon MNPQ. Dùng
 * onSegment (KHÔNG free explicitCoords) để 4 đỉnh THAM CHIẾU cạnh tam giác →
 * cùng 1 component → hình vuông nằm TRONG tam giác (nội tiếp, không bị layout
 * disjoint-offset tách rời). CHỈ kích hoạt khi 4 đỉnh hình vuông mỗi đỉnh thuộc
 * đúng 1 cạnh + 2 đỉnh cùng nằm trên cạnh huyền (P,Q ∈ BC) → cấu hình nội tiếp.
 */
export const inscribedSquareRule: LanguageRule = {
  id: 'inscribed-square',
  priority: 56,
  languages: ['vi'],
  patterns: [PREFILTER],
  match(ctx) {
    const out: RuleMatch[] = [];

    // Tìm clause chứa nhãn hình vuông.
    for (const c of ctx.clauses) {
      const labelM = SQUARE_LABELS.exec(c.text);
      if (!labelM) continue;
      const labels = [labelM[1], labelM[2], labelM[3], labelM[4]];
      if (new Set(labels).size !== 4) continue; // 4 đỉnh phải phân biệt

      const memberships = parseMemberships(c.text);
      if (memberships.length < 4) continue; // cần đủ 4 ràng buộc thuộc-cạnh

      // Mỗi đỉnh hình vuông phải thuộc đúng 1 cạnh; gom side theo đỉnh.
      const bySide = new Map<string, string[]>(); // side-key "XY"(sorted) → [pts]
      const ptSide = new Map<string, [string, string]>();
      for (const mem of memberships) {
        if (!labels.includes(mem.pt)) continue;
        ptSide.set(mem.pt, mem.side);
        const key = [...mem.side].sort().join('');
        const arr = bySide.get(key) ?? [];
        if (!arr.includes(mem.pt)) arr.push(mem.pt);
        bySide.set(key, arr);
      }
      // Cả 4 đỉnh hình vuông phải có ràng buộc thuộc-cạnh.
      if (labels.some((l) => !ptSide.has(l))) continue;

      // Cấu hình nội tiếp: ĐÚNG 2 đỉnh nằm trên 1 cạnh chung (cạnh huyền),
      // 2 đỉnh còn lại trên 2 cạnh khác nhau (2 cạnh góc vuông).
      const sideKeys = [...bySide.keys()];
      const hypKey = sideKeys.find((k) => (bySide.get(k) ?? []).length === 2);
      if (!hypKey) continue;
      const legKeys = sideKeys.filter((k) => k !== hypKey);
      if (legKeys.length !== 2) continue;
      if ((bySide.get(legKeys[0]) ?? []).length !== 1) continue;
      if ((bySide.get(legKeys[1]) ?? []).length !== 1) continue;

      // 3 cạnh phải tạo thành 1 tam giác (chia sẻ đúng 3 đỉnh tam giác).
      const triVerts = new Set<string>();
      for (const [, side] of ptSide) side.forEach((v) => triVerts.add(v));
      if (triVerts.size !== 3) continue;

      // Đỉnh góc vuông = đỉnh CHUNG của 2 cạnh góc vuông (2 legKeys).
      const legVerts = legKeys.map((k) => k.split('') as [string, string]);
      const apex = legVerts[0].find((v) => legVerts[1].includes(v));
      if (!apex) continue;
      const triLabels = [apex, ...[...triVerts].filter((v) => v !== apex).sort()];

      // Nếu đề nêu "vuông tại X" thì X PHẢI là apex (đỉnh chung) — fail-safe.
      const explicitRight = collectRightAt(ctx.clauses);
      if (explicitRight && explicitRight !== apex) continue;

      // Toạ độ canonical tam giác right-at-A → tham số onSegment cho 4 đỉnh.
      const tri = triangleCanonical('right-at-A');
      const params = inscribedSquareParams(tri[0], tri[1], tri[2]);

      // Gán (cạnh, t) cho từng nhãn đề theo VAI TRÒ hình học (suy từ ràng buộc
      // thuộc-cạnh). Điểm onSegment THAM CHIẾU cạnh tam giác → cùng 1 component
      // (KHÔNG bị disjoint-offset) → hình vuông NẰM trong tam giác (nội tiếp).
      const placement = assignSquarePlacement(
        labels,
        ptSide,
        bySide.get(hypKey)!,
        triLabels[0], // apex (đỉnh góc vuông)
        triLabels[1], // đỉnh B của tam giác (đầu mút cạnh huyền gần Q)
        triLabels[2], // đỉnh C của tam giác (đầu mút cạnh huyền gần P)
        params,
      );
      if (!placement) continue; // không gán đủ 4 đỉnh → fail-safe escalate

      const rightIdx = triLabels.indexOf(apex); // luôn 0 (apex đứng đầu)
      const variant = RIGHT_BY_IDX[rightIdx] ?? 'right-at-A';

      const intents: IntentT[] = [drawShape('triangle', triLabels, variant)];
      for (const lbl of labels) {
        const { of, t } = placement.get(lbl)!;
        intents.push(addPoint(lbl, { kind: 'onSegment', of, t }));
      }
      // Hình vuông = polygon nối 4 điểm vừa dựng (mark-shape, không tạo coord mới).
      intents.push(markShape('quadrilateral', labels));

      // Claim clause hình vuông + clause "vuông tại apex" (để C62 phủ clause góc).
      const claimed = new Set<number>([c.id]);
      for (const cc of ctx.clauses) {
        const rm = RIGHT_AT.exec(cc.text);
        if (rm && rm[1] === apex) claimed.add(cc.id);
      }
      out.push({ ruleId: 'inscribed-square', clauseIds: [...claimed], intents });
    }
    return out;
  },
};

/** Đỉnh "vuông tại X" nêu tường minh trong bất kỳ clause nào (undefined nếu không). */
function collectRightAt(clauses: readonly { text: string }[]): string | undefined {
  for (const c of clauses) {
    const m = RIGHT_AT.exec(c.text);
    if (m) return m[1];
  }
  return undefined;
}

interface Placement {
  /** ref cạnh tam giác builder dựng (HƯỚNG: A→B, A→C, B→C). */
  of: string;
  /** vị trí t∈[0,1] trên cạnh đó. */
  t: number;
}

/**
 * Gán (cạnh, t) cho 4 nhãn đề theo VAI TRÒ hình học (onSegment):
 *   - đỉnh leg trên AB (≡ apex-B) → tM trên "AB" (A→B),
 *   - đỉnh leg trên AC (≡ apex-C) → tN trên "AC" (A→C),
 *   - 2 đỉnh trên cạnh huyền BC: đỉnh KỀ (chu vi MNPQ) đỉnh-trên-AB → tQ (gần B),
 *     đỉnh kề đỉnh-trên-AC → tP (gần C). Cả 2 trên "BC" (B→C).
 * `of` đặt theo HƯỚNG khớp với inscribedSquareParams (resolveSegmentRef giữ thứ
 * tự ký tự). Trả null nếu không gán đủ 4 (fail-safe → caller escalate).
 */
function assignSquarePlacement(
  labels: string[],
  ptSide: Map<string, [string, string]>,
  hypPts: string[],
  triA: string,
  triB: string,
  triC: string,
  params: { tM: number; tN: number; tP: number; tQ: number },
): Map<string, Placement> | null {
  const place = new Map<string, Placement>();
  // Đỉnh leg trên AB / AC (không thuộc cạnh huyền).
  const onAB = labels.find((l) => !hypPts.includes(l) && ptSide.get(l)!.includes(triB));
  const onAC = labels.find((l) => !hypPts.includes(l) && ptSide.get(l)!.includes(triC));
  if (!onAB || !onAC) return null;
  place.set(onAB, { of: `${triA}${triB}`, t: params.tM }); // A→B
  place.set(onAC, { of: `${triA}${triC}`, t: params.tN }); // A→C

  // Hàng xóm-chu-vi của 1 đỉnh leg mà nằm trên cạnh huyền.
  const neighborInHyp = (anchor: string): string | undefined => {
    const i = labels.indexOf(anchor);
    const next = labels[(i + 1) % labels.length];
    const prev = labels[(i - 1 + labels.length) % labels.length];
    if (hypPts.includes(next)) return next;
    if (hypPts.includes(prev)) return prev;
    return undefined;
  };
  const qVtx = neighborInHyp(onAB); // kề đỉnh-trên-AB → gần B
  const pVtx = neighborInHyp(onAC); // kề đỉnh-trên-AC → gần C
  const hyp = `${triB}${triC}`; // B→C
  if (qVtx) place.set(qVtx, { of: hyp, t: params.tQ });
  if (pVtx) place.set(pVtx, { of: hyp, t: params.tP });
  // Lấp đỉnh huyền còn sót (adjacency không phủ hết — fail-safe).
  for (const hp of hypPts) {
    if (!place.has(hp)) place.set(hp, { of: hyp, t: hp === qVtx ? params.tQ : params.tP });
  }

  return labels.every((l) => place.has(l)) ? place : null;
}
