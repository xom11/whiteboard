// Regenerate Excalidraw BinaryFiles for stamp elements after page reload.
//
// Why this exists: VideoRoom only persists the Excalidraw scene (elements +
// appState) to sessionStorage; binary files (the SVG dataURLs for stamp
// images) are NOT persisted. After reload, elements still reference a fileId
// via customData, but the file payload is missing — Excalidraw renders the
// image area as an empty placeholder.
//
// Strategy: tra registry để tìm StampType khớp customData.kind → gọi
// `renderSvgFromCustomData(customData)` → dataURL + addFiles dưới fileId cũ.
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
  type: string;
  fileId?: string | null;
  customData?: unknown;
}

interface AddFileRecord {
  id: string;
  dataURL: string;
  mimeType: 'image/svg+xml';
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
 * @param api Excalidraw imperative API.
 * @param elements Tất cả elements (sẽ filter type=image + có fileId + match registry).
 * @param stamps Registry. Default = DEFAULT_STAMPS.
 */
export async function restoreMissingStampFiles(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  api: any,
  elements: readonly ElementLike[],
  stamps: ReadonlyArray<StampType> = DEFAULT_STAMPS,
): Promise<void> {
  if (!api) return;
  const existing = (typeof api.getFiles === 'function') ? api.getFiles() : {};
  const targets: Array<{ fileId: string; customData: unknown; stamp: StampType }> = [];
  const seen = new Set<string>();
  for (const el of elements) {
    if (el.type !== 'image') continue;
    if (!el.fileId) continue;
    if (existing && existing[el.fileId]) continue;
    if (seen.has(el.fileId)) continue;
    const stamp = findStampForCustomData(el.customData, stamps);
    if (!stamp) continue;
    seen.add(el.fileId);
    targets.push({ fileId: el.fileId, customData: el.customData, stamp });
  }
  if (targets.length === 0) return;
  const built = await Promise.all(targets.map(t => buildFileForStamp(t.fileId, t.customData, t.stamp)));
  const files = built.filter((f): f is AddFileRecord => !!f);
  if (files.length > 0) {
    try { api.addFiles(files); } catch (err) { console.warn('addFiles failed:', err); }
  }
}

/** @deprecated Dùng `restoreMissingStampFiles` thay vì `restoreMissingMathStampFiles`. Sẽ xoá ở 0.6.0. */
export const restoreMissingMathStampFiles = restoreMissingStampFiles;
