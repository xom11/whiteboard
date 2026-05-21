// Regenerate Excalidraw BinaryFiles for stamp elements after page reload.
//
// Why this exists: VideoRoom only persists the Excalidraw scene (elements +
// appState) to sessionStorage; binary files (the SVG dataURLs for stamp
// images) are NOT persisted. After reload, elements still reference a fileId
// via customData, but the file payload is missing — Excalidraw renders the
// image area as an empty placeholder.
//
// Strategy: tra registry để tìm StampType khớp customData.kind. Nếu stamp có
// `restoreFileFromCustomData`, gọi trực tiếp với full element (stamp tự lấy
// fileId + render). Ngược lại, fallback sang `renderSvgFromCustomData` (path
// cũ: filter type=image + fileId + kiểm tra existing files).
//
// Excalidraw key trên fileId chứ không phải hash dataURL nên nếu kết quả
// render có sai khác nhỏ (vd thứ tự element) cũng không ảnh hưởng.
//
// Theme: stamps được render với LIGHT palette (nét đậm). Excalidraw áp dụng
// `filter: invert(...)` lên canvas trong dark mode → nét tự đảo sáng. KHÔNG
// cần force regenerate khi user toggle theme.

import { DEFAULT_STAMPS, findStampForCustomData } from './registry';
import type { StampType } from './types';

interface ElementLike {
  id: string;
  type?: string;
  fileId?: string | null;
  customData?: unknown;
}

interface AddFileRecord {
  id: string;
  dataURL: string;
  mimeType: string;
  created: number;
}

function svgToDataURL(svg: string): string {
  const utf8 = unescape(encodeURIComponent(svg));
  return 'data:image/svg+xml;base64,' + btoa(utf8);
}

async function buildFileForStamp(
  fileId: string,
  customData: unknown,
  stamp: StampType,
): Promise<AddFileRecord | null> {
  try {
    if (!stamp.matchesCustomData(customData)) return null;
    const svg = await stamp.renderSvgFromCustomData(customData);
    return { id: fileId, dataURL: svgToDataURL(svg), mimeType: 'image/svg+xml', created: Date.now() };
  } catch (err) {
    console.warn('Stamp restore failed for', fileId, '(' + stamp.kind + ')', err);
    return null;
  }
}

/**
 * Find stamp elements whose binary file is missing from Excalidraw, then
 * regenerate via registry dispatch. Idempotent: safe to call on every scene
 * update.
 *
 * Stamps that implement `restoreFileFromCustomData` are handled via the new
 * registry-driven path (stamp receives the full element and returns the file
 * record). Stamps that only implement `renderSvgFromCustomData` use the legacy
 * path (filter type=image + fileId, skip already-present files).
 *
 * @param api Excalidraw imperative API.
 * @param elements Tất cả elements trong scene.
 * @param stamps Registry. Default = DEFAULT_STAMPS.
 */
export async function restoreMissingStampFiles(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  api: any,
  elements: readonly ElementLike[],
  stamps: ReadonlyArray<StampType> = DEFAULT_STAMPS,
): Promise<void> {
  if (!api) return;

  const filesToAdd: AddFileRecord[] = [];

  // --- New registry-driven path: stamp.restoreFileFromCustomData ---
  const newPathHandled = new Set<string>();
  for (const el of elements) {
    const stamp = findStampForCustomData(el.customData, stamps);
    if (!stamp?.restoreFileFromCustomData) continue;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const restored = await stamp.restoreFileFromCustomData(el as any);
    if (!restored) continue;
    newPathHandled.add(el.id);
    filesToAdd.push({
      id: restored.fileId,
      dataURL: restored.dataURL,
      mimeType: restored.mimeType,
      created: Date.now(),
    });
  }

  // --- Legacy path: stamp.renderSvgFromCustomData (type=image + fileId filter) ---
  const existing = (typeof api.getFiles === 'function') ? api.getFiles() : {};
  const seen = new Set<string>();
  for (const el of elements) {
    if (newPathHandled.has(el.id)) continue;
    if (el.type !== 'image') continue;
    if (!el.fileId) continue;
    if (existing && existing[el.fileId]) continue;
    if (seen.has(el.fileId)) continue;
    const stamp = findStampForCustomData(el.customData, stamps);
    if (!stamp) continue;
    seen.add(el.fileId);
    const built = await buildFileForStamp(el.fileId, el.customData, stamp);
    if (built) filesToAdd.push(built);
  }

  if (filesToAdd.length > 0) {
    try { api.addFiles(filesToAdd); } catch (err) { console.warn('addFiles failed:', err); }
  }
}
