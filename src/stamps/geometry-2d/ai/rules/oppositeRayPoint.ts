// src/stamps/geometry-2d/ai/rules/oppositeRayPoint.ts
//
// Điểm trên TIA ĐỐI: "Trên tia đối của tia AB lấy điểm C" → C nằm trên tia đối
// của tia AB (xuất phát A, hướng NGƯỢC B) = trên đường BA kéo dài QUA A.
//   → C = pointAtDistance(from=B, through=A, literal) (C vượt qua A, xa B).
//
// "tia AB" = tia gốc A hướng B. Tia ĐỐI = gốc A hướng ngược B. Điểm C trên tia
// đối ⇒ C bên kia A so với B ⇒ pointAtDistance từ B qua A kéo dài. Khoảng cách
// không nêu ("lấy điểm C" tuỳ ý) → literal canonical (chỉ để minh hoạ vị trí).
//
// GOTCHA \b: ký tự Việt → cờ 'u'.
import type { LanguageRule, RuleMatch } from './_types';
import { addPoint } from './_shared';

// "Trên tia đối của tia AB lấy điểm C" — g1g2 = tia AB (A gốc, B hướng), g3 = C.
const RE = new RegExp(
  String.raw`[Tt]rên\s+tia\s+đối\s+(?:của\s+)?(?:tia\s+)?([A-Z])([A-Z])(?![A-Z])[^.]{0,20}?lấy\s+(?:một\s+)?(?:điểm\s+)?([A-Z])(?![A-Z])`,
  'gu',
);

// Khoảng cách canonical (board units) — vị trí C trên tia đối không nêu metric.
// Dạng tên-TRƯỚC (vao10): "Lấy điểm A trên tia đối của tia CB" — g1=tên, g2g3=tia.
const RE_NAME_FIRST = new RegExp(
  String.raw`[Ll]ấy\s+(?:điểm\s+)?([A-Z])(?![A-Z])\s+trên\s+tia\s+đối\s+(?:của\s+)?(?:tia\s+)?([A-Z])([A-Z])(?![A-Z])`,
  'gu',
);

// DISTRIBUTIVE: "Lấy D, E thuộc tia đối của tia AB, AC" (C82) — zip 1-1: D trên
// tia đối AB (gốc A, vượt A so với B), E trên tia đối AC. g1 = blob tên (≥2,
// phẩy/và), g2 = blob tia (≥2 cặp HOA, phẩy/và). "thuộc"/"trên/nằm trên" đều OK.
// Số tên PHẢI = số tia (else bỏ qua → escalate, không đoán lệch).
const RE_DISTRIB = new RegExp(
  String.raw`[Ll]ấy\s+(?:các\s+)?(?:điểm\s+)?((?:[A-Z]\s*(?:,|và)\s*)+[A-Z])(?![A-Z])\s+(?:lần\s*lượt\s+|(?:theo\s+)?thứ\s+tự\s+)?(?:thuộc|trên|nằm\s+trên)\s+(?:các\s+)?tia\s+đối\s+(?:của\s+)?(?:các\s+)?(?:tia\s+)?((?:[A-Z]{2}\s*(?:,|và)\s*)+[A-Z]{2})(?![A-Z])`,
  'u',
);

const CANON = 2.5;

function splitNames(blob: string): string[] {
  return blob.split(/\s*,\s*|\s+và\s+/u).map((s) => s.trim()).filter(Boolean);
}

export const oppositeRayPointRule: LanguageRule = {
  id: 'oppositeRayPoint',
  priority: 56,
  languages: ['vi'],
  patterns: [/tia\s+đối/u],
  match(ctx) {
    const out: RuleMatch[] = [];
    for (const c of ctx.clauses) {
      // DISTRIBUTIVE ưu tiên: "Lấy D, E thuộc tia đối của tia AB, AC" → zip.
      const dm = RE_DISTRIB.exec(c.text);
      if (dm) {
        const names = splitNames(dm[1]);
        const rays = splitNames(dm[2]);
        if (names.length >= 2 && names.length === rays.length) {
          const intents = [];
          let valid = true;
          for (let i = 0; i < names.length; i++) {
            const a = rays[i][0]; // gốc tia
            const b = rays[i][1]; // hướng tia
            if (new Set([a, b, names[i]]).size !== 3) {
              valid = false;
              break;
            }
            intents.push(
              addPoint(names[i], {
                kind: 'pointAtDistance',
                from: b,
                through: a,
                distance: { kind: 'literal', value: CANON },
              }),
            );
          }
          if (valid) {
            out.push({ ruleId: 'oppositeRayPoint', clauseIds: [c.id], intents });
            continue; // clause xử lý bằng distributive — skip single-form
          }
        }
      }

      RE.lastIndex = 0;
      for (const m of c.text.matchAll(RE)) {
        const a = m[1]; // gốc tia
        const b = m[2]; // hướng tia
        const name = m[3];
        if (new Set([a, b, name]).size !== 3) continue;
        out.push({
          ruleId: 'oppositeRayPoint',
          clauseIds: [c.id],
          // tia AB gốc A → tia đối gốc A ngược B → C vượt A so với B:
          // pointAtDistance(from=B, through=A) đặt C sau A trên tia B→A.
          intents: [
            addPoint(name, {
              kind: 'pointAtDistance',
              from: b,
              through: a,
              distance: { kind: 'literal', value: CANON },
            }),
          ],
        });
      }
      RE_NAME_FIRST.lastIndex = 0;
      for (const m of c.text.matchAll(RE_NAME_FIRST)) {
        const name = m[1];
        const a = m[2]; // gốc tia
        const b = m[3]; // hướng tia
        if (new Set([a, b, name]).size !== 3) continue;
        out.push({
          ruleId: 'oppositeRayPoint',
          clauseIds: [c.id],
          intents: [
            addPoint(name, {
              kind: 'pointAtDistance',
              from: b,
              through: a,
              distance: { kind: 'literal', value: CANON },
            }),
          ],
        });
      }
    }
    return out;
  },
};
