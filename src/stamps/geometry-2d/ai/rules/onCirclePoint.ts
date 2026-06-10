// src/stamps/geometry-2d/ai/rules/onCirclePoint.ts
//
// Points declared on a named circle/semicircle:
//   "Điểm M nằm trên nửa đường tròn" after "(O) đường kính AB" → M on O_c
//   "Lấy điểm F thuộc cung AC nhỏ" with a unique "(O)" circle → F on O_c/O
//
// This rule is intentionally conservative: it needs one unambiguous circle name
// in the whole problem, and it does not try to model arc bounds yet.
import type { LanguageRule, RuleMatch } from './_types';
import { addPoint } from './_shared';

const PREFILTER = /(?:nằm|thuộc|lấy\s+điểm|trên\s+(?:nửa\s+)?(?:đường\s*tròn|cung))/iu;
const NAMED_CIRCLE = /(?:nửa\s+)?đường\s*tròn\s*(?:tâm\s+)?\(?\s*([A-Z])(?:\s*[;,]\s*[Rr])?\s*\)?/u;
const COMPACT_CIRCLE = /\(\s*([A-Z])\s*[;,]\s*[Rr]\s*\)/u;
// "<Name> thuộc/nằm trên/là (một) điểm trên  cung (nhỏ|lớn)? <pair>" — chấp nhận
// tính từ cung ĐỨNG TRƯỚC cặp đỉnh ("cung lớn AB") lẫn sau ("cung AB nhỏ").
// Hậu tố circle/cung: "cung (nhỏ|lớn)? AB" | "(nửa)? đường tròn" | "(O)" bare
// paren (1 ký tự HOA — "thuộc (O)" cực phổ biến khi đề đã đặt tên đường tròn).
const ON_SUFFIX =
  '(?:cung\\s+(?:nhỏ\\s+|lớn\\s+)?[A-Z]{2}(?:\\s*(?:nhỏ|lớn))?|(?:nửa\\s+)?đường\\s*tròn|\\(\\s*[A-Z]\\s*\\))';
const POINT_ON = new RegExp(
  // "nằm" optional → bắt "M (bất kì)? trên (nửa)? đường tròn" / "điểm A trên (O)"
  // (chỉ "trên" trần, không "nằm trên"). ON_SUFFIX neo circle/cung nên "trên"
  // trần vẫn an toàn (không nuốt "trên đoạn/tia").
  `(?:[Đđ]iểm\\s+)?([A-Z])(?:\\s+[^.]{0,12}?)?\\s+(?:(?:nằm\\s+)?trên|thuộc|là\\s+(?:một\\s+)?điểm\\s+(?:[^.A-Z]{0,16}?\\s+)?(?:nằm\\s+)?trên)\\s+${ON_SUFFIX}`,
  'u',
);
const TAKE_ON = new RegExp(
  `[Ll]ấy\\s+điểm\\s+([A-Z])[^.]{0,20}?(?:trên|thuộc)\\s+(?:cung|(?:nửa\\s+)?đường\\s*tròn|\\(\\s*[A-Z]\\s*\\))`,
  'u',
);
// Đảo "Trên (nửa)? đường tròn lấy điểm X" (KHÔNG "(X)", không "cung") → X onCircle
// trên circle toàn-đề. TAKE_ON_REV cần "(X)"; TAKE_ON_CUNG cần "cung"; đây phủ
// dạng trần "Trên đường tròn lấy điểm D" (phang:14).
const TAKE_ON_DUONGTRON =
  /[Tt]rên\s+(?:nửa\s+)?đường\s*tròn\s+lấy\s+(?:một\s+)?điểm\s+([A-Z])(?![A-Z])/u;
// Đảo trên CUNG (không paren): "Trên cung BC lấy điểm M" → M onCircle. KHÁC
// TAKE_ON_REV (cần "(X)"): ở đây cung nêu bằng cặp đỉnh; circle = toàn đề.
const TAKE_ON_CUNG = /[Tt]rên\s+cung\s+(?:nhỏ\s+|lớn\s+)?[A-Z]{2}(?:\s*(?:nhỏ|lớn))?[^.]{0,16}?lấy\s+điểm\s+([A-Z])(?![A-Z])/u;
// Đảo: "Trên (nửa)? đường tròn (X) lấy điểm P" — clause TỰ nêu circle (X). Bắt
// CẢ circle lẫn điểm để không nhầm sang circle toàn-đề khác. group1=center,
// group2=point. Center emit THÔ (resolveCircleNames map X→X_c nếu cần).
const TAKE_ON_REV =
  /[Tt]rên\s+(?:nửa\s+)?(?:đường\s*tròn|cung)\s*\(\s*([A-Z])(?:\s*[;,]\s*[Rr])?\s*\)[^.]{0,16}?lấy\s+điểm\s+([A-Z])(?![A-Z])/u;
// Distributive 2 điểm (Bài 9): "(lấy)? hai điểm C và D thuộc (nửa)? đường tròn"
// → 2 điểm onCircle với theta KHÁC nhau. group1=điểm 1 (C), group2=điểm 2 (D).
const TWO_ON =
  /(?:lấy\s+)?hai\s+điểm\s+([A-Z])(?![A-Za-z])\s+và\s+([A-Z])(?![A-Za-z])\s+thuộc\s+(?:nửa\s+)?(?:đường\s*tròn|cung)/u;
