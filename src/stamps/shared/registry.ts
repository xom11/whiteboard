import { geometryStamp } from '../geometry-2d';
import { latexStamp } from '../latex';
import { geometry3dStamp } from '../geometry-3d';
import { graph2dStamp } from '../graph-2d';
import type { StampType } from './types';

export { geometryStamp, type GeometryCustomData } from '../geometry-2d';
export { latexStamp, type LatexCustomData } from '../latex';
export { geometry3dStamp, type Geometry3DCustomData } from '../geometry-3d';
export { graph2dStamp, type Graph2DCustomData } from '../graph-2d';
export type { StampType, BaseStampCustomData } from './types';

/** Stamp ổn định, sẵn sàng production. */
export const STABLE_STAMPS: ReadonlyArray<StampType> = Object.freeze([
  geometryStamp,
  latexStamp,
]);

/** Stamp experimental — chưa ổn định cho production. Consumer phải opt-in. */
export const EXPERIMENTAL_STAMPS: ReadonlyArray<StampType> = Object.freeze([
  geometry3dStamp,
  graph2dStamp,
]);

/** Tất cả stamp (stable + experimental). */
export const ALL_STAMPS: ReadonlyArray<StampType> = Object.freeze([
  ...STABLE_STAMPS,
  ...EXPERIMENTAL_STAMPS,
]);

export const DEFAULT_STAMPS: ReadonlyArray<StampType> = ALL_STAMPS;

/** Tìm stamp tương ứng với customData của element. null nếu không match. */
export function findStampForCustomData(
  data: unknown,
  stamps: ReadonlyArray<StampType> = DEFAULT_STAMPS,
): StampType | null {
  for (const s of stamps) {
    if (s.matchesCustomData(data)) return s;
  }
  return null;
}

/** isMathStamp version dựa trên registry. */
export function isStampElement<T extends { customData?: unknown }>(
  element: T,
  stamps: ReadonlyArray<StampType> = DEFAULT_STAMPS,
): boolean {
  return findStampForCustomData(element.customData, stamps) !== null;
}
