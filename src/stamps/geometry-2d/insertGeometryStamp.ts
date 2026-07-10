import { renderGeometrySvgFromState } from './render';
import { insertStampImage } from '../shared/insertImage';
import type { GeometryCustomData } from './types';

/**
 * Chèn một hình học (dạng `jsonState`) vào Excalidraw scene như một stamp
 * re-edit được. Dùng cho handoff "Mở trong bảng trắng": trang landing ghi
 * `jsonState` vào sessionStorage, trang /whiteboard đọc ra rồi gọi hàm này.
 *
 * `api` là `ExcalidrawImperativeAPI` — để `unknown` ở public API cho consumer
 * không phải khớp type Excalidraw.
 */
export async function insertGeometryStampIntoScene(
  api: unknown,
  jsonState: string,
): Promise<void> {
  const svgString = await renderGeometrySvgFromState(jsonState);

  await insertStampImage(api as any, {
    svgString,
    makeCustomData: (): GeometryCustomData => ({
      kind: 'geometry',
      version: 1,
      jsonState,
    }),
    editingElementId: null,
  });
}
