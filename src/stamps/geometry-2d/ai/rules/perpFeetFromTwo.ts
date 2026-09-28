// src/stamps/geometry-2d/ai/rules/perpFeetFromTwo.ts
//
// Hai đường vuông góc từ HAI điểm khác nhau, phân phối:
//   "Từ B và C kẻ BH, CK theo thứ tự vuông góc với AD và AE (H ∈ AD, K ∈ AE)"
//   "Kẻ BH, CK lần lượt vuông góc với AD, AE"
//   "Vẽ BD, CE lần lượt vuông góc với AC, AB"
//
// → H = chân vuông góc từ B xuống AD, K = từ C xuống AE; nối BH, CK.
// (`parallelPerp` chỉ lo các đoạn CÙNG một gốc "Từ C kẻ CE, CF ⊥ AD, DB".)
//
// Thà thiếu còn hơn sai: mỗi đoạn phải bắt đầu bằng gốc tương ứng (nếu có "Từ X và
// Y"), chân không trùng gốc và không nằm trên chính đường đích (tên đích không chứa
// chân), số đoạn = số đường đích = 2.
import type { LanguageRule, RuleMatch } from './_types';
import { addPoint, connect } from './_shared';

const RE = new RegExp(
  String.raw`(?:[Tt]ừ\s+(?:điểm\s+)?([A-Z])\s+và\s+([A-Z])\s*,?\s*)?(?:[Kk]ẻ|[Vv]ẽ|[Hh]ạ|[Dd]ựng)\s+(?:các\s+)?(?:đường\s+)?` +
    String.raw`([A-Z])([A-Z])\s*(?:,|và)\s*([A-Z])([A-Z])(?![\p{L}\d'′])\s+(?:lần\s*lượt\s+|(?:theo\s+)?thứ\s+tự\s+)` +
    String.raw`(?:⊥|vuông\s*góc(?:\s+với)?)\s*(?:các\s+)?(?:cạnh\s+|đường\s*thẳng\s+)?([A-Z])([A-Z])\s*(?:,|và)\s*([A-Z])([A-Z])(?![\p{L}\d'′])`,
  'gu',
);

export const perpFeetFromTwoRule: LanguageRule = {
  id: 'perpFeetFromTwo',
  priority: 61,
  languages: ['vi'],
  patterns: [/(?:lần\s*lượt|thứ\s+tự)\s+(?:⊥|vuông\s*góc)/u],
  match(ctx) {
    const out: RuleMatch[] = [];
    for (const c of ctx.clauses) {
      for (const m of c.text.matchAll(RE)) {
        const [, g1, g2, f1, c1, f2, c2, l1a, l1b, l2a, l2b] = m;
        if (f1 === f2) continue; // cùng gốc → việc của parallelPerp
        if (g1 && (g1 !== f1 || g2 !== f2)) continue;
        const cap = [
          [f1, c1, l1a + l1b],
          [f2, c2, l2a + l2b],
        ] as const;
        if (cap.some(([f, ch, l]) => f === ch || l.includes(ch))) continue;
        out.push({
          ruleId: 'perpFeetFromTwo',
          clauseIds: [c.id],
          intents: cap.flatMap(([f, ch, l]) => [addPoint(ch, { kind: 'perpFoot', from: f, onLine: l }), connect(f, ch, 'segment')]),
        });
      }
    }
    return out;
  },
};
