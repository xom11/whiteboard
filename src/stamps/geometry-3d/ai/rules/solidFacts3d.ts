import type { LanguageRule3D, RuleContext3D, RuleMatch3D } from './_types';
import { solidRule } from './solid';
import { refineClaimedClauses } from './solidClaims3d';

// Claim mệnh đề mà KHỐI đã dựng đúng (solidRefine3d.consumed): "Tam giác SAB đều và nằm trong mặt
// phẳng vuông góc với đáy", "Đường thẳng SA vuông góc với mặt phẳng đáy", "Hình chiếu của S … là
// trung điểm AB"… Trước đây solidRule chỉ claim mệnh đề ĐẦU nên các mệnh đề này bỏ trống dù hình
// đã tôn trọng chúng. Chỉ claim khi phần còn lại của mệnh đề (bỏ đoạn đã hiểu + đẳng thức độ dài)
// không còn từ khoá hình học — không nuốt nội dung chưa dựng.

export const solidFacts3dRule: LanguageRule3D = {
  id: 'solidFacts3d',
  priority: 89,
  languages: ['vi'],
  patterns: [/vuông\s*góc|⊥|hình\s+chiếu|đường\s+cao|đều|cân|vuông/u],
  match(ctx: RuleContext3D): RuleMatch3D[] {
    // Chỉ khi khối được CHỌN là khối có refine (nhánh khoiDaDien không tôn trọng các điều kiện đó).
    const ids = refineClaimedClauses(ctx, solidRule.match(ctx)[0]?.intents[0]);
    return ids.length ? [{ ruleId: this.id, clauseIds: ids, intents: [] }] : [];
  },
};
