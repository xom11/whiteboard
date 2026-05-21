// src/core/scene/kinds/labelOf.ts
import type { State } from '../types';

/**
 * Resolve một object id sang label hiển thị. Dùng trong describe() để show
 * tên đẹp ("AB") thay vì internal id ("p_1p_2"). Fallback về id nếu không
 * tìm thấy (vd state chưa truyền vào, hoặc ref chỉ tới object đã bị xoá).
 */
export function labelOf(id: string, state: State | undefined): string {
  return state?.objects[id]?.label ?? id;
}
