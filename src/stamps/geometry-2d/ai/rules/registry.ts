// src/stamps/geometry-2d/ai/rules/registry.ts
//
// Đăng ký rule + engine chạy theo priority. Thêm construct mới = import module
// + thêm vào ALL_RULES (không sửa engine).
import type { LanguageRule, RuleContext, RuleMatch } from './_types';
import { triangleRule } from './triangle';

const RULES: readonly LanguageRule[] = [
  triangleRule,
];

/** Sắp xếp priority giảm dần (cao chạy trước) — tính 1 lần ở module load. */
export const ALL_RULES: readonly LanguageRule[] = [...RULES].sort(
  (a, b) => b.priority - a.priority,
);

export function runRules(ctx: RuleContext): RuleMatch[] {
  const matches: RuleMatch[] = [];
  for (const rule of ALL_RULES) {
    if (!rule.patterns.some((p) => p.test(ctx.problem))) continue;
    matches.push(...rule.match(ctx));
  }
  return matches;
}
