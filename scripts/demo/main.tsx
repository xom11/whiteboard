import React from 'react';
import { createRoot } from 'react-dom/client';
import { Whiteboard, type AiFigureUiResult } from '@xom11/whiteboard';
import './tailwind.css';

async function generateGeometryFigure(
  problem: string,
  { signal }: { signal: AbortSignal },
): Promise<AiFigureUiResult> {
  try {
    const res = await fetch('/api/generate-figure', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ problem }),
      signal,
    });
    if (!res.ok) {
      return { ok: false, message: `HTTP ${res.status} ${res.statusText}` };
    }
    return (await res.json()) as AiFigureUiResult;
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
