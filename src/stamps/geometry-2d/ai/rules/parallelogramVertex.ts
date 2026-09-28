// src/stamps/geometry-2d/ai/rules/parallelogramVertex.ts
//
// Đỉnh thứ tư của hình bình hành dựng từ ba điểm đã có — rất hay gặp ở chương Vectơ:
//   "Cho tam giác ABC. Gọi D là điểm sao cho ABCD là hình bình hành."
//   "Dựng điểm E sao cho tứ giác ABEC là hình bình hành."
// Đỉnh X ở vị trí i của tên hình ⇒ X = đỉnh trước + đỉnh sau − đỉnh đối (vectơ
// XA = vectơ … — hai đường chéo cắt nhau tại trung điểm mỗi đường). Dựng bằng
// constraint 'affine' (kéo A, B, C thì X vẫn là đỉnh hình bình hành) + nối 4 cạnh.
//
// "Tìm/Xác định điểm D …" là câu hỏi (mệnh đề chứng minh) — coverage đã loại, không
// vào đây.
import type { LanguageRule, RuleMatch } from './_types';
import { addPoint, markShape } from './_shared';

const RE = /(?:[Gg]ọi|[Dd]ựng|[Ll]ấy|[Cc]ho|[Vv]ẽ)\s+(?:điểm\s+)?([A-Z])(?![A-Z'′])\s+(?:là\s+(?:một\s+)?điểm\s+)?(?:sao\s+cho|để|thoả\s+mãn|thỏa\s+mãn)\s+(?:tứ\s+giác\s+)?([A-Z])([A-Z])([A-Z])([A-Z])(?![A-Z'′])\s+là\s+(?:một\s+)?hình\s+bình\s+hành/u;

export const parallelogramVertexRule: LanguageRule = {
  id: 'parallelogramVertex',
  priority: 66,
  languages: ['vi'],
  patterns: [/bình\s+hành/u],
  match(ctx) {
    const out: RuleMatch[] = [];
    for (const c of ctx.clauses) {
      const m = RE.exec(c.text);
      if (!m) continue;
      const X = m[1];
      const v = [m[2], m[3], m[4], m[5]];
      const i = v.indexOf(X);
      if (i < 0 || new Set(v).size !== 4) continue;
      const truoc = v[(i + 3) % 4];
      const sau = v[(i + 1) % 4];
      const doi = v[(i + 2) % 4];
      out.push({
        ruleId: 'parallelogramVertex',
        clauseIds: [c.id],
        intents: [
          addPoint(X, { kind: 'affine', points: [truoc, sau, doi], weights: [1, 1, -1] }),
          markShape('quadrilateral', v),
        ],
      });
    }
    return out;
  },
};
