import type { LanguageRule3D, RuleContext3D, RuleMatch3D } from './_types';
import { addPoint3d } from './_shared';

// Single: "M là trung điểm của BC" | "M là trung điểm cạnh BC" | "M là trung điểm BC"
// Nhãn đỉnh có thể mang dấu phẩy (CC', A'B'): trước đây "trung điểm của CC'" bắt thành C–C
// (trung điểm = chính C — hình sai). `(?![\p{L}'′])` chặn cắt ngang nhãn có prime.
const SINGLE = /([A-Z])\s+là\s+trung\s+điểm\s+(?:của\s+)?(?:cạnh\s+)?([A-Z]['′]?)([A-Z]['′]?)(?![\p{L}'′])/u;

// Distributive: "M, N lần lượt là trung điểm AB, CD"
// `(?<!(?:,|và)\s*)`: "M, N, P lần lượt là trung điểm AB, BC, CA" KHÔNG được khớp đuôi
// "N, P … AB, BC" (lệch cặp → N = trung điểm AB, sai). Danh sách ≥3 điểm do pointList3d lo.
const DISTRIB =
  /(?<!(?:,|và)\s*)([A-Z])\s*,\s*([A-Z])\s+lần\s+lượt\s+là\s+trung\s+điểm\s+(?:(?:của|cạnh)\s+)?([A-Z]['′]?)([A-Z]['′]?)\s*,\s*([A-Z]['′]?)([A-Z]['′]?)(?![\p{L}'′])/u;

export const midpoint3dRule: LanguageRule3D = {
  id: 'midpoint3d',
  priority: 62,
  languages: ['vi'],
  patterns: [/trung\s+điểm/u],
  match(ctx: RuleContext3D): RuleMatch3D[] {
    const out: RuleMatch3D[] = [];
    for (const c of ctx.clauses) {
      const d = DISTRIB.exec(c.text);
      if (d) {
        out.push({
          ruleId: this.id,
          clauseIds: [c.id],
          intents: [
            addPoint3d(d[1], { kind: 'midpoint', p1: d[3], p2: d[4] }),
            addPoint3d(d[2], { kind: 'midpoint', p1: d[5], p2: d[6] }),
          ],
        });
        continue;
      }
      const m = SINGLE.exec(c.text);
      if (m) {
        out.push({
          ruleId: this.id,
          clauseIds: [c.id],
          intents: [addPoint3d(m[1], { kind: 'midpoint', p1: m[2], p2: m[3] })],
        });
      }
    }
    return out;
  },
};
