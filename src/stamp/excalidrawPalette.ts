// 8 màu chính lấy từ Excalidraw DEFAULT_ELEMENT_STROKE_COLOR_PALETTE.
// Nguồn: @excalidraw/excalidraw — packages/excalidraw/colors.ts (top row chuẩn).
// Cần đồng bộ tay nếu Excalidraw đổi palette ở major bump.
export const STROKE_PALETTE = [
  '#1e1e1e', // black
  '#e03131', // red
  '#e8590c', // orange
  '#f08c00', // yellow
  '#2f9e44', // green
  '#1971c2', // blue
  '#9c36b5', // grape
  '#868e96', // gray
] as const;

export type StrokeColor = (typeof STROKE_PALETTE)[number];
