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
import { addPoint, connect, drawCircle, CIRCLE_KW, escapeRe } from './_shared';
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
// Guard `(?!\s+cắt\s+nhau)`: "hai dây MN và BK CẮT NHAU ở E" mô tả GIAO của 2 dây
// ĐÃ CÓ (M,N,B,K dựng trước) — KHÔNG khai báo dây mới (vao10:226: B=đầu đường kính
// → onCircle gây CYCLE). Chỉ khớp khi 2 dây là MỚI ("vẽ … song song", "cùng đi qua").
const CHORD_TWO =
  /(?:vẽ\s+)?(?:hai|các)\s+dây\s+(?:cung\s+)?([A-Z])([A-Z])(?![A-Z])\s*(?:,|và)\s*([A-Z])([A-Z])(?![A-Z])(?!\s+cắt\s+nhau)/gu;

// Glider angle cho 2 đầu mút dây ĐẦU TIÊN (radian) — phân biệt để A≠B, dây trải
// phần trên. Dây thứ k (k≥1) tịnh tiến theta thêm k·THETA_STEP để KHÔNG trùng
// điểm khi nhiều dây trên cùng đường tròn.
const THETA_A = 2.3;
const THETA_B = 0.7;
const THETA_STEP = 0.9;

/**
 * Thetas cho HAI DÂY VUÔNG GÓC NHAU tại M, cắt nhau bên trong đường tròn. Hệ trục
 * riêng: dây 1 (AB) nằm ngang y = d1, dây 2 (CD) thẳng đứng x = d2, M = (d2, d1);
 * A = (−h1, d1), B = (h1, d1), C = (d2, h2), D = (d2, −h2) với h = nửa độ dài dây.
 * Dữ kiện đề: độ dài hai dây ("AB = 18 cm, CD = 14 cm") và một đoạn từ M tới đầu
 * mút ("MC = 4 cm") → dựng ĐÚNG tỉ lệ; thiếu đoạn từ M → chọn R giữa max(h) và
 * √(h1²+h2²) (điều kiện cắt nhau bên trong); thiếu độ dài dây → hai dây bằng nhau.
 */
function thetaDayVuongGoc(
  problem: string,
  d1: { a: string; b: string },
  d2: { a: string; b: string },
  giao?: string,
): [[number, number], [number, number]] {
  const doDai = (x: string, y: string) => {
    const re = new RegExp(`(?<![A-Z])(?:${x}${y}|${y}${x})\\s*=\\s*(\\d+(?:[.,]\\d+)?)`, 'u');
    const m = re.exec(problem);
    return m ? Number(m[1].replace(',', '.')) : undefined;
  };
  const L1 = doDai(d1.a, d1.b);
  const L2 = doDai(d2.a, d2.b);
  const [h1, h2] = L1 && L2 ? [L1 / 2, L2 / 2] : [1, 1];
  let y1: number | undefined; // d1
  let x2: number | undefined; // d2
  if (L1 && L2 && giao) {
    const tu = (p: string) => doDai(giao, p);
    if (tu(d2.a) !== undefined) y1 = h2 - tu(d2.a)!;
    else if (tu(d2.b) !== undefined) y1 = tu(d2.b)! - h2;
    else if (tu(d1.a) !== undefined) x2 = tu(d1.a)! - h1;
    else if (tu(d1.b) !== undefined) x2 = h1 - tu(d1.b)!;
  }
  let R: number;
  if (y1 !== undefined) R = Math.hypot(h1, y1);
  else if (x2 !== undefined) R = Math.hypot(h2, x2);
  else R = (Math.max(h1, h2) + Math.hypot(h1, h2)) / 2;
  y1 ??= Math.sqrt(Math.max(R * R - h1 * h1, 0));
  x2 ??= Math.sqrt(Math.max(R * R - h2 * h2, 0));
  // Dữ kiện mâu thuẫn (M ngoài một dây) → bố cục không dữ kiện.
  if (!(Math.abs(x2) < h1 && Math.abs(y1) < h2) || Math.abs(Math.hypot(h2, x2) - R) > 1e-9 * R) {
    return thetaDayVuongGoc('', d1, d2);
  }
  const g = (x: number, y: number) => Math.atan2(y, x);
  return [[g(-h1, y1), g(h1, y1)], [g(x2, h2), g(x2, -h2)]];
}

