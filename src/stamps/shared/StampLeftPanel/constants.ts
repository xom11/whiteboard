// src/stamps/shared/StampLeftPanel/constants.ts
//
// Desktop popover sizing chia sẻ giữa 3 stamp editor (geometry-2d, geometry-3d,
// graph-2d). Trước đây mỗi EditorPanel hardcode size riêng (640×540 cho 2D/graph,
// 800×600 cho 3D) → kích thước canvas nhỏ + không nhất quán. Gom vào constant
// 880×700 + cap responsive để dùng được trên màn nhỏ.

/** Tailwind class string áp cho outer popover của stamp editor (desktop). */
export const STAMP_PANEL_DESKTOP =
  'h-[700px] w-[880px] max-h-[85vh] max-w-[calc(100vw-280px)]';
