// src/stamps/geometry-2d/ai/rules/registry.ts
//
// Đăng ký rule + engine chạy theo priority. Thêm construct mới = import module
// + thêm vào ALL_RULES (không sửa engine).
import type { LanguageRule, RuleContext, RuleMatch } from './_types';
import { triangleRule } from './triangle';
import { quadRule } from './quad';
import { connectRule } from './connect';
import { midpointRule } from './midpoint';
import { perpBisectorRule } from './perpBisector';
import { cevianRule } from './cevian';
import { angleBisectorAngleRule } from './angleBisectorAngle';
import { centersRule } from './centers';
import { perpFootRule } from './perpFoot';
import { circleRadiusRule } from './circleRadius';
import { circleTriangleRule } from './circleTriangle';
import { tangentFromExtRule } from './tangentFromExt';
import { externalPointRule } from './externalPoint';
import { arcMidpointRule } from './arcMidpoint';
import { excenterRule } from './excenter';
import { parallelPerpRule } from './parallelPerp';
import { reflectionRule } from './reflection';
import { pointAtDistanceRule } from './pointAtDistance';
import { eulerLineRule } from './eulerLine';
import { radicalAxisRule } from './radicalAxis';
import { simsonRule } from './simson';
import { ninePointRule } from './ninePoint';
import { diameterCirclePairwiseRule } from './diameterCirclePairwise';
import { angleBisectorFootRule } from './angleBisectorFoot';
import { intersectionRule } from './intersection';
import { chordRule } from './chord';
import { incircleTangencyRule } from './incircleTangency';
import { altitudeDiameterCirclesRule } from './altitudeDiameterCircles';
import { diameterCircleCutsSidesRule } from './diameterCircleCutsSides';
import { circleDiameterRule } from './circleDiameter';
import { onCirclePointRule } from './onCirclePoint';
import { tangentAtRule } from './tangentAt';
import { onSegmentPointRule } from './onSegmentPoint';
import { lineCircleIntersectionRule } from './lineCircleIntersection';
import { incenterNamedTriangleRule } from './incenterNamedTriangle';
import { perpThroughCutsLinesRule } from './perpThroughCutsLines';
import { tangentRayRule } from './tangentRay';
import { pointOnTangentRayRule } from './pointOnTangentRay';
import { intersectRayRule } from './intersectRay';
import { tangentFromPointAtRule } from './tangentFromPointAt';

const RULES: readonly LanguageRule[] = [
  triangleRule,
  quadRule,
  connectRule,
  midpointRule,
  perpBisectorRule,
  cevianRule,
  angleBisectorAngleRule,
  centersRule,
  perpFootRule,
  circleRadiusRule,
  circleTriangleRule,
  tangentFromExtRule,
  externalPointRule,
  arcMidpointRule,
  excenterRule,
  parallelPerpRule,
  reflectionRule,
  pointAtDistanceRule,
  eulerLineRule,
  radicalAxisRule,
  simsonRule,
  ninePointRule,
  diameterCirclePairwiseRule,
  angleBisectorFootRule,
  intersectionRule,
  chordRule,
  incircleTangencyRule,
  altitudeDiameterCirclesRule,
  diameterCircleCutsSidesRule,
  circleDiameterRule,
  onCirclePointRule,
  tangentAtRule,
  onSegmentPointRule,
  lineCircleIntersectionRule,
  incenterNamedTriangleRule,
  perpThroughCutsLinesRule,
  tangentRayRule,
  pointOnTangentRayRule,
  intersectRayRule,
  tangentFromPointAtRule,
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