// "(Các)? điểm E, F thuộc cung BC …" — 2 điểm phân phối ngăn bởi dấu phẩy.
const TWO_ON_COMMA =
  /(?:[CcNn]ác\s+|[Nn]hững\s+)?điểm\s+([A-Z])(?![A-Za-z])\s*,\s*([A-Z])(?![A-Za-z])\s+thuộc\s+(?:nửa\s+)?(?:đường\s*tròn|cung)/u;
// "M, N là hai điểm thuộc cung nhỏ BC …" — tên ĐỨNG TRƯỚC "là hai điểm thuộc".
const TWO_ON_NAMES =
  /([A-Z])(?![A-Za-z])\s*,\s*([A-Z])(?![A-Za-z])\s+là\s+hai\s+điểm\s+(?:thuộc|nằm\s+trên|trên)\s+(?:nửa\s+)?(?:đường\s*tròn|cung)/u;

// Bare "(O)" (1 ký tự HOA trong ngoặc) — fallback khi không có tiền tố "đường
// tròn". Dùng cuối cùng vì rộng (mọi "(X)").
const BARE_CIRCLE = /\(\s*([A-Z])\s*\)/u;

function resolveCircle(problem: string): string | undefined {
  const m = NAMED_CIRCLE.exec(problem) ?? COMPACT_CIRCLE.exec(problem) ?? BARE_CIRCLE.exec(problem);
  if (!m) return undefined;
  const center = m[1];
  // circleDiameterRule names its support circle "<center>_c" (đường tròn ĐƯỜNG
  // KÍNH có tên tâm). Chỉ thêm "_c" khi "đường kính" gắn với CHÍNH center NÀY —
  // KHÔNG phải "đường kính" của 1 đường tròn KHÁC trong đề. Vd phang:17:
  // circumcircle "(O)" (circleTriangle đặt tên "O") + 1 đường tròn đường kính MP
  // rời → onCircle phải trỏ "O", KHÔNG "O_c". Nếu là circle bán kính/qua-3-điểm
  // (tên thô "O"), resolveCircleNames sẽ map "O"→"O_c" khi cần (có collision).
  const c = center.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const diameterOfThisCenter =
    new RegExp(`(?:\\(\\s*${c}\\s*[;,)]|tâm\\s+${c}(?![A-Za-z]))[^.]{0,25}?đường\\s*kính`, 'u').test(problem) ||
    new RegExp(`đường\\s*kính[^.]{0,25}?\\(\\s*${c}\\s*\\)`, 'u').test(problem);
  return diameterOfThisCenter ? `${center}_c` : center;
}

export const onCirclePointRule: LanguageRule = {
  id: 'on-circle-point',
  priority: 64,
  languages: ['vi'],
  patterns: [PREFILTER],
  match(ctx) {
    const circle = resolveCircle(ctx.problem);
    const out: RuleMatch[] = [];
    let theta = 1.2;
    for (const c of ctx.clauses) {
      // Đảo trước: clause tự nêu circle (X) → dùng circle ĐÓ (thô), tránh nhầm
      // circle toàn-đề. Khớp rồi thì bỏ qua forward patterns cho clause này.
      const rev = TAKE_ON_REV.exec(c.text);
      if (rev) {
        const name = rev[2];
        if (name.length === 1) {
          out.push({
            ruleId: 'on-circle-point',
            clauseIds: [c.id],
            intents: [addPoint(name, { kind: 'onCircle', circle: rev[1], theta })],
          });
          theta += 0.8;
        }
        continue;
      }
      if (!circle) continue; // forward patterns cần circle toàn-đề
      // Distributive 2 điểm: "lấy hai điểm C và D thuộc nửa đường tròn" — 2 điểm
      // onCircle theta khác nhau trên circle toàn-đề.
      const two = TWO_ON.exec(c.text) ?? TWO_ON_COMMA.exec(c.text) ?? TWO_ON_NAMES.exec(c.text);
      if (two && two[1].length === 1 && two[2].length === 1) {
        out.push({
          ruleId: 'on-circle-point',
          clauseIds: [c.id],
          intents: [
            addPoint(two[1], { kind: 'onCircle', circle, theta }),
            addPoint(two[2], { kind: 'onCircle', circle, theta: theta + 0.8 }),
          ],
        });
        theta += 1.6;
        continue;
      }
      const m =
        POINT_ON.exec(c.text) ??
        TAKE_ON.exec(c.text) ??
        TAKE_ON_CUNG.exec(c.text) ??
        TAKE_ON_DUONGTRON.exec(c.text);
      if (!m) continue;
      const name = m[1];
      if (name.length !== 1) continue;
      out.push({
        ruleId: 'on-circle-point',
        clauseIds: [c.id],
        intents: [addPoint(name, { kind: 'onCircle', circle, theta })],
      });
      theta += 0.8;
    }
    return out;
  },
};
