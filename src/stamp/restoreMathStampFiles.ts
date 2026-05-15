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

import { DEFAULT_STAMPS, findStampForCustomData } from './registry';
import type { StampRenderCtx, StampType } from './registry/types';
import { svgToImageElement } from './svgToImageElement';

interface ElementLike {
  id: string;
  type: string;
  fileId?: string | null;
  customData?: unknown;
  version?: number;
  versionNonce?: number;
  updated?: number;
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
  ctx: StampRenderCtx,
): Promise<AddFileRecord | null> {
  try {
    const svg = await stamp.renderSvgFromCustomData(customData, ctx);
    return { id: fileId, dataURL: svgToDataURL(svg), mimeType: 'image/svg+xml', created: Date.now() };
  } catch (err) {
    console.warn('Stamp restore failed for', fileId, '(' + stamp.kind + ')', err);
    return null;
  }
}

// Deterministic hash 16 hex từ string (FNV-1a 2x chained). Dùng để derive
// fileId ổn định theo (customData + theme) → cycle dark↔light tái dùng cùng
// fileId thay vì leak file mới mỗi lần switch.
function stableShortHash(input: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0xcbf29ce4;
  for (let i = 0; i < input.length; i++) {
    const c = input.charCodeAt(i);
    h1 ^= c;
    h1 = Math.imul(h1, 0x01000193);
    h2 ^= c + i;
    h2 = Math.imul(h2, 0x100000001b3 & 0xffffffff);
  }
  return (h1 >>> 0).toString(16).padStart(8, '0') + (h2 >>> 0).toString(16).padStart(8, '0');
}

function themedFileId(stampKind: string, customData: unknown, ctx: StampRenderCtx): string {
  const key = stampKind + '|' + (ctx.isDark ? 'd' : 'l') + '|' + JSON.stringify(customData);
  return stampKind + '-' + (ctx.isDark ? 'd' : 'l') + '-' + stableShortHash(key);
}

// Generate file với fileId deterministic theo theme + customData. Dùng khi force
// regenerate vì Excalidraw `addFiles` skip nếu fileId đã tồn tại — fileId mới
// cho mỗi theme đảm bảo dataURL mới được nạp; lặp cùng theme tái dùng fileId.
async function rebuildStampFileWithNewId(
  customData: unknown,
  stamp: StampType,
  ctx: StampRenderCtx,
): Promise<{ fileId: string; dataURL: string } | null> {
  try {
    const svg = await stamp.renderSvgFromCustomData(customData, ctx);
    const { dataURL } = await svgToImageElement(svg);
    const fileId = themedFileId(stamp.kind, customData, ctx);
    return { fileId, dataURL };
  } catch (err) {
    console.warn('Stamp rebuild (force) failed for stamp.kind=' + stamp.kind, err);
    return null;
  }
}

export interface RestoreStampFilesOptions {
  /** Re-render mọi stamp file kể cả nếu đã có sẵn trong Excalidraw. Dùng khi
   * theme thay đổi và cần regenerate để khớp dark/light canvas. */
  forceRegenerate?: boolean;
  /** Theme context truyền vào `renderSvgFromCustomData`. Mặc định light. */
  ctx?: StampRenderCtx;
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
export async function restoreMissingMathStampFiles(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  api: any,
  elements: readonly ElementLike[],
  stamps: ReadonlyArray<StampType> = DEFAULT_STAMPS,
  options: RestoreStampFilesOptions = {},
): Promise<void> {
  if (!api) return;
  const { forceRegenerate = false, ctx = { isDark: false } } = options;
  const existing = (typeof api.getFiles === 'function') ? api.getFiles() : {};
  const targets: Array<{ fileId: string; customData: unknown; stamp: StampType }> = [];
  const seen = new Set<string>();
  for (const el of elements) {
    if (el.type !== 'image') continue;
    if (!el.fileId) continue;
    if (!forceRegenerate && existing && existing[el.fileId]) continue;
    if (seen.has(el.fileId)) continue;
    const stamp = findStampForCustomData(el.customData, stamps);
    if (!stamp) continue;
    seen.add(el.fileId);
    targets.push({ fileId: el.fileId, customData: el.customData, stamp });
  }
  if (targets.length === 0) return;

  if (forceRegenerate) {
    // Excalidraw `addFiles` skip fileId đã tồn tại → buộc phải tạo fileId mới
    // và update element references. Dùng cho theme switch.
    const oldToNew: Record<string, string> = {};
    const newFiles: AddFileRecord[] = [];
    for (const t of targets) {
      const built = await rebuildStampFileWithNewId(t.customData, t.stamp, ctx);
      if (!built) continue;
      oldToNew[t.fileId] = built.fileId;
      newFiles.push({ id: built.fileId, dataURL: built.dataURL, mimeType: 'image/svg+xml', created: Date.now() });
    }
    if (newFiles.length === 0) return;
    try { api.addFiles(newFiles); } catch (err) { console.warn('addFiles failed:', err); }
    try {
      const current = (typeof api.getSceneElements === 'function' ? api.getSceneElements() : elements) as readonly ElementLike[];
      const updated = current.map((el) => {
        if (el.type === 'image' && el.fileId && oldToNew[el.fileId]) {
          return {
            ...el,
            fileId: oldToNew[el.fileId],
            version: (el.version ?? 1) + 1,
            versionNonce: Math.floor(Math.random() * 1e9),
            updated: Date.now(),
          };
        }
        return el;
      });
      api.updateScene({ elements: updated });
    } catch (err) {
      console.warn('updateScene after force regenerate failed:', err);
    }
    return;
  }

  const built = await Promise.all(targets.map(t => buildFileForStamp(t.fileId, t.customData, t.stamp, ctx)));
  const files = built.filter((f): f is AddFileRecord => !!f);
  if (files.length > 0) {
    try { api.addFiles(files); } catch (err) { console.warn('addFiles failed:', err); }
  }
}
