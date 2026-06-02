'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  fileToImagePart,
  validateFile,
} from '../ai/vision/preprocess';
import type { ImagePart } from '../ai/providers/types';

export interface ImageDropZoneError {
  code: 'invalid-format' | 'too-large' | 'decode-fail';
  message: string;
}

export interface ImageDropZoneProps {
  value: ImagePart | null;
  onChange: (image: ImagePart | null) => void;
  onError?: (err: ImageDropZoneError) => void;
  disabled?: boolean;
}

export function ImageDropZone({ value, onChange, onError, disabled }: ImageDropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const inputId = 'image-drop-zone-input';

  // Build preview data URL from base64.
  useEffect(() => {
    if (!value) {
      setPreviewUrl(null);
      return;
    }
    setPreviewUrl(`data:${value.mediaType};base64,${value.base64}`);
  }, [value]);

  const handleFile = useCallback(
    async (file: File) => {
      if (disabled) return;
      const v = validateFile(file);
      if (!v.ok) {
        onError?.({ code: v.code, message: v.message });
        return;
      }
      try {
        const part = await fileToImagePart(file);
        onChange(part);
      } catch (e) {
        onError?.({
          code: 'decode-fail',
          message: e instanceof Error ? e.message : 'Không decode được ảnh',
        });
      }
    },
    [disabled, onChange, onError],
  );

  const onFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) void handleFile(file);
      e.target.value = '';
    },
    [handleFile],
  );

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files?.[0];
      if (file) void handleFile(file);
    },
    [handleFile],
  );

  const onPaste = useCallback(
    (e: React.ClipboardEvent<HTMLDivElement>) => {
      const items = Array.from(e.clipboardData.items);
      const imgItem = items.find((it) => it.kind === 'file' && it.type.startsWith('image/'));
      if (!imgItem) return;
      const file = imgItem.getAsFile();
      if (file) void handleFile(file);
    },
    [handleFile],
  );

  const onRemove = useCallback(() => onChange(null), [onChange]);

  if (value) {
    return (
      <div className="flex items-start gap-2 rounded border border-slate-300 bg-slate-50 p-2">
        <img
          src={previewUrl ?? ''}
          alt="Ảnh đề bài"
          className="h-20 w-20 rounded border border-slate-200 object-cover"
        />
        <div className="flex-1 text-xs text-slate-600">
          <div>Ảnh đề bài đã chọn</div>
          <div className="text-[10px] text-slate-500">{value.mediaType}</div>
        </div>
        <button
          type="button"
          onClick={onRemove}
          disabled={disabled}
          aria-label="Xoá ảnh"
          className="rounded bg-slate-200 px-2 py-1 text-xs text-slate-700 hover:bg-slate-300 disabled:opacity-50"
        >
          ×
        </button>
      </div>
    );
  }

  return (
    <div
      role="region"
      aria-label="Khu vực kéo thả ảnh"
      tabIndex={0}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={onDrop}
      onPaste={onPaste}
      className={
        'flex flex-col items-center justify-center gap-1 rounded border-2 border-dashed px-3 py-4 text-xs ' +
        (isDragOver ? 'border-emerald-500 bg-emerald-50' : 'border-slate-300 bg-slate-50') +
        (disabled ? ' opacity-50' : '')
      }
    >
      <p className="text-slate-600">Kéo thả ảnh đề bài vào đây, hoặc paste (Ctrl+V)</p>
      <label
        htmlFor={inputId}
        className="cursor-pointer rounded bg-emerald-600 px-3 py-1 text-[11px] font-medium text-white hover:bg-emerald-700"
      >
        Chọn ảnh
      </label>
      <input
        id={inputId}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="sr-only"
        onChange={onFileChange}
        disabled={disabled}
        aria-label="Chọn ảnh đề bài"
      />
      <p className="text-[10px] text-slate-500">PNG, JPEG, WEBP (tối đa 10 MB)</p>
    </div>
  );
}
