import type { LanguageRule3D, RuleContext3D, RuleMatch3D } from './_types';
import { solidRule } from './solid';
import { pointOnEdgeRule } from './pointOnEdge';
import { planeNamedRule } from './planeNamed';
import { midpoint3dRule } from './midpoint3d';
import { centroid3dRule } from './centroid3d';
import { intersectionLineRule } from './intersectionLine';
import { crossSectionRule } from './crossSection';
import { crossSectionParallelRule } from './crossSectionParallel';
import { linePlanePointRule } from './linePlanePoint';
import { projectionFootRule } from './projectionFoot';
import { perpLineToPlaneRule } from './perpLineToPlane';
import { perpPlaneToLineRule } from './perpPlaneToLine';
import { angleLinePlaneRule } from './angleLinePlane';
import { circumsphereRule } from './circumsphere';
import { insphereOfPyramidRule } from './insphereOfPyramid';
import { coneRule } from './cone';
import { cylinderRule } from './cylinder';
import { insphereCubeRule } from './insphereCube';
import { inscribedRoundSolidRule } from './inscribedRoundSolid';

const RULES: LanguageRule3D[] = [
  solidRule,                  // priority 90
  midpoint3dRule,             // priority 62
  centroid3dRule,             // priority 61
  pointOnEdgeRule,            // priority 60
  intersectionLineRule,       // priority 58
  crossSectionParallelRule,   // priority 58
  crossSectionRule,           // priority 57
  linePlanePointRule,         // priority 56
  planeNamedRule,             // priority 55
  projectionFootRule,         // priority 54
  perpLineToPlaneRule,        // priority 53
  perpPlaneToLineRule,        // priority 52
  angleLinePlaneRule,         // priority 51
  circumsphereRule,           // priority 50
  insphereOfPyramidRule,      // priority 50
  coneRule,                   // priority 49
  cylinderRule,               // priority 48
  insphereCubeRule,           // priority 47
  inscribedRoundSolidRule,    // priority 46
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
