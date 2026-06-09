// src/stamps/geometry-2d/ai/rules/chord.ts
//
// Dây cung của đường tròn (chord):
//   "Cho đường tròn (O), dây AB"          → circle O + A,B ∈ (O) + đoạn AB
//   "đường tròn tâm O. Dây cung MN"       → circle O + M,N ∈ (O) + đoạn MN
//   "AB là dây của (O)"                   → reverse
// → drawCircle(O, centerRadius default) + onCircle A,B + connect A-B (dây).
//
// "(O)" KHÔNG có bán kính (circleRadius cố ý BỎ QUA "(O)" trơ). Dây cần MỘT đường
// tròn để minh hoạ → emit circleCR tâm O bán kính CANONICAL (SYMBOLIC_RADIUS), y
// như cách xử lý "(O; R)" ký hiệu. 2 đầu mút dây là glider onCircle (theta phân
// biệt) → nằm ĐÚNG trên đường tròn; đoạn nối = dây.
//
// Nếu đường tròn O đã được rule khác (circleRadius) dựng với bán kính cụ thể →
// addShape idempotent theo TÊN + circleRadius priority cao hơn ⇒ định nghĩa cụ
// thể THẮNG, circle ở đây bị bỏ (không chồng). onCircle/connect vẫn dùng O đó.
//
// Circle emit TRƯỚC (RuleMatch đầu) để onCircle tham chiếu O đã tồn tại (transpile
// xử lý theo thứ tự). Claim cả clause khai báo đường tròn để coverage không sót.
//
// Thiếu đường tròn / đầu mút dây trùng tâm / cặp trùng → bỏ qua (escalate).
//
// GOTCHA \b: \b của JS theo ASCII nên KHÔNG khớp quanh ký tự Việt. Regex chứa ký
// tự Việt dùng cờ 'u' + lookaround (?!\p{L}).
import type { LanguageRule, RuleMatch } from './_types';
import type { Clause } from '../deterministic/coverage';
import { addPoint, connect, drawCircle } from './_shared';
import { SYMBOLIC_RADIUS } from './circleRadius';

// Tên đường tròn toàn đề: "đường tròn (tâm) O" / "(O)".
const CIRCLE_WORDS = /đường\s*tròn\s*(?:\(\s*)?(?:tâm\s+)?([A-Z])(?![A-Z])/u;
const CIRCLE_PAREN = /\(\s*([A-Z])\s*\)/u;

// "dây (cung)? AB" (forward) / "AB là (một)? dây (cung)?" (reverse). Cặp đỉnh 2
// ký tự HOA liền, neo (?![A-Z]) chặn cụm 3+.
// [Dd]ây: "Dây" HOA đầu câu (sau dấu '.') cũng khớp; nhãn cặp đỉnh vẫn STRICT HOA.
const CHORD_FWD = /[Dd]ây\s+(?:cung\s+)?([A-Z])([A-Z])(?![A-Z])/gu;
const CHORD_REV = /([A-Z])([A-Z])(?![A-Z])\s+là\s+(?:một\s+)?dây(?:\s+cung)?(?!\p{L})/gu;

// Glider angle cho 2 đầu mút dây (radian) — phân biệt để A≠B, dây trải phần trên.
const THETA_A = 2.3;
const THETA_B = 0.7;

// Prefilter toàn đề ("Dây" HOA đầu câu cũng khớp).
const PREFILTER = /[Dd]ây/u;

/** Clause id chứa khai báo đường tròn (CIRCLE_WORDS hoặc "(O)"). */
function findCircleClauseId(clauses: readonly Clause[], circle: string): number | undefined {
  const frag = new RegExp(`đường\\s*tròn|\\(\\s*${circle}\\s*\\)`, 'u');
  for (const c of clauses) if (frag.test(c.text)) return c.id;
  return undefined;
}

/**
 * Resolve tên đường tròn từ toàn đề; undefined nếu không có.
 */
function resolveCircle(problem: string): string | undefined {
  const w = CIRCLE_WORDS.exec(problem);
  if (w) return w[1];
  const p = CIRCLE_PAREN.exec(problem);
  if (p) return p[1];
  return undefined;
}

export const chordRule: LanguageRule = {
  id: 'chord',
  // Dưới circleRadius (75) — nếu circle O có bán kính cụ thể, định nghĩa đó thắng.
  priority: 52,
  languages: ['vi'],
  patterns: [PREFILTER],
  match(ctx) {
    const circle = resolveCircle(ctx.problem);
    if (!circle) return []; // không có đường tròn → escalate

    // Gom các dây hợp lệ.
    interface Chord {
      clauseId: number;
      a: string;
      b: string;
    }
    const chords: Chord[] = [];
    const seen = new Set<string>(); // "a|b" (chuẩn hoá thứ tự) tránh trùng
    for (const c of ctx.clauses) {
      const collect = (re: RegExp) => {
        re.lastIndex = 0;
        for (const m of c.text.matchAll(re)) {
          const a = m[1];
          const b = m[2];
          if (a === b) continue; // cặp trùng → degenerate
          if (a === circle || b === circle) continue; // đầu mút trùng tâm → degenerate
          const key = [a, b].sort().join('|');
          if (seen.has(key)) continue;
          seen.add(key);
          chords.push({ clauseId: c.id, a, b });
        }
      };
      collect(CHORD_FWD);
      collect(CHORD_REV);
    }
    if (chords.length === 0) return []; // không trích được dây → escalate

    const out: RuleMatch[] = [];
    // 1) Đường tròn (centerRadius default) — TRƯỚC, claim clause khai báo đường
    //    tròn để coverage không sót clause "Cho đường tròn (O)".
    const circleClauseId = findCircleClauseId(ctx.clauses, circle);
    out.push({
      ruleId: 'chord',
      clauseIds: circleClauseId === undefined ? [] : [circleClauseId],
      intents: [drawCircle(circle, 'centerRadius', { center: circle, radius: SYMBOLIC_RADIUS })],
    });
    // 2) Mỗi dây: A,B glider onCircle (theta phân biệt) + đoạn nối.
    for (const ch of chords) {
      out.push({
        ruleId: 'chord',
        clauseIds: [ch.clauseId],
        intents: [
          addPoint(ch.a, { kind: 'onCircle', circle, theta: THETA_A }),
          addPoint(ch.b, { kind: 'onCircle', circle, theta: THETA_B }),
          connect(ch.a, ch.b, 'segment'),
        ],
      });
    }
    return out;
  },
};
