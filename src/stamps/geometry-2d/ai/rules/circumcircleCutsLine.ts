// src/stamps/geometry-2d/ai/rules/circumcircleCutsLine.ts
//
// Đường tròn ngoại tiếp 1 tam giác cắt 1 ĐƯỜNG THẲNG (cặp đỉnh) tại điểm thứ 2:
//   "Đường tròn ngoại tiếp tam giác HBC cắt BI tại K khác B"
//     → wHBC = through3(H,B,C); K = circle∩line, loại điểm chung (B nằm trên cả
//       wHBC lẫn line BI). other = đỉnh chung của tam giác và line ("khác B" hoặc
//       suy: đầu mút line nằm trong bộ 3 đỉnh).
//
// KHÁC lineCircleIntersection (đường tròn ĐẶT TÊN "(O)"): ở đây đường tròn là
// CIRCUMCIRCLE vô danh của 1 tam giác → tự synth tên `w<verts>` (giống
// circumcirclePairMeet) + dựng through3.
//
// \b không khớp ký tự Việt → (?!\p{L}) + cờ 'u'.
import type { LanguageRule, RuleMatch } from './_types';
import { drawCircle, addPoint } from './_shared';

const PREFILTER =
  /[Đđ]ường\s*tròn\s+ngoại\s*tiếp\s+(?:tam\s*giác\s+)?[A-Z]{3}[^.]{0,20}?cắt\s+[A-Z]{2}|[Đđ]ường\s*tròn\s+\([A-Z]{3}\)[^.]{0,20}?cắt\s+[A-Z]{2}|\([A-Z]{3}\)\s*∩\s*[A-Z]{2}\s*=\s*\{/u;

// group1 = 3 đỉnh tam giác, 2 = line (cặp đỉnh), 3 = giao K, 4 = "khác W" (optional).
const RE = new RegExp(
  '[Đđ]ường\\s*tròn\\s+ngoại\\s*tiếp\\s+(?:tam\\s*giác\\s+)?([A-Z]{3})(?![A-Z])\\s+cắt\\s+(?:lại\\s+)?' +
    '(?:đường\\s*thẳng\\s+|đoạn\\s+|tia\\s+|cạnh\\s+)?([A-Z]{2})(?![A-Z])\\s+(?:tại|ở)\\s+' +
    '(?:điểm\\s+(?:thứ\\s+hai\\s+)?)?([A-Z])(?![A-Z])(?:\\s+khác\\s+([A-Z])(?![A-Z]))?',
  'gu',
);

// Shorthand PAREN: "Đường tròn (ABC) cắt OA tại điểm thứ 2 là I" — (XYZ) = đường
// tròn ngoại tiếp tam giác XYZ. Cho "thứ 2"/"thứ hai" + "là" (vao10:14).
const RE_PAREN = new RegExp(
  '[Đđ]ường\\s*tròn\\s+\\(([A-Z]{3})\\)\\s+cắt\\s+(?:lại\\s+)?' +
    '(?:đường\\s*thẳng\\s+|đoạn\\s+|tia\\s+|cạnh\\s+)?([A-Z]{2})(?![A-Z])\\s+(?:tại|ở)\\s+' +
    '(?:điểm\\s+(?:thứ\\s+(?:hai|2)\\s+)?)?(?:là\\s+)?([A-Z])(?![A-Z])(?:\\s+khác\\s+([A-Z])(?![A-Z]))?',
  'gu',
);

// Set-notation KÝ HIỆU: "(BMC) ∩ AC = {C, N}" (C40) — đường tròn ngoại tiếp (XYZ)
// giao đường thẳng PQ tại tập 2 điểm {S1, S2}. (XYZ) = circumcircle tam giác XYZ.
// Điểm CHUNG (loại khỏi second-intersection) = phần tử của {S1,S2} NẰM TRÊN line
// PQ (đầu mút line) — phần tử còn lại là giao THỨ HAI cần dựng. Cùng builder
// secondIntersection với RE/RE_PAREN. group: 1=tam giác, 2=line, 3=S1, 4=S2.
const RE_SET = new RegExp(
  '\\(([A-Z]{3})\\)\\s*∩\\s*(?:đường\\s*thẳng\\s+|đoạn\\s+|tia\\s+|cạnh\\s+)?([A-Z]{2})(?![A-Z])' +
    '\\s*=\\s*\\{\\s*([A-Z])(?![A-Z])\\s*,\\s*([A-Z])(?![A-Z])\\s*\\}',
  'gu',
);

export const circumcircleCutsLineRule: LanguageRule = {
  id: 'circumcircleCutsLine',
  priority: 58, // sau circleTriangle/cevian; trước intersection(45)
  languages: ['vi'],
  patterns: [PREFILTER],
  match(ctx) {
    const out: RuleMatch[] = [];
    for (const c of ctx.clauses) {
      for (const re of [RE, RE_PAREN]) {
        re.lastIndex = 0;
        for (const m of c.text.matchAll(re)) {
          const tri = m[1].split('');
          const line = m[2];
          const k = m[3];
          // Điểm chung (loại): "khác W" tường minh, else đầu mút line nằm trong tam giác.
          const shared = m[4] ?? line.split('').find((v) => tri.includes(v));
          if (!shared || tri.includes(k) || line.includes(k)) continue;
          const w = `w${m[1]}`;
          out.push({
            ruleId: 'circumcircleCutsLine',
            clauseIds: [c.id],
            intents: [
              drawCircle(w, 'through3', { points: tri }),
              addPoint(k, { kind: 'secondIntersection', line, circle: w, other: shared }),
            ],
          });
        }
      }
      // Set-notation: "(XYZ) ∩ PQ = {S1, S2}". Điểm CHUNG = phần tử ∈ {S1,S2} nằm
      // TRÊN line PQ (đầu mút line); giao THỨ HAI = phần tử còn lại. Fail-safe nếu
      // không xác định được đúng 1 điểm chung (cả 2 / không phần tử nào ∈ line).
      RE_SET.lastIndex = 0;
      for (const m of c.text.matchAll(RE_SET)) {
        const tri = m[1].split('');
        const line = m[2];
        const set = [m[3], m[4]];
        const onLine = set.filter((v) => line.includes(v));
        if (onLine.length !== 1) continue; // điểm chung không xác định → bỏ
        const shared = onLine[0];
        const k = set.find((v) => v !== shared)!;
        if (tri.includes(k) || line.includes(k)) continue;
        const w = `w${m[1]}`;
        out.push({
          ruleId: 'circumcircleCutsLine',
          clauseIds: [c.id],
          intents: [
            drawCircle(w, 'through3', { points: tri }),
            addPoint(k, { kind: 'secondIntersection', line, circle: w, other: shared }),
          ],
        });
      }
    }
    return out;
  },
};
