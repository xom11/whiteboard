// src/stamps/geometry-2d/ai/rules/oppositeRayAtLength.ts
//
// Điểm trên TIA ĐỐI có ĐIỀU KIỆN ĐỘ DÀI — dạng cực phổ biến lớp 7–8:
//   "Trên tia đối của tia MA lấy điểm D sao cho MD = MA"
//   "Trên tia đối của tia FH lấy điểm M sao cho FH = FM"      (vế đảo thứ tự)
//   "Trên tia đối của tia BA lấy điểm E sao cho BE = 2BA"
//   "Lấy điểm D trên tia đối của tia CB sao cho CD = AB"
//
// oppositeRayPoint đặt điểm ở khoảng cách CỐ ĐỊNH 2,5 đơn vị bất kể "sao cho …" —
// hình đúng chỉ khi tình cờ (vd trung tuyến cạnh huyền tam giác mẫu = 2,5). Rule này
// (priority 57 > 56, add-point first-wins) dựng CHÍNH XÁC: gốc tia X, P nằm bên kia X
// so với Y, XP = k·|ST|. Vế không quy được (tổng, tích, đoạn chứa điểm mới) → bỏ
// (oppositeRayPoint giữ hành vi cũ).
import type { LanguageRule, RuleMatch } from './_types';
import { addPoint } from './_shared';

const PREFILTER = /tia\s+đối[^.]{0,60}?sao\s+cho/u;
const PT = "([A-Z])(?![A-Z'′])";
const RE_TRUOC = new RegExp(
  String.raw`[Tt]rên\s+tia\s+đối\s+(?:của\s+)?(?:tia\s+)?([A-Z])([A-Z])(?![A-Z])\s*,?\s*lấy\s+(?:một\s+)?(?:điểm\s+)?${PT}\s*,?\s*sao\s+cho\s+([^,.;]+)`,
  'gu',
);
const RE_SAU = new RegExp(
  String.raw`[Ll]ấy\s+(?:một\s+)?(?:điểm\s+)?${PT}\s+(?:trên|thuộc)\s+tia\s+đối\s+(?:của\s+)?(?:tia\s+)?([A-Z])([A-Z])(?![A-Z])\s*,?\s*sao\s+cho\s+([^,.;]+)`,
  'gu',
);
const VE = /^\s*(?:(\d+(?:[.,]\d+)?)\s*)?([A-Z])([A-Z])\s*$/u;

function khoangCach(rel: string, X: string, P: string): Record<string, unknown> | null {
  // chỉ lấy phần chuỗi bằng nhau đầu tiên ("MD = MA và …" → "MD = MA")
  const chuoi = rel.split(/\s+(?:và|thì|,)\s+/u)[0];
  const ves = chuoi.split('=').map((v) => v.trim());
  if (ves.length < 2) return null;
  const vs = ves.map((v) => VE.exec(v));
  if (vs.some((v) => !v)) return null;
  const iP = vs.findIndex((v) => v && !v[1] && new Set([v[2], v[3]]).size === 2 && [v[2], v[3]].includes(P) && [v[2], v[3]].includes(X));
  if (iP < 0) return null;
  const khac = vs.filter((_, i) => i !== iP).find((v) => v && !v[2].includes(P) && v[3] !== P);
  if (!khac) return null;
  const k = khac[1] ? Number(khac[1].replace(',', '.')) : 1;
  if (!(k > 0)) return null;
  return { kind: 'segmentLength', p1: khac[2], p2: khac[3], ...(k !== 1 ? { scale: k } : {}) };
}

export const oppositeRayAtLengthRule: LanguageRule = {
  id: 'oppositeRayAtLength',
  priority: 57,
  languages: ['vi'],
  patterns: [PREFILTER],
  match(ctx) {
    const out: RuleMatch[] = [];
    for (const c of ctx.clauses) {
      const xuLy = (X: string, Y: string, P: string, rel: string) => {
        if (new Set([X, Y, P]).size !== 3) return;
        const d = khoangCach(rel, X, P);
        if (!d) return;
        out.push({
          ruleId: 'oppositeRayAtLength',
          clauseIds: [c.id],
          // from Y qua X, đặt BÊN KIA X một đoạn d ⇒ XP = d, P trên tia đối của tia XY.
          intents: [addPoint(P, { kind: 'pointAtDistance', from: Y, through: X, distance: d })],
        });
      };
      for (const m of c.text.matchAll(RE_TRUOC)) xuLy(m[1], m[2], m[3], m[4]);
      for (const m of c.text.matchAll(RE_SAU)) xuLy(m[2], m[3], m[1], m[4]);
    }
    return out;
  },
};
