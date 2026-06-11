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
import { addPoint, CIRCLE_KW } from './_shared';

const PREFILTER = /cắt\s+(?:lại\s+)?(?:(?:nửa\s+)?đường\s*tròn\s*)?\(|giao\s*điểm\s+(?:thứ\s+hai\s+)?(?:của\s+|khác\s+[A-Z]\s+của\s+)?[A-Z]{2}\s+(?:và|với)\s+(?:(?:nửa\s+)?đường\s*tròn\s*)?(?:\(|ngoại\s*tiếp\s+tam\s*giác)/u;
const CIRCLE = String.raw`(?:đường\s*tròn\s*)?\(\s*([A-Z])(?:['′]?)\s*\)`;
// Circle GIỮ prime trong tên tâm (O'): cần cho "(O')" — đường tròn đường kính
// đặt tên "O'_c" (circleDiameter). emit raw "O'" → resolveCircleNames map "O'_c".
const CIRCLE_P = String.raw`(?:(?:nửa\s+)?đường\s*tròn\s*)?\(\s*([A-Z](?:['′])?)\s*\)`;

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

// "XY cắt (O) (ở|tại) (điểm (thứ hai)?)? Z (khác W)?" — "điểm thứ hai" + "khác W"
// optional. `khác W` (nếu có) là điểm chung cần loại (other); else mặc định
// chữ đầu của line (đầu mút nằm trên đường tròn).
const SINGLE = new RegExp(
  String.raw`([A-Z]{2})(?![A-Z])\s+cắt\s+(?:lại\s+)?` + CIRCLE +
    String.raw`\s+(?:ở|tại)\s+(?:điểm\s+(?:thứ\s+hai\s+)?)?(?:là\s+)?([A-Z])(?![A-Z])(?:\s+khác\s+([A-Z])(?![A-Z]))?`,
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
  String.raw`([A-Z])(?![A-Z])\s+là\s+giao\s*điểm\s+thứ\s+hai\s+của\s+([A-Z]{2})(?![A-Z])\s+(?:và|với)\s+` + CIRCLE,
  'gu',
);

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

function secondIntersection(name: string, line: string, circle: string, other?: string) {
  return addPoint(name, { kind: 'secondIntersection', line, circle, other: other ?? line[0] });
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

      SINGLE.lastIndex = 0;
      for (const m of c.text.matchAll(SINGLE)) {
        const line = m[1];
        const circle = m[2];
        const name = m[3];
        const other = m[4]; // "khác W" (optional) → điểm chung cần loại
        if (valid(name, line)) intents.push(secondIntersection(name, line, circle, other));
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

      if (intents.length > 0) out.push({ ruleId: 'line-circle-intersection', clauseIds: [c.id], intents });
    }
    return out;
  },
};
