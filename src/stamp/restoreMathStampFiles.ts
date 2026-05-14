// Regenerate Excalidraw BinaryFiles for math-stamp elements after page reload.
//
// Why this exists: VideoRoom only persists the Excalidraw scene (elements +
// appState) to sessionStorage; binary files (the SVG dataURLs for our LaTeX /
// geometry stamps) are NOT persisted. After reload, elements still reference a
// fileId via customData, but the file payload is missing — Excalidraw renders
// the image area as an empty placeholder.
//
// We deterministically reproduce each stamp's SVG from its customData
// (LaTeX source / geometry creation log), then call api.addFiles using the
// element's existing fileId. The dataURL contents may differ slightly from
// the original (e.g. element ordering), but that's fine — Excalidraw keys on
// the fileId we provide, not on dataURL hash.

import { renderLatexToSvg } from './renderLatexToSvg';
import { renderGeometryToSvg } from './renderGeometryToSvg';
import { deserializeIntoBoard, type SerializedBoard } from './serializeBoard';
import { isMathStamp, type MathStampCustomData } from './types';

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

async function renderGeometrySvgFromState(jsonState: string): Promise<string> {
  const parsed = JSON.parse(jsonState) as SerializedBoard;
  const JXG = (await import('jsxgraph')).default;
  const container = document.createElement('div');
  const containerId = 'jxg_offscreen_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
  container.id = containerId;
  // Place off-screen but with real dimensions so JSXGraph renders correctly.
  container.style.cssText = 'position:absolute;top:-99999px;left:-99999px;width:400px;height:300px;visibility:hidden;pointer-events:none;';
  document.body.appendChild(container);
  let board: unknown = null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    board = (JXG as any).JSXGraph.initBoard(containerId, {
      boundingbox: parsed.bbox,
      axis: !!parsed.showAxis,
      grid: !!parsed.showGrid,
      showCopyright: false,
      showNavigation: false,
      keepAspectRatio: false,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    deserializeIntoBoard(board as any, parsed);
    // Allow render flush
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (board as any).update();
    return renderGeometryToSvg(container);
  } finally {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (board) (JXG as any).JSXGraph.freeBoard(board);
    } catch { /* ignore */ }
    if (container.parentNode) container.parentNode.removeChild(container);
  }
}

async function buildFileForStamp(
  fileId: string,
  customData: MathStampCustomData,
): Promise<AddFileRecord | null> {
  try {
    let svg: string;
    if (customData.kind === 'latex') {
      svg = await renderLatexToSvg(customData.src, customData.displayMode);
    } else if (customData.kind === 'geometry') {
      svg = await renderGeometrySvgFromState(customData.jsonState);
    } else {
      return null;
    }
    return { id: fileId, dataURL: svgToDataURL(svg), mimeType: 'image/svg+xml', created: Date.now() };
  } catch (err) {
    console.warn('Math-stamp restore failed for', fileId, err);
    return null;
  }
}

/**
 * Find math-stamp elements whose binary file is missing from Excalidraw, then
 * regenerate and add it. Idempotent: safe to call on every scene update.
 */
export async function restoreMissingMathStampFiles(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  api: any,
  elements: readonly ElementLike[],
): Promise<void> {
  if (!api) return;
  const existing = (typeof api.getFiles === 'function') ? api.getFiles() : {};
  const targets: Array<{ fileId: string; customData: MathStampCustomData }> = [];
  const seen = new Set<string>();
  for (const el of elements) {
    if (el.type !== 'image') continue;
    if (!el.fileId) continue;
    if (existing && existing[el.fileId]) continue;
    if (seen.has(el.fileId)) continue;
    if (!isMathStamp(el as { customData?: unknown })) continue;
    seen.add(el.fileId);
    targets.push({ fileId: el.fileId, customData: (el as { customData: MathStampCustomData }).customData });
  }
  if (targets.length === 0) return;
  const built = await Promise.all(targets.map(t => buildFileForStamp(t.fileId, t.customData)));
  const files = built.filter((f): f is AddFileRecord => !!f);
  if (files.length > 0) {
    try { api.addFiles(files); } catch (err) { console.warn('addFiles failed:', err); }
  }
}
