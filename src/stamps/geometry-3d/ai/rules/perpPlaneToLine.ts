import type { LanguageRule3D, RuleContext3D, RuleMatch3D } from './_types';
import type { Intent3DT } from '../intent';
import { plane3d } from './_shared';

// Co-fire guard: these cues belong to projectionFoot (priority 54).
const OWNED_BY_FOOT = /hình\s*chiếu|chân\s+đường|khoảng\s*cách/iu;

// Main capture:
// "[Mm]ặt phẳng [(P)] qua <Point> [và] vuông góc [với] [đường thẳng] <L1><L2>"
// LINE target = exactly two capital letters, NOT a "(XYZ)" plane token.
// Groups: 1=point, 2=lineA, 3=lineB
const RE =
  /[Mm]ặt\s*phẳng\s*(?:\([A-Z]\)\s*)?[Qq]ua\s+([A-Z](?:['′])?)\s*(?:và\s+)?(?:vuông\s*góc|⊥)\s*(?:với\s+)?(?:đường\s*thẳng\s+)?([A-Z](?:['′])?)([A-Z](?:['′])?)(?![\p{L}])/u;

export const perpPlaneToLineRule: LanguageRule3D = {
  id: 'perpPlaneToLine',
  priority: 52,
  languages: ['vi'],
  patterns: [/vuông\s*góc/iu, /⊥/u],
  match(ctx: RuleContext3D): RuleMatch3D[] {
    const out: RuleMatch3D[] = [];
    for (const c of ctx.clauses) {
      if (OWNED_BY_FOOT.test(c.text)) continue;          // co-fire guard: projectionFoot owns
      const m = RE.exec(c.text);
      if (!m) continue;
      const [, point, lineA, lineB] = m;
      const cleanPoint = point.replace(/['′]/gu, '');
      const intents: Intent3DT[] = [
        plane3d(`mp_perp_${cleanPoint}`, { kind: 'perpToLine', point, lineA, lineB }),
      ];
      out.push({ ruleId: this.id, clauseIds: [c.id], intents });
    }
    return out;
  },
};
