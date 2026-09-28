// src/stamps/geometry-2d/ai/rules/angleXOy.ts
//
// GÓC xOy với hai tia đặt tên chữ thường (lớp 7–8, Thalès / đồng dạng):
//   "Cho góc xOy. Trên tia Ox, lấy hai điểm A và B sao cho OA = 2 cm, OB = 5 cm.
//    Trên tia Oy, lấy điểm C sao cho OC = 3 cm."
//   "Cho góc nhọn xOy, các điểm A, N nằm trên tia Ox, các điểm B, M nằm trên tia Oy
//    sao cho AM, BN lần lượt vuông góc với Oy, Ox."
//
// Dựng: đỉnh O, điểm nhãn "x", "y" ở đầu hai tia (đúng cách sách vẽ: chữ x, y cuối
// tia), tia Ox, Oy. Số đo góc đề cho ("góc xOy = 60°", "góc vuông/nhọn/tù xOy") thì
// theo; mặc định 55°. Điểm trên tia:
//   - có độ dài "OA = 2 cm" → cách O đúng TỈ LỆ với các độ dài khác trên hai tia;
//   - không độ dài → điểm tự do trên tia (rải theo thứ tự nêu).
// "sao cho AM, BN lần lượt vuông góc với Oy, Ox" → M, N là chân đường vuông góc.
import type { LanguageRule, RuleMatch } from './_types';
import type { IntentT } from '../intent';
import { addPoint, connect } from './_shared';

const PREFILTER = /góc\s+(?:(?:nhọn|vuông|tù)\s+)?[a-z][A-Z][a-z](?![\p{L}])/u;
const GOC = /góc\s+(?:(nhọn|vuông|tù)\s+)?([a-z])([A-Z])([a-z])(?![\p{L}])(?:\s*=\s*(\d+(?:[.,]\d+)?)\s*(?:°|độ))?/u;

export const angleXOyRule: LanguageRule = {
  id: 'angleXOy',
  priority: 99,
  languages: ['vi'],
  patterns: [PREFILTER],
  match(ctx) {
    const g = GOC.exec(ctx.problem);
    if (!g) return [];
    const [, loai, x, O, y, soDo] = g;
    if (x === y) return [];
    let deg = 55;
    if (soDo) deg = Number(soDo.replace(',', '.'));
    else if (loai === 'vuông') deg = 90;
    else if (loai === 'tù') deg = 125;
    if (!(deg > 0 && deg < 180)) return [];
    const r = (deg * Math.PI) / 180;
    const R = 6;
    const tia: Record<string, string> = { [O + x]: x, [O + y]: y };
    const huong = (t: string) => tia[t];

    const out: RuleMatch[] = [];
    const cGoc = ctx.clauses.find((c) => GOC.test(c.text));
    out.push({
      ruleId: 'angleXOy',
      clauseIds: cGoc ? [cGoc.id] : [],
      intents: [
        addPoint(O, { kind: 'free', at: [0, 0] }),
        addPoint(x, { kind: 'free', at: [R, 0] }),
        addPoint(y, { kind: 'free', at: [R * Math.cos(r), R * Math.sin(r)] }),
        connect(O, x, 'ray'),
        connect(O, y, 'ray'),
      ],
    });

    // Độ dài trên tia: "OA = 2 cm" — quy về thang chung (lớn nhất = 4,5 đơn vị).
    const doDai = new Map<string, number>();
    for (const m of ctx.problem.matchAll(new RegExp(`(?<![A-Z])(?:${O}([A-Z])|([A-Z])${O})\\s*=\\s*(\\d+(?:[.,]\\d+)?)\\s*(?:cm|dm|mm|m)?(?![\\p{L}\\d])`, 'gu'))) {
      doDai.set(m[1] ?? m[2], Number(m[3].replace(',', '.')));
    }
    const k = doDai.size ? 4.5 / Math.max(...doDai.values()) : 1;

    const TREN = new RegExp(`[Tt]rên\\s+tia\\s+(${O}[${x}${y}])(?![\\p{L}])\\s*,?\\s*lấy\\s+(?:hai\\s+|các\\s+)?(?:điểm\\s+)?((?:[A-Z]\\s*(?:,|và)\\s*)*[A-Z])(?![A-Z])`, 'gu');
    const NAM = new RegExp(`(?:các\\s+)?(?:điểm\\s+)?((?:[A-Z]\\s*(?:,|và)\\s*)*[A-Z])(?![A-Z])\\s+(?:nằm\\s+)?(?:trên|thuộc)\\s+tia\\s+(${O}[${x}${y}])(?![\\p{L}])`, 'gu');
    const VG = /sao\s+cho\s+([A-Z])([A-Z])\s*,\s*([A-Z])([A-Z])\s+lần\s*lượt\s+vuông\s*góc\s+với\s+([A-Z][a-z])\s*,\s*([A-Z][a-z])(?![\p{L}])/u;
    const tach = (s: string) => s.split(/\s*,\s*|\s+và\s+/u).map((t) => t.trim()).filter(Boolean);

    for (const c of ctx.clauses) {
      const intents: IntentT[] = [];
      const daDung = new Set<string>();
      const vg = VG.exec(c.text);
      const chan = new Map<string, [string, string]>(); // điểm chân → [từ, tia]
      if (vg) {
        chan.set(vg[2], [vg[1], vg[5]]);
        chan.set(vg[4], [vg[3], vg[6]]);
      }
      const dat = (P: string, t: string, thuTu: number, soDiem: number) => {
        if (daDung.has(P) || P === O) return;
        const d = huong(t);
        if (!d) return;
        daDung.add(P);
        const ch = chan.get(P);
        if (ch) {
          if (huong(ch[1]) && t === ch[1]) intents.push(addPoint(P, { kind: 'perpFoot', from: ch[0], onLine: O + huong(ch[1]) }));
          return;
        }
        const L = doDai.get(P);
        if (L) intents.push(addPoint(P, { kind: 'pointAtDistance', from: O, through: d, distance: { kind: 'literal', value: L * k }, origin: 'from' }));
        else intents.push(addPoint(P, { kind: 'onSegment', of: O + d, t: (thuTu + 1) / (soDiem + 1) }));
      };
      for (const m of c.text.matchAll(TREN)) tach(m[2]).forEach((P, i, a) => dat(P, m[1], i, a.length));
      for (const m of c.text.matchAll(NAM)) tach(m[1]).forEach((P, i, a) => dat(P, m[2], i, a.length));
      // chân vuông góc phải dựng SAU điểm gốc: sắp perpFoot xuống cuối
      const laChan = (i: IntentT) => (i as { constraint?: { kind?: string } }).constraint?.kind === 'perpFoot';
      intents.sort((a, b) => Number(laChan(a)) - Number(laChan(b)));
      if (intents.length) out.push({ ruleId: 'angleXOy', clauseIds: [c.id], intents });
    }
    return out;
  },
};
