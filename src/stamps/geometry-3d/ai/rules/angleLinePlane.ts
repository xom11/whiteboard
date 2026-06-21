import type { LanguageRule3D, RuleContext3D, RuleMatch3D } from './_types';
import type { Intent3DT } from '../intent';
import { plane3d, addPoint3d, connect3d, baseFaceOf, parseSolidHead3D } from './_shared';

// "góc/Góc giữa|hợp [cạnh|đường thẳng] <X><Y> và [mặt phẳng] (đáy|(XYZ))"
// Uses [Gg]óc instead of /i flag to keep [A-Z] capture groups strictly uppercase.
const RE_GIUA = new RegExp(
  '(?:[Gg]óc\\s+(?:giữa|hợp(?:\\s+bởi)?)\\s+(?:cạnh\\s+|đường\\s*thẳng\\s+)?)([A-Z](?:[\'′])?)([A-Z](?:[\'′])?)\\s+(?:và|với)\\s+(?:mặt\\s*(?:[Pp]hẳng\\s*)?)?(\\(([A-Z]{3,})\\)|mặt\\s*[Đđ]áy|[Đđ]áy)',
  'u',
);

// "<X><Y> tạo với [mặt] (đáy|(XYZ)) [một] góc"
const RE_TAO = new RegExp(
  '([A-Z](?:[\'′])?)([A-Z](?:[\'′])?)\\s+tạo\\s+với\\s+(?:mặt\\s*phẳng\\s*)?(\\(([A-Z]{3,})\\)|mặt\\s*đáy|[Đđ]áy)\\s*(?:một\\s+)?góc',
  'u',
);

// Dihedral / two-plane angle → defer to Phase 3b
const DIHEDRAL = /góc\s+(?:giữa\s+)?(?:hai\s+mặt\s+phẳng|nhị\s+diện|mặt\s+bên)/iu;

export const angleLinePlaneRule: LanguageRule3D = {
  id: 'angleLinePlane',
  priority: 51,
  languages: ['vi'],
  patterns: [/góc\s+(?:giữa|hợp)/iu, /tạo\s+với/iu],

  match(ctx: RuleContext3D): RuleMatch3D[] {
    const head = parseSolidHead3D(ctx.problem);
    const apex = head?.apex;
    if (!apex) return [];            // need a pyramid apex to project

    const out: RuleMatch3D[] = [];

    for (const c of ctx.clauses) {
      if (DIHEDRAL.test(c.text)) continue;              // dihedral → defer (Phase 3b)

      const m = RE_GIUA.exec(c.text) ?? RE_TAO.exec(c.text);
      if (!m) continue;

      const e1 = m[1];
      const e2 = m[2];
      const planeTok = m[4];       // group 4 = three-letter plane label (no parens), or undefined for đáy

      // exactly one endpoint must be the apex; the other is a base vertex
      let vtx: string | null = null;
      if (e1 === apex && e2 !== apex) vtx = e2;
      else if (e2 === apex && e1 !== apex) vtx = e1;
      if (!vtx) continue;

      // Resolve base plane
      let planeName: string;
      let p: [string, string, string];

      if (planeTok) {
        const L = [...planeTok].slice(0, 3) as [string, string, string];
        planeName = `mp_${L.join('')}`;
        p = L;
      } else {
        const bf = baseFaceOf(ctx.problem);
        if (!bf) continue;
        planeName = bf.planeName;
        p = [bf.p1, bf.p2, bf.p3];
      }

      const foot = `H_${apex.replace(/['′]/gu, '')}`;

      const intents: Intent3DT[] = [
        plane3d(planeName, { kind: 'threePoints', p1: p[0], p2: p[1], p3: p[2] }),
        addPoint3d(foot, { kind: 'perpFootPlane', from: apex, plane: planeName }),
        connect3d(apex, foot, 'segment'),
        connect3d(foot, vtx, 'segment'),
        connect3d(apex, vtx, 'segment'),
      ];

      out.push({ ruleId: this.id, clauseIds: [c.id], intents });
    }

    return out;
  },
};