// Prefilter toàn đề ("Dây" HOA đầu câu cũng khớp).
const PREFILTER = /[Dd]ây/u;

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

// Đỉnh tam giác NỘI TIẾP đường tròn O ("tam giác ABC nội tiếp (O)" / "… nội tiếp
// đường tròn (O)"). Các đỉnh này ĐÃ ràng buộc trên O qua circumcircle through3
// (circleTriangle rule) → resolveCircleNames đổi circle O→O_c, O_c=through3(A,B,C)
// phụ thuộc CHÍNH các đỉnh đó. Nếu chord lại đặt đỉnh = onCircle(O)→onCircle(O_c)
// thì sinh CYCLE (vd B → O_c → B) → transpile crash, KÉO CẢ partial xuống none.
// → SKIP onCircle cho đầu mút dây là đỉnh tam giác nội tiếp (đã trên đường tròn);
//   đầu mút MỚI + đoạn nối vẫn giữ. Chỉ áp khi tam giác nội tiếp ĐÚNG circle O.
// \b không khớp quanh ký tự Việt → cờ 'u' + lookaround.
function inscribedTriangleVertices(problem: string, circle: string): Set<string> {
  const out = new Set<string>();
  // CHỈ circumcircle (through3) mới có đỉnh NẰM TRÊN đường tròn → 2 phrasing:
  //  (A) "tam giác XYZ [adj]? … nội tiếp (trong)? (đường tròn)? [ (O)/tâm O ]"
  //      (tam giác TRƯỚC, đường tròn SAU). Đường tròn (tuỳ chọn nêu tên) bound.
  //  (B) "(đường tròn) [ (O)/tâm O ] NGOẠI tiếp tam giác XYZ" (đường tròn TRƯỚC).
  // KHÔNG bắt incircle ("đường tròn (O) NỘI tiếp tam giác") — đỉnh KHÔNG trên O.
  // \b không khớp quanh ký tự Việt → cờ 'u' + lookaround.
  const NAMED_O = '(?:\\(\\s*([^\\s;,).:]+)\\s*\\)|tâm\\s+([A-Z]))?';
  const TRI = 'tam\\s*giác\\s+(?:(?:nhọn|cân|đều|vuông|tù)\\s+)?([A-Z])([A-Z])([A-Z])(?![A-Z])';
  // (A) tam giác … nội tiếp … (O)
  const RE_A = new RegExp(TRI + '[^.]{0,40}?nội\\s*tiếp\\s+(?:trong\\s+)?(?:' + CIRCLE_KW + ')?\\s*' + NAMED_O, 'gu');
  for (const m of problem.matchAll(RE_A)) {
    const named = m[4] ?? m[5];
    if (named && named !== circle) continue; // đường tròn khác O → bỏ
    out.add(m[1]); out.add(m[2]); out.add(m[3]);
  }
  // (B) (đường tròn) (O) ngoại tiếp tam giác … — circumcircle, đỉnh trên O.
  // Tên đường tròn có thể là "(O)", "tâm O" HOẶC bare "O" (OCR "đường tròn O").
  const NAMED_O_B = '(?:\\(\\s*([^\\s;,).:]+)\\s*\\)|tâm\\s+([A-Z])|([A-Z]))?';
  const RE_B = new RegExp(CIRCLE_KW + '\\s*' + NAMED_O_B + '\\s*ngoại\\s*tiếp\\s+' + TRI, 'gu');
  for (const m of problem.matchAll(RE_B)) {
    const named = m[1] ?? m[2] ?? m[3]; // tên đường tròn đứng TRƯỚC ở phrasing này
    if (named && named !== circle) continue;
    out.add(m[4]); out.add(m[5]); out.add(m[6]);
  }
  return out;
}

const SECANT_TOKEN = /cát\s*tuyến\s+[A-Z]([A-Z])([A-Z])(?![A-Z])/gu;
const SECANT_THROUGH =
  /[Qq]ua\s+(?:điểm\s+)?[A-Z](?!\p{L})[^.]{0,30}?cắt\s+(?:lại\s+)?(?:nửa\s+)?(?:đường\s*tròn\s*)?(?:\(\s*[A-Z]\s*\)\s*|[A-Z]\s+)?(?:tại|ở)\s+(?:hai\s+|2\s+)?(?:điểm\s+)?([A-Z])\s*(?:và|,)\s*([A-Z])(?![A-Z])/gu;

