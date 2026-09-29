// src/stamps/geometry-2d/ai/rules/parallelogramOnSides.ts
//
// Hình bình hành DỰNG TRÊN CẠNH của tam giác đã có (đề vectơ lớp 10, HSG):
//   "Cho tam giác ABC. Bên ngoài tam giác vẽ các hình bình hành ABIJ, BCPQ, CARS."
// Mỗi hình XYZW có XY là cạnh tam giác, Z, W là điểm mới. Đề không cho hướng/độ dài
// cạnh thứ hai ⇒ chọn vectơ d = k·(trung điểm XY − đỉnh đối diện T): Z = Y + d,
// W = X + d (luôn là hình bình hành, nằm phía NGOÀI tam giác so với cạnh XY, cạnh
// YZ không song song cạnh nào của tam giác). Dựng bằng constraint 'affine' nên kéo
// đỉnh tam giác hình vẫn là hình bình hành.
//
// Trước đây quad đặt hình bình hành ABIJ theo HÌNH MẪU (I, J toạ độ cố định, A, B đã
// có) ⇒ ABIJ không còn là hình bình hành; BCPQ, CARS mất hẳn mà hình vẫn "đủ".
import type { LanguageRule, RuleMatch } from './_types';
import type { IntentT } from '../intent';
import { addPoint, markShape } from './_shared';

const K = 0.9;
const TRI = /tam\s*giác\s+(?:(?:nhọn|tù|vuông|cân|đều)\s+)?([A-Z])([A-Z])([A-Z])(?![A-Z])/u;
const HBH = /[Hh]ình\s+bình\s+hành\s+([A-Z]{4}(?:\s*(?:,|và)\s*[A-Z]{4})*)(?![A-Z])/gu;

interface Tren { ten: string; X: string; Y: string; Z: string; W: string; T: string }

/** Các hình bình hành trên cạnh tam giác khai báo TRƯỚC chúng trong đề. */
export function hinhBinhHanhTrenCanh(problem: string): Tren[] {
  const t = TRI.exec(problem);
  if (!t) return [];
  const dinh = [t[1], t[2], t[3]];
  const out: Tren[] = [];
  for (const m of problem.matchAll(HBH)) {
    if (m.index! < t.index) continue;
    for (const ten of m[1].split(/\s*,\s*|\s+và\s+/u)) {
      const [X, Y, Z, W] = ten;
      if (!dinh.includes(X) || !dinh.includes(Y) || X === Y) continue;
      if (dinh.includes(Z) || dinh.includes(W) || Z === W) continue;
      out.push({ ten, X, Y, Z, W, T: dinh.find((d) => d !== X && d !== Y)! });
    }
  }
  return out;
}

export const parallelogramOnSidesRule: LanguageRule = {
  id: 'parallelogramOnSides',
  priority: 99,
  languages: ['vi'],
  patterns: [/bình\s+hành/u],
  match(ctx) {
    const cac = hinhBinhHanhTrenCanh(ctx.problem);
    if (cac.length === 0) return [];
    const out: RuleMatch[] = [];
    for (const c of ctx.clauses) {
      const intents: IntentT[] = [];
      for (const h of cac) {
        if (!new RegExp(`(?<![A-Z])${h.ten}(?![A-Z])`, 'u').test(c.text)) continue;
        // d = K·((X + Y)/2 − T) ⇒ Z = Y + d, W = X + d.
        intents.push(
          addPoint(h.Z, { kind: 'affine', points: [h.X, h.Y, h.T], weights: [K / 2, 1 + K / 2, -K] }),
          addPoint(h.W, { kind: 'affine', points: [h.X, h.Y, h.T], weights: [1 + K / 2, K / 2, -K] }),
          markShape('quadrilateral', [h.X, h.Y, h.Z, h.W]),
        );
      }
      if (intents.length) out.push({ ruleId: 'parallelogramOnSides', clauseIds: [c.id], intents });
    }
    return out;
  },
};
