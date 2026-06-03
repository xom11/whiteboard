// src/stamps/geometry-2d/ai/deterministic/confidence.ts
import { countGeometryKeywords } from './vocabulary';

const LABEL_WEIGHT: Record<string, number> = {
  triangle: 1,
  'triangle-right': 1,
  'triangle-isoceles': 1,
  'triangle-equilateral': 1,
  rectangle: 1,
  square: 1,
  parallelogram: 1,
  'on-segment': 1,
  'circle-cr': 2,
  midpoint: 1,
  altitude: 2,
  median: 1,
  bisector: 1,
  centroid: 1,
  orthocenter: 1,
  circumscribed: 1,
  inscribed: 1,
  tangent: 1,
  parallel: 1,
  perpendicular: 1,
};

export function scoreConfidence(prompt: string, matched: readonly string[]): number {
  const total = countGeometryKeywords(prompt);
  if (total === 0) {
    return matched.length > 0 ? 1.0 : 0;
  }
  let covered = 0;
  for (const label of matched) {
    covered += LABEL_WEIGHT[label] ?? 1;
  }
  return Math.min(1.0, covered / total);
}
