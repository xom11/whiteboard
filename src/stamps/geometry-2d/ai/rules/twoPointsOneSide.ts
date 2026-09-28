// src/stamps/geometry-2d/ai/rules/twoPointsOneSide.ts
//
// HAI điểm trên CÙNG một cạnh, mỗi điểm một điều kiện độ dài riêng:
//   "Trên cạnh BC lấy hai điểm D và E sao cho BD = BA và CE = CA"
// → D = B + |BA|·hướng BC ; E = C + |CA|·hướng CB. Mỗi đẳng thức phải có đúng một
// đoạn chứa điểm mới, đo từ MỘT ĐẦU của cạnh; vế kia là đoạn đã biết (không chứa
// điểm mới). Không đủ điều kiện cho cả hai điểm → bỏ qua.
import type { LanguageRule, RuleMatch } from './_types';
import type { IntentT } from '../intent';
import { addPoint, connect } from './_shared';

const RE = new RegExp(
  String.raw`[Tt]rên\s+(?:cạnh|đoạn\s*(?:thẳng)?)\s+([A-Z])([A-Z])(?![A-Z])\s*,?\s*lấy\s+(?:hai\s+)?(?:điểm\s+)?([A-Z])\s*(?:,|và)\s*([A-Z])(?![\p{L}\d'′])` +
    String.raw`\s*,?\s*sao\s+cho\s+([A-Z]{2})\s*=\s*([A-Z]{2})\s*(?:,|và)\s*([A-Z]{2})\s*=\s*([A-Z]{2})(?![\p{L}\d'′])(?!\s*[+\-*/·=<>])`,
  'gu',
);

export const twoPointsOneSideRule: LanguageRule = {
  id: 'twoPointsOneSide',
  priority: 65, // trên pointOnSideAtLength (64)
  languages: ['vi'],
  patterns: [/lấy\s+(?:hai\s+)?(?:điểm\s+)?[A-Z]\s*(?:,|và)\s*[A-Z][^.]{0,6}sao\s+cho/u],
  match(ctx) {
    const out: RuleMatch[] = [];
    for (const c of ctx.clauses) {
      for (const m of c.text.matchAll(RE)) {
        const [, x, y, p, q, e1a, e1b, e2a, e2b] = m;
        const moi = new Set([p, q]);
        if (moi.has(x) || moi.has(y) || p === q) continue;
        const plan = new Map<string, IntentT>();
        for (const [u, v] of [
          [e1a, e1b],
          [e2a, e2b],
        ]) {
          // vế chứa điểm mới
          const [seg, known] = [...u].some((ch) => moi.has(ch)) ? [u, v] : [v, u];
          if ([...known].some((ch) => moi.has(ch)) || ![...seg].some((ch) => moi.has(ch))) break;
          const pt = [...seg].find((ch) => moi.has(ch))!;
          const goc = seg.replace(pt, '');
          if (goc !== x && goc !== y) break;
          if (plan.has(pt)) break;
          plan.set(
            pt,
            addPoint(pt, {
              kind: 'pointAtDistance',
              from: goc,
              through: goc === x ? y : x,
              origin: 'from',
              distance: { kind: 'segmentLength', p1: known[0], p2: known[1] },
            }),
          );
        }
        if (plan.size !== 2) continue;
        out.push({ ruleId: 'twoPointsOneSide', clauseIds: [c.id], intents: [...plan.values(), connect(x, y, 'segment')] });
      }
    }
    return out;
  },
};
