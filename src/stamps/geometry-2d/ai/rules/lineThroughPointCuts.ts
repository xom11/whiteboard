// src/stamps/geometry-2d/ai/rules/lineThroughPointCuts.ts
//
// "MỘT đường thẳng (bất kì) qua điểm P cắt X tại M, cắt Y tại N" — đường TỰ DO qua P
// (lớp 8, đồng dạng / hình bình hành):
//   "Một đường thẳng đi qua D lần lượt cắt đoạn thẳng BC và tia AB tại M và N"
//   "Một đường thẳng đi qua O lần lượt cắt các cạnh AB, CD … tại hai điểm M, N"
// Dựng: M = điểm tự do trên đoạn X (đề cho "cạnh/đoạn"), N = PM ∩ Y.
//
// "Thà thiếu còn hơn sai": N phải CHẮC nằm đúng chỗ đề nói. Nhận khi Y là tia /
// đường thẳng (giao với đường kéo dài luôn hợp lệ) hoặc Y là cạnh đối xứng tâm qua P
// (P = giao hai đường chéo hình bình hành, X và Y là hai cạnh đối) — còn lại bỏ.
import type { LanguageRule, RuleMatch } from './_types';
import { addPoint, connect } from './_shared';

const PREFILTER = /[Mm]ột\s+đường\s*thẳng/u;
const LOAI = String.raw`(cạnh|đoạn(?:\s+thẳng)?|tia|đường\s*thẳng)?`;
const RE = new RegExp(
  String.raw`[Mm]ột\s+đường\s*thẳng\s+(?:bất\s*k[iìyỳ]\s+)?(?:đi\s+)?qua\s+(?:điểm\s+)?([A-Z])(?![A-Z'′])\s*,?\s*(?:lần\s*lượt\s+)?cắt\s+(?:các\s+|hai\s+)?${LOAI}\s*([A-Z]{2})(?![A-Z])\s*(?:,|và)\s*${LOAI}\s*([A-Z]{2})(?![A-Z])[^.;]{0,40}?(?:tại|ở)\s+(?:hai\s+điểm\s+|các\s+điểm\s+|điểm\s+)?([A-Z])\s*(?:,|và)\s*([A-Z])(?![A-Z'′])`,
  'gu',
);
const TAM_HBH = /([A-Z])\s+là\s+giao\s*điểm\s+(?:của\s+)?hai\s+đường\s+chéo\s+(?:của\s+)?hình\s+(?:bình\s+hành|chữ\s+nhật|thoi|vuông)\s+([A-Z]{4})(?![A-Z])/u;

const laDoan = (l: string | undefined, fallback: string | undefined) => {
  const x = l ?? fallback ?? 'cạnh';
  return x.startsWith('cạnh') || x.startsWith('đoạn');
};

export const lineThroughPointCutsRule: LanguageRule = {
  id: 'lineThroughPointCuts',
  priority: 55,
  languages: ['vi'],
  patterns: [PREFILTER],
  match(ctx) {
    const out: RuleMatch[] = [];
    const tam = TAM_HBH.exec(ctx.problem);
    for (const c of ctx.clauses) {
      for (const m of c.text.matchAll(RE)) {
        const [, P, l1, X, l2raw, Y, M, N] = m;
        const l2 = l2raw ?? l1; // "các cạnh AB, CD": loại dùng chung
        if (!laDoan(l1, undefined)) continue; // điểm đầu phải trên ĐOẠN (điểm tự do)
        if (X.includes(P) || Y.includes(P) || M === N || X.includes(M) || Y.includes(N)) continue;
        let ok = !laDoan(l2, undefined);
        if (!ok && tam && tam[1] === P) {
          const q = tam[2];
          const doi = (s: string) => {
            const i = q.indexOf(s[0]);
            const j = q.indexOf(s[1]);
            return i >= 0 && j >= 0 ? q[(i + 2) % 4] + q[(j + 2) % 4] : '';
          };
          const d = doi(X);
          ok = d.length === 2 && [d, d[1] + d[0]].includes(Y);
        }
        if (!ok) continue;
        out.push({
          ruleId: 'lineThroughPointCuts',
          clauseIds: [c.id],
          intents: [
            addPoint(M, { kind: 'onSegment', of: X, t: 0.35 }),
            addPoint(N, { kind: 'intersection', of: [P + M, Y] }),
            connect(M, N, 'segment'),
          ],
        });
      }
    }
    return out;
  },
};
