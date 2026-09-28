// src/stamps/geometry-2d/ai/rules/pointOnNamedSide.ts
//
// Điểm trên cạnh gọi bằng TÊN VAI TRÒ, không nêu cặp đỉnh (lớp 8):
//   "Xét một điểm M trên cạnh huyền của tam giác ABC vuông cân tại A" → M ∈ BC
//   "Lấy điểm D thuộc cạnh đáy của tam giác ABC cân tại A"             → D ∈ BC
// Cạnh huyền = cạnh đối đỉnh vuông; cạnh đáy = cạnh đối đỉnh cân. Không xác định
// được đỉnh (tam giác không nêu "vuông/cân tại") → bỏ qua.
import type { LanguageRule, RuleMatch } from './_types';
import { addPoint } from './_shared';

const PREFILTER = /cạnh\s+(?:huyền|đáy)(?!\s*[A-Z]{2})/u;
const RE = /(?:điểm\s+)?([A-Z])(?![A-Z'′])\s+(?:nằm\s+)?(?:trên|thuộc)\s+cạnh\s+(huyền|đáy)(?!\s*[A-Z])/gu;
const TRI = /tam\s*giác\s+([A-Z])([A-Z])([A-Z])(?![A-Z])[^.;]{0,20}?(vuông\s+cân|vuông|cân)\s+tại\s+(?:đỉnh\s+)?([A-Z])(?![A-Z])/u;

export const pointOnNamedSideRule: LanguageRule = {
  id: 'pointOnNamedSide',
  priority: 63,
  languages: ['vi'],
  patterns: [PREFILTER],
  match(ctx) {
    const t = TRI.exec(ctx.problem);
    if (!t) return [];
    const dinh = [t[1], t[2], t[3]];
    const loai = t[4];
    const v = t[5];
    if (!dinh.includes(v)) return [];
    const doi = dinh.filter((x) => x !== v).join('');
    const out: RuleMatch[] = [];
    for (const c of ctx.clauses) {
      for (const m of c.text.matchAll(RE)) {
        const [, p, vaiTro] = m;
        if (dinh.includes(p)) continue;
        if (vaiTro === 'huyền' && !loai.startsWith('vuông')) continue;
        if (vaiTro === 'đáy' && !loai.endsWith('cân')) continue;
        out.push({ ruleId: 'pointOnNamedSide', clauseIds: [c.id], intents: [addPoint(p, { kind: 'onSegment', of: doi })] });
      }
    }
    return out;
  },
};
