// src/stamps/geometry-2d/ai/rules/midpointCondition.ts
//
// Điểm mới xác định bởi điều kiện TRUNG ĐIỂM (đối xứng qua một điểm):
//   "Trên tia MI lấy điểm N sao cho I là trung điểm của MN"   → N = đối xứng M qua I
//   "lấy điểm O sao cho E là trung điểm của OM"               → O = đối xứng M qua E
//   "Vẽ điểm D sao cho C là trung điểm của AD"                → D = đối xứng A qua C
// + nối đoạn cũ–mới.
//
// Hợp nhất midpointCondition (nhánh lớp 8) và midpointReflect (nhánh lớp 7) — cùng
// nghĩa. reflection.ts chỉ đọc "đối xứng với … qua …"; dạng "sao cho X là trung điểm"
// bị onSegmentPoint đặt điểm TỰ DO (sai điều kiện) hoặc bị `midpoint` đọc thành "C là
// trung điểm AD" (C đỉnh tam giác bị nâng thành phụ thuộc D → vòng, transpile-fail);
// `midpoint` hỏi `laTrungDiemDiemMoi` để nhường đúng occurrence. Priority 67 để thắng
// mọi "điểm tự do trên tia/cạnh" (add-point first-wins).
import type { LanguageRule, RuleMatch } from './_types';
import { addPoint, connect } from './_shared';

const PREFILTER = /sao\s+cho\s+[A-Z]\s+là\s+trung\s*điểm/u;
const DOAN = String.raw`(?:của\s+)?(?:(?:đoạn|cạnh)(?:\s+thẳng)?\s+)?([A-Z])([A-Z])(?![\p{L}\d'′])`;
const RE = new RegExp(
  String.raw`(?:[Ll]ấy|[Vv]ẽ|[Dd]ựng|[Xx]ác\s+định)\s+(?:một\s+)?(?:điểm\s+)?([A-Z])(?![A-Z'′])[^.;]{0,40}?sao\s+cho\s+([A-Z])\s+là\s+trung\s*điểm\s+` + DOAN,
  'gu',
);
// "Trên tia XY lấy điểm N sao cho …" — tên đứng sau "lấy".
const RE_TIA = new RegExp(
  String.raw`[Tt]rên\s+(?:tia|đường\s*thẳng|đoạn(?:\s+thẳng)?)\s+[A-Z]{2}(?![A-Z])\s*,?\s*lấy\s+(?:một\s+)?(?:điểm\s+)?([A-Z])(?![A-Z'′])\s+sao\s+cho\s+([A-Z])\s+là\s+trung\s*điểm\s+` + DOAN,
  'gu',
);

interface Hit {
  moi: string;
  tam: string;
  cu: string;
  /** vị trí chữ tên tâm trong text (để `midpoint` nhận ra occurrence). */
  tamIdx: number;
}

function hits(text: string): Hit[] {
  const out: Hit[] = [];
  const seen = new Set<string>();
  for (const re of [RE_TIA, RE]) {
    re.lastIndex = 0;
    for (const m of text.matchAll(re)) {
      const [whole, moi, tam, p, q] = m;
      if (seen.has(moi)) continue;
      if (moi !== p && moi !== q) continue; // điểm mới phải là một đầu mút
      const cu = moi === p ? q : p;
      if (cu === moi || tam === moi || tam === cu) continue;
      seen.add(moi);
      out.push({ moi, tam, cu, tamIdx: (m.index ?? 0) + whole.lastIndexOf(`${tam} là`) });
    }
  }
  return out;
}

/** `midpoint` hỏi: cụm "<tam> là trung điểm …" ở vị trí idx có thuộc dạng này không. */
export function laTrungDiemDiemMoi(text: string, idx: number): boolean {
  return hits(text).some((h) => h.tamIdx === idx);
}

export const midpointConditionRule: LanguageRule = {
  id: 'midpointCondition',
  priority: 67,
  languages: ['vi'],
  patterns: [PREFILTER],
  match(ctx) {
    const out: RuleMatch[] = [];
    for (const c of ctx.clauses) {
      for (const h of hits(c.text)) {
        out.push({
          ruleId: 'midpointCondition',
          clauseIds: [c.id],
          intents: [addPoint(h.moi, { kind: 'reflectPoint', of: h.cu, through: h.tam }), connect(h.cu, h.moi, 'segment')],
        });
      }
    }
    return out;
  },
};
