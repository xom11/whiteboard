import React from 'react';
import { createRoot } from 'react-dom/client';
import {
  Whiteboard,
  type AiFigureUiResult,
  type AiFigureProgress,
} from '@xom11/whiteboard';
import './tailwind.css';

/**
 * Streaming adapter: gọi SSE endpoint, parse `data:` events,
 * forward `progress` events ra onProgress callback, return final result.
 */
async function generateGeometryFigure(
  problem: string,
  {
    signal,
    onProgress,
    currentDsl,
  }: { signal: AbortSignal; onProgress?: (info: AiFigureProgress) => void; currentDsl?: string },
): Promise<AiFigureUiResult> {
  try {
    const url = currentDsl
      ? '/api/generate-figure-refine/stream'
      : '/api/generate-figure/stream';
    const body = currentDsl
      ? JSON.stringify({ problem, currentDsl })
      : JSON.stringify({ problem });
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body,
      signal,
    });
    if (!res.ok || !res.body) {
      return { ok: false, message: `HTTP ${res.status} ${res.statusText}` };
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let finalResult: AiFigureUiResult | null = null;

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // SSE: events tách bằng "\n\n", mỗi event có "data: <json>" line
      let evIdx;
      while ((evIdx = buffer.indexOf('\n\n')) !== -1) {
        const eventBlock = buffer.slice(0, evIdx).trim();
        buffer = buffer.slice(evIdx + 2);
        if (!eventBlock.startsWith('data:')) continue;
        const payload = eventBlock.slice(5).trim();
        try {
          const data = JSON.parse(payload) as
            | { type: 'progress'; tokens: number }
            | { type: 'done'; result: AiFigureUiResult };
          if (data.type === 'progress') {
            onProgress?.({ tokens: data.tokens });
          } else if (data.type === 'done') {
            finalResult = data.result;
          }
        } catch {
          // ignore malformed payload
        }
      }
    }

    if (!finalResult) {
      return { ok: false, message: 'Stream kết thúc nhưng thiếu kết quả cuối' };
    }
    return finalResult;
  } catch (err) {
    if ((err as Error).name === 'AbortError') {
      return { ok: false, message: 'Đã huỷ' };
    }
    return { ok: false, message: (err as Error).message };
  }
}

function App() {
  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <Whiteboard generateGeometryFigure={generateGeometryFigure} />
    </div>
  );
}

const container = document.getElementById('root');
if (!container) throw new Error('No #root');
// StrictMode tắt: double-mount race với MiniBoard async JSXGraph init + lazy
// dynamic import gây flaky e2e trong headless Chromium (board container đôi
// khi rỗng sau cleanup-then-remount). Demo chỉ là E2E harness, không cần
// StrictMode warnings của React.
createRoot(container).render(<App />);
