// src/stamps/geometry-2d/ai/rules/midpointCondition.ts
//
// Điểm mới xác định bởi điều kiện TRUNG ĐIỂM (đối xứng qua một điểm), cách nói lớp 8:
//   "Trên tia MI lấy điểm N sao cho I là trung điểm của MN"   → N = đối xứng M qua I
//   "lấy điểm O sao cho E là trung điểm của OM"               → O = đối xứng M qua E
//   "Lấy điểm Q sao cho P là trung điểm của MQ"
//
// reflection.ts chỉ đọc "đối xứng với … qua …"; dạng "sao cho X là trung điểm" bị
// onSegmentPoint đặt N TỰ DO trên tia (sai điều kiện) hoặc bỏ sót. Priority 67 để
// thắng mọi "điểm tự do trên tia/cạnh" (add-point first-wins).
import type { LanguageRule, RuleMatch } from './_types';
import { addPoint } from './_shared';

const PREFILTER = /sao\s+cho\s+[A-Z]\s+là\s+trung\s*điểm/u;
const RE = new RegExp(
  String.raw`[Ll]ấy\s+(?:một\s+)?(?:điểm\s+)?([A-Z])(?![A-Z'′])[^.;]{0,40}?sao\s+cho\s+([A-Z])\s+là\s+trung\s*điểm\s+(?:của\s+)?(?:đoạn(?:\s+thẳng)?\s+)?([A-Z])([A-Z])(?![A-Z'′])`,
  'gu',
);
// "Trên tia XY lấy điểm N sao cho …" — tên đứng sau "lấy".
const RE_TIA = new RegExp(
  String.raw`[Tt]rên\s+(?:tia|đường\s*thẳng|đoạn(?:\s+thẳng)?)\s+[A-Z]{2}(?![A-Z])\s*,?\s*lấy\s+(?:một\s+)?(?:điểm\s+)?([A-Z])(?![A-Z'′])\s+sao\s+cho\s+([A-Z])\s+là\s+trung\s*điểm\s+(?:của\s+)?(?:đoạn(?:\s+thẳng)?\s+)?([A-Z])([A-Z])(?![A-Z'′])`,
  'gu',
);

export const midpointConditionRule: LanguageRule = {
  id: 'midpointCondition',
  priority: 67,
  languages: ['vi'],
  patterns: [PREFILTER],
  match(ctx) {
    const out: RuleMatch[] = [];
    for (const c of ctx.clauses) {
      const seen = new Set<string>();
      for (const re of [RE_TIA, RE]) {
        for (const m of c.text.matchAll(re)) {
          const [, moi, tam, p, q] = m;
          if (seen.has(moi)) continue;
          if (moi !== p && moi !== q) continue; // điểm mới phải là một đầu mút
          const cu = moi === p ? q : p;
          if (cu === moi || tam === moi || tam === cu) continue;
          seen.add(moi);
          out.push({ ruleId: 'midpointCondition', clauseIds: [c.id], intents: [addPoint(moi, { kind: 'reflectPoint', of: cu, through: tam })] });
        }
      }
    }
    return out;
  },
};
