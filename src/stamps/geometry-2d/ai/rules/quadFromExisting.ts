// src/stamps/geometry-2d/ai/rules/quadFromExisting.ts
//
// Hình bình hành (và chữ nhật/thoi/vuông) có BA đỉnh đã thuộc hình nêu TRƯỚC — đỉnh
// thứ tư phải DỰNG, không đặt tự do:
//   "Cho tam giác ABC. Vẽ hình bình hành ABDC"      → D = đối xứng A qua trung điểm BC
//   "Cho hình thoi ABCD và hình bình hành BCMD"     → M = đối xứng C qua trung điểm BD
// (draw-shape cũ thêm D/M ở toạ độ mẫu ⇒ "hình bình hành" méo, báo full mà sai.)
// Đỉnh mới Pi = P(i−1) + P(i+1) − P(i+2) (constraint 'affine').
// Với chữ nhật/thoi/vuông, hình đúng loại khi ba đỉnh có sẵn đúng dữ kiện đề (tam giác
// vuông / cân …) — dựng theo hình bình hành là cách chính xác duy nhất từ ba đỉnh.
import type { IntentT } from '../intent';
import { addPoint, markShape } from './_shared';

const HINH_TRUOC = /(?:tam\s*giác|tứ\s*giác|hình\s+(?:vuông|chữ\s+nhật|bình\s+hành|thoi|thang)(?:\s+(?:cân|vuông))?)\s+([A-Z]{3,4})(?![A-Z])/gu;

/** Đỉnh đã có (thuộc hình khai báo TRƯỚC vị trí `viTri` trong đề). */
function dinhCo(problem: string, viTri: number): Set<string> {
  const out = new Set<string>();
  for (const m of problem.matchAll(HINH_TRUOC)) {
    if ((m.index ?? 0) >= viTri) break;
    for (const ch of m[1]) out.add(ch);
  }
  return out;
}

export function dungTuDinhCo(problem: string, viTri: number, shape: string, labels: readonly string[]): IntentT[] | undefined {
  if (!['parallelogram', 'rectangle', 'rhombus', 'square'].includes(shape) || labels.length !== 4) return undefined;
  const co = dinhCo(problem, viTri);
  const moi = labels.filter((x) => !co.has(x));
  if (moi.length !== 1) return undefined;
  const i = labels.indexOf(moi[0]);
  // Đỉnh mới = đỉnh trước + đỉnh sau − đỉnh đối (constraint affine, như parallelogramVertex).
  const truoc = labels[(i + 3) % 4];
  const sau = labels[(i + 1) % 4];
  const doi = labels[(i + 2) % 4];
  return [
    addPoint(moi[0], { kind: 'affine', points: [truoc, sau, doi], weights: [1, 1, -1] }),
    markShape('quadrilateral', [...labels]),
  ];
}
