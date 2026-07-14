import { createStampFile } from './svgToStampFile';
import type { ExcalidrawElement } from '../../types';

// Excalidraw imperative API — không có public type chính xác. Giữ untyped ở
// boundary và yêu cầu caller pass đúng instance.
 
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
  /**
   * Khi re-edit: GIỮ size hiện tại của element trên canvas (kể cả user đã
   * resize bằng tay) thay vì reset về size SVG mới render. Dùng cho stamp có
   * "khung cố định" (geometry 2D/3D, graph) — size do user kiểm soát. KHÔNG
   * dùng cho latex (size phụ thuộc nội dung công thức → cần re-fit theo natural).
   * Mặc định false.
   */
  preserveExistingSize?: boolean;
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
 *   1. createStampFile(svg) → fileId + dataURL + kích thước
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
    // Re-edit. Với stamp khung-cố-định (preserveExistingSize): GIỮ size hiện
    // tại của element (kể cả user đã resize tay) thay vì reset về size SVG mới.
    // Giữ cạnh dài nhất của element cũ, áp tỉ lệ (aspect) của SVG mới → không
    // méo khi sửa nội dung làm đổi aspect. Element cũ chưa có size hợp lệ →
    // dùng natural.
    const old = elements.find((e) => e.id === editingId);
    const oldLongest =
      opts.preserveExistingSize && old ? Math.max(old.width ?? 0, old.height ?? 0) : 0;
    const newLongest = Math.max(width, height);
    const scale = oldLongest > 0 && newLongest > 0 ? oldLongest / newLongest : 1;
    const w = width * scale;
    const h = height * scale;
    // Chèn lại = "chèn sau" → đưa element lên TRÊN CÙNG (cuối mảng), giữ
    // nguyên id/vị trí/size. Index fractional cũ thành invalid ở vị trí mới
    // → updateScene tự syncInvalidIndices cấp index cao nhất.
    const updated = old
      ? [...elements.filter((e) => e.id !== editingId), { ...old, fileId, customData, width: w, height: h }]
      : elements;
    api.updateScene({ elements: updated, appState: clearAppStateAfterInsert() });
    return { fileId, width: w, height: h, elementId: editingId };
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
