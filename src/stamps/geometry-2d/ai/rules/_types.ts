// src/stamps/geometry-2d/ai/rules/_types.ts
//
// LanguageRule registry: mỗi construct family một module, emit IntentT[] từ
// regex tiếng Việt/Anh. Engine chạy theo priority, gom intent + clause đã phủ.
import type { IntentT } from '../intent';
import type { Clause } from '../deterministic/coverage';

export interface RuleContext {
  problem: string;
  clauses: readonly Clause[];
}

export interface RuleMatch {
  ruleId: string;
  /** id các clause mà match này "claim" (để computeCoverage tính phủ). */
  clauseIds: number[];
  intents: IntentT[];
}

export interface LanguageRule {
  id: string;
  /** cao chạy trước — giải overlap (vd 'trung trực' > 'trung điểm'). */
  priority: number;
  /**
   * Metadata ngôn ngữ (tài liệu). LƯU Ý: runRules KHÔNG lọc theo field này —
   * prefilter chạy patterns[] cho MỌI rule bất kể languages. Đừng giả định set
   * 'vi'/'en' sẽ skip rule khác ngôn ngữ (rule EN tự né qua patterns[] tiếng Anh).
   */
  languages: readonly ('vi' | 'en')[];
  /** prefilter nhanh trên toàn đề trước khi gọi match(). */
  patterns: readonly RegExp[];
  match(ctx: RuleContext): RuleMatch[];
}
