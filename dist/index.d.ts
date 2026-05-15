import * as react_jsx_runtime from 'react/jsx-runtime';
import { NonDeletedExcalidrawElement } from '@excalidraw/excalidraw/element/types';
export { ExcalidrawElement, NonDeletedExcalidrawElement } from '@excalidraw/excalidraw/element/types';
import { AppState, BinaryFiles } from '@excalidraw/excalidraw/types';
export { AppState, BinaryFiles } from '@excalidraw/excalidraw/types';
import { ReactNode, ForwardRefExoticComponent, RefAttributes } from 'react';

interface SyncableAppState {
    viewBackgroundColor: string;
    zoom: AppState['zoom'];
    scrollX: number;
    scrollY: number;
    gridSize: AppState['gridSize'] | null;
    theme: AppState['theme'];
}
interface ExcalidrawSceneSnapshot {
    elements: readonly NonDeletedExcalidrawElement[];
    appState: SyncableAppState;
}

/**
 * Props mà mỗi StampHost nhận từ ExcalidrawWhiteboardView. Host component tự
 * quản lý state nội bộ (panel ref, undo stack, displayMode...) — main view
 * chỉ điều phối show/hide.
 */
interface StampHostProps {
    api: any;
    /**
     * Element đang re-edit (double-click) hoặc null nếu đang tạo mới.
     * Host tự parse customData để load state ban đầu.
     */
    editingElement: {
        id: string;
        customData: unknown;
    } | null;
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
interface StampHostHandle {
    tryInsert(): boolean;
    hasContent(): boolean;
}
type StampHostComponent = ForwardRefExoticComponent<StampHostProps & RefAttributes<StampHostHandle>>;
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
interface StampType {
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
     * handler). ExcalidrawWhiteboardView mount Host khi activeStamp khớp kind.
     */
    Host: StampHostComponent;
}

interface ExcalidrawWhiteboardViewProps {
    role: 'teacher' | 'student';
    roomId: string;
    initialScene: ExcalidrawSceneSnapshot | null;
    remoteScene: ExcalidrawSceneSnapshot | null;
    remoteFiles?: BinaryFiles | null;
    onSceneChange: (snapshot: ExcalidrawSceneSnapshot) => void;
    onFilesChange: (files: BinaryFiles, newFileIds: string[]) => void;
    /** Excalidraw UI language. Defaults to 'vi-VN'. See @excalidraw/excalidraw locales. */
    langCode?: string;
    /**
     * Khi set, component tự lưu scene + files vào `sessionStorage[persistKey]` mỗi
     * lần thay đổi (teacher) và khôi phục khi mount. Math stamps tự regenerate SVG
     * qua `restoreMissingMathStampFiles`, nên storage chỉ cần chứa elements + appState
     * + raster files.
     */
    persistKey?: string;
    /**
     * Danh sách stamp đăng ký. Mỗi stamp khai báo phím tắt + toolbar button +
     * Host component (UI editing). Mặc định DEFAULT_STAMPS (geometry + latex).
     * Truyền `[...DEFAULT_STAMPS, customStamp]` để thêm stamp mới.
     */
    stamps?: ReadonlyArray<StampType>;
    /**
     * Callback nhận Excalidraw imperative API khi nó mount xong. Dùng cho test
     * (Playwright) hoặc consumer cần điều khiển scene ngoài luồng remote-sync.
     * Tránh expose API nếu không cần — phần lớn consumer chỉ cần onSceneChange.
     */
    onApi?: (api: any) => void;
}
declare function ExcalidrawWhiteboardView({ role, initialScene, remoteScene, remoteFiles, onSceneChange, onFilesChange, langCode, persistKey, stamps, onApi, }: ExcalidrawWhiteboardViewProps): react_jsx_runtime.JSX.Element;

declare function pickSyncableAppState(s: AppState): SyncableAppState;

export { type ExcalidrawSceneSnapshot, ExcalidrawWhiteboardView, type ExcalidrawWhiteboardViewProps, type SyncableAppState, pickSyncableAppState };
