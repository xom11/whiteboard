// src/stamps/geometry-2d/ai/intent-builders/add-point/index.ts
//
// Dispatcher cho op add-point: map constraint.kind → builder (Phase 2b, #45).
// ADD_POINT_BUILDERS được export cho Phase 6 matrix script.

import type { BuildState } from '../_types';
import type { AddPointIntentT } from '../../intent';
import { buildMidpoint } from './midpoint';
import { buildOnPerpBisector } from './onPerpBisector';
import { buildPerpFoot } from './perpFoot';
import { buildCentroid, buildCircumcenter, buildIncenter, buildOrthocenter, buildExcenter } from './centers';
import { buildIntersection, buildSecondIntersection, buildCircleIntersection, buildCircleSecondIntersection } from './intersections';
import { buildTangencyPoint, buildTangentPoint } from './tangency';
import { buildOnSegment, buildFree } from './onSegment-free';
import { buildAngleBisectorFoot } from './angleBisectorFoot';
import { buildExternalAngleBisectorFoot } from './externalAngleBisectorFoot';
import { buildRightAngleViewing } from './rightAngleViewing';
import { buildArcMidpoint } from './arcMidpoint';
import { buildReflectPoint, buildReflectLine } from './reflect';
import { buildPointAtDistance } from './pointAtDistance';
import { buildCommonTangentPoint } from './commonTangentPoint';
import { buildExternalToCircle } from './externalToCircle';
import { buildOnCircle } from './onCircle';
import { buildMixtilinearPoint } from './mixtilinear';

export const ADD_POINT_BUILDERS: Record<string, (s: BuildState, intent: AddPointIntentT) => void> = {
  midpoint: buildMidpoint, onPerpBisector: buildOnPerpBisector, perpFoot: buildPerpFoot,
  centroid: buildCentroid, circumcenter: buildCircumcenter, incenter: buildIncenter,
  orthocenter: buildOrthocenter, excenter: buildExcenter,
  intersection: buildIntersection, secondIntersection: buildSecondIntersection, circleIntersection: buildCircleIntersection,
  circleSecondIntersection: buildCircleSecondIntersection,
  tangencyPoint: buildTangencyPoint, tangentPoint: buildTangentPoint,
  onSegment: buildOnSegment, free: buildFree,
  angleBisectorFoot: buildAngleBisectorFoot, externalAngleBisectorFoot: buildExternalAngleBisectorFoot,
  rightAngleViewing: buildRightAngleViewing,
  arcMidpoint: buildArcMidpoint, reflectPoint: buildReflectPoint, reflectLine: buildReflectLine,
  pointAtDistance: buildPointAtDistance,
  commonTangentPoint: buildCommonTangentPoint,
  externalToCircle: buildExternalToCircle,
  onCircle: buildOnCircle,
  mixtilinearPoint: buildMixtilinearPoint,
};

export const buildAddPoint = (s: BuildState, intent: AddPointIntentT): void => {
  const fn = ADD_POINT_BUILDERS[intent.constraint.kind];
  if (fn) fn(s, intent);
};
