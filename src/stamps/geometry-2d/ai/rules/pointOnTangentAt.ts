// src/stamps/geometry-2d/ai/rules/pointOnTangentAt.ts
//
// Điểm lấy TRÊN tiếp tuyến TẠI một điểm trên đường tròn (tiếp tuyến KHÔNG đặt tên
// kiểu tia Ax — mà mô tả bằng "tiếp tuyến tại A"):
//   "Trên tiếp tuyến của đường tròn (O) tại A lấy điểm M"        (vao10:17)
//   "Trên tiếp tuyến tại C của (O) lấy một điểm P"
//
// → drawLine('tA', 'tangentAt', {through:A, circle}) + addPoint(M, onSegment 'tA')
//   Tạo CẢ tiếp tuyến (như tangentAt) LẪN điểm tự do M trượt trên nó. M là gốc
//   của nhiều phái sinh downstream ("Từ M vẽ tiếp tuyến thứ hai", "MB cắt (O)") →
//   phủ clause này mở khoá cả chuỗi.
//
// KHÁC pointOnTangentRay (tia ĐÃ đặt tên Ax do tangentRay dựng): ở đây tiếp tuyến
// chưa tồn tại, rule tự dựng line tên "t<điểm>".
import type { LanguageRule, RuleMatch } from './_types';
import { addPoint, drawLine } from './_shared';

const PREFILTER = /[Tt]rên\s+tiếp\s*tuyến/u;
const CIRCLE_REF =
  /đường\s*tròn\s*(?:tâm\s+)?\(?\s*([A-Z])(?:\s*[;,]\s*[Rr])?\s*\)?|\(\s*([A-Z])(?:\s*[;,]\s*[Rr])?\s*\)/u;

// "Trên tiếp tuyến (của (đường tròn)? (O))? tại A (của (O))? lấy (một)? điểm M"
//   - "của (O)" có thể đứng TRƯỚC "tại A" ("tiếp tuyến của (O) tại A") hoặc SAU
//     ("tiếp tuyến tại A của (O)") — blob `[^.]{0,30}?` nuốt cụm xen giữa.
// group1 = điểm tiếp xúc (A); group2 = điểm lấy (M).
const TAKE_ON_TANGENT_AT = new RegExp(
  '[Tt]rên\\s+tiếp\\s*tuyến\\s+[^.]{0,30}?tại\\s+([A-Z])(?![A-Za-z])' +
    '[^.]{0,30}?lấy\\s+(?:một\\s+)?điểm\\s+([A-Z])(?![A-Za-z])',
  'u',
);

function circleName(problem: string): string | undefined {
  const m = CIRCLE_REF.exec(problem);
  const center = m?.[1] ?? m?.[2];
  if (!center) return undefined;
  return /đường\s*kính/u.test(problem) ? `${center}_c` : center;
}

export const pointOnTangentAtRule: LanguageRule = {
  // Dưới tangent-at (63) / tangent-ray (63); rule này TỰ dựng line nên thứ tự nội
  // bộ (drawLine trước addPoint) đảm bảo onSegment tham chiếu được line.
  id: 'point-on-tangent-at',
  priority: 56,
  languages: ['vi'],
  patterns: [PREFILTER],
  match(ctx) {
    const circle = circleName(ctx.problem);
    if (!circle) return [];
    const out: RuleMatch[] = [];
    for (const c of ctx.clauses) {
      const m = TAKE_ON_TANGENT_AT.exec(c.text);
      if (!m) continue;
      const [touch, point] = [m[1], m[2]];
      if (touch === point) continue;
      const line = `t${touch}`;
      out.push({
        ruleId: 'point-on-tangent-at',
        clauseIds: [c.id],
        intents: [
          drawLine(line, 'tangentAt', { through: touch, circle }),
          addPoint(point, { kind: 'onSegment', of: line }),
        ],
      });
    }
    return out;
  },
};
