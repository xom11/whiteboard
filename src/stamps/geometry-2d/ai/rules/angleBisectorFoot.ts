// src/stamps/geometry-2d/ai/rules/angleBisectorFoot.ts
//
// Chân đường phân giác (trong/ngoài) hạ từ một đỉnh xuống cạnh đối:
//   "D là chân đường phân giác từ A"              → onLine = cạnh đối A (suy từ tam giác)
//   "D là chân đường phân giác trong kẻ từ A đến BC" → onLine = BC (nêu rõ)
//   "D là chân phân giác góc A"                    → onLine = cạnh đối A
//   "D là chân đường phân giác ngoài từ A"         → externalAngleBisectorFoot
// → add-point D {kind:'angleBisectorFoot', from:'A', onLine:'BC'} (builder dựng
//   tia phân giác ∠(onLine[0])-from-(onLine[1]) ∩ đoạn onLine).
//
// Phân biệt (KHÔNG chồng rule khác):
//   - cevian ("phân giác AD" — đỉnh+chân dạng cặp HOA NGAY sau "phân giác"): rule
//     này BẮT BUỘC chữ "chân" mở đầu cụm → cevian không khớp.
//   - perpFoot ("chân đường vuông góc / cao"): keyword khác ("vuông góc"/"cao").
//   - angleBisectorAngle ("phân giác góc A" — vẽ tia VISIBLE, không foot): rule
//     đó tự né khi có "chân" đứng trước (guard CHAN_BEFORE bên angleBisectorAngle).
//
// Cần TAM GIÁC để suy cạnh đối khi đề KHÔNG nêu cạnh ("đến BC"); nêu rõ thì dùng
// luôn. Tên chân (HOA) bind cục bộ qua "X là" NGAY TRƯỚC cụm. Thiếu tên / không
// suy được cạnh đối → bỏ qua clause (escalate AI thay vì đoán sai).
//
// GOTCHA \b: \b của JS theo ASCII nên KHÔNG khớp quanh ký tự Việt ("đ","ề","ạ"…).
// Regex chứa ký tự Việt dùng cờ 'u' + lookaround (?!\p{L}).
import type { LanguageRule, RuleMatch } from './_types';
import { addPoint } from './_shared';

// Tam giác toàn đề (suy cạnh đối). Bổ ngữ "vuông|cân|đều|nhọn|tù" optional.
const TRI = /tam\s*giác(?:\s+(?:vuông|cân|đều|nhọn|tù))?\s+([A-Z])([A-Z])([A-Z])(?![A-Z])/u;

// onLine token: tên đường 1 ký tự HOA HOẶC cặp đỉnh 2 ký tự HOA. Tiền tố tuỳ chọn.
const LINE = '(?:đường\\s*thẳng\\s+|cạnh\\s+|đoạn\\s+)?([A-Z]{1,2})(?![A-Z])';
// Giới từ dẫn tới cạnh đáy.
const PREP_TO = '(?:đến|tới|xuống|trên|ra)';
// Đỉnh: "từ (đỉnh)? X" | "của góc X" | "góc X" | "tại (đỉnh)? X" | "đỉnh X".
const VERTEX =
  '(?:từ\\s+(?:đỉnh\\s+)?|của\\s+góc\\s+|góc\\s+|tại\\s+(?:đỉnh\\s+)?|đỉnh\\s+)([A-Z])(?![A-Z])';

// "chân (của)? (đường|tia)? phân giác (trong|ngoài)? (hạ|kẻ|vẽ|dựng)? VERTEX (PREP_TO LINE)?".
//   group1 = trong|ngoài (optional); group2 = vertex; group3 = onLine (optional).
const CORE = new RegExp(
  'chân\\s+(?:của\\s+)?(?:đường\\s*|tia\\s+)?phân\\s*giác\\s+(?:(trong|ngoài)\\s+)?' +
    '(?:(?:hạ|kẻ|vẽ|dựng)\\s+)?' +
    VERTEX +
    `(?:\\s+${PREP_TO}\\s+${LINE})?`,
  'gu',
);

// Tên chân đứng TRƯỚC: "X là " NGAY TRƯỚC cụm "chân … phân giác".
const NAME_BEFORE = /([A-Z])(?:['′]?)\s+là\s+$/u;

// Prefilter toàn đề.
const PREFILTER = /chân\s+(?:của\s+)?(?:đường\s*|tia\s+)?phân\s*giác/u;

/** Cạnh đối diện đỉnh V trong tam giác = 2 đỉnh còn lại, join token (vd "BC"). */
function opposite(tri: readonly string[], vertex: string): string | undefined {
  const rest = tri.filter((v) => v !== vertex);
  return rest.length === 2 ? rest[0] + rest[1] : undefined;
}

/**
 * Mỗi clause → 0..n add-point angleBisectorFoot / externalAngleBisectorFoot.
 * onLine ưu tiên cạnh nêu rõ ("đến BC"); else suy cạnh đối từ tam giác. Tên chân
 * bind cục bộ. Thiếu tên / không suy được cạnh → bỏ qua (escalate).
 */
export const angleBisectorFootRule: LanguageRule = {
  id: 'angleBisectorFoot',
  priority: 63,
  languages: ['vi'],
  patterns: [PREFILTER],
  match(ctx) {
    const triM = TRI.exec(ctx.problem);
    const tri = triM ? [triM[1], triM[2], triM[3]] : null;

    const out: RuleMatch[] = [];
    for (const c of ctx.clauses) {
      CORE.lastIndex = 0;
      for (const m of c.text.matchAll(CORE)) {
        const external = m[1] === 'ngoài';
        const vertex = m[2];
        let onLine: string | undefined = m[3]; // cạnh nêu rõ (optional)
        if (!onLine) {
          if (!tri || !tri.includes(vertex)) continue; // không suy được cạnh đối → escalate
          onLine = opposite(tri, vertex);
        }
        if (!onLine) continue; // không có cạnh (nêu rõ/suy ra) → escalate
        // Tên chân: "X là" NGAY TRƯỚC cụm; không có → escalate (đừng bịa).
        const nm = NAME_BEFORE.exec(c.text.slice(0, m.index));
        if (!nm) continue;
        const name = nm[1];
        if (onLine.includes(name)) continue; // chân trùng đầu mút cạnh đáy → degenerate
        const kind = external ? 'externalAngleBisectorFoot' : 'angleBisectorFoot';
        out.push({
          ruleId: 'angleBisectorFoot',
          clauseIds: [c.id],
          intents: [addPoint(name, { kind, from: vertex, onLine })],
        });
      }
    }
    return out;
  },
};
