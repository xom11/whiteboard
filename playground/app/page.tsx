'use client';

import { useCallback, useState } from 'react';
import {
  Whiteboard,
  type ExcalidrawSceneSnapshot,
  type BinaryFiles,
} from '../../src';

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
