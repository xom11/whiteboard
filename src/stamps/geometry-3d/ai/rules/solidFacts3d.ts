import type { LanguageRule3D, RuleContext3D, RuleMatch3D } from './_types';
import { residualHasGeometry } from './_shared';
import { solidRule } from './solid';
import { refineSolid, type SolidHeadInfo } from '../solidRefine3d';

// Claim mệnh đề mà KHỐI đã dựng đúng (solidRefine3d.consumed): "Tam giác SAB đều và nằm trong mặt
// phẳng vuông góc với đáy", "Đường thẳng SA vuông góc với mặt phẳng đáy", "Hình chiếu của S … là
// trung điểm AB"… Trước đây solidRule chỉ claim mệnh đề ĐẦU nên các mệnh đề này bỏ trống dù hình
// đã tôn trọng chúng. Chỉ claim khi phần còn lại của mệnh đề (bỏ đoạn đã hiểu + đẳng thức độ dài)
// không còn từ khoá hình học — không nuốt nội dung chưa dựng.
const METRIC = /(?:[A-Z]['′]?){2}\s*=\s*[^,.;]*|cạnh\s+bên|đường\s+thẳng|mặt\s+bên|Biết|biết|rằng|tất\s+cả\s+các\s+cạnh[^,.;]*/giu;

export const solidFacts3dRule: LanguageRule3D = {
  id: 'solidFacts3d',
  priority: 89,
  languages: ['vi'],
  patterns: [/vuông\s*góc|⊥|hình\s+chiếu|đường\s+cao|đều|cân|vuông/u],
  match(ctx: RuleContext3D): RuleMatch3D[] {
    const sm = solidRule.match(ctx);
    const si = sm[0]?.intents[0];
    if (!si || si.op !== 'solid') return [];
    let head: SolidHeadInfo = { flavor: si.flavor, base: si.baseLabels, apex: si.apex, top: si.topLabels };
    // Tứ diện đã đổi vai (reorder) ⇒ dựng lại head GỐC theo thứ tự nhãn trong đề cho refineSolid.
    const tm = si.flavor === 'tetrahedron' ? /tứ\s+diện(?:\s+đều)?\s+([A-Z]{4})/u.exec(ctx.problem) : null;
    if (tm) head = { flavor: 'tetrahedron', base: [...tm[1]].slice(0, 3), apex: tm[1][3] };
    const { refine, consumed } = refineSolid(ctx.problem, head);
    if (!refine || consumed.length === 0) return [];
    const norm = (t: string) => t.replace(/\s+/gu, ' ');
    const ids: number[] = [];
    for (const c of ctx.clauses) {
      const text = norm(c.text);
      const hit = consumed.filter((u) => text.includes(u) || u.includes(text));
      if (!hit.length) continue;
      const rest = text.replace(METRIC, ' ');
      if (!residualHasGeometry(rest, hit.flatMap((u) => [u, ...u.split(/(?<=\.)/u)]))) ids.push(c.id);
    }
    return ids.length ? [{ ruleId: this.id, clauseIds: ids, intents: [] }] : [];
  },
};
