import type { LanguageRule3D, RuleContext3D, RuleMatch3D } from './_types';
import type { Intent3DT } from '../intent';
import { plane3d, addPoint3d, connect3d, baseFaceOf } from './_shared';

// Cue/prefilter (full problem): /iu so sentence-initial capitals match.
const CUE = /hình\s*chiếu|chân\s+đường|khoảng\s*cách/iu;

// Capture regexes stay /u (strict [A-Z]); sentence-initial capital via [Hh]/[Kk]/[Cc].
// Target = plane token (≥3 letters), or "mặt đáy"/"đáy", or a bare 2-letter line.
// Trailing optional: "là [điểm] <name>" after target.
const TARGET =
  '(?:(?:mặt\\s*phẳng\\s*)?\\(([A-Z]{3,})\\)|(mặt\\s*đáy|[Đđ]áy)|(?:cạnh\\s+|đường\\s*thẳng\\s+)?([A-Z](?:[\'′])?)([A-Z](?:[\'′])?))';
const TRAIL = '(?:\\s+là\\s+(?:điểm\\s+)?([A-Z](?:[\'′]?)))?';

// "[<H> là] hình chiếu [vuông góc] [của] [đỉnh|điểm] <from> lên|trên|xuống <target> [là [điểm] <name>]"
// Groups: 1=leading-name, 2=from, 3=planeTok, 4=dayKw, 5=lineA, 6=lineB, 7=trailing-name
const RE_HC = new RegExp(
  '(?:([A-Z](?:[\'′])?)\\s+là\\s+)?[Hh]ình\\s*chiếu\\s*(?:vuông\\s*góc\\s*)?(?:của\\s+)?(?:đỉnh\\s+|điểm\\s+)?([A-Z](?:[\'′])?)\\s*(?:lên|trên|xuống)\\s+' + TARGET + TRAIL,
  'u',
);
// "chân đường (vuông góc|cao) [hạ] [từ] <from> [lên|trên|xuống|đến] <target> [là [điểm] <name>]"
// Groups: 1=leading-name, 2=from, 3=planeTok, 4=dayKw, 5=lineA, 6=lineB, 7=trailing-name
const RE_CHAN = new RegExp(
  '(?:([A-Z](?:[\'′])?)\\s+là\\s+)?[Cc]hân\\s+đường\\s+(?:vuông\\s*góc|cao)\\s+(?:hạ\\s+)?(?:từ\\s+|của\\s+)?(?:đỉnh\\s+|điểm\\s+)?([A-Z](?:[\'′])?)\\s*(?:lên|trên|xuống|đến)\\s+' + TARGET + TRAIL,
  'u',
);
// "khoảng cách (từ) <from> đến <target>"  (foot unnamed → synth)
// Groups: 1=from, 2=planeTok, 3=dayKw, 4=lineA, 5=lineB
const RE_KC = new RegExp(
  '[Kk]hoảng\\s*cách\\s+(?:từ\\s+)?(?:đỉnh\\s+|điểm\\s+)?([A-Z](?:[\'′])?)\\s+đến\\s+' + TARGET,
  'u',
);

const stripPrime = (s: string) => s.replace(/['′]/gu, '');

type Target =
  | { kind: 'plane'; planeName: string; p: [string, string, string] }
  | { kind: 'line'; a: string; b: string };

function toTarget(planeTok: string | undefined, dayKw: string | undefined, lineA: string | undefined, lineB: string | undefined, problem: string): Target | null {
  if (planeTok) {
    const L = [...planeTok].slice(0, 3) as [string, string, string];
    return { kind: 'plane', planeName: `mp_${L.join('')}`, p: L };
  }
  if (dayKw) {
    const bf = baseFaceOf(problem);
    if (!bf) return null;
    return { kind: 'plane', planeName: bf.planeName, p: [bf.p1, bf.p2, bf.p3] };
  }
  if (lineA && lineB) return { kind: 'line', a: lineA, b: lineB };
  return null;
}

function emit(named: string | undefined, from: string, t: Target): Intent3DT[] {
  const foot = named ?? `H${stripPrime(from)}`;
  const out: Intent3DT[] = [];
  if (t.kind === 'plane') {
    out.push(plane3d(t.planeName, { kind: 'threePoints', p1: t.p[0], p2: t.p[1], p3: t.p[2] }));
    out.push(addPoint3d(foot, { kind: 'perpFootPlane', from, plane: t.planeName }));
  } else {
    out.push(addPoint3d(foot, { kind: 'perpFootLine', from, a: t.a, b: t.b }));
  }
  out.push(connect3d(from, foot, 'segment'));
  return out;
}

export const projectionFootRule: LanguageRule3D = {
  id: 'projectionFoot',
  priority: 54,
  languages: ['vi'],
  patterns: [/hình\s*chiếu/iu, /chân\s+đường/iu, /khoảng\s*cách/iu],
  match(ctx: RuleContext3D): RuleMatch3D[] {
    const out: RuleMatch3D[] = [];
    for (const c of ctx.clauses) {
      if (!CUE.test(c.text)) continue;
      let m = RE_HC.exec(c.text) ?? RE_CHAN.exec(c.text);
      if (m) {
        const t = toTarget(m[3], m[4], m[5], m[6], ctx.problem);
        if (!t) continue;
        // Named: leading "H là" (m[1]) takes priority; then trailing "là H" (m[7]).
        const named = m[1] ?? m[7];
        out.push({ ruleId: this.id, clauseIds: [c.id], intents: emit(named, m[2], t) });
        continue;
      }
      m = RE_KC.exec(c.text);
      if (m) {
        const t = toTarget(m[2], m[3], m[4], m[5], ctx.problem);
        if (!t) continue;
        out.push({ ruleId: this.id, clauseIds: [c.id], intents: emit(undefined, m[1], t) });
      }
    }
    return out;
  },
};
