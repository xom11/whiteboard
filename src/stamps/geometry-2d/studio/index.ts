// Subpath @xom11/whiteboard/studio — editor hình học 2D dùng được ngoài Excalidraw.
// KHÔNG re-export từ đây vào ../index.tsx (sẽ kéo editor vào bundle gốc).

export { GeometryStudio, type GeometryStudioProps } from './GeometryStudio';
export { geometryStateToJsonState } from './geometryStateToJsonState';
export { renderGeometrySvgFromState } from '../render';
