import type { LanguageRule3D, RuleContext3D, RuleMatch3D } from './_types';

// Rules are imported and added here as they are created (Tasks 9-11).
const RULES: LanguageRule3D[] = [];

export const ALL_RULES_3D: readonly LanguageRule3D[] = RULES.slice().sort(
  (a, b) => b.priority - a.priority,
);

export function runRules3D(ctx: RuleContext3D): RuleMatch3D[] {
  const results: RuleMatch3D[] = [];
  for (const rule of ALL_RULES_3D) {
    const problemHitsPattern = rule.patterns.some((p) => p.test(ctx.problem));
    if (!problemHitsPattern) continue;
    const matches = rule.match(ctx);
    results.push(...matches);
  }
  return results;
}
