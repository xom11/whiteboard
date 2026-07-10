import { serializeBoard } from '../serialize';
import { DEFAULT_VIEW_2D, type State } from '../../../core/scene';

/**
 * `State` → chuỗi `jsonState` dùng được cho `deserializeBoard`,
 * `renderGeometrySvgFromState`, `GeometryStudio.initialJsonState` và
 * `insertGeometryStampIntoScene`.
 *
 * Tồn tại vì `serializeBoard` đòi thêm `View2D` mà consumer (trang landing,
 * chỉ có `state` từ `handleGenerateFigure`) không cầm sẵn.
 */
export function geometryStateToJsonState(state: State): string {
  const view = state.meta.domain === '2d' ? state.meta.view : DEFAULT_VIEW_2D;
  return serializeBoard(state, view);
}
