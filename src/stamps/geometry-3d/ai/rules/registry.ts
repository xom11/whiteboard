import type { LanguageRule3D, RuleContext3D, RuleMatch3D } from './_types';
import { solidRule } from './solid';
import { pointOnEdgeRule } from './pointOnEdge';
import { planeNamedRule } from './planeNamed';
import { midpoint3dRule } from './midpoint3d';
import { centroid3dRule } from './centroid3d';
import { intersectionLineRule } from './intersectionLine';
import { crossSectionRule } from './crossSection';
import { linePlanePointRule } from './linePlanePoint';

const RULES: LanguageRule3D[] = [
  solidRule,            // priority 90
  midpoint3dRule,       // priority 62
  centroid3dRule,       // priority 61
  pointOnEdgeRule,      // priority 60
  intersectionLineRule, // priority 58
  crossSectionRule,     // priority 57
  linePlanePointRule,   // priority 56
  planeNamedRule,       // priority 55
];

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
