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
import { addPoint, connect, drawCircle, CIRCLE_KW } from './_shared';
import { SYMBOLIC_RADIUS } from './circleRadius';

// Tên đường tròn toàn đề: "đường tròn (tâm) O" / "(O)".
// Hỗ trợ cả tên chữ (alpha, omega...).
const CIRCLE_WORDS = new RegExp(CIRCLE_KW + '\\s*(?:\\(\\s*)?(?:tâm\\s+)?([^\\s;,).:]+)(?![A-Z])', 'u');
const CIRCLE_PAREN = /\(\s*([^\\s;,).:]+)\s*\)/u;

// "dây (cung)? AB" (forward) / "AB là (một)? dây (cung)?" (reverse). Cặp đỉnh 2
// ký tự HOA liền, neo (?![A-Z]) chặn cụm 3+.
// [Dd]ây: "Dây" HOA đầu câu (sau dấu '.') cũng khớp; nhãn cặp đỉnh vẫn STRICT HOA.
const CHORD_FWD = /[Dd]ây\s+(?:cung\s+)?([A-Z])([A-Z])(?![A-Z])/gu;
const CHORD_REV = /([A-Z])([A-Z])(?![A-Z])\s+là\s+(?:một\s+)?dây(?:\s+cung)?(?!\p{L})/gu;

// "(vẽ)? hai dây CD,EF" — HAI dây liệt kê: 2 cặp đỉnh HOA ngăn cách dấu phẩy sau
// "hai dây". CHORD_FWD chỉ bắt cặp NGAY sau "dây" (CD) nên bỏ sót cặp thứ hai (EF
// sau dấu phẩy). Bắt riêng để cả 4 đầu mút thành glider onCircle. Bỏ qua phần
// "cùng đi qua I" (I là điểm trên dây AB, rule khác xử lý).
const CHORD_TWO =
  /(?:vẽ\s+)?hai\s+dây\s+(?:cung\s+)?([A-Z])([A-Z])(?![A-Z])\s*,\s*([A-Z])([A-Z])(?![A-Z])/gu;

// Glider angle cho 2 đầu mút dây ĐẦU TIÊN (radian) — phân biệt để A≠B, dây trải
// phần trên. Dây thứ k (k≥1) tịnh tiến theta thêm k·THETA_STEP để KHÔNG trùng
// điểm khi nhiều dây trên cùng đường tròn.
const THETA_A = 2.3;
const THETA_B = 0.7;
const THETA_STEP = 0.9;

// Prefilter toàn đề ("Dây" HOA đầu câu cũng khớp).
const PREFILTER = /[Dd]ây/u;

/** Escape regex metachar — tên đường tròn từ OCR bẩn có thể chứa "(", "*"… */
function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Clause id chứa khai báo đường tròn (CIRCLE_WORDS hoặc "(O)"). */
function findCircleClauseId(clauses: readonly Clause[], circle: string): number | undefined {
  const frag = new RegExp(CIRCLE_KW + `|\\(\\s*${escapeRe(circle)}\\s*\\)`, 'u');
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
  // 71: TRÊN externalPoint (68) + tangentNamedFromExt (50) để đường tròn nền
  // (do dây định nghĩa) build TRƯỚC điểm ngoài / tiếp điểm tham chiếu nó (Bài 8:
  // "(O) và dây AB. Lấy C ngoài. Kẻ tiếp tuyến CP, CQ"). DƯỚI circleRadius (75)
  // để bán kính SỐ cụ thể vẫn thắng (idempotent theo tên).
  priority: 71,
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
      // GUARD: dây cung VUÔNG GÓC (qua điểm, ⊥ đoạn) → perpChordThroughPoint sở hữu
      // (D,E là giao của đường ⊥ với đường tròn SẴN CÓ). chord không được dựng đường
      // tròn lạ + glider rời cho clause này (sẽ chồng + sai hình).
      if (/vuông\s*góc|⊥/u.test(c.text)) continue;
      const pushChord = (clauseId: number, a: string, b: string) => {
        if (a === b) return; // cặp trùng → degenerate
        if (a === circle || b === circle) return; // đầu mút trùng tâm → degenerate
        const key = [a, b].sort().join('|');
        if (seen.has(key)) return;
        seen.add(key);
        chords.push({ clauseId, a, b });
      };
      // "hai dây CD,EF" — bắt TRƯỚC để cả 2 cặp vào (CHORD_FWD chỉ lấy cặp đầu).
      CHORD_TWO.lastIndex = 0;
      for (const m of c.text.matchAll(CHORD_TWO)) {
        pushChord(c.id, m[1], m[2]);
        pushChord(c.id, m[3], m[4]);
      }
      const collect = (re: RegExp) => {
        re.lastIndex = 0;
        for (const m of c.text.matchAll(re)) pushChord(c.id, m[1], m[2]);
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
    // 2) Mỗi dây: 2 đầu mút glider onCircle (theta phân biệt) + đoạn nối. Dây thứ
    //    k tịnh tiến theta thêm k·THETA_STEP → nhiều dây KHÔNG trùng điểm (dây đầu
    //    giữ 2.3/0.7 như cũ ⇒ hành vi 1-dây không đổi).
    chords.forEach((ch, k) => {
      const offset = k * THETA_STEP;
      out.push({
        ruleId: 'chord',
        clauseIds: [ch.clauseId],
        intents: [
          addPoint(ch.a, { kind: 'onCircle', circle, theta: THETA_A + offset }),
          addPoint(ch.b, { kind: 'onCircle', circle, theta: THETA_B + offset }),
          connect(ch.a, ch.b, 'segment'),
        ],
      });
    });
    return out;
  },
};
