// src/stamps/geometry-2d/ai/rules/pointAtDistance.ts
//
// Constraint METRIC: điểm trên tia kéo dài, cách mốc một khoảng cho trước.
//   C = through + d · unit(through − from)   (xem spec 2026-06-06-point-at-distance)
//
// Phrasing phủ:
//   - "trên tia đối của tia BA, lấy (điểm)? C sao cho BC = R"
//       tia đối của tia BA = tia từ B ngược hướng A ⇒ hướng A→B kéo dài.
//       ⇒ from = A, through = B, điểm mới C nằm NGOÀI B.
//   - "kéo dài AB (về phía B) lấy C sao cho BC = R"
//       ⇒ from = A, through = B.
//
// Hướng suy từ thứ tự token (from→through), KHÔNG cần field thừa. Điểm mốc đo
// khoảng cách (through) trùng đỉnh đầu của cụm "YZ = ..." (Y = through, Z = tên
// điểm mới). Ta dùng chính cặp này để chốt hướng + nguồn distance.
//
// distance (3 nguồn — discriminated union):
//   "= R" / "= bán kính" / "= bán kính (O)"   → {kind:'circleRadius', circle}
//   "= AB" / "= MN" (2 ký tự HOA)             → {kind:'segmentLength', p1, p2}
//   "= 3" / "= 2,5" / "= 2 cm"                → {kind:'literal', value}
//
// GOTCHA \b: \b của JS dựa ASCII word-char nên KHÔNG khớp quanh ký tự Việt.
// Mọi regex chứa ký tự Việt dùng cờ 'u' + lookaround \p{L}.
import type { LanguageRule, RuleMatch } from './_types';
import { addPoint } from './_shared';

// LƯU Ý: KHÔNG dùng cờ 'i' — nó làm [A-Z] khớp cả chữ thường, hỏng việc trích
// tên điểm (đỉnh là CHỮ HOA). Clause có thể bắt đầu bằng chữ HOA ("Kéo dài…",
// "Trên tia đối…") nên chữ cái đầu từ-khoá tiếng Việt dùng alternation [Kk]/[Tt].
// --- Prefilter (toàn đề) ------------------------------------------------------
const KEYWORD = /(?:[Kk]éo\s*dài|tia\s*đối)/u;

// --- Trigger trên clause ------------------------------------------------------
// "trên tia đối của tia BA" → cặp [B, A] (B = gốc tia, A = hướng cũ). Hướng kéo
// dài là tia đối ⇒ from = A, through = B.
const TIA_DOI =
  /tia\s*đối\s+của\s+tia\s+([A-Z])([A-Z])(?![A-Z])/u;
// "kéo dài AB" → cặp [A, B]. Mặc định lấy điểm về phía B (đỉnh cuối) ⇒ from = A,
// through = B. ("về phía A" hiếm + cần re-map; defer → bỏ qua để escalate.)
const KEO_DAI =
  /[Kk]éo\s*dài\s+(?:(?:đoạn|cạnh|tia)\s+)?([A-Z])([A-Z])(?![A-Z])/u;

