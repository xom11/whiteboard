import type { LanguageRule3D, RuleContext3D, RuleMatch3D } from './_types';
import type { Intent3DT } from '../intent';
import { addPoint3d, connect3d, residualHasGeometry } from './_shared';

// "Khoảng cách giữa (hai đường thẳng) SB và CD (bằng …)" / "d(AB, CD)" → dựng ĐƯỜNG VUÔNG GÓC CHUNG:
// 2 chân commonPerpFoot (mỗi chân trên một đường) + đoạn nối (= khoảng cách) + 2 đường (đoạn đầu
// mút). Dạng mệnh đề còn sót nhiều nhất trong bộ vuonggoc (≈35). Hai đường song song/cắt nhau ⇒
// verify3d từ chối (không có đoạn vuông góc chung duy nhất).
const P = "[A-Z](?:['′])?";
const RE = new RegExp(
  `[Kk]hoảng\\s*cách\\s+giữa\\s+(?:hai\\s+)?(?:đường\\s+thẳng\\s+|cạnh\\s+)?(${P})(${P})\\s+(?:và|với)\\s+(?:đường\\s+thẳng\\s+|cạnh\\s+)?(${P})(${P})(?![\\p{L}'′])`,
  'u',
);
const POOL = ['I', 'J', 'K', 'E', 'F', 'P', 'Q', 'U', 'V'];

export const skewDistance3dRule: LanguageRule3D = {
  id: 'skewDistance3d',
  priority: 53,
  languages: ['vi'],
  patterns: [/khoảng\s*cách\s+giữa/iu],
  match(ctx: RuleContext3D): RuleMatch3D[] {
    const out: RuleMatch3D[] = [];
    const used = new Set(ctx.problem.match(/[A-Z]/gu) ?? []);
    for (const c of ctx.clauses) {
      const m = RE.exec(c.text);
      if (!m) continue;
      const [a1, b1, a2, b2] = [m[1], m[2], m[3], m[4]];
      if (new Set([a1, b1, a2, b2]).size < 4) continue; // chung đầu mút ⇒ cắt nhau, không phải chéo nhau
      const names = POOL.filter((x) => !used.has(x)).slice(0, 2);
      if (names.length < 2) continue;
      names.forEach((x) => used.add(x));
      const [f1, f2] = names;
      const intents: Intent3DT[] = [
        connect3d(a1, b1), connect3d(a2, b2),
        addPoint3d(f1, { kind: 'commonPerpFoot', a1, b1, a2, b2 }),
        addPoint3d(f2, { kind: 'commonPerpFoot', a1: a2, b1: b2, a2: a1, b2: b1 }),
        connect3d(f1, f2),
      ];
      // Chân có thể nằm trên PHẦN KÉO DÀI — vẽ thêm đoạn nối đầu mút gần nhất tới chân cho thấy.
      intents.push(connect3d(a1, f1), connect3d(a2, f2));
      out.push({ ruleId: this.id, clauseIds: residualHasGeometry(c.text.replace(/[Kk]hoảng\s*cách/u, ''), [m[0].replace(/[Kk]hoảng\s*cách/u, '')]) ? [] : [c.id], intents });
    }
    return out;
  },
};
