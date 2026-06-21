import type { LanguageRule3D, RuleContext3D, RuleMatch3D } from './_types';
import { solidRule } from './solid';
import { pointOnEdgeRule } from './pointOnEdge';
import { planeNamedRule } from './planeNamed';

const RULES: LanguageRule3D[] = [solidRule, pointOnEdgeRule, planeNamedRule];

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
