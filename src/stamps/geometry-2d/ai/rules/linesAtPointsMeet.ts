// src/stamps/geometry-2d/ai/rules/linesAtPointsMeet.ts
//
// Ba dạng đường thẳng lớp 8 chưa có rule:
//
// (1) Hai đường ⊥/∥ "TẠI" điểm, rồi cắt nhau:
//     "Kẻ đường thẳng vuông góc với AC tại C và đường thẳng vuông góc với BD tại D,
//      hai đường thẳng này cắt nhau tại E"
// (2) Đường thẳng (đặt tên hoặc không) song song với HAI ĐÁY hình thang, cắt hai cạnh
//     bên (và đường chéo) — đường tự do; nếu đề cho tỉ số trên cạnh bên ("MD = 2MA")
//     thì đặt đúng tỉ số:
//     "Đường thẳng d song song với hai đáy và cắt hai cạnh bên AD, BC … lần lượt tại
//      M, N; cắt đường chéo AC tại P"
// (3) "Qua điểm M bất kì thuộc cạnh AC, vẽ đường thẳng song song với CD. Đường thẳng
//      đó cắt BD tại N" — tham chiếu "đường thẳng đó" sang câu sau.
import type { LanguageRule, RuleMatch } from './_types';
import type { IntentT } from '../intent';
import { addPoint, drawLine } from './_shared';

const PREFILTER = /song\s*song|vuông\s*góc|⊥/u;
const KW = String.raw`(vuông\s*góc|⊥|song\s*song)`;
const PT = "([A-Z])(?![A-Z'′])";
const SEG = '([A-Z]{2})(?![A-Z])';

