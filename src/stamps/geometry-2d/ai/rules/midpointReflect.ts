// src/stamps/geometry-2d/ai/rules/midpointReflect.ts
//
// Điểm MỚI được xác định qua "trung điểm" của một điểm CŨ:
//
//   "Vẽ điểm D sao cho C là trung điểm của AD"
//   "Trên tia đối của tia MA lấy điểm D sao cho M là trung điểm của AD"
//   "lấy điểm E sao cho M là trung điểm của đoạn thẳng BE"
//
// → D = đối xứng của A qua C (reflectPoint) — đúng tuyệt đối, + nối đoạn AD.
//
// Rule `midpoint` đọc cùng câu thành "C = trung điểm AD" (C đã là đỉnh tam giác
// → bị nâng thành phụ thuộc D, vòng tròn → transpile-fail). `midpoint` gọi
// `laTrungDiemDiemMoi` để nhường đúng occurrence này cho rule đây.
//
// Thà thiếu còn hơn sai: điểm mới PHẢI là một đầu mút của đoạn, tâm KHÁC hai đầu.
import type { LanguageRule, RuleMatch } from './_types';
import { addPoint, connect } from './_shared';

const RE = new RegExp(
  String.raw`(?:[Vv]ẽ|[Ll]ấy|[Dd]ựng|[Xx]ác\s+định)\s+(?:(?:một\s+)?điểm\s+)?([A-Z])(?![\p{L}\d'′])` +
    String.raw`\s+sao\s+cho\s+([A-Z])\s+là\s+trung\s*điểm\s+(?:của\s+)?(?:(?:đoạn|cạnh)\s*(?:thẳng\s+)?)?([A-Z])([A-Z])(?![\p{L}\d'′])`,
  'gu',
);

interface Hit {
  moi: string;
  tam: string;
  goc: string;
  /** chỉ số chữ tên tâm trong text (để `midpoint` nhận ra occurrence). */
  tamIdx: number;
}

function hits(text: string): Hit[] {
  const out: Hit[] = [];
  RE.lastIndex = 0;
  for (const m of text.matchAll(RE)) {
    const [whole, moi, tam, p, q] = m;
    if (moi !== p && moi !== q) continue;
    const goc = moi === p ? q : p;
    if (tam === moi || tam === goc || goc === moi) continue;
    const tamIdx = (m.index ?? 0) + whole.lastIndexOf(`${tam} là`);
    out.push({ moi, tam, goc, tamIdx });
  }
  return out;
}

/** `midpoint` hỏi: cụm "<tam> là trung điểm …" ở vị trí idx có thuộc dạng này không. */
export function laTrungDiemDiemMoi(text: string, idx: number): boolean {
  return hits(text).some((h) => h.tamIdx === idx);
}

export const midpointReflectRule: LanguageRule = {
  id: 'midpointReflect',
  priority: 56, // trên reflection (55)/midpoint (50): điểm mới đặt tên trước.
  languages: ['vi'],
  patterns: [/sao\s+cho\s+[A-Z]\s+là\s+trung\s*điểm/u],
  match(ctx) {
    const out: RuleMatch[] = [];
    for (const c of ctx.clauses) {
      for (const h of hits(c.text)) {
        out.push({
          ruleId: 'midpointReflect',
          clauseIds: [c.id],
          intents: [addPoint(h.moi, { kind: 'reflectPoint', of: h.goc, through: h.tam }), connect(h.goc, h.moi, 'segment')],
        });
      }
    }
    return out;
  },
};
