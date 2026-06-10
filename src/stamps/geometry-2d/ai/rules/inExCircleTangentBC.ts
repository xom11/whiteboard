// src/stamps/geometry-2d/ai/rules/inExCircleTangentBC.ts
//
// Tâm + tiếp điểm trên 1 cạnh của đường tròn NỘI tiếp / BÀNG tiếp:
//   "Đường tròn nội tiếp tam giác ABC có tâm I tiếp xúc với BC tại D"
//     → I = incenter(ABC); D = perpFoot(I, BC) (tiếp điểm = chân ⊥ từ tâm).
//   "Đường tròn bàng tiếp góc A của tam giác ABC có tâm J tiếp xúc với BC tại E"
//     → J = excenter(ABC, đối A); E = perpFoot(J, BC).
//
// Chỉ dựng ĐIỂM (tâm + tiếp điểm) — đủ cho construct phái sinh (AE, DI, …). Đường
// tròn vẽ (nếu cần) do circleTriangle lo riêng.
//
// \b không khớp ký tự Việt → (?!\p{L}) + cờ 'u'.
import type { LanguageRule, RuleMatch } from './_types';
import { addPoint } from './_shared';

const PREFILTER = /[Đđ]ường\s*tròn\s+(?:nội|bàng)\s*tiếp[^.]{0,60}?tâm\s+[A-Z][^.]{0,30}?tiếp\s*xúc/u;

const TANGENT_TAIL = '\\s*,?\\s*tiếp\\s*xúc\\s+(?:với\\s+)?(?:cạnh\\s+|đoạn(?:\\s+thẳng)?\\s+)?([A-Z]{2})(?!\\p{L})\\s+(?:ở|tại)\\s+([A-Z])(?![A-Z])';
// Nội tiếp: group1=tam giác(3 đỉnh), 2=tâm I, 3=cạnh BC, 4=tiếp điểm D.
const INCIRCLE = new RegExp(
  '[Đđ]ường\\s*tròn\\s+nội\\s*tiếp\\s+tam\\s*giác\\s+([A-Z]{3})(?![A-Z])[^.]{0,20}?tâm\\s+([A-Z])(?!\\p{L})' + TANGENT_TAIL,
  'u',
);
// Bàng tiếp: group1=góc đối(A), 2=tam giác, 3=tâm J, 4=cạnh, 5=tiếp điểm E.
const EXCIRCLE = new RegExp(
  '[Đđ]ường\\s*tròn\\s+bàng\\s*tiếp\\s+góc\\s+([A-Z])(?!\\p{L})\\s+(?:của\\s+)?tam\\s*giác\\s+([A-Z]{3})(?![A-Z])[^.]{0,20}?tâm\\s+([A-Z])(?!\\p{L})' + TANGENT_TAIL,
  'u',
);

export const inExCircleTangentBCRule: LanguageRule = {
  id: 'inExCircleTangentBC',
  priority: 69,
  languages: ['vi'],
  patterns: [PREFILTER],
  match(ctx) {
    const out: RuleMatch[] = [];
    for (const c of ctx.clauses) {
      const im = INCIRCLE.exec(c.text);
      if (im) {
        const tri = im[1].split('') as [string, string, string];
        const center = im[2];
        const side = im[3];
        const touch = im[4];
        out.push({
          ruleId: 'inExCircleTangentBC',
          clauseIds: [c.id],
          intents: [
            addPoint(center, { kind: 'incenter', of: tri }),
            addPoint(touch, { kind: 'perpFoot', from: center, onLine: side }),
          ],
        });
      }
      const em = EXCIRCLE.exec(c.text);
      if (em) {
        const opp = em[1];
        const tri = em[2].split('') as [string, string, string];
        const center = em[3];
        const side = em[4];
        const touch = em[5];
        if (!tri.includes(opp)) continue;
        out.push({
          ruleId: 'inExCircleTangentBC',
          clauseIds: [c.id],
          intents: [
            addPoint(center, { kind: 'excenter', of: tri, opposite: opp }),
            addPoint(touch, { kind: 'perpFoot', from: center, onLine: side }),
          ],
        });
      }
    }
    return out;
  },
};
