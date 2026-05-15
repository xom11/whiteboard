import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ExcalidrawWhiteboardView } from '../../../src';
import type {
  ExcalidrawElement,
  ExcalidrawSceneSnapshot,
  BinaryFiles,
} from '../../../src';

// E2E demo cho theme regen. Mount ExcalidrawWhiteboardView, expose API toàn cục
// để Playwright test:
//   - window.__exApi → Excalidraw imperative API (sau khi mounted)
//   - window.__setTheme(t) → đổi appState.theme ('light' | 'dark')
//   - window.__insertGeometry() → tạo image element với customData.geometry
//     mẫu (1 đoạn thẳng A-B). Bypass UI editor cho test deterministic.

declare global {
  interface Window {
    __exApi?: unknown;
    __setTheme?: (t: 'light' | 'dark') => void;
    __insertGeometry?: () => Promise<string>;
    __sceneInfo?: () => { elementCount: number; fileIds: string[]; fileById: Record<string, string> };
  }
}

const SAMPLE_GEOMETRY_STATE = JSON.stringify({
  bbox: [-10, 10, 10, -10],
  showAxis: false,
  showGrid: false,
  elements: [
    { id: 'j0', type: 'point', args: [-3, -2], attrs: { name: 'A', color: '@stroke', size: 3, fillColor: '@stroke', strokeColor: '@stroke' } },
    { id: 'j1', type: 'point', args: [4, 3], attrs: { name: 'B', color: '@stroke', size: 3, fillColor: '@stroke', strokeColor: '@stroke' } },
    { id: 'j2', type: 'segment', args: ['j0', 'j1'], attrs: { strokeColor: '@stroke', strokeWidth: 2 } },
  ],
});

export const ExcalidrawDemo: React.FC = () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const apiRef = useRef<any>(null);
  const [scene, setScene] = useState<ExcalidrawSceneSnapshot | null>(null);
  const [files, setFiles] = useState<BinaryFiles>({});

  const onApi = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (api: any) => {
      apiRef.current = api;
      window.__exApi = api;
    },
    [],
  );

  const onSceneChange = useCallback((snap: ExcalidrawSceneSnapshot) => {
    setScene(snap);
  }, []);

  const onFilesChange = useCallback((f: BinaryFiles, _newIds?: string[]) => {
    setFiles((prev) => ({ ...prev, ...f }));
  }, []);

  useEffect(() => {
    window.__setTheme = (t: 'light' | 'dark') => {
      const api = apiRef.current;
      if (!api) return;
      const appState = api.getAppState();
      api.updateScene({ appState: { ...appState, theme: t } });
    };
    window.__insertGeometry = async () => {
      const api = apiRef.current;
      if (!api) throw new Error('Excalidraw chưa sẵn sàng');
      // Render SVG via offscreen helper với theme hiện tại
      const isDark = api.getAppState()?.theme === 'dark';
      const { renderGeometrySvgFromState } = await import('../../../src/stamp/renderGeometryFromState');
      const svg = await renderGeometrySvgFromState(SAMPLE_GEOMETRY_STATE, isDark);
      const { insertStampImage } = await import('../../../src/core/insertStampImage');
      const res = await insertStampImage(api, {
        svgString: svg,
        makeCustomData: (w: number, h: number) => ({
          kind: 'geometry',
          version: 1,
          jsonState: SAMPLE_GEOMETRY_STATE,
          svgWidth: w,
          svgHeight: h,
        }),
        editingElementId: null,
      });
      return res.fileId;
    };
    window.__sceneInfo = () => {
      const api = apiRef.current;
      if (!api) return { elementCount: 0, fileIds: [], fileById: {} };
      const els = api.getSceneElements() ?? [];
      const fmap = api.getFiles?.() ?? {};
      const fileIds: string[] = [];
      const fileById: Record<string, string> = {};
      for (const el of els) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const fid = (el as any).fileId as string | undefined;
        if (fid && el.type === 'image') {
          fileIds.push(fid);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          fileById[fid] = (fmap[fid] as any)?.dataURL?.slice(0, 80) ?? '<missing>';
        }
      }
      return { elementCount: els.length, fileIds, fileById };
    };
  }, []);

  return (
    <div style={{ position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: 8, background: '#0f172a', color: '#fff', display: 'flex', gap: 8, alignItems: 'center', fontSize: 13 }}>
        <strong>Theme regen demo</strong>
        <button data-testid="set-light" onClick={() => window.__setTheme?.('light')}>Light</button>
        <button data-testid="set-dark" onClick={() => window.__setTheme?.('dark')}>Dark</button>
        <button data-testid="insert-geom" onClick={() => window.__insertGeometry?.()}>Insert sample stamp</button>
        <span data-testid="scene-count">elements: {scene?.elements.length ?? 0}</span>
        <span data-testid="file-count">files: {Object.keys(files).length}</span>
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>
        <ExcalidrawWhiteboardView
          role="teacher"
          roomId="demo-room"
          initialScene={null}
          remoteScene={null}
          onSceneChange={onSceneChange}
          onFilesChange={onFilesChange}
          onApi={onApi}
        />
      </div>
    </div>
  );
};
