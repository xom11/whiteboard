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

export default function PlaygroundPage() {
  const [, setScene] = useState<ExcalidrawSceneSnapshot | null>(null);
  const [, setFiles] = useState<BinaryFiles>({});

  const handleSceneChange = useCallback((snapshot: ExcalidrawSceneSnapshot) => {
    setScene(snapshot);
  }, []);

  const handleFilesChange = useCallback((next: BinaryFiles) => {
    setFiles(next);
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
        onSceneChange={handleSceneChange}
        onFilesChange={handleFilesChange}
        generateGeometryFigure={generateGeometryFigure}
      />
    </div>
  );
}
