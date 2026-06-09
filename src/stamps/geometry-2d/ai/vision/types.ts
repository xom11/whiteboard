// src/stamps/geometry-2d/ai/vision/types.ts
//
// Neutral types cho image OCR. Module LLM cũ đã xoá — vision path chỉ cần
// ImagePart, không phụ thuộc gì khác.

export interface ImagePart {
  /** Whitelist 3 format browser decode native được. */
  mediaType: 'image/png' | 'image/jpeg' | 'image/webp';
  /** Base64 không bao gồm "data:image/...;base64," prefix. */
  base64: string;
}
