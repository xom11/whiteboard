'use client';

import { useCallback, useState } from 'react';
import nextDynamic from 'next/dynamic';
import type {
  ExcalidrawSceneSnapshot,
  BinaryFiles,
  GenerateGeometryFigure,
} from '../../src';

// Excalidraw chạm `window` lúc load → không SSR/prerender được. ssr:false để
// chỉ render client. (Type imports ở trên bị erase nên an toàn cho server.)
const Whiteboard = nextDynamic(
  () => import('../../src').then((m) => m.Whiteboard),
  { ssr: false },
);

const HANDOFF_KEY = 'htbk:figure-handoff:v1';
const HANDOFF_TTL_MS = 5 * 60 * 1000;

/**
 * Nhận hình từ /ve-hinh: đọc ĐÚNG MỘT LẦN, xoá khoá ngay, bỏ qua bản ghi cũ hơn
 * 5 phút (một tab bỏ quên từ hôm trước không được bất ngờ chèn hình vào bảng
 * đang dạy).
 */
async function consumeHandoff(api: unknown) {
  let raw: string | null = null;
  try {
    raw = sessionStorage.getItem(HANDOFF_KEY);
    if (raw) sessionStorage.removeItem(HANDOFF_KEY);
  } catch {
    return;
  }
  if (!raw) return;

  let payload: { jsonState?: unknown; ts?: unknown };
  try {
    payload = JSON.parse(raw);
  } catch {
    return;
  }
  if (typeof payload.jsonState !== 'string' || typeof payload.ts !== 'number') return;
  if (Date.now() - payload.ts > HANDOFF_TTL_MS) return;

  // Dynamic import: root kéo Excalidraw, không prerender được ở module scope.
  // Dùng tên package (alias → ../src/index.ts) để chứng minh export root có thật.
  const { insertGeometryStampIntoScene } = await import('@xom11/whiteboard');
  await insertGeometryStampIntoScene(api, payload.jsonState);
}

export default function PlaygroundPage() {
  const [, setScene] = useState<ExcalidrawSceneSnapshot | null>(null);
  const [, setFiles] = useState<BinaryFiles>({});

  const handleSceneChange = useCallback((snapshot: ExcalidrawSceneSnapshot) => {
    setScene(snapshot);
  }, []);

  const handleFilesChange = useCallback((next: BinaryFiles) => {
    setFiles(next);
  }, []);

  const handleApi = useCallback((api: unknown) => {
    void consumeHandoff(api);
  }, []);

  // Bridge AI: gọi API route server-side (token ở server local, không ra browser).
  const generateGeometryFigure = useCallback<GenerateGeometryFigure>(
    async (problem, options) => {
      const res = await fetch('/api/generate-figure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ problem }),
        signal: options.signal,
      });
      return res.json();
    },
    [],
  );

  return (
    <div className="h-screen w-screen">
      <Whiteboard
        storageKey="playground"
        onApi={handleApi}
        onSceneChange={handleSceneChange}
        onFilesChange={handleFilesChange}
        generateGeometryFigure={generateGeometryFigure}
      />
    </div>
  );
}
