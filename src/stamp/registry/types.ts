import type { ForwardRefExoticComponent, ReactNode, RefAttributes } from 'react';

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

export type StampHostComponent = ForwardRefExoticComponent<
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
export interface StampType {
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
  matchesCustomData(data: unknown): boolean;

  /**
   * Re-render SVG từ customData. Dùng khi restore math-stamp file sau reload
   * page (Excalidraw không persist binary file payload, chỉ giữ fileId trong
   * element). SVG render với light palette (nét đậm) — Excalidraw tự đảo
   * màu trong dark mode qua CSS filter.
   */
  renderSvgFromCustomData(data: unknown): Promise<string>;

  /**
   * Host component bọc toàn bộ UI editing (panel + left panel + insert
   * handler). Whiteboard mount Host khi activeStamp khớp kind.
   */
  Host: StampHostComponent;
}
