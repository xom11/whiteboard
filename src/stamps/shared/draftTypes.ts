/**
 * Snapshot tiến trình dựng hình geometry-2d, phát ra trong lúc GV thao tác
 * (trước khi chèn ảnh thật). Consumer broadcast cho học sinh để vẽ ghost preview.
 * Toạ độ + kích thước tính theo board-units của Excalidraw.
 */
export interface GeometryDraftPreview {
  /** SVG markup của hình đang dựng (đã render từ state hiện tại). */
  svg: string;
  /** Board-units width (= intrinsic px của SVG ở zoom 1). */
  width: number;
  /** Board-units height. */
  height: number;
  /** Board-coord góc trên-trái nơi ảnh sẽ được chèn. */
  x: number;
  y: number;
  /** Counter tăng dần để consumer bỏ khung cũ khi kênh lossy reorder. */
  seq: number;
}
