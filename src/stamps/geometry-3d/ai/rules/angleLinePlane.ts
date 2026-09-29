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
    const boxBase = /hình\s+(?:hộp(?:\s+(?:chữ\s+nhật|đứng))?|lập\s+phương)\s+([A-Z]{4})\./u.exec(ctx.problem)?.[1];
    if (!apex && !head && !boxBase) return [];      // cần một khối để biết mặt đáy

    const out: RuleMatch3D[] = [];

    for (const c of ctx.clauses) {
      if (DIHEDRAL.test(c.text)) continue;              // dihedral → defer (Phase 3b)

      const m = RE_GIUA.exec(c.text) ?? RE_TAO.exec(c.text);
      if (!m) continue;

      const e1 = m[1];
      const e2 = m[2];
      const planeTok = m[4];       // group 4 = three-letter plane label (no parens), or undefined for đáy

      // Chóp: một đầu là đỉnh S, đầu kia trên mặt. Lăng trụ/hộp (không có đỉnh chóp): một đầu
      // thuộc MẶT (nhãn mặt/đáy), đầu kia ngoài mặt ⇒ chiếu đầu ngoài (vd AC' với (ABCD) ⇒ chiếu C').
      // Mặt CHỨA đỉnh chóp (vd góc giữa SC và (SAB)) ⇒ chiếu đầu KHÔNG thuộc mặt (C), không phải S
      // (trước đây chiếu S lên (SAB) = chính S — hình suy biến).
      const apexInPlane = !!(apex && planeTok && planeTok.includes(apex));
      let vtx: string | null = null;
      let from: string | null = apex ?? null;
      if (apex && !apexInPlane && e1 === apex && e2 !== apex) vtx = e2;
      else if (apex && !apexInPlane && e2 === apex && e1 !== apex) vtx = e1;
      else if (!apex || apexInPlane) {
        const inPlane = planeTok ? [...planeTok].filter((x) => /[A-Z]/u.test(x)) : (head?.baseLabels ?? (boxBase ? [...boxBase] : []));
        const strip = (x: string) => x.replace(/['′]/gu, '');
        const in1 = inPlane.includes(e1) && e1 === strip(e1), in2 = inPlane.includes(e2) && e2 === strip(e2);
        // Cạnh bên lăng trụ (AA') tạo góc ≠ 90° với đáy ⇒ lăng trụ XIÊN theo góc — layout chưa dựng
        // được góc đó (lăng trụ đứng sẽ ra 90°) ⇒ không nhận (thà thiếu còn hơn sai).
        if (strip(e1) === strip(e2) && !/[Hh]ình\s+chiếu[^.;]{0,40}?[A-Z]['′]/u.test(ctx.problem)) continue;
        if (in1 && !in2) { vtx = e1; from = e2; } else if (in2 && !in1) { vtx = e2; from = e1; }
      }
      if (!vtx || !from) continue;

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

      const foot = `H${from.replace(/['′]/gu, '')}`;

      const intents: Intent3DT[] = [
        plane3d(planeName, { kind: 'threePoints', p1: p[0], p2: p[1], p3: p[2] }),
        addPoint3d(foot, { kind: 'perpFootPlane', from, plane: planeName }),
        connect3d(from, foot, 'segment'),
        connect3d(foot, vtx, 'segment'),
        connect3d(from, vtx, 'segment'),
      ];

      out.push({ ruleId: this.id, clauseIds: [c.id], intents });
    }

    return out;
  },
};
