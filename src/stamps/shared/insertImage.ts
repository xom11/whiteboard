import { createStampFile } from './svgToStampFile';
import type { ExcalidrawElement } from '../../types';

// Excalidraw imperative API — không có public type chính xác. Giữ untyped ở
// boundary và yêu cầu caller pass đúng instance.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ExApi = any;

export interface InsertStampImageOptions {
  /** SVG string sẵn sàng render (geometry export hoặc katex render). */
  svgString: string;
  /**
   * Factory tạo customData. Mỗi stamp tự define shape (kind, version, jsonState).
   * width/height của element đã được Excalidraw track riêng — không cần lưu
   * trong customData (drop tại Tier D cleanup v0.20).
   */
  makeCustomData: () => unknown;
  /** Nếu đang re-edit, id của element cũ — sẽ update thay vì tạo mới. */
  editingElementId?: string | null;
  /** Vị trí gốc (lúc tạo mới). Bỏ qua khi đang re-edit. */
  position?: { x?: number; y?: number };
}

export interface InsertStampImageResult {
  fileId: string;
  width: number;
  height: number;
  /** Element id (mới hoặc cũ tuỳ flow). */
  elementId: string;
}

// Bỏ qua appState (selectedElementIds + croppingElementId) sau khi insert để
// Excalidraw không tự động bật crop mode cho element vừa thêm → tránh trigger
// crop intercept handler vô tận.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const clearAppStateAfterInsert = (): any => ({
  selectedElementIds: {},
  croppingElementId: null,
});

function buildStampImageElement(
  api: ExApi,
  fileId: string,
  width: number,
  height: number,
  customData: unknown,
  x?: number,
  y?: number,
) {
  const appState =
    api?.getAppState() ?? { scrollX: 0, scrollY: 0, width: 800, height: 600, zoom: { value: 1 } };
  const cx =
    x ?? appState.scrollX + (appState.width ?? 800) / 2 / (appState.zoom?.value ?? 1) - width / 2;
  const cy =
    y ?? appState.scrollY + (appState.height ?? 600) / 2 / (appState.zoom?.value ?? 1) - height / 2;
  return {
    type: 'image' as const,
    id: 'stamp_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
    x: cx,
    y: cy,
    width,
    height,
    fileId,
    customData,
    angle: 0,
    strokeColor: 'transparent',
    backgroundColor: 'transparent',
    fillStyle: 'solid',
    strokeWidth: 1,
    strokeStyle: 'solid',
    roughness: 0,
    opacity: 100,
    groupIds: [],
    roundness: null,
    seed: Math.floor(Math.random() * 1e9),
    versionNonce: 0,
    version: 1,
    isDeleted: false,
    boundElements: null,
    updated: Date.now(),
    link: null,
    locked: false,
    status: 'saved',
    scale: [1, 1],
  };
}

/**
 * Chèn (hoặc thay thế) một stamp image vào Excalidraw scene.
 *
 * Flow:
 *   1. svgToImageElement(svg) → fileId + dataURL + kích thước
 *   2. api.addFiles([...]) — đăng ký SVG dưới fileId
 *   3. Nếu editingElementId → update element cũ (giữ position, đổi fileId+customData+size)
 *      Còn lại → tạo image element mới ở giữa viewport (hoặc position truyền vào)
 *
 * Đoạn này trước đây nằm 2 chỗ (handleGeometryInsert + handleLatexInsert),
 * chỉ khác customData. Gộp lại để: thêm stamp type mới chỉ cần truyền
 * `makeCustomData`.
 */
export async function insertStampImage(
  api: ExApi,
  opts: InsertStampImageOptions,
): Promise<InsertStampImageResult> {
  const { dataURL, fileId, width, height, mimeType } = await createStampFile(opts.svgString);
  api.addFiles([{ id: fileId, dataURL, mimeType, created: Date.now() }]);
  const customData = opts.makeCustomData();

  const elements = api.getSceneElements() as readonly ExcalidrawElement[];
  const editingId = opts.editingElementId ?? null;

  if (editingId) {
    const updated = elements.map((e) =>
      e.id === editingId ? { ...e, fileId, customData, width, height } : e,
    );
    api.updateScene({ elements: updated, appState: clearAppStateAfterInsert() });
    return { fileId, width, height, elementId: editingId };
  }

  const newElement = buildStampImageElement(
    api,
    fileId,
    width,
    height,
    customData,
    opts.position?.x,
    opts.position?.y,
  );
  api.updateScene({
    elements: [...elements, newElement],
    appState: clearAppStateAfterInsert(),
  });
  return { fileId, width, height, elementId: newElement.id };
}
