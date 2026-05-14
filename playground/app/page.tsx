'use client';

import { useCallback, useState } from 'react';
import {
  ExcalidrawWhiteboardView,
  type ExcalidrawSceneSnapshot,
  type BinaryFiles,
} from '../../src';

export default function PlaygroundPage() {
  const [, setScene] = useState<ExcalidrawSceneSnapshot | null>(null);
  const [files, setFiles] = useState<BinaryFiles>({});

  const handleSceneChange = useCallback((snapshot: ExcalidrawSceneSnapshot) => {
    setScene(snapshot);
  }, []);

  const handleFilesChange = useCallback((next: BinaryFiles) => {
    setFiles(next);
  }, []);

  return (
    <div className="h-screen w-screen">
      <ExcalidrawWhiteboardView
        role="teacher"
        roomId="playground"
        initialScene={null}
        remoteScene={null}
        remoteFiles={files}
        onSceneChange={handleSceneChange}
        onFilesChange={handleFilesChange}
      />
    </div>
  );
}
