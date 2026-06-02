// src/stamps/geometry-2d/ai/vision/preprocess.ts
//
// Pure-ish browser utilities cho image: validate, infer media type, downscale,
// encode base64. fileToImagePart() là entry point chính cho UI.

import type { ImagePart } from '../providers/types';

export const MAX_EDGE_PX = 2048;
export const MAX_RAW_BYTES = 10 * 1024 * 1024; // 10 MB
export const MAX_ENCODED_BYTES = 4 * 1024 * 1024; // 4 MB sau base64 — cap budget cho Anthropic

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const;
type AllowedType = (typeof ALLOWED_TYPES)[number];

export type ValidationResult =
  | { ok: true; mediaType: AllowedType }
  | { ok: false; code: 'invalid-format' | 'too-large'; message: string };

export function inferMediaType(file: File): AllowedType | null {
  const t = file.type.toLowerCase();
  if ((ALLOWED_TYPES as readonly string[]).includes(t)) return t as AllowedType;
  return null;
}

export function validateFile(file: File): ValidationResult {
  const mt = inferMediaType(file);
  if (mt == null) {
    return {
      ok: false,
      code: 'invalid-format',
      message: 'Chỉ hỗ trợ PNG, JPEG, WEBP.',
    };
  }
  if (file.size > MAX_RAW_BYTES) {
    return {
      ok: false,
      code: 'too-large',
      message: `Ảnh quá lớn (> ${Math.round(MAX_RAW_BYTES / 1024 / 1024)} MB). Crop hoặc resize trước.`,
    };
  }
  return { ok: true, mediaType: mt };
}

/**
 * Convert File → ImagePart. Auto-downscale nếu max edge > MAX_EDGE_PX.
 * Throws nếu file invalid hoặc decode fail.
 */
export async function fileToImagePart(file: File): Promise<ImagePart> {
  const v = validateFile(file);
  if (!v.ok) throw new Error(v.message);

  // Decode + có thể downscale qua canvas.
  const bitmap = await createImageBitmap(file);
  const { width, height } = bitmap;
  const maxEdge = Math.max(width, height);
  const scale = maxEdge > MAX_EDGE_PX ? MAX_EDGE_PX / maxEdge : 1;
  const targetW = Math.round(width * scale);
  const targetH = Math.round(height * scale);

  const canvas =
    typeof OffscreenCanvas !== 'undefined'
      ? new OffscreenCanvas(targetW, targetH)
      : Object.assign(document.createElement('canvas'), { width: targetW, height: targetH });
  const ctx = canvas.getContext('2d') as
    | CanvasRenderingContext2D
    | OffscreenCanvasRenderingContext2D
    | null;
  if (!ctx) throw new Error('Không tạo được canvas 2D context');
  ctx.drawImage(bitmap, 0, 0, targetW, targetH);
  bitmap.close();

  // Encode: PNG nếu input PNG, JPEG cho jpeg/webp (downscale → re-encode JPEG nhỏ hơn).
  const outputType: AllowedType =
    v.mediaType === 'image/png' ? 'image/png' : 'image/jpeg';
  const blob = await canvasToBlob(canvas, outputType, 0.92);

  // Nếu vẫn quá cap encoded → re-encode JPEG quality thấp hơn 1 lần.
  let finalBlob = blob;
  if (blob.size > MAX_ENCODED_BYTES && outputType === 'image/jpeg') {
    finalBlob = await canvasToBlob(canvas, 'image/jpeg', 0.7);
  }

  const base64 = await blobToBase64(finalBlob);
  return { mediaType: outputType, base64 };
}

async function canvasToBlob(
  canvas: HTMLCanvasElement | OffscreenCanvas,
  type: AllowedType,
  quality: number,
): Promise<Blob> {
  if ('convertToBlob' in canvas) {
    return canvas.convertToBlob({ type, quality });
  }
  return new Promise((resolve, reject) => {
    (canvas as HTMLCanvasElement).toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Canvas encode fail'))),
      type,
      quality,
    );
  });
}

async function blobToBase64(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer();
  // btoa cần string → dùng chunked conversion cho Uint8Array.
  let binary = '';
  const bytes = new Uint8Array(buf);
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return typeof btoa === 'function' ? btoa(binary) : Buffer.from(binary, 'binary').toString('base64');
}
