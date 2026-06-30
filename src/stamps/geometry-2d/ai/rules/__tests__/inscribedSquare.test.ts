// src/stamps/geometry-2d/ai/rules/__tests__/inscribedSquare.test.ts
//
// Hình vuông NỘI TIẾP tam giác vuông (C112, C62): hình vuông MNPQ với
// M∈AB, N∈AC (2 cạnh góc vuông), P,Q∈BC (cạnh huyền). Right angle tại A.
import { inscribedSquareRule, inscribedSquareCoords } from '../inscribedSquare';
import { segmentClauses } from '../../deterministic/coverage';
import { tryDeterministicFigure } from '../../deterministic/tryDeterministicFigure';

function intents(problem: string) {
  return inscribedSquareRule
    .match({ problem, clauses: segmentClauses(problem) })
    .flatMap((m) => m.intents as any[]);
}

// Phrasing thật từ dataset vào-10 2018-2019.
const C112 = 'Cho tam giác ABC vuông tại A. Kẻ hình vuông MN PQ với M ∈ AB, Ne AC và P,Q ∈ BC.';
const C62 =
  'Cho góc Ay vuông tại A và hai điểm B,C trên Az, Ay. Dựng hình vuông MN PQ có M trên AB, N trên AC và P,Q trên BC.';

describe('inscribedSquareCoords (geometry helper)', () => {
  it('M trên AB, N trên AC, P&Q trên BC, MNPQ là hình vuông (tam giác vuông tại A)', () => {
    const A: [number, number] = [0, 0];
    const B: [number, number] = [4, 0];
    const C: [number, number] = [0, 3];
    const { M, N, P, Q } = inscribedSquareCoords(A, B, C);

    const cross = (p: number[], q: number[]) => p[0] * q[1] - p[1] * q[0];
    const sub = (p: number[], q: number[]) => [p[0] - q[0], p[1] - q[1]];
    const dist = (p: number[], q: number[]) => Math.hypot(p[0] - q[0], p[1] - q[1]);
    const onSeg = (pt: number[], X: number[], Y: number[]) => {
      const d = sub(Y, X);
      const t = (sub(pt, X)[0] * d[0] + sub(pt, X)[1] * d[1]) / (d[0] * d[0] + d[1] * d[1]);
      return Math.abs(cross(sub(pt, X), d)) < 1e-9 && t >= -1e-9 && t <= 1 + 1e-9;
    };

    expect(onSeg(M, A, B)).toBe(true); // M ∈ AB
    expect(onSeg(N, A, C)).toBe(true); // N ∈ AC
    expect(onSeg(P, B, C)).toBe(true); // P ∈ BC
    expect(onSeg(Q, B, C)).toBe(true); // Q ∈ BC

    // 4 cạnh bằng nhau + góc vuông → hình vuông thật.
    const s = dist(M, N);
    expect(dist(N, P)).toBeCloseTo(s, 6);
    expect(dist(P, Q)).toBeCloseTo(s, 6);
    expect(dist(Q, M)).toBeCloseTo(s, 6);
    // MN ⊥ NP
    const mn = sub(N, M);
    const np = sub(P, N);
    expect(mn[0] * np[0] + mn[1] * np[1]).toBeCloseTo(0, 6);
  });

  it('hoạt động với tam giác vuông xoay/tịnh tiến bất kỳ (không chỉ trục-aligned)', () => {
    const A: [number, number] = [1, 1];
    const B: [number, number] = [5, 2];
    // AC ⊥ AB, độ dài 3
    const perp = (() => {
      const d = [B[0] - A[0], B[1] - A[1]];
      const l = Math.hypot(d[0], d[1]);
      return [-d[1] / l, d[0] / l];
    })();
    const C: [number, number] = [A[0] + perp[0] * 3, A[1] + perp[1] * 3];
    const { M, N, P, Q } = inscribedSquareCoords(A, B, C);
    const dist = (p: number[], q: number[]) => Math.hypot(p[0] - q[0], p[1] - q[1]);
    const s = dist(M, N);
    expect(dist(N, P)).toBeCloseTo(s, 6);
    expect(dist(P, Q)).toBeCloseTo(s, 6);
    expect(dist(Q, M)).toBeCloseTo(s, 6);
  });
});

