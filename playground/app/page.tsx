'use client';

import { useCallback, useState } from 'react';
import nextDynamic from 'next/dynamic';
import type {
  ExcalidrawSceneSnapshot,
  BinaryFiles,
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

  return (
    <div className="h-screen w-screen">
      <Whiteboard
        storageKey="playground"
        onSceneChange={handleSceneChange}
        onFilesChange={handleFilesChange}
      />
    </div>
  );
}
