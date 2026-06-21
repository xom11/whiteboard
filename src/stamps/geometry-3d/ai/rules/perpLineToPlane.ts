import type { LanguageRule3D, RuleContext3D, RuleMatch3D } from './_types';
import type { Intent3DT } from '../intent';
import { plane3d, line3dIntent, baseFaceOf } from './_shared';

// Co-fire guard: these cues belong to projectionFoot (priority 54).
const OWNED_BY_FOOT = /hình\s*chiếu|chân\s+đường|khoảng\s*cách/iu;

// Guard: target must NOT be a bare 2-letter line like "BC" (perpPlaneToLine owns that).
// A line target is indicated by a 2-uppercase-letter token WITHOUT surrounding parens,
// not preceded by "mặt phẳng" or "(", and not followed by more uppercase letters.
const LINE_TARGET = /(?:vuông\s*góc|⊥)\s*(?:với\s+)?(?!(?:mặt\s*(?:phẳng\s*)?|đáy|mặt\s*đáy))[A-Z][A-Z](?![A-Z])/u;

// Main capture:
// "qua <P> [dựng] [đường thẳng] [và] vuông góc [với] [mặt phẳng] (<XYZ>) | đáy | mặt đáy"
// Groups: 1=point, 2=plane token (XYZ), 3=đáy keyword
const RE = /[Qq]ua\s+([A-Z](?:['′]?)?)\s+(?:dựng\s+)?(?:đường\s*thẳng\s+)?(?:và\s+)?(?:vuông\s*góc|⊥)\s*(?:với\s+)?(?:mặt\s*phẳng\s*)?(?:\(([A-Z]{3,})\)|(mặt\s*đáy|[Đđ]áy)(?!\s*[A-Z]))/u;

export const perpLineToPlaneRule: LanguageRule3D = {
  id: 'perpLineToPlane',
  priority: 53,
  languages: ['vi'],
  patterns: [/vuông\s*góc/iu, /⊥/u],
  match(ctx: RuleContext3D): RuleMatch3D[] {
    const out: RuleMatch3D[] = [];
    for (const c of ctx.clauses) {
      if (OWNED_BY_FOOT.test(c.text)) continue;         // co-fire guard: projectionFoot owns
      if (LINE_TARGET.test(c.text)) continue;           // guard: line target → perpPlaneToLine
      const m = RE.exec(c.text);
      if (!m) continue;
      const point = m[1];
      let planeName: string;
      let p: [string, string, string];
      if (m[2]) {
        // explicit (XYZ) token
        const L = [...m[2]].slice(0, 3) as [string, string, string];
        planeName = `mp_${L.join('')}`;
        p = L;
      } else {
        // "đáy" / "mặt đáy" — synthesize from solid header
        const bf = baseFaceOf(ctx.problem);
        if (!bf) continue;
        planeName = bf.planeName;
        p = [bf.p1, bf.p2, bf.p3];
      }
      const intents: Intent3DT[] = [
        plane3d(planeName, { kind: 'threePoints', p1: p[0], p2: p[1], p3: p[2] }),
        line3dIntent({ kind: 'perpToPlane', point, plane: planeName }),
      ];
      out.push({ ruleId: this.id, clauseIds: [c.id], intents });
    }
    return out;
  },
};
