// Re-export union type + type guard từ registry để giữ tương thích với code
// đã import từ `src/stamp/types.ts`. Logic kiểm tra thật nằm trong các
// per-stamp guard ở `src/stamp/registry/*`.
//
// Khi thêm 1 loại stamp mới (vd chart):
//   - Tạo file registry/chart.tsx với guard riêng + StampType.
//   - Thêm chart vào union dưới đây (typescript không tự suy diễn theo registry
//     runtime nên union vẫn cần khai báo).
//   - Update isMathStamp để gọi guard mới.

import {
  isGeometryCustomData,
  type GeometryCustomData,
} from '../stamps/geometry-2d';
import {
  isLatexCustomData,
  type LatexCustomData,
} from '../stamps/latex';

export type MathStampCustomData = GeometryCustomData | LatexCustomData;

export function isMathStamp<T extends { customData?: unknown }>(
  element: T,
): element is T & { customData: MathStampCustomData } {
  return isGeometryCustomData(element.customData) || isLatexCustomData(element.customData);
}
