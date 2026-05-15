import { geometryStamp } from '../../stamp/registry/geometry';
import { latexStamp } from '../../stamp/registry/latex';
import type { StampType } from './types';

export { geometryStamp, type GeometryCustomData, isGeometryCustomData } from '../../stamp/registry/geometry';
export { latexStamp, type LatexCustomData, isLatexCustomData } from '../../stamp/registry/latex';
export type { StampType, BaseStampCustomData } from './types';

/**
 * Set stamp mặc định dùng trong Whiteboard. Consumer có thể
 * truyền custom array để bật/tắt từng stamp hoặc đăng ký stamp mới.
 *
 * Để thêm 1 stamp mới (vd chart):
 *   1. Tạo `src/stamp/registry/chart.tsx` với StampType object.
 *   2. Add vào DEFAULT_STAMPS ở dưới, HOẶC consumer truyền
 *      `<Whiteboard stamps={[...DEFAULT_STAMPS, chartStamp]} />`.
 */
export const DEFAULT_STAMPS: ReadonlyArray<StampType> = Object.freeze([geometryStamp, latexStamp]);

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

/** isMathStamp version dựa trên registry — replace logic hardcode trong types.ts. */
export function isStampElement<T extends { customData?: unknown }>(
  element: T,
  stamps: ReadonlyArray<StampType> = DEFAULT_STAMPS,
): boolean {
  return findStampForCustomData(element.customData, stamps) !== null;
}
