// src/stamps/geometry-2d/ai/rules/quad.ts
//
// Tứ giác / đa giác 4 đỉnh: hình vuông, chữ nhật, bình hành, thoi, thang
// (cân/vuông/thường), tứ giác chung. Mỗi loại trích 4 ký tự HOA liền sau tên
// hình → draw-shape với shape + variant tương ứng.
import type { LanguageRule, RuleMatch } from './_types';
import { drawShape } from './_shared';

// LƯU Ý: \b của JS dựa trên ASCII word-char nên KHÔNG khớp quanh ký tự Việt
// ("đ","ề","ạ"…). Dùng lookaround \p{L} (cờ 'u') ở prefilter để chặn biên từ.
// 4 đỉnh = 4 ký tự HOA liền nhau (vd "ABCD") neo ngay sau tên hình.

// Mỗi entry: regex tên hình (đã neo trước 4 đỉnh) → shape + variant.
// Thứ tự QUAN TRỌNG: loại cụ thể (hình thang cân/vuông) phải đứng TRƯỚC loại
// chung (hình thang), và mọi "hình ..." phải đứng trước "tứ giác" chung.
interface QuadKind {
  name: RegExp;
  shape: string;
  variant: string;
}

const KINDS: QuadKind[] = [
  // hình thang cân / hình thang vuông phải match trước hình thang chung
  {
    name: /hình\s+thang\s+cân\s+([A-Z])([A-Z])([A-Z])([A-Z])/u,
    shape: 'trapezoid',
    variant: 'isoceles',
  },
  {
    name: /hình\s+thang\s+vuông\s+([A-Z])([A-Z])([A-Z])([A-Z])/u,
    shape: 'trapezoid',
    variant: 'right',
  },
  {
    name: /hình\s+thang\s+([A-Z])([A-Z])([A-Z])([A-Z])/u,
    shape: 'trapezoid',
    variant: 'general',
  },
  {
    name: /hình\s+vuông\s+([A-Z])([A-Z])([A-Z])([A-Z])/u,
    shape: 'square',
    variant: 'standard',
  },
  {
    name: /hình\s+chữ\s+nhật\s+([A-Z])([A-Z])([A-Z])([A-Z])/u,
    shape: 'rectangle',
    variant: 'wide',
  },
  {
    name: /hình\s+bình\s+hành\s+([A-Z])([A-Z])([A-Z])([A-Z])/u,
    shape: 'parallelogram',
    variant: 'standard',
  },
  {
    name: /hình\s+thoi\s+([A-Z])([A-Z])([A-Z])([A-Z])/u,
    shape: 'rhombus',
    variant: 'standard',
  },
  {
    name: /tứ\s+giác\s+([A-Z])([A-Z])([A-Z])([A-Z])/u,
    shape: 'quadrilateral',
    variant: 'any',
  },
];

// Prefilter toàn đề: bất kỳ tên hình 4 đỉnh nào.
const PREFILTER =
  /hình\s+(?:vuông|chữ\s+nhật|bình\s+hành|thoi|thang)|tứ\s+giác/u;

/**
 * Tứ giác / đa giác 4 đỉnh → draw-shape. Duyệt từng clause, thử KINDS theo thứ
 * tự (cụ thể trước chung) — clause đầu tiên khớp 1 kind → 1 RuleMatch, dừng kind
 * loop cho clause đó. KHÔNG trích được 4 đỉnh HOA liền → bỏ qua (escalate AI).
 */
export const quadRule: LanguageRule = {
  id: 'quad',
  priority: 100,
  languages: ['vi'],
  patterns: [PREFILTER],
  match(ctx) {
    const out: RuleMatch[] = [];
    for (const c of ctx.clauses) {
      for (const k of KINDS) {
        const m = k.name.exec(c.text);
        if (!m) continue;
        const labels = [m[1], m[2], m[3], m[4]];
        out.push({
          ruleId: 'quad',
          clauseIds: [c.id],
          intents: [drawShape(k.shape, labels, k.variant)],
        });
        break; // 1 clause → 1 shape (kind cụ thể đã ưu tiên)
      }
    }
    return out;
  },
};