describe('inscribedSquareRule', () => {
  it('C112 "Kẻ hình vuông MN PQ với M ∈ AB, Ne AC và P,Q ∈ BC" → 4 onSegment + mark-shape + triangle right-at-A', () => {
    const all = intents(C112);
    // M,N,P,Q là điểm onSegment trên 3 cạnh tam giác (cùng component → nội tiếp).
    const onSeg = (n: string) =>
      all.find((i) => i.op === 'add-point' && i.name === n && i.constraint.kind === 'onSegment');
    for (const n of ['M', 'N', 'P', 'Q']) expect(onSeg(n)).toBeTruthy();
    expect(onSeg('M').constraint.of).toBe('AB'); // M ∈ AB
    expect(onSeg('N').constraint.of).toBe('AC'); // N ∈ AC
    expect(onSeg('P').constraint.of).toBe('BC'); // P ∈ BC
    expect(onSeg('Q').constraint.of).toBe('BC'); // Q ∈ BC
    // hình vuông = polygon nối 4 điểm có sẵn (mark-shape quadrilateral).
    const sq = all.find((i) => i.op === 'mark-shape');
    expect(sq.labels).toEqual(['M', 'N', 'P', 'Q']);
    const tri = all.find((i) => i.op === 'draw-shape' && i.shape === 'triangle');
    expect(tri).toBeTruthy();
    expect(tri.labels).toEqual(['A', 'B', 'C']);
    expect(tri.variant).toBe('right-at-A');
  });

  it('C62 "Dựng hình vuông MN PQ có M trên AB, N trên AC và P,Q trên BC" → onSegment + mark-shape + triangle (không có chữ "tam giác")', () => {
    const all = intents(C62);
    const onSeg = (n: string) =>
      all.find((i) => i.op === 'add-point' && i.name === n && i.constraint.kind === 'onSegment');
    for (const n of ['M', 'N', 'P', 'Q']) expect(onSeg(n)).toBeTruthy();
    const sq = all.find((i) => i.op === 'mark-shape');
    expect(sq.labels).toEqual(['M', 'N', 'P', 'Q']);
    const tri = all.find((i) => i.op === 'draw-shape' && i.shape === 'triangle');
    expect(tri).toBeTruthy();
    expect(tri.variant).toBe('right-at-A');
  });

  it('không match khi thiếu ràng buộc thuộc-cạnh (chỉ "hình vuông MNPQ")', () => {
    expect(intents('Dựng hình vuông MNPQ.')).toEqual([]);
  });

  it('không match hình vuông KHÔNG nội tiếp (P,Q không trên cạnh huyền)', () => {
    expect(intents('Cho tam giác ABC vuông tại A. Dựng hình vuông ABDE ra ngoài.')).toEqual([]);
  });

  it('C112 end-to-end: hình hợp lệ, M N P Q là onSegment trên cạnh tam giác', () => {
    const r = tryDeterministicFigure(C112);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const pts = (r as any).figure.dsl.points;
    const names = pts.map((p: any) => p.name);
    expect(names).toEqual(expect.arrayContaining(['A', 'B', 'C', 'M', 'N', 'P', 'Q']));
    for (const n of ['M', 'N', 'P', 'Q']) {
      const p = pts.find((x: any) => x.name === n);
      expect(p.kind).toBe('onSegment');
    }
  });

  it('C62 end-to-end: hình hợp lệ + hình vuông NỘI TIẾP (cùng 1 component, KHÔNG bị disjoint-offset)', () => {
    const r = tryDeterministicFigure(C62);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const pts = (r as any).figure.dsl.points;
    const names = pts.map((p: any) => p.name);
    expect(names).toEqual(expect.arrayContaining(['A', 'B', 'C', 'M', 'N', 'P', 'Q']));
    // M,N,P,Q là onSegment (không có x/y riêng) → bám theo cạnh tam giác, KHÔNG
    // thể bị layoutDisjointComponents tách rời (chỉ free point bị dịch).
    for (const n of ['M', 'N', 'P', 'Q']) {
      const p = pts.find((x: any) => x.name === n);
      expect(p.kind).toBe('onSegment');
    }
  });
});
