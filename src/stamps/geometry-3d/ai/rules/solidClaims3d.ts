import type { RuleContext3D } from './_types';
import type { Intent3DT } from '../intent';
import { residualHasGeometry } from './_shared';
import { refineSolid, type SolidHeadInfo } from '../solidRefine3d';

// Mệnh đề mà khối (solid intent CÓ refine) đã dựng đúng — dùng chung cho solidFacts3d (claim) và
// solidRule.chooseSolid (so độ phủ với nhánh khoiDaDien).
const METRIC = /(?:[A-Z]['′]?){2}\s*=\s*[^,.;]*|cạnh\s+bên|đường\s+thẳng|mặt\s+bên|Biết|biết|rằng|tất\s+cả\s+các\s+cạnh[^,.;]*/giu;

export function refineClaimedClauses(ctx: RuleContext3D, si: Intent3DT | undefined): number[] {
  if (!si || si.op !== 'solid' || !(si as { refine?: unknown }).refine) return [];
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
    // Bỏ đoạn đã hiểu TRƯỚC, rồi mới bỏ đẳng thức/từ nối (METRIC xoá "Mặt bên" sẽ làm đoạn
    // đã hiểu "Mặt bên SAC …" không còn khớp nguyên văn).
    let rest = text;
    for (const u of [...hit].sort((a, b) => b.length - a.length)) rest = rest.split(u).join(' ');
    if (!residualHasGeometry(rest.replace(METRIC, ' '), [])) ids.push(c.id);
  }
  return ids;
}