const HAI_TAI = new RegExp(
  String.raw`(?:[Kk]ẻ|[Vv]ẽ|[Dd]ựng)\s+(?:các\s+)?đường\s*thẳng\s+${KW}\s+(?:với\s+)?${SEG}\s+tại\s+${PT}\s*(?:,|và)\s*(?:đường\s*thẳng\s+)?${KW}\s+(?:với\s+)?${SEG}\s+tại\s+${PT}\s*,?\s*(?:hai\s+đường\s*thẳng\s+(?:này|đó)\s+|chúng\s+)?cắt\s+nhau\s+(?:tại|ở)\s+(?:điểm\s+)?${PT}`,
  'gu',
);
const SS_HAI_DAY = new RegExp(
  String.raw`[Đđ]ường\s*thẳng\s+(?:([a-z])\s+)?song\s*song\s+với\s+hai\s+đáy\s+(?:và\s+)?cắt\s+(?:hai\s+)?(?:cạnh\s+bên\s+)?${SEG}\s*(?:,|và)\s*${SEG}(?:\s+của\s+hình\s+thang(?:\s+đó|\s+[A-Z]{4})?)?\s*${'(?:lần\\s*lượt\\s+|theo\\s+thứ\\s+tự\\s+)?'}(?:tại|ở)\s+${PT}\s*(?:,|và)\s*${PT}`,
  'u',
);
const CAT_THEM = new RegExp(String.raw`^\s*cắt\s+(?:đường\s+chéo\s+|cạnh\s+|đoạn\s+)?${SEG}\s+(?:tại|ở)\s+${PT}`, 'u');
const HINH_THANG = /hình\s+thang(?:\s+(?:cân|vuông))?\s+([A-Z]{4})(?![A-Z])[^.]{0,20}?\(?\s*([A-Z]{2})\s*\/\/\s*([A-Z]{2})/u;

const QUA_TU_DO = new RegExp(
  String.raw`[Qq]ua\s+(?:một\s+)?(?:điểm\s+)?${PT}\s+(?:bất\s*k[iìyỳ]\s+)?(?:thuộc|trên)\s+(?:cạnh\s+|đoạn(?:\s+thẳng)?\s+)?${SEG}\s*,?\s*(?:vẽ|kẻ|dựng)\s+(?:một\s+)?đường\s*thẳng\s+${KW}\s+(?:với\s+)?${SEG}\s*$`,
  'u',
);
const DUONG_DO = new RegExp(String.raw`^\s*[Đđ]ường\s*thẳng\s+(?:đó|này)\s+cắt\s+(?:cạnh\s+|đoạn\s+|đường\s*thẳng\s+)?${SEG}\s+(?:tại|ở)\s+${PT}`, 'u');

const ss = (kw: string) => /song/u.test(kw);

export const linesAtPointsMeetRule: LanguageRule = {
  id: 'linesAtPointsMeet',
  priority: 56,
  languages: ['vi'],
  patterns: [PREFILTER],
  match(ctx) {
    const out: RuleMatch[] = [];
    const cls = ctx.clauses;
    for (let i = 0; i < cls.length; i++) {
      const c = cls[i];
      // (1)
      for (const m of c.text.matchAll(HAI_TAI)) {
        const [, k1, r1, p1, k2, r2, p2, X] = m;
        if ((ss(k1) && r1.includes(p1)) || (ss(k2) && r2.includes(p2)) || X === p1 || X === p2) continue;
        const l1 = (ss(k1) ? 'par' : 'prp') + p1 + r1;
        const l2 = (ss(k2) ? 'par' : 'prp') + p2 + r2;
        out.push({
          ruleId: 'linesAtPointsMeet',
          clauseIds: [c.id],
          intents: [
            drawLine(l1, ss(k1) ? 'parallelThrough' : 'perpThrough', { through: p1, to: r1 }),
            drawLine(l2, ss(k2) ? 'parallelThrough' : 'perpThrough', { through: p2, to: r2 }),
            addPoint(X, { kind: 'intersection', of: [l1, l2] }),
          ],
        });
      }
      // (2)
      const d = SS_HAI_DAY.exec(c.text);
      const ht = HINH_THANG.exec(ctx.problem);
      if (d && ht) {
        const [, , s1, s2, M, N] = d;
        const day = ht[2];
        const canh = [ht[1][0] + ht[1][1], ht[1][1] + ht[1][2], ht[1][2] + ht[1][3], ht[1][3] + ht[1][0]];
        const la = (s: string) => canh.some((x) => x === s || x === s[1] + s[0]);
        if (la(s1) && la(s2) && !s1.includes(M) && !s2.includes(N) && M !== N) {
          // Tỉ số trên cạnh bên s1 nếu đề cho ("MD = 2MA" ⇒ AM/AD = 1/3).
          let t = 0.4;
          const [a, b] = [s1[0], s1[1]];
          const r = new RegExp(`(?<![A-Z])(?:${M}${b}|${b}${M})\\s*=\\s*(\\d+)\\s*(?:${M}${a}|${a}${M})(?![A-Z])`, 'u').exec(ctx.problem);
          const r2 = new RegExp(`(?<![A-Z])(?:${M}${a}|${a}${M})\\s*=\\s*(\\d+)\\s*(?:${M}${b}|${b}${M})(?![A-Z])`, 'u').exec(ctx.problem);
          if (r) t = 1 / (1 + Number(r[1]));
          else if (r2) t = Number(r2[1]) / (1 + Number(r2[1]));
          const ten = d[1] ?? `par${M}`;
          const intents: IntentT[] = [
            addPoint(M, { kind: 'pointAtDistance', from: a, through: b, distance: { kind: 'segmentLength', p1: a, p2: b, scale: t }, origin: 'from' }),
            drawLine(ten, 'parallelThrough', { through: M, to: day }),
            addPoint(N, { kind: 'intersection', of: [ten, s2] }),
          ];
          const ids = [c.id];
          // "; cắt đường chéo AC tại P" (có thể là mệnh đề kế tiếp)
          const sau = c.text.slice((d.index ?? 0) + d[0].length).replace(/^\s*[;,]/u, '');
          const them = CAT_THEM.exec(sau) ?? (cls[i + 1] ? CAT_THEM.exec(cls[i + 1].text) : null);
          if (them && !them[1].includes(them[2])) {
            intents.push(addPoint(them[2], { kind: 'intersection', of: [ten, them[1]] }));
            if (!CAT_THEM.exec(sau) && cls[i + 1]) ids.push(cls[i + 1].id);
          }
          out.push({ ruleId: 'linesAtPointsMeet', clauseIds: ids, intents });
        }
      }
      // (3)
      const q = QUA_TU_DO.exec(c.text);
      const nx = cls[i + 1] ? DUONG_DO.exec(cls[i + 1].text) : null;
      if (q && nx) {
        const [, P, seg, kw, ref] = q;
        const [, cat, X] = nx;
        if (!seg.includes(P) && !(ss(kw) && ref.includes(P)) && !cat.includes(X) && X !== P) {
          const ten = (ss(kw) ? 'par' : 'prp') + P + ref;
          out.push({
            ruleId: 'linesAtPointsMeet',
            clauseIds: [c.id, cls[i + 1].id],
            intents: [
              addPoint(P, { kind: 'onSegment', of: seg, t: 0.4 }),
              drawLine(ten, ss(kw) ? 'parallelThrough' : 'perpThrough', { through: P, to: ref }),
              addPoint(X, { kind: 'intersection', of: [ten, cat] }),
            ],
          });
        }
      }
    }
    return out;
  },
};
