import type { LanguageRule3D, RuleContext3D, RuleMatch3D } from './_types';
import { addPoint3d, splitVertexToken } from './_shared';

// "G là trọng tâm (của)? (tam giác)? SBC"
const RE = /([A-Z])\s+là\s+trọng\s+tâm\s+(?:của\s+)?(?:tam\s+giác\s+)?([A-Z]{3})(?![\p{L}])/u;

export const centroid3dRule: LanguageRule3D = {
  id: 'centroid3d',
  priority: 61,
  languages: ['vi'],
  patterns: [/trọng\s+tâm/u],
  match(ctx: RuleContext3D): RuleMatch3D[] {
    const out: RuleMatch3D[] = [];
    for (const c of ctx.clauses) {
      const m = RE.exec(c.text);
      if (m) {
        out.push({
          ruleId: this.id,
          clauseIds: [c.id],
          intents: [addPoint3d(m[1], { kind: 'centroid', vertices: splitVertexToken(m[2]) })],
        });
      }
    }
    return out;
  },
};
