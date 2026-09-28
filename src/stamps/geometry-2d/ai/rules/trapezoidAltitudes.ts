// src/stamps/geometry-2d/ai/rules/trapezoidAltitudes.ts
//
// Đường cao của HÌNH THANG kẻ từ đỉnh xuống đáy đối diện (lớp 8, hình thang cân):
//   "Cho hình thang cân ABCD (AB // CD, AB < CD), đường cao AH, BK"
//   "Kẻ các đường cao AH, BK"
// → H = chân ⊥ từ A xuống đáy CD, K = chân ⊥ từ B xuống CD. Cặp đáy lấy từ "(XY // ZW)"
// (mặc định AB // CD như hình mẫu). Đỉnh không nằm trên đáy nào → bỏ. Hình bình hành
// ("đường cao AH" không rõ xuống cạnh nào) KHÔNG đoán — guard named-entity escalate.
import type { LanguageRule, RuleMatch } from './_types';
import type { IntentT } from '../intent';
import { addPoint, connect } from './_shared';

const PREFILTER = /hình\s+thang/u;
const HT = /hình\s+thang(?:\s+(?:cân|vuông))?\s+([A-Z]{4})(?![A-Z])/u;
const SS = /(?<![A-Z])([A-Z]{2})\s*(?:\/\/|∥|song\s+song\s+(?:với\s+)?)\s*([A-Z]{2})(?![A-Z])/gu;
const CAO = /(?:[Đđ]ường\s*cao|[Cc]hiều\s*cao)\s+((?:[A-Z][A-Z]\s*(?:,|và)\s*)*[A-Z][A-Z])(?![A-Z])/gu;

const key = (s: string) => s.split('').sort().join('');

export const trapezoidAltitudesRule: LanguageRule = {
  id: 'trapezoidAltitudes',
  priority: 64,
  languages: ['vi'],
  patterns: [PREFILTER],
  match(ctx) {
    const ht = HT.exec(ctx.problem);
    if (!ht) return [];
    // Không có tam giác nào trong đề (cevian lo phần tam giác) — tránh nhầm "đường cao
    // AH của tam giác ABC".
    if (/tam\s*giác/u.test(ctx.problem)) return [];
    const q = ht[1];
    const canh = [q[0] + q[1], q[1] + q[2], q[2] + q[3], q[3] + q[0]].map(key);
    let day: [string, string] = [q[0] + q[1], q[2] + q[3]];
    for (const m of ctx.problem.matchAll(SS)) {
      if (canh.includes(key(m[1])) && canh.includes(key(m[2])) && new Set(m[1] + m[2]).size === 4) {
        day = [m[1], m[2]];
        break;
      }
    }
    const out: RuleMatch[] = [];
    for (const c of ctx.clauses) {
      const intents: IntentT[] = [];
      for (const m of c.text.matchAll(CAO)) {
        for (const cap of m[1].split(/\s*,\s*|\s+và\s+/u)) {
          const [V, F] = [cap[0], cap[1]];
          if (q.includes(F) || !q.includes(V)) continue;
          const doi = day[0].includes(V) ? day[1] : day[1].includes(V) ? day[0] : undefined;
          if (!doi) continue;
          intents.push(addPoint(F, { kind: 'perpFoot', from: V, onLine: doi }), connect(V, F, 'segment'));
        }
      }
      if (intents.length) out.push({ ruleId: 'trapezoidAltitudes', clauseIds: [c.id], intents });
    }
    return out;
  },
};
