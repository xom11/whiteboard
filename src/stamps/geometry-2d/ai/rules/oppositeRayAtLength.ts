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
// một đoạn đã biết không chứa P, có thể kèm hệ số ("BE = 2BA"); không nhận tổng/hiệu.
//
// Hợp nhất 2 bản cùng tên (nhánh lớp 7 + lớp 8): lớp 8 góp hệ số k, dạng tên-trước
// "Lấy điểm D trên tia đối của tia CB sao cho CD = AB" và chuỗi bằng "MD = MA = …";
// lớp 7 góp dạng phân phối hai tia, "Gọi A là điểm nằm trên tia đối …", "lấy MD = MH"
// và nối đoạn XP.
import type { LanguageRule, RuleMatch } from './_types';
import { addPoint, connect } from './_shared';

const PT = "([A-Z])(?![A-Z'′])";
// "Trên tia đối của tia XY lấy (điểm)? P sao cho <quan hệ>"
const RE = new RegExp(
  String.raw`[Tt]rên\s+tia\s+đối\s+(?:của\s+)?(?:tia\s+)?([A-Z])([A-Z])(?![A-Z])[^.]{0,20}?lấy\s+(?:một\s+)?(?:điểm\s+)?${PT}\s*,?\s*sao\s+cho\s+([^,.;]+)`,
  'gu',
);
// "Lấy (điểm)? P trên/thuộc tia đối của tia XY sao cho <quan hệ>"
const RE_SAU = new RegExp(
  String.raw`[Ll]ấy\s+(?:một\s+)?(?:điểm\s+)?${PT}\s+(?:trên|thuộc)\s+tia\s+đối\s+(?:của\s+)?(?:tia\s+)?([A-Z])([A-Z])(?![A-Z])\s*,?\s*sao\s+cho\s+([^,.;]+)`,
  'gu',
);
const VE = /^\s*(?:(\d+(?:[.,]\d+)?)\s*[.·]?\s*)?([A-Z])([A-Z])\s*$/u;

/** "MD = MA", "FH = FM", "BE = 2BA" → độ dài XP (đoạn khác, hệ số); null nếu không chắc. */
export function khoangCach(rel: string, X: string, P: string): Record<string, unknown> | null {
  const chuoi = rel.split(/\s+(?:và|thì)\s+/u)[0];
  const ves = chuoi.split('=').map((v) => v.trim());
  if (ves.length < 2) return null;
  const vs = ves.map((v) => VE.exec(v));
  if (vs.some((v) => !v)) return null;
  const iP = vs.findIndex((v) => v && !v[1] && v[2] !== v[3] && [v[2], v[3]].includes(P) && [v[2], v[3]].includes(X));
  if (iP < 0) return null;
  const khac = vs.filter((_, i) => i !== iP).find((v) => v && v[2] !== P && v[3] !== P && v[2] !== v[3]);
  if (!khac) return null;
  const k = khac[1] ? Number(khac[1].replace(',', '.')) : 1;
  if (!(k > 0)) return null;
  return { kind: 'segmentLength', p1: khac[2], p2: khac[3], ...(k !== 1 ? { scale: k } : {}) };
}

// Tên đứng trước: "Gọi A là điểm (nằm) trên tia đối của tia MB sao cho MA = MB".
const RE_TEN_TRUOC = new RegExp(
  String.raw`(?<![A-Z])([A-Z])\s+là\s+(?:một\s+)?điểm\s+(?:nằm\s+)?(?:trên|thuộc)\s+tia\s+đối\s+(?:của\s+)?(?:tia\s+)?([A-Z])([A-Z])(?![A-Z])` +
    String.raw`\s*,?\s*sao\s+cho\s+([^,.;]+)`,
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
  priority: 57,
  languages: ['vi'],
  patterns: [/tia\s+đối[^.]{0,60}sao\s+cho/u, /tia\s+đối[^.]{0,40}lấy\s+(?:điểm\s+)?[A-Z]{2}\s*=/u],
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
      // [gốc X, hướng Y, điểm mới P, quan hệ]
      const hits: Array<[string, string, string, string]> = [
        ...[...c.text.matchAll(RE)].map((m) => [m[1], m[2], m[3], m[4]] as [string, string, string, string]),
        ...[...c.text.matchAll(RE_SAU)].map((m) => [m[2], m[3], m[1], m[4]] as [string, string, string, string]),
        ...[...c.text.matchAll(RE_TEN_TRUOC)].map((m) => [m[2], m[3], m[1], m[4]] as [string, string, string, string]),
        // "lấy MD = MH": gốc tia phải là chữ đầu của đoạn mới, điểm mới là chữ sau.
        ...[...c.text.matchAll(RE_LAY_DOAN)]
          .filter((m) => m[3] === m[1])
          .map((m) => [m[1], m[2], m[4], `${m[3]}${m[4]} = ${m[5]}${m[6]}`] as [string, string, string, string]),
      ];
      const daCo = new Set<string>();
      for (const [x, y, p, rel] of hits) {
        if (new Set([x, y, p]).size !== 3 || daCo.has(p)) continue;
        const d = khoangCach(rel, x, p);
        if (!d) continue;
        daCo.add(p);
        out.push({
          ruleId: 'oppositeRayAtLength',
          clauseIds: [c.id],
          intents: [addPoint(p, { kind: 'pointAtDistance', from: y, through: x, distance: d }), connect(x, p, 'segment')],
        });
      }
    }
    return out;
  },
};
