import type { ComponentType, ReactNode, RefAttributes } from 'react';
import type { ExcalidrawElement } from '../../types';
import type { State } from '../../core/scene/types';

/** Minimal client-safe response required by the geometry AI editor. */
export type AiFigureUiResult =
  | { ok: true; state: State }
  | { ok: false; message: string };

/**
 * Progress event emitted bởi streaming generator. Số token output đã sinh.
 * Editor dùng để hiển thị "Đang nhận N token..." realtime.
 */
export interface AiFigureProgress {
  /** Số token output đã sinh tính đến lúc emit. */
  tokens: number;
}

/**
 * Consumer-provided bridge to a server-side `generateFigure()` call.
 * Implementations must keep API credentials outside the browser bundle.
 *
 * `onProgress` là optional: nếu consumer dùng streaming endpoint (SSE),
 * forward chunk events vào đây. Non-streaming impl bỏ qua.
 */
export type GenerateGeometryFigure = (
  problem: string,
  options: {
    signal: AbortSignal;
    onProgress?: (info: AiFigureProgress) => void;
  },
) => Promise<AiFigureUiResult>;

/**
 * Kết quả trả về từ `restoreFileFromCustomData`. Chứa đủ thông tin để
 * consumer gọi `api.addFiles(...)`.
 */
export interface RestoredStampFile {
  fileId: string;
  dataURL: string;
  mimeType: 'image/svg+xml' | 'image/png';
}

/**
 * Tối thiểu mọi custom data của stamp cần có. Các stamp cụ thể (geometry,
 * latex, ...) extend interface này với fields riêng.
 */
export interface BaseStampCustomData {
  kind: string;
  version: number;
}

/**
 * Props mà mỗi StampHost nhận từ Whiteboard. Host component tự
 * quản lý state nội bộ (panel ref, undo stack, displayMode...) — main view
 * chỉ điều phối show/hide.
 */
export interface StampHostProps {
   
  api: any;
  /**
   * Element đang re-edit (double-click) hoặc null nếu đang tạo mới.
   * Host tự parse customData để load state ban đầu.
   */
  editingElement: { id: string; customData: unknown } | null;
  /** Đóng stamp panel (gọi sau khi insert hoặc khi user huỷ). */
  onClose: () => void;
  /** Dark theme flag. */
  isDark: boolean;
  /** Optional client-safe bridge for the geometry-2d AI prompt editor. */
  generateGeometryFigure?: GenerateGeometryFigure;
  /**
   * Chỉ geometry-2d dùng: phát snapshot hình đang dựng (debounced) để consumer
   * broadcast cho học sinh xem live. `null` = clear ghost (đã chèn / huỷ / rỗng).
   */
  onGeometryDraft?: (draft: import('./draftTypes').GeometryDraftPreview | null) => void;
}

/**
 * Imperative API mà main view truy cập qua ref:
 *   - tryInsert(): khi user click ra ngoài → auto-commit nếu valid.
 *     Trả về true nếu chèn thành công, false nếu chưa có nội dung.
 *   - hasContent(): có nội dung để chèn không.
 */
export interface StampHostHandle {
  tryInsert(): boolean;
  hasContent(): boolean;
}

/**
 * Component contract của Host. Chấp nhận cả `forwardRef` thông thường lẫn
 * `React.lazy(() => import('./host'))` (LazyExoticComponent forwards ref).
 */
export type StampHostComponent = ComponentType<
  StampHostProps & RefAttributes<StampHostHandle>
>;

/**
 * Định nghĩa 1 loại stamp. Mỗi stamp khai báo:
 *   - kind: unique string (khớp với customData.kind)
 *   - phím tắt + UI toolbar
 *   - cách nhận biết customData thuộc về stamp này (matchesCustomData)
 *   - cách re-render SVG từ customData (cho restore sau reload)
 *   - Host component: bọc trọn editor + left panel + insert logic
 *
 * Main view dispatch generic: `<stamp.Host ... />` — không cần biết kind.
 */
export interface StampType<TCustomData extends BaseStampCustomData = BaseStampCustomData> {
  /** Unique kind. VD: 'geometry', 'latex'. Phải khớp với customData.kind. */
  kind: string;
  /** Phím tắt mở/đóng stamp (lowercase, 1 ký tự). VD: 'g', 'l'. */
  shortcutKey: string;
  /** Chữ hiển thị overlay góc dưới nút toolbar (e.g. "G"). */
  toolbarLabel: string;
  /** Tooltip + aria-label của nút toolbar. */
  toolbarTitle: string;
  /** Icon SVG (ReactNode) trong nút toolbar. */
  toolbarIcon: ReactNode;
  /** Test data-testid cho nút toolbar (optional). */
  toolbarTestId?: string;

  /** Type guard: customData có thuộc về stamp này không. */
  matchesCustomData(data: unknown): data is TCustomData;

  /**
   * Re-render SVG từ customData. Dùng khi restore math-stamp file sau reload
   * page (Excalidraw không persist binary file payload, chỉ giữ fileId trong
   * element). SVG render với light palette (nét đậm) — Excalidraw tự đảo
   * màu trong dark mode qua CSS filter.
   */
  renderSvgFromCustomData(data: TCustomData): Promise<string>;

  /**
   * Regenerate file SVG/PNG cho element thuộc stamp này khi reload từ persisted
   * snapshot. Trả về `RestoredStampFile` để consumer gọi `api.addFiles`, hoặc
   * `null` nếu element không cần file (vd stamp chỉ là text overlay).
   *
   * Khi method này có mặt, `restoreMissingStampFiles` sẽ ưu tiên gọi method
   * này thay vì dùng `renderSvgFromCustomData`. Stamp tự chịu trách nhiệm lấy
   * `fileId` từ element và render file.
   */
  restoreFileFromCustomData?: (element: ExcalidrawElement) => Promise<RestoredStampFile | null>;

  /**
   * Host component bọc toàn bộ UI editing (panel + left panel + insert
   * handler). Whiteboard mount Host khi activeStamp khớp kind.
   */
  Host: StampHostComponent;

  /**
   * Đánh dấu stamp chưa production-ready. Consumer mặc định bỏ qua
   * (xem `DEFAULT_STAMPS` chỉ gồm stamp không `experimental`).
   */
  experimental?: boolean;
}
