import type { AppState } from '@excalidraw/excalidraw/types';
import type { SyncableAppState } from './types';

/**
 * Nền bảng khi đang bật lớp giấy kẻ dòng. Đây là trạng thái HIỂN THỊ do
 * `PaperBackground` đặt tạm, không phải thuộc tính của scene — lưu nó đi
 * thì máy khác (hoặc chính máy này sau khi tắt tính năng) mở bảng ra sẽ
 * thấy nền trong suốt lộ cả trang web phía sau.
 */
const TRANSIENT_BACKGROUND = 'transparent';
const DEFAULT_BACKGROUND = '#ffffff';

export function pickSyncableAppState(s: AppState): SyncableAppState {
  return {
    viewBackgroundColor:
      s.viewBackgroundColor === TRANSIENT_BACKGROUND
        ? DEFAULT_BACKGROUND
        : s.viewBackgroundColor,
    zoom: s.zoom,
    scrollX: s.scrollX,
    scrollY: s.scrollY,
    gridSize: s.gridSize ?? null,
    theme: s.theme,
  };
}
