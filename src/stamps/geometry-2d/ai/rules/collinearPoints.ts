// src/stamps/geometry-2d/ai/rules/collinearPoints.ts
//
// N điểm THẲNG HÀNG trên một đường thẳng (KHÔNG kèm hình khác):
//   "Cho 4 điểm A, B, C, D cùng thuộc một đường thẳng."   (t02:BT27)
//   "Cho ba điểm A, B, C thẳng hàng."
//   "Các điểm A, B, C, D nằm trên một đường thẳng."
//
// → 2 điểm ĐẦU & CUỐI free (toạ độ trải ngang), các điểm GIỮA = onSegment trên
//   đoạn đầu-cuối (t cách đều) + nối đoạn đầu→cuối để hiện đường thẳng.
//
// Mục tiêu = dựng được hình tối thiểu (partial OK). KHÔNG giải thứ tự/khoảng cách
// cụ thể giữa các điểm (đề chỉ nói "thẳng hàng"). Đặt đều theo thứ tự liệt kê.
//
// Guard: cần ≥3 điểm HOA phân biệt + cụm từ "thẳng hàng" / "cùng thuộc/nằm trên
// một đường thẳng". KHÔNG kích hoạt khi đề có hình (tam giác/tứ giác/đường tròn)
// chứa các điểm đó — tránh đặt lại toạ độ đỉnh hình (silent-wrong).
//
// GOTCHA \b: ký tự Việt → cờ 'u' + lookaround (?!\p{L}).
import type { LanguageRule, RuleMatch } from './_types';
import { addPoint, connect } from './_shared';

// "thẳng hàng" HOẶC "(cùng)? (thuộc|nằm trên|ở trên) một đường thẳng".
const PREFILTER =
  /thẳng\s+hàng|(?:cùng\s+)?(?:thuộc|nằm\s+trên|ở\s+trên)\s+(?:một\s+)?(?:cùng\s+)?(?:một\s+)?[Đđ]ư[ờơ]ng\s*thẳng/u;

// Danh sách tên: "A, B, C, D" (≥3 ký tự HOA cách nhau bằng phẩy/và). Mỗi tên 1
// HOA + prime optional. Cho phép "và" trước phần tử cuối.
const NAMES = "([A-Z](?:['′])?(?:\\s*(?:,|và)\\s*[A-Z](?:['′])?){2,})";

// Dạng A: "(Cho|Các)? (4|bốn)? điểm A, B, C, D (cùng)? (thuộc|nằm trên|...) một
//          đường thẳng" — danh sách tên TRƯỚC, mô tả thẳng hàng SAU.
const ON_LINE = new RegExp(
  '(?:[Cc]ác\\s+|[Cc]ho\\s+)?(?:\\d+\\s+|(?:hai|ba|bốn|năm|sáu)\\s+)?điểm\\s+' +
    NAMES +
    '\\s+(?:cùng\\s+)?(?:thuộc|nằm\\s+trên|ở\\s+trên)\\s+(?:một\\s+)?[Đđ]ư[ờơ]ng\\s*thẳng',
  'u',
);

// Dạng B: "(Cho|Các)? (ba)? điểm A, B, C thẳng hàng".
const COLLINEAR = new RegExp(
  '(?:[Cc]ác\\s+|[Cc]ho\\s+)?(?:\\d+\\s+|(?:hai|ba|bốn|năm|sáu)\\s+)?điểm\\s+' +
    NAMES +
    '\\s+thẳng\\s+hàng',
  'u',
);

function parseNames(blob: string): string[] {
  return blob
    .split(/\s*(?:,|và)\s*/u)
    .map((s) => s.trim().replace('′', "'"))
    .filter((s) => /^[A-Z]'?$/u.test(s));
}

export const collinearPointsRule: LanguageRule = {
  id: 'collinear-points',
  priority: 95, // cao: dựng "bộ khung" điểm thẳng hàng sớm (như triangle/quad).
  languages: ['vi'],
  patterns: [PREFILTER],
  match(ctx) {
    const out: RuleMatch[] = [];
    for (const c of ctx.clauses) {
      const m = ON_LINE.exec(c.text) ?? COLLINEAR.exec(c.text);
      if (!m) continue;
      const names = parseNames(m[1]);
      if (names.length < 3) continue;
      if (new Set(names).size !== names.length) continue; // tên trùng → bỏ

      const first = names[0];
      const last = names[names.length - 1];
      const span = 12; // tổng bề ngang
      const intents = [
        addPoint(first, { kind: 'free', at: [-span / 2, 0] }),
        addPoint(last, { kind: 'free', at: [span / 2, 0] }),
        // Điểm giữa: onSegment trên đoạn đầu-cuối, t cách đều theo thứ tự liệt kê.
        ...names.slice(1, -1).map((nm, i) =>
          addPoint(nm, { kind: 'onSegment', of: `${first}${last}`, t: (i + 1) / (names.length - 1) }),
        ),
        connect(first, last, 'segment'),
      ];
      out.push({ ruleId: 'collinear-points', clauseIds: [c.id], intents });
    }
    return out;
  },
};
