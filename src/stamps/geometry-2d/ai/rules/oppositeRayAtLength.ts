// src/stamps/geometry-2d/ai/rules/oppositeRayAtLength.ts
//
// Điểm trên TIA ĐỐI có ĐỘ DÀI đề cho, đoạn mới viết ở vế PHẢI (hoặc vế trái):
//
//   "Trên tia đối của tia CB lấy điểm N sao cho BM = CN"   → CN = BM
//   "Trên tia đối của tia IH lấy điểm K sao cho HI = IK"   → IK = IH
//   "Trên tia đối của tia MA lấy điểm D sao cho MD = MA"   → MD = MA
//
// Tia XY gốc X, tia đối gốc X ngược Y ⇒ P = pointAtDistance(from Y, through X,
// d = |đoạn đã biết|) — P nằm bên kia X, XP đúng bằng đoạn đề cho. Nối XP.
//
// `pointAtDistance` chỉ nhận dạng đoạn mới đứng TRƯỚC dấu "=" bắt đầu từ gốc tia;
// `oppositeRayPoint` từng đặt P ở khoảng cách tuỳ ý bất chấp "sao cho" (hình sai).
//
// Thà thiếu còn hơn sai: đoạn chứa P phải đúng là XP (đo từ GỐC tia); vế kia là
// một đoạn đã biết không chứa P; không nhận biểu thức (BD = AC + AB, = 2AB…).
import type { LanguageRule, RuleMatch } from './_types';
import { addPoint, connect } from './_shared';

const RE = new RegExp(
  String.raw`[Tt]rên\s+tia\s+đối\s+(?:của\s+)?(?:tia\s+)?([A-Z])([A-Z])(?![A-Z])[^.]{0,20}?lấy\s+(?:một\s+)?(?:điểm\s+)?([A-Z])(?![\p{L}\d'′])` +
    String.raw`\s*,?\s*sao\s+cho\s+([A-Z])([A-Z])\s*=\s*([A-Z])([A-Z])(?![\p{L}\d'′])(?!\s*[+\-*/·.]\s*[A-Z\d])`,
  'gu',
);

// Tên đứng trước: "Gọi A là điểm (nằm) trên tia đối của tia MB sao cho MA = MB".
const RE_TEN_TRUOC = new RegExp(
  String.raw`(?<![A-Z])([A-Z])\s+là\s+(?:một\s+)?điểm\s+(?:nằm\s+)?(?:trên|thuộc)\s+tia\s+đối\s+(?:của\s+)?(?:tia\s+)?([A-Z])([A-Z])(?![A-Z])` +
    String.raw`\s*,?\s*sao\s+cho\s+([A-Z])([A-Z])\s*=\s*([A-Z])([A-Z])(?![\p{L}\d'′])(?!\s*[+\-*/·.]\s*[A-Z\d])`,
  'gu',
);

// Phân phối hai tia, độ dài bằng nhau:
//   "Trên tia đối của các tia BC và CB lấy thứ tự hai điểm D và E sao cho BD = CE"
//   "Trên tia đối của tia AB và AC lần lượt lấy các điểm D, E sao cho AD = AE < AB"
// → điểm đầu tuỳ ý trên tia đối (cách gốc ½ đoạn nền — thoả luôn "< XY" nếu có),
//   điểm sau đo bằng điểm đầu. Hai vế phải đo từ đúng GỐC hai tia.
const RE_PHAN_PHOI = new RegExp(
  String.raw`[Tt]rên\s+(?:các\s+)?tia\s+đối\s+(?:của\s+)?(?:các\s+|hai\s+)?(?:tia\s+)?([A-Z])([A-Z])\s*(?:,|và)\s*(?:tia\s+)?([A-Z])([A-Z])(?![A-Z])` +
    String.raw`\s*,?\s*(?:lần\s*lượt\s+|(?:theo\s+)?thứ\s+tự\s+)?lấy\s+(?:lần\s*lượt\s+|(?:theo\s+)?thứ\s+tự\s+)?(?:các\s+|hai\s+)?(?:điểm\s+)?([A-Z])\s*(?:,|và)\s*([A-Z])(?![\p{L}\d'′])` +
    String.raw`\s*,?\s*sao\s+cho\s+([A-Z])([A-Z])\s*=\s*([A-Z])([A-Z])(?![\p{L}\d'′])(\s*[<>]\s*[A-Z]{2}(?![A-Z]))?(?!\s*[+\-*/·.=]\s*[A-Z\d])`,
  'gu',
);