// "lấy (điểm)? C sao cho" / "lấy C" → tên điểm mới C.
const TAKE_POINT =
  /lấy\s+(?:điểm\s+)?([A-Z])(?:['′]?)(?![A-Z])/u;

// Cụm chốt mốc + khoảng cách: "BC = R" / "BC = AB" / "BC = 3" / "BC = 2,5 cm".
// Đỉnh đầu (m[1]) = mốc đo (through); đỉnh sau (m[2]) = điểm mới (Z).
// Phần sau dấu "=" gom thô để parse riêng (radius / segment / số). KHÔNG kết
// thúc trên ',' — dấu phẩy có thể là phân tách thập phân ("2,5"); clause đã
// được segmentClauses tách trên dấu chấm/'; nên gom tới hết clause là an toàn.
const DIST_CLAUSE =
  /(?:sao\s+cho\s+)?([A-Z])([A-Z])(?![A-Z])\s*=\s*(.+?)\s*(?:[.;]|$)/u;

// --- Distance parsing ---------------------------------------------------------
const RADIUS_WORD = /(?<!\p{L})(?:R|bán\s*kính)(?!\p{L})/u;
const CIRCLE_OF_RADIUS = /bán\s*kính\s*(?:\(\s*)?([A-Z])\s*\)?/u;
const SEGMENT_PAIR = /^\s*([A-Z])([A-Z])(?![A-Z])\s*$/u;
const NUMBER = /(\d+(?:[.,]\d+)?)/u;

// Tâm đường tròn trong đề: "(O;" / "(O)" / "đường tròn tâm O" → tên circle.
const CIRCLE_NAME_PAREN = /\(\s*([A-Z])\s*[;,)]/u;
const CIRCLE_NAME_WORDS = /đường\s*tròn\s*(?:tâm\s+)?([A-Z])(?![A-Z])/u;

function parseNum(raw: string): number {
  return Number(raw.replace(',', '.'));
}

/** Tên circle để gắn radius. Suy từ đề (ctx.problem); mặc định 'O'. */
function resolveCircleName(problem: string): string {
  const w = CIRCLE_NAME_WORDS.exec(problem);
  if (w) return w[1];
  const p = CIRCLE_NAME_PAREN.exec(problem);
  if (p) return p[1];
  return 'O';
}

type Distance =
  | { kind: 'circleRadius'; circle: string }
  | { kind: 'segmentLength'; p1: string; p2: string }
  | { kind: 'literal'; value: number };

/** Parse phần sau dấu "=" → DistanceSpec hoặc undefined (không nhận dạng được). */
function parseDistance(raw: string, problem: string): Distance | undefined {
  const text = raw.trim();
  // 1. Bán kính: "R" / "bán kính" / "bán kính (O)".
  if (RADIUS_WORD.test(text)) {
    const co = CIRCLE_OF_RADIUS.exec(text);
    const circle = co ? co[1] : resolveCircleName(problem);
    return { kind: 'circleRadius', circle };
  }
  // 2. Đoạn = 2 ký tự HOA liền ("AB", "MN").
  const seg = SEGMENT_PAIR.exec(text);
  if (seg) return { kind: 'segmentLength', p1: seg[1], p2: seg[2] };
  // 3. Số literal (board units). "2 cm" → 2 (cm-mapping defer).
  const num = NUMBER.exec(text);
  if (num) {
    const value = parseNum(num[1]);
    if (Number.isFinite(value) && value > 0) return { kind: 'literal', value };
  }
  return undefined;
}

/**
 * "kéo dài AB lấy C sao cho BC = R" / "trên tia đối của tia BA, lấy C sao cho
 * BC = R" → add-point C kind:pointAtDistance. Hướng (from→through) suy từ token
 * cặp + mốc đo (đỉnh đầu cụm "YZ = …"). Không parse đủ (thiếu tên điểm mới /
 * distance không nhận dạng / mốc không khớp) → bỏ qua để escalate AI.
 */
export const pointAtDistanceRule: LanguageRule = {
  id: 'pointAtDistance',
  priority: 55,
  languages: ['vi'],
  patterns: [KEYWORD],
  match(ctx) {
    const out: RuleMatch[] = [];
    for (const c of ctx.clauses) {
      // --- Hướng: from → through (qua token cặp) --------------------------
      let from: string | undefined;
      let through: string | undefined;
      const doi = TIA_DOI.exec(c.text);
      if (doi) {
        // tia đối của tia BA: B = gốc, A = hướng cũ ⇒ kéo dài về B ⇒ from=A, through=B.
        from = doi[2];
        through = doi[1];
      } else {
        const kd = KEO_DAI.exec(c.text);
        if (kd) {
          // kéo dài AB (về phía B mặc định) ⇒ from=A, through=B.
          from = kd[1];
          through = kd[2];
        }
      }
      if (!from || !through) continue;

      // --- Tên điểm mới ----------------------------------------------------
      const take = TAKE_POINT.exec(c.text);
      const name = take ? take[1] : undefined;
      if (!name) continue;

      // --- Mốc đo + khoảng cách ("YZ = …") ---------------------------------
      const dc = DIST_CLAUSE.exec(c.text);
      if (!dc) continue;
      const anchor = dc[1]; // Y = mốc đo (phải trùng through)
      const newPt = dc[2]; // Z = điểm mới (phải trùng name)
      // Mốc đo phải là through; đỉnh sau là điểm mới ta vừa lấy.
      if (anchor !== through || newPt !== name) continue;

      const distance = parseDistance(dc[3], ctx.problem);
      if (!distance) continue;

      out.push({
        ruleId: 'pointAtDistance',
        clauseIds: [c.id],
        intents: [addPoint(name, { kind: 'pointAtDistance', from, through, distance })],
      });
    }
    return out;
  },
};
