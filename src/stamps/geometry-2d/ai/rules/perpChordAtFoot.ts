// src/stamps/geometry-2d/ai/rules/perpChordAtFoot.ts
//
// Dây vuông góc với một đường (thường là đường kính). HAI nhánh theo việc đầu
// mút thứ nhất đã được đề nhắc TRƯỚC clause hay chưa:
//
// (A) Đầu mút neo ĐÃ có ("Kẻ dây DE ⊥ AB tại H" — D là tiếp điểm/điểm dựng trước):
//     → E = reflectLine(D qua AB)  (E đối xứng D qua AB → cũng trên đường tròn
//        khi AB là đường kính)
//       H = perpFoot(D trên AB)    (chân vuông góc = giao DE với AB)
//       + đoạn DE (dây).
//
// (B) KHÔNG đầu mút nào có trước + dây ⊥ đường COLLINEAR với đường kính tại H
//     (vao10 61/94/126: "(O;R) đường kính AB. Điểm H thuộc OA. Kẻ dây CD ⊥ AB
//     tại H"): H là điểm DẪN (đã/được dựng trên đường kính), 2 đầu mút = giao
//     đường-⊥-tại-H với đường tròn:
//       H = onSegment(T)                (first-wins nhường nếu rule khác đã dựng H)
//       pc<H> = perpThrough(H, T)       (đường ⊥ T tại H)
//       C = rightAngleViewing(X, Y, pc<H>)  (X,Y = 2 đầu đường kính — Thales:
//            giao pc<H> với đường tròn đường kính XY, đúng đường tròn của dây)
//       D = reflectLine(C qua T) + đoạn CD.
//     Điều kiện: đề có "đường kính XY"; mọi chữ của T ∈ {X, Y, tâm} (T collinear
//     đường kính). Thiếu điều kiện → rơi về nhánh (A) như cũ (fail-safe escalate).
//
// KHÁC perpChordThroughPoint ("Qua M kẻ dây DE ⊥ AB" — chord qua điểm cho trước).
//
// GOTCHA \b: ký tự Việt → cờ 'u'; ⊥ hoặc "vuông góc với".
import type { LanguageRule, RuleMatch } from './_types';
import { addPoint, connect, drawLine } from './_shared';

// "(Kẻ)? dây (cung)? DE (⊥|vuông góc với) AB (tại H)?" — g1g2=dây DE, g3=đường
// AB (1-2 ký tự), g4=H (optional, chân).
const RE = new RegExp(
  String.raw`(?:[Kk]ẻ|[Vv]ẽ|[Dd]ựng)?\s*[Dd]ây\s*(?:cung\s+)?([A-Z])([A-Z])(?![A-Z])\s*(?:⊥|vuông\s*góc(?:\s+với)?)\s+(?:đường\s*thẳng\s+|cạnh\s+|đoạn\s+)?([A-Z]{1,2})(?![A-Z])(?:\s+tại\s+(?:điểm\s+)?([A-Z])(?![A-Z]))?`,
  'gu',
);

// "đường kính XY" trong toàn đề (lấy cặp ĐẦU TIÊN — đường kính chính của (O)).
const DIAMETER = /đường\s*kính\s+([A-Z])([A-Z])(?![A-Z])/u;
// Tâm đường tròn đặt tên: "(O" / "tâm O".
const CENTER = /\(\s*([A-Z])\s*[;,)]|tâm\s+([A-Z])(?![A-Za-z])/u;

/** Đầu mút d đã được đề nhắc TRƯỚC vị trí match (token HOA đứng riêng)? */
function appearsBefore(problem: string, chordText: string, d: string): boolean {
  const pos = problem.indexOf(chordText);
  if (pos < 0) return true; // không định vị được → conservative: coi như đã có (nhánh A)
  return new RegExp(`(?<![A-Za-z])${d}(?![a-z])`, 'u').test(problem.slice(0, pos));
}

export const perpChordAtFootRule: LanguageRule = {
  id: 'perpChordAtFoot',
  priority: 49,
  languages: ['vi'],
  patterns: [/[Dd]ây[^.]{0,12}?(?:⊥|vuông\s*góc)/u],
  match(ctx) {
    const out: RuleMatch[] = [];
    const diam = DIAMETER.exec(ctx.problem);
    const ctrM = CENTER.exec(ctx.problem);
    const center = ctrM ? (ctrM[1] ?? ctrM[2]) : undefined;
    for (const c of ctx.clauses) {
      RE.lastIndex = 0;
      for (const m of c.text.matchAll(RE)) {
        const d = m[1]; // đầu mút thứ nhất
        const e = m[2]; // đầu mút thứ hai (suy ra)
        const line = m[3];
        const h = m[4];
        if (new Set([d, e]).size !== 2 || line.includes(d) || line.includes(e)) continue;

        // Nhánh (B): cả 2 đầu mút mới + có chân H + T collinear đường kính.
        const diamLetters = diam ? [diam[1], diam[2], ...(center ? [center] : [])] : [];
        const collinear =
          line.length === 2 && line.split('').every((ch) => diamLetters.includes(ch));
        const freshEndpoints = diam && !appearsBefore(ctx.problem, m[0], d);
        if (freshEndpoints && collinear && h && h !== d && h !== e && !line.includes(h)) {
          const perpName = `pc${h}`;
          out.push({
            ruleId: 'perpChordAtFoot',
            clauseIds: [c.id],
            intents: [
              // t≠0.5 để không rơi đúng tâm (dây qua tâm = đường kính, degenerate).
              addPoint(h, { kind: 'onSegment', of: line, t: 0.3 }),
              drawLine(perpName, 'perpThrough', { through: h, to: line }),
              addPoint(d, { kind: 'rightAngleViewing', a: diam[1], b: diam[2], onLine: perpName }),
              addPoint(e, { kind: 'reflectLine', of: d, through: line }),
              connect(d, e, 'segment'),
            ],
          });
          continue;
        }

        // Nhánh (A): đầu mút neo đã có.
        const intents = [
          addPoint(e, { kind: 'reflectLine', of: d, through: line }),
          connect(d, e, 'segment'),
        ];
        if (h && h !== d && h !== e && !line.includes(h)) {
          intents.push(addPoint(h, { kind: 'perpFoot', from: d, onLine: line }));
        }
        out.push({ ruleId: 'perpChordAtFoot', clauseIds: [c.id], intents });
      }
    }
    return out;
  },
};