// Viết tắt: "Trên tia đối của tia MH lấy MD = MH" — đoạn mới nêu thẳng sau "lấy".
const RE_LAY_DOAN = new RegExp(
  String.raw`[Tt]rên\s+tia\s+đối\s+(?:của\s+)?(?:tia\s+)?([A-Z])([A-Z])(?![A-Z])[^.]{0,20}?lấy\s+(?:điểm\s+)?([A-Z])([A-Z])\s*=\s*([A-Z])([A-Z])(?![\p{L}\d'′])(?!\s*[+\-*/·.]\s*[A-Z\d])`,
  'gu',
);

export const oppositeRayAtLengthRule: LanguageRule = {
  id: 'oppositeRayAtLength',
  priority: 56,
  languages: ['vi'],
  patterns: [/tia\s+đối[^.]{0,60}sao\s+cho/u],
  match(ctx) {
    const out: RuleMatch[] = [];
    for (const c of ctx.clauses) {
      for (const m of c.text.matchAll(RE_PHAN_PHOI)) {
        const [, x1, y1, x2, y2, p1, p2, a1, a2, b1, b2, bdt] = m;
        if (new Set([x1, y1, p1]).size !== 3 || new Set([x2, y2, p2]).size !== 3 || p1 === p2) continue;
        const doan = (u: string, v: string, x: string, p: string) => (u === x && v === p) || (u === p && v === x);
        const khop =
          (doan(a1, a2, x1, p1) && doan(b1, b2, x2, p2)) || (doan(a1, a2, x2, p2) && doan(b1, b2, x1, p1));
        if (!khop) continue;
        // "AD = AE < AB": chỉ nhận so sánh "<" với đúng đoạn nền của một trong hai tia.
        if (bdt) {
          const bm = /([<>])\s*([A-Z])([A-Z])/u.exec(bdt)!;
          const nen = (u: string, v: string) => (u === x1 && v === y1) || (u === y1 && v === x1) || (u === x2 && v === y2) || (u === y2 && v === x2);
          if (bm[1] !== '<' || !nen(bm[2], bm[3])) continue;
        }
        // ½ của đoạn nền NGẮN hơn chưa biết trước → dùng đoạn nền tia 1; nếu có "< XY"
        // thì lấy ½·XY (thoả chặt).
        const base = bdt ? /[<>]\s*([A-Z])([A-Z])/u.exec(bdt)!.slice(1, 3) : [x1, y1];
        out.push({
          ruleId: 'oppositeRayAtLength',
          clauseIds: [c.id],
          intents: [
            addPoint(p1, {
              kind: 'pointAtDistance',
              from: y1,
              through: x1,
              distance: { kind: 'segmentLength', p1: base[0], p2: base[1], scale: 0.5 },
            }),
            addPoint(p2, {
              kind: 'pointAtDistance',
              from: y2,
              through: x2,
              distance: { kind: 'segmentLength', p1: x1, p2: p1 },
            }),
            connect(x1, p1, 'segment'),
            connect(x2, p2, 'segment'),
          ],
        });
      }
      const hits = [
        ...[...c.text.matchAll(RE)].map((m) => [m[1], m[2], m[3], m[4], m[5], m[6], m[7]]),
        ...[...c.text.matchAll(RE_TEN_TRUOC)].map((m) => [m[2], m[3], m[1], m[4], m[5], m[6], m[7]]),
        // "lấy MD = MH": gốc tia phải là chữ đầu của đoạn mới, điểm mới là chữ sau.
        ...[...c.text.matchAll(RE_LAY_DOAN)].filter((m) => m[3] === m[1]).map((m) => [m[1], m[2], m[4], m[3], m[4], m[5], m[6]]),
      ];
      for (const [x, y, p, a1, a2, b1, b2] of hits) {
        if (new Set([x, y, p]).size !== 3) continue;
        const la = (u: string, v: string) => (u === x && v === p) || (u === p && v === x);
        let known: [string, string] | null = null;
        if (la(a1, a2) && b1 !== p && b2 !== p && b1 !== b2) known = [b1, b2];
        else if (la(b1, b2) && a1 !== p && a2 !== p && a1 !== a2) known = [a1, a2];
        if (!known) continue;
        out.push({
          ruleId: 'oppositeRayAtLength',
          clauseIds: [c.id],
          intents: [
            addPoint(p, {
              kind: 'pointAtDistance',
              from: y,
              through: x,
              distance: { kind: 'segmentLength', p1: known[0], p2: known[1] },
            }),
            connect(x, p, 'segment'),
          ],
        });
      }
    }
    return out;
  },
};
