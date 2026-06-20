// src/stamps/geometry-2d/ai/rules/lineCircleIntersection.ts
//
// Giao đường thẳng/đoạn với đường tròn:
//   "CM cắt (O) tại N" → N = secondIntersection(CM, O), other=C
//   "AD, BE, CF cắt đường tròn (O) lần lượt tại M, N, P"
//     → M/N/P là giao thứ hai, loại A/B/C tương ứng.
//
// `other` lấy là chữ đầu của line token XY. Đây đúng cho các đề phổ biến
// "đường cao AD cắt lại ngoại tiếp tại M", "CM cắt (O) tại N"; dạng cần loại
// chữ thứ hai sẽ phải có rule riêng/fail-safe sau.
import type { LanguageRule, RuleMatch } from './_types';
import { addPoint, drawCircle, CIRCLE_KW } from './_shared';

// 3 nhánh: cắt-rồi-paren | giao điểm thứ hai | "cắt AB và (O)" (LINE_AND_CIRCLE
// vao10:28 — paren đứng sau "và", nhánh 1 không khớp) | "giao điểm thứ hai …
// với đường tròn" TRẦN không paren (vao10:254).
// Cuối nhánh: ĐƯỜNG TRÒN CHỦ NGỮ "(O) cắt …" (CIRCLE_SUBJECT/CIRCLE_SUBJECT_TWO)
// — paren-tâm (1 chữ HOA, optional prime/;R) liền "cắt" + sau đó có cặp đỉnh
// (line). Trước đây 2 nhánh circle-subject KHÔNG có prefilter → rule không chạy
// khi đề KHÔNG có nhánh line-chủ-ngữ nào (julielltv:12 "(I) cắt AB,AC tại M,N").
const PREFILTER = /cắt\s+(?:lại\s+)?(?:(?:nửa\s+)?đường\s*tròn\s*)?\(|cắt\s+(?:lại\s+)?(?:nửa\s+)?đường\s*tròn\s+(?:tâm\s+[A-Z](?:['′])?\s+)?(?:ở|tại)|cắt\s+[A-Z]{2}\s+và\s+\(|\(\s*[A-Z](?:['′]?)\s*(?:[;,]\s*[Rr]\s*)?\)\s+cắt\s+(?:lại\s+)?[A-Z]{2}\s*(?:,|và)?\s*(?:[A-Z]{2})?\s+(?:lần\s*lượt\s+|theo\s+thứ\s+tự\s+|tương\s+ứng\s+)?(?:ở|tại)|\(\s*[A-Z]{3}\s*\)\s*(?:,|và)\s*\(\s*[A-Z]{3}\s*\)\s+cắt|giao\s*điểm\s+(?:thứ\s+hai\s+)?(?:của\s+|khác\s+[A-Z]\s+của\s+)?(?:đường\s*thẳng\s+)?[A-Z]{2}(?:\s*,\s*[A-Z]{2})?\s+(?:và|với)\s+(?:(?:nửa\s+)?đường\s*tròn|\(|ngoại\s*tiếp\s+tam\s*giác)/u;
// "(O)" + compact "(O;R)"/"(O,R)" — vao10:127 "Tia CI cắt đường tròn (O;R) tại E".
// "nửa" optional — vao10:18 "giao điểm thứ hai của DC với NỬA đường tròn (O)".
const CIRCLE = String.raw`(?:(?:nửa\s+)?đường\s*tròn\s*)?\(\s*([A-Z])(?:['′]?)\s*(?:[;,]\s*[Rr]\s*)?\)`;
// Circle GIỮ prime trong tên tâm (O'): cần cho "(O')" — đường tròn đường kính
// đặt tên "O'_c" (circleDiameter). emit raw "O'" → resolveCircleNames map "O'_c".
const CIRCLE_P = String.raw`(?:(?:nửa\s+)?đường\s*tròn\s*)?\(\s*([A-Z](?:['′])?)\s*(?:[;,]\s*[Rr]\s*)?\)`;

// "<XY> vuông góc <L> (tại I)? … cắt (nửa)? đường tròn (O') (ở|tại) F" → đường
// vuông góc XY cắt đường tròn (O') tại F (2 nhánh, lấy branch 0). XY có thể là
// "EI" (E onCircle + I chân vuông góc) — cả 2 điểm dựng trước, line ref hợp lệ.
const PERP_CUTS_CIRCLE = new RegExp(
  String.raw`([A-Z])([A-Z])(?![A-Z])\s+(?:vuông\s*góc|⊥)\s+(?:với\s+)?[A-Z]{2}(?![A-Z])(?:\s+tại\s+[A-Z])?` +
    String.raw`[^.]{0,30}?cắt\s+` + CIRCLE_P + String.raw`\s+(?:ở|tại)\s+(?:điểm\s+)?([A-Z])(?![A-Z])`,
  'gu',
);

const TRIPLE_DISTRIB = new RegExp(
  String.raw`([A-Z]{2})\s*,\s*([A-Z]{2})\s*,\s*([A-Z]{2})(?![A-Z])[^.]{0,80}?cắt\s+` +
    CIRCLE +
    String.raw`[^.]{0,40}?lần\s*lượt\s+(?:ở|tại)\s+([A-Z])\s*,\s*([A-Z])\s*,\s*([A-Z])(?![A-Z])`,
  'gu',
);

// 2 đường ∩ đường tròn, phân phối: "BE,CF … cắt (O) lần lượt tại M và N" (vao10:77
// "Các đường cao BE,CF cắt nhau tại H, cắt đường tròn (O;R) lần lượt tại M và N" —
// "cắt nhau tại H," xen giữa; lazy-region + CIRCLE-paren tự bỏ qua "cắt nhau").
// Guard CHỈ 2 đường + CHỈ 2 điểm (lookahead phủ định ngăn nuốt dạng 3 của TRIPLE).
const DOUBLE_DISTRIB = new RegExp(
  String.raw`([A-Z]{2})\s*(?:,|và)\s*([A-Z]{2})(?![A-Z])(?!\s*(?:,|và)\s*[A-Z]{2})[^.]{0,80}?cắt\s+` +
    CIRCLE +
    String.raw`[^.]{0,40}?lần\s*lượt\s+(?:ở|tại)\s+([A-Z])\s*(?:,|và)\s*([A-Z])(?![A-Z])(?!\s*(?:,|và)\s*[A-Z])`,
  'gu',
);

// "XY cắt (O) (ở|tại) (điểm (thứ hai)?)? Z (khác W)?" — "điểm thứ hai" + "khác W"
// optional. `khác W` (nếu có) là điểm chung cần loại (other); else mặc định
// chữ đầu của line (đầu mút nằm trên đường tròn).
const SINGLE = new RegExp(
  String.raw`([A-Z]{2})(?![A-Z])\s+(?:kéo\s+dài\s+)?cắt\s+(?:lại\s+)?` + CIRCLE +
    String.raw`\s+(?:ở|tại)\s+(?:điểm\s+(?:thứ\s+hai\s+)?)?(?:là\s+)?([A-Z])(?![A-Z])(?:\s+khác\s+([A-Z])(?![A-Z]))?`,
  'gu',
);

// "XY (kéo dài)? cắt đường tròn TÂM O' (ở|tại) (điểm (thứ hai)?)? Z" — circle nêu
// bằng TÊN TÂM (không paren): "DC cắt đường tròn tâm O' tại I" (vao10:139). Tên tâm
// giữ prime → resolveCircleNames map "O'"→"O'_c". 1 đầu mút XY trên đường tròn
// (đầu line) → Z = giao thứ hai. groups: 1=line 2=center 3=name.
const SINGLE_NAMED_CENTER = new RegExp(
  String.raw`([A-Z]{2})(?![A-Z])\s+(?:kéo\s+dài\s+)?cắt\s+(?:lại\s+)?(?:nửa\s+)?đường\s*tròn\s+tâm\s+([A-Z](?:['′])?)(?![A-Za-z])` +
    String.raw`\s+(?:ở|tại)\s+(?:điểm\s+(?:thứ\s+hai\s+)?)?(?:là\s+)?([A-Z])(?![A-Z])`,
  'gu',
);

// "XY cắt (O) tại HAI điểm M, N" — CẢ HAI giao của đường với đường tròn (branch
// 0/1). Khác SINGLE (1 giao thứ hai khi biết điểm chung): ở đây 2 đầu mút đều
// chưa nằm trên (O) nên dùng intersection lineCircle 2 nhánh.
const BOTH = new RegExp(
  String.raw`([A-Z]{2})(?![A-Z])\s+cắt\s+` + CIRCLE +
    String.raw`\s+(?:ở|tại)\s+(?:hai\s+|các\s+)?điểm\s+(?:phân\s*biệt\s+)?([A-Z])\s*(?:,|và)\s*([A-Z])(?![A-Z])`,
  'gu',
);

// "XY cắt AB và (O) lần lượt tại H và I" (vao10:28 "OM cắt AB và (O) lần lượt
// tại H và I") — 1 đường cắt 1 ĐƯỜNG + 1 ĐƯỜNG TRÒN phân phối: H=XY∩AB
// (intersection thường), I=XY∩(O) (intersection lineCircle branch 0 — cả 2 đầu
// mút XY đều không trên đường tròn nên không dùng secondIntersection).
//   groups: 1=line 2=line2 3=circle 4=name1 5=name2.
const LINE_AND_CIRCLE = new RegExp(
  String.raw`([A-Z]{2})(?![A-Z])\s+cắt\s+([A-Z]{2})(?![A-Z])\s+và\s+` + CIRCLE +
    String.raw`\s+(?:lần\s*lượt\s+|theo\s+thứ\s+tự\s+)?(?:tại|ở)\s+([A-Z])\s*(?:,|và)\s*([A-Z])(?![A-Z])`,
  'gu',
);

// "XY (kéo dài)? cắt (lại)? (nửa)? đường tròn (ở|tại) (điểm (thứ hai)?)? Z" —
// đường tròn TRẦN (không paren, httcd:42 "BN cắt đường tròn ở C"). 1 đầu mút XY
// trên đường tròn (đầu line) → Z = giao thứ hai. circle resolve toàn đề.
const SINGLE_BARE = new RegExp(
  String.raw`([A-Z]{2})(?![A-Z])\s+(?:kéo\s+dài\s+)?cắt\s+(?:lại\s+)?(?:nửa\s+)?đường\s*tròn(?!\s*\()\s+(?:ở|tại)\s+(?:điểm\s+(?:thứ\s+hai\s+)?)?(?:là\s+)?([A-Z])(?![A-Z])`,
  'gu',
);

// "(đường thẳng)? AO cắt (O), (O′) lần lượt (ở|tại) C và D" (vao10:174,
// son123:107) — 1 đường cắt HAI đường tròn (giao của 2 circle tự do). A (đầu line)
// nằm trên CẢ 2 đường tròn (là 1 giao điểm) → C,D đều là secondIntersection, mỗi
// điểm với circle tương ứng, other = đầu line. Line giữ prime ("AO′").
//   groups: 1=line(prime optional) 2=circle1 3=circle2 4=name1 5=name2.
const LINE_TWO_CIRCLES = new RegExp(
  String.raw`(?:đường\s*thẳng\s+)?([A-Z][A-Z](?:['′])?)(?![A-Z])\s+cắt\s+` +
    CIRCLE_P + String.raw`\s*(?:,|và)\s*` + CIRCLE_P +
    String.raw`\s+(?:lần\s*lượt\s+|theo\s+thứ\s+tự\s+)?(?:ở|tại)\s+([A-Z])(?![A-Z])\s*(?:,|và)\s*([A-Z])(?![A-Z])`,
  'gu',
);

// Đường tròn LÀM CHỦ NGỮ: "(O) cắt XY (ở|tại) Z" (vao10:157 "(O) cắt AC tại E").
// Đảo của SINGLE (line chủ ngữ). 1 đầu mút XY nằm trên (O) → Z = giao thứ hai,
// other = đầu line (mặc định line[0]). groups: 1=circle 2=line 3=name.
const CIRCLE_SUBJECT = new RegExp(
  CIRCLE + String.raw`\s+cắt\s+(?:lại\s+)?([A-Z]{2})(?![A-Z])\s+(?:ở|tại)\s+(?:điểm\s+(?:thứ\s+hai\s+)?)?(?:là\s+)?([A-Z])(?![A-Z])`,
  'gu',
);

// Đường tròn chủ ngữ cắt HAI đường, phân phối: "(I) cắt AB,AC tại M,N"
//   (julielltv:12) → M = 2nd(AB, I) other A, N = 2nd(AC, I) other A. Mỗi line có
//   1 đầu mút trên đường tròn (đầu line) → giao thứ hai. groups: 1=circle 2=line1
//   3=line2 4=name1 5=name2.
const CIRCLE_SUBJECT_TWO = new RegExp(
  CIRCLE + String.raw`\s+cắt\s+(?:lại\s+)?([A-Z]{2})\s*(?:,|và)\s*([A-Z]{2})(?![A-Z])\s+(?:lần\s*lượt\s+|theo\s+thứ\s+tự\s+|tương\s+ứng\s+)?(?:ở|tại)\s+([A-Z])\s*(?:,|và)\s*([A-Z])(?![A-Z])`,
  'gu',
);

// "giao điểm của XY và (O) là R (khác W)?" — dạng "Gọi giao điểm của NQ và (O)
// là R khác N". Ref đầu = line (cặp đỉnh), ref sau = circle "(O)".
const GIAO_CIRCLE = new RegExp(
  String.raw`giao\s*điểm\s+(?:thứ\s+hai\s+)?(?:của\s+)?([A-Z]{2})(?![A-Z])\s+(?:và|với)\s+` + CIRCLE +
    String.raw`\s+là\s+([A-Z])(?![A-Z])(?:\s+khác\s+([A-Z])(?![A-Z]))?`,
  'gu',
);

// "X là giao điểm thứ hai của XY (và|với) (O)" — tên TRƯỚC, "thứ hai", KHÔNG
// "khác" (Bài 114: "I là giao điểm thứ hai của KA với (O)"). other = đầu mút
// line nằm trên đường tròn: ưu tiên chữ THỨ HAI (đỉnh tam giác/điểm-trên-(O)
// thường đứng sau, vd KA→A, AH→H?) — mặc định line[1] cho dạng này.
const NAME_2ND_CUA = new RegExp(
  String.raw`([A-Z])(?![A-Z])\s+là\s+giao\s*điểm\s+thứ\s+hai\s+của\s+(?:đường\s*thẳng\s+)?([A-Z]{2})(?![A-Z])\s+(?:và|với)\s+` + CIRCLE,
  'gu',
);

// "I là giao điểm thứ hai của (đường thẳng)? CE với đường tròn" — đường tròn
// TRẦN không paren (vao10:254); circle resolve từ toàn đề. other = line[0]
// (dạng này đầu mút TRÊN đường tròn thường đứng trước: "CE" với C tiếp điểm).
const NAME_2ND_BARE = new RegExp(
  String.raw`([A-Z])(?![A-Z])\s+là\s+giao\s*điểm\s+thứ\s+hai\s+của\s+(?:đường\s*thẳng\s+)?([A-Z]{2})(?![A-Z])\s+(?:và|với)\s+(?:nửa\s+)?đường\s*tròn(?!\s*\()`,
  'gu',
);
// Resolve circle toàn đề cho NAME_2ND_BARE: "(O)"/"(O;R)" hoặc "đường tròn (tâm)? O".
const RESOLVE_CIRCLE_BARE =
  /\(\s*([A-Z])(?:['′]?)\s*(?:[;,]\s*[Rr]\s*)?\)|đường\s*tròn\s+(?:tâm\s+)?([A-Z])(?![A-Za-z])/u;

// Distributive "E,F lần lượt là giao điểm thứ hai của AM,AN với (O)" → E=2nd(AM,O),
// F=2nd(AN,O). 2 line cùng circle. groups: 1=n1 2=n2 3=line1 4=line2 5=circle.
const DISTRIB_2ND = new RegExp(
  String.raw`([A-Z])\s*,\s*([A-Z])(?![A-Z])\s+(?:lần\s*lượt\s+|theo\s+thứ\s+tự\s+)?là\s+giao\s*điểm\s+thứ\s+hai\s+của\s+([A-Z]{2})\s*,\s*([A-Z]{2})(?![A-Z])\s+(?:và|với)\s+` + CIRCLE,
  'gu',
);

// Tên ĐỨNG TRƯỚC + "khác" TRƯỚC "của": "K là giao điểm (thứ hai)? khác A của AY
// và (O)" (VD8). g1=name, g2=other(khác), g3=line, g4|g5=circle.
const NAME_KHAC_CUA = new RegExp(
  String.raw`([A-Z])(?![A-Z])\s+là\s+giao\s*điểm\s+(?:thứ\s+hai\s+)?khác\s+([A-Z])(?![A-Z])\s+của\s+([A-Z]{2})(?![A-Z])\s+(?:và|với)\s+` + CIRCLE,
  'gu',
);

// Đường tròn MÔ TẢ (KHÔNG "(O)"): "giao điểm thứ hai của <LINE> (và|với) (nửa)?
// đường tròn ngoại tiếp tam giác XYZ là (điểm)? P (khác Q)?" (hinh9 #66).
// circleTriangle dựng circumcircle này KHÔNG khai báo tâm → tên mặc định "O"
// (intentFor: center || 'O'). Vì cụm "đường tròn ngoại tiếp tam giác XYZ" ở đây
// KHÔNG có token tâm "(X)"/"tâm X" chen giữa → resolve circle ref = "O".
// Tên P đứng SAU, "khác Q" optional (Q = điểm chung cần loại; else default line[0]).
const NAME_2ND_CIRCUM = new RegExp(
  String.raw`giao\s*điểm\s+thứ\s+hai\s+của\s+([A-Z]{2})(?![A-Z])\s+(?:và|với)\s+` +
    String.raw`(?:nửa\s+)?` + CIRCLE_KW +
    String.raw`\s+ngoại\s*tiếp\s+tam\s*giác\s+[A-Z]{3}(?![A-Z])` +
    String.raw`\s+là\s+(?:điểm\s+)?([A-Z])(?![A-Z])(?:\s+khác\s+([A-Z])(?![A-Z]))?`,
  'gu',
);

// "CM theo thứ tự cắt (CDE),(ABC) tại điểm thứ hai là P,Q" (julielltv:1) — 1 đường
//  cắt HAI đường tròn ngoại tiếp paren-3-chữ, zip. Mỗi giao = giao thứ hai; điểm
//  chung (other) = đỉnh circumcircle nằm TRÊN line token (vd C ∈ CM ∩ {C,D,E}).
//  group1=line 2=tri1 3=tri2 4=name1 5=name2.
const LINE_CUTS_PAREN_PAIR = new RegExp(
  String.raw`([A-Z]{2})(?![A-Z])\s+(?:lần\s*lượt\s+|theo\s+thứ\s+tự\s+|tương\s+ứng\s+)?cắt\s+(?:lại\s+)?` +
    String.raw`\(\s*([A-Z]{3})\s*\)\s*(?:,|và)\s*\(\s*([A-Z]{3})\s*\)` +
    String.raw`\s+(?:lần\s*lượt\s+|theo\s+thứ\s+tự\s+)?(?:ở|tại)\s+(?:điểm\s+(?:thứ\s+hai\s+)?(?:là\s+)?)?([A-Z])\s*(?:,|và)\s*([A-Z])(?![A-Z])`,
  'gu',
);

// "Các đường tròn (APB),(APC) cắt AC,AB (lần lượt)? tại E,F" (julielltv:23) — HAI
//  đường tròn ngoại tiếp (paren 3 chữ) cắt HAI đường, ZIP 1-1: E=2nd(AC, wAPB),
//  F=2nd(AB, wAPC). Mỗi giao = giao thứ hai; điểm chung (other) = đỉnh circumcircle
//  nằm TRÊN line token. group1=tri1 2=tri2 3=line1 4=line2 5=name1 6=name2.
const PAREN_PAIR_CUTS = new RegExp(
  String.raw`\(\s*([A-Z]{3})\s*\)\s*(?:,|và)\s*\(\s*([A-Z]{3})\s*\)\s+cắt\s+(?:lại\s+)?` +
    String.raw`([A-Z]{2})\s*(?:,|và)\s*([A-Z]{2})(?![A-Z])\s+(?:lần\s*lượt\s+|theo\s+thứ\s+tự\s+)?(?:ở|tại)\s+([A-Z])\s*(?:,|và)\s*([A-Z])(?![A-Z])`,
  'gu',
);

function secondIntersection(name: string, line: string, circle: string, other?: string) {
  return addPoint(name, { kind: 'secondIntersection', line, circle, other: other ?? line[0] });
}

// Đỉnh circumcircle nằm trên line token (điểm chung đã biết của line∩circle).
function vertexOnLine(verts: string, line: string): string | undefined {
  return verts.split('').find((v) => line.includes(v));
}

function valid(name: string, line: string): boolean {
  return /^[A-Z]$/u.test(name) && /^[A-Z]{2}$/u.test(line) && !line.includes(name);
}

export const lineCircleIntersectionRule: LanguageRule = {
  id: 'line-circle-intersection',
  priority: 47,
  languages: ['vi'],
  patterns: [PREFILTER],
  match(ctx) {
    const out: RuleMatch[] = [];
    for (const c of ctx.clauses) {
      const intents = [];

      TRIPLE_DISTRIB.lastIndex = 0;
      for (const m of c.text.matchAll(TRIPLE_DISTRIB)) {
        const circle = m[4];
        const pairs: Array<[string, string]> = [[m[1], m[5]], [m[2], m[6]], [m[3], m[7]]];
        if (pairs.every(([line, name]) => valid(name, line))) {
          intents.push(...pairs.map(([line, name]) => secondIntersection(name, line, circle)));
        }
      }

      DOUBLE_DISTRIB.lastIndex = 0;
      for (const m of c.text.matchAll(DOUBLE_DISTRIB)) {
        const circle = m[3];
        const pairs: Array<[string, string]> = [[m[1], m[4]], [m[2], m[5]]];
        if (pairs.every(([line, name]) => valid(name, line))) {
          intents.push(...pairs.map(([line, name]) => secondIntersection(name, line, circle)));
        }
      }

      SINGLE.lastIndex = 0;
      for (const m of c.text.matchAll(SINGLE)) {
        const line = m[1];
        const circle = m[2];
        const name = m[3];
        const other = m[4]; // "khác W" (optional) → điểm chung cần loại
        if (valid(name, line)) intents.push(secondIntersection(name, line, circle, other));
      }

      // "DC cắt đường tròn tâm O' tại I" — circle nêu bằng tên-tâm (không paren).
      SINGLE_NAMED_CENTER.lastIndex = 0;
      for (const m of c.text.matchAll(SINGLE_NAMED_CENTER)) {
        const line = m[1];
        const circle = m[2].replace(/′/g, "'");
        const name = m[3];
        if (valid(name, line)) intents.push(secondIntersection(name, line, circle, line[0]));
      }

      LINE_AND_CIRCLE.lastIndex = 0;
      for (const m of c.text.matchAll(LINE_AND_CIRCLE)) {
        const [line, line2, circle, n1, n2] = [m[1], m[2], m[3], m[4], m[5]];
        if (n1 === n2 || line.includes(n1) || line2.includes(n1) || line.includes(n2)) continue;
        intents.push(
          addPoint(n1, { kind: 'intersection', of: [line, line2] }),
          addPoint(n2, { kind: 'intersection', of: [line, circle], branch: 0 }),
        );
      }

      BOTH.lastIndex = 0;
      for (const m of c.text.matchAll(BOTH)) {
        const line = m[1];
        const circle = m[2];
        const [x, y] = [m[3], m[4]];
        if (x === y || line.includes(x) || line.includes(y)) continue;
        intents.push(
          addPoint(x, { kind: 'intersection', of: [line, circle], branch: 0 }),
          addPoint(y, { kind: 'intersection', of: [line, circle], branch: 1 }),
        );
      }

      // "I là giao điểm thứ hai của CE với đường tròn" TRẦN — circle toàn đề.
      NAME_2ND_BARE.lastIndex = 0;
      for (const m of c.text.matchAll(NAME_2ND_BARE)) {
        const rc = RESOLVE_CIRCLE_BARE.exec(ctx.problem);
        const circle = rc?.[1] ?? rc?.[2];
        if (!circle || !valid(m[1], m[2])) continue;
        intents.push(secondIntersection(m[1], m[2], circle, m[2][0]));
      }

      // "X là giao điểm thứ hai của XY (và|với) (O)" — name trước, other=line[1].
      NAME_2ND_CUA.lastIndex = 0;
      for (const m of c.text.matchAll(NAME_2ND_CUA)) {
        const [name, line, circle] = [m[1], m[2], m[3]];
        if (valid(name, line)) intents.push(secondIntersection(name, line, circle, line[1]));
      }

      // "E,F lần lượt là giao điểm thứ hai của AM,AN với (O)" — 2 line cùng circle.
      DISTRIB_2ND.lastIndex = 0;
      for (const m of c.text.matchAll(DISTRIB_2ND)) {
        const [n1, n2, l1, l2, circle] = [m[1], m[2], m[3], m[4], m[5]];
        if (valid(n1, l1)) intents.push(secondIntersection(n1, l1, circle));
        if (valid(n2, l2)) intents.push(secondIntersection(n2, l2, circle));
      }

      // "AO cắt (O), (O′) lần lượt ở C và D" — 1 đường, 2 đường tròn.
      LINE_TWO_CIRCLES.lastIndex = 0;
      for (const m of c.text.matchAll(LINE_TWO_CIRCLES)) {
        const line = m[1].replace(/′/g, "'");
        const [circle1, circle2, n1, n2] = [m[2].replace(/′/g, "'"), m[3].replace(/′/g, "'"), m[4], m[5]];
        const other = line[0]; // đầu line nằm trên cả 2 đường tròn (1 giao điểm)
        if (n1 === n2 || line.includes(n1) || line.includes(n2)) continue;
        if (circle1 === circle2) continue;
        intents.push(
          addPoint(n1, { kind: 'secondIntersection', line, circle: circle1, other }),
          addPoint(n2, { kind: 'secondIntersection', line, circle: circle2, other }),
        );
      }

      // "XY cắt đường tròn TRẦN (ở|tại) Z" — circle resolve toàn đề.
      SINGLE_BARE.lastIndex = 0;
      for (const m of c.text.matchAll(SINGLE_BARE)) {
        const rc = RESOLVE_CIRCLE_BARE.exec(ctx.problem);
        const circle = rc?.[1] ?? rc?.[2];
        const [line, name] = [m[1], m[2]];
        if (circle && valid(name, line)) intents.push(secondIntersection(name, line, circle, line[0]));
      }

      // "(I) cắt AB,AC tại M,N" — đường tròn chủ ngữ cắt 2 đường, phân phối.
      CIRCLE_SUBJECT_TWO.lastIndex = 0;
      for (const m of c.text.matchAll(CIRCLE_SUBJECT_TWO)) {
        const [circle, l1, l2, n1, n2] = [m[1], m[2], m[3], m[4], m[5]];
        if (n1 === n2) continue;
        if (valid(n1, l1)) intents.push(secondIntersection(n1, l1, circle));
        if (valid(n2, l2)) intents.push(secondIntersection(n2, l2, circle));
      }

      // "(O) cắt XY tại Z" — đường tròn chủ ngữ (đảo SINGLE).
      CIRCLE_SUBJECT.lastIndex = 0;
      for (const m of c.text.matchAll(CIRCLE_SUBJECT)) {
        const [circle, line, name] = [m[1], m[2], m[3]];
        if (valid(name, line)) intents.push(secondIntersection(name, line, circle));
      }

      GIAO_CIRCLE.lastIndex = 0;
      for (const m of c.text.matchAll(GIAO_CIRCLE)) {
        const line = m[1];
        const circle = m[2];
        const name = m[3];
        const other = m[4];
        if (valid(name, line)) intents.push(secondIntersection(name, line, circle, other));
      }

      // "K là giao điểm khác A của AY và (O)" — tên trước, "khác" trước "của".
      NAME_KHAC_CUA.lastIndex = 0;
      for (const m of c.text.matchAll(NAME_KHAC_CUA)) {
        const name = m[1];
        const other = m[2];
        const line = m[3];
        const circle = m[4];
        if (valid(name, line)) intents.push(secondIntersection(name, line, circle, other));
      }

      // "giao điểm thứ hai của AI và đường tròn ngoại tiếp tam giác ABC là điểm P
      // khác A" — circle MÔ TẢ (không "(O)"), resolve = "O" (tên circleTriangle dùng
      // cho circumcircle không khai báo tâm). other = "khác Q" (nếu có), else line[0].
      NAME_2ND_CIRCUM.lastIndex = 0;
      for (const m of c.text.matchAll(NAME_2ND_CIRCUM)) {
        const line = m[1];
        const name = m[2];
        const other = m[3]; // "khác Q" optional
        if (valid(name, line)) intents.push(secondIntersection(name, line, 'O', other));
      }

      // "EI ⊥ BC … cắt (nửa)? đường tròn (O') ở F" → F = giao đường vuông góc với
      // đường tròn (2 nhánh, branch 0). circle raw (giữ prime) → resolveCircleNames map.
      PERP_CUTS_CIRCLE.lastIndex = 0;
      for (const m of c.text.matchAll(PERP_CUTS_CIRCLE)) {
        const line = m[1] + m[2];
        const circle = m[3];
        const name = m[4];
        if (line.includes(name)) continue;
        intents.push(addPoint(name, { kind: 'intersection', of: [line, circle], branch: 0 }));
      }

      // "CM cắt (CDE),(ABC) tại điểm thứ hai là P,Q" — 1 đường ∩ 2 circumcircle paren.
      LINE_CUTS_PAREN_PAIR.lastIndex = 0;
      for (const m of c.text.matchAll(LINE_CUTS_PAREN_PAIR)) {
        const [line, t1, t2, n1, n2] = [m[1], m[2], m[3], m[4], m[5]];
        const o1 = vertexOnLine(t1, line);
        const o2 = vertexOnLine(t2, line);
        if (!o1 || !o2 || n1 === n2) continue;
        if (line.includes(n1) || line.includes(n2)) continue;
        intents.push(
          drawCircle(`w${t1}`, 'through3', { points: t1.split('') }),
          drawCircle(`w${t2}`, 'through3', { points: t2.split('') }),
          secondIntersection(n1, line, `w${t1}`, o1),
          secondIntersection(n2, line, `w${t2}`, o2),
        );
      }

      // "Các đường tròn (APB),(APC) cắt AC,AB tại E,F" — 2 circumcircle ∩ 2 đường (zip).
      PAREN_PAIR_CUTS.lastIndex = 0;
      for (const m of c.text.matchAll(PAREN_PAIR_CUTS)) {
        const [t1, t2, l1, l2, n1, n2] = [m[1], m[2], m[3], m[4], m[5], m[6]];
        const o1 = vertexOnLine(t1, l1);
        const o2 = vertexOnLine(t2, l2);
        if (!o1 || !o2 || n1 === n2) continue;
        if (l1.includes(n1) || l2.includes(n2)) continue;
        intents.push(
          drawCircle(`w${t1}`, 'through3', { points: t1.split('') }),
          drawCircle(`w${t2}`, 'through3', { points: t2.split('') }),
          secondIntersection(n1, l1, `w${t1}`, o1),
          secondIntersection(n2, l2, `w${t2}`, o2),
        );
      }

      if (intents.length > 0) out.push({ ruleId: 'line-circle-intersection', clauseIds: [c.id], intents });
    }
    return out;
  },
};