/** Điểm do cát tuyến định nghĩa (khớp các dạng rule secant nhận). */
function secantPoints(problem: string): Set<string> {
  const out = new Set<string>();
  for (const re of [SECANT_TOKEN, SECANT_THROUGH]) {
    for (const m of problem.matchAll(re)) { out.add(m[1]); out.add(m[2]); }
  }
  return out;
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

    // Đỉnh tam giác nội tiếp O — đã trên đường tròn (qua circumcircle). KHÔNG
    // gắn onCircle (tránh CYCLE qua O_c=through3); connect vẫn dựng dây.
    const inscribedVerts = inscribedTriangleVertices(ctx.problem, circle);
    // Hai giao điểm của cát tuyến ("cát tuyến ABC", "qua A cắt (O) tại D và E")
    // do rule secant dựng ĐÚNG thứ tự gần→xa. Gắn onCircle tự do ở đây (prio 71 >
    // secant 58) là đè mất: "dây BC" của cát tuyến ABC từng ra B xa, C gần.
    for (const p of secantPoints(ctx.problem)) inscribedVerts.add(p);

    // Gom các dây hợp lệ.
    interface Chord {
      clauseId: number;
      a: string;
      b: string;
      /** thetas cố định (dây ⊥ nhau) — vắng = bố cục mặc định. */
      th?: [number, number];
    }
    const chords: Chord[] = [];
    const seen = new Set<string>(); // "a|b" (chuẩn hoá thứ tự) tránh trùng
    for (const c of ctx.clauses) {
      const pushChord = (clauseId: number, a: string, b: string) => {
        if (a === b) return; // cặp trùng → degenerate
        if (a === circle || b === circle) return; // đầu mút trùng tâm → degenerate
        const key = [a, b].sort().join('|');
        if (seen.has(key)) return;
        seen.add(key);
        chords.push({ clauseId, a, b });
      };
      // "hai dây CD,EF" / "hai dây AB và CD vuông góc với nhau" — khai báo TƯỜNG
      // MINH 2 dây ("hai|các dây X,Y") → 4 đầu mút glider. Chạy KỂ CẢ khi clause có
      // "vuông góc" (2 dây ⊥ NHAU ≠ perpChordThroughPoint — httcd:65/68).
      CHORD_TWO.lastIndex = 0;
      for (const m of c.text.matchAll(CHORD_TWO)) {
        const n0 = chords.length;
        pushChord(c.id, m[1], m[2]);
        pushChord(c.id, m[3], m[4]);
        // "… vuông góc với nhau": bố cục mặc định KHÔNG vuông góc (hình sai đề) →
        // đặt thetas để hai dây ⊥ và cắt nhau bên trong đường tròn.
        const sau = c.text.slice((m.index ?? 0) + m[0].length);
        const vg = /^\s*(?:vuông\s*góc|⊥)\s*(?:với\s+)?nhau(?:\s+(?:tại|ở)\s+([A-Z])(?![A-Z]))?/u.exec(sau);
        if (chords.length === n0 + 2 && vg) {
          const [t1, t2] = thetaDayVuongGoc(ctx.problem, chords[n0], chords[n0 + 1], vg[1]);
          chords[n0].th = t1;
          chords[n0 + 1].th = t2;
        }
      }
      // GUARD (chỉ dây ĐƠN fwd/rev): dây cung VUÔNG GÓC (qua điểm, ⊥ đoạn) →
      // perpChordThroughPoint sở hữu (D,E là giao của đường ⊥ với đường tròn SẴN CÓ).
      if (/vuông\s*góc|⊥/u.test(c.text)) continue;
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
      const intents = [];
      // Đầu mút là đỉnh tam giác nội tiếp O → BỎ onCircle (đã trên O, tránh cycle).
      const [ta, tb] = ch.th ?? [THETA_A + offset, THETA_B + offset];
      if (!inscribedVerts.has(ch.a)) intents.push(addPoint(ch.a, { kind: 'onCircle', circle, theta: ta }));
      if (!inscribedVerts.has(ch.b)) intents.push(addPoint(ch.b, { kind: 'onCircle', circle, theta: tb }));
      intents.push(connect(ch.a, ch.b, 'segment'));
      out.push({ ruleId: 'chord', clauseIds: [ch.clauseId], intents });
    });
    return out;
  },
};
