'use client';

import { useCallback, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import nextDynamic from 'next/dynamic';
import { handleGenerateFigure } from '@xom11/whiteboard/ai';
import { geometryStateToJsonState, renderGeometrySvgFromState } from '@xom11/whiteboard/studio';

// Board chạm document lúc render → không prerender được.
const GeometryStudio = nextDynamic(
  () => import('@xom11/whiteboard/studio').then((m) => m.GeometryStudio),
  { ssr: false },
);

const HANDOFF_KEY = 'htbk:figure-handoff:v1';

type Phase =
  | { kind: 'idle' }
  | { kind: 'generating' }
  | { kind: 'figure'; jsonState: string; svg: string; partial?: string }
  | { kind: 'error'; message: string }
  | { kind: 'editing'; jsonState: string };

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** SVG → PNG qua canvas. Cố ý ở consumer: jsdom không có `canvas.toBlob`. */
async function svgToPngBlob(svg: string, scale = 2): Promise<Blob> {
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Không đọc được SVG'));
      img.src = url;
    });
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth * scale;
    canvas.height = img.naturalHeight * scale;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Không tạo được canvas 2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob trả null'))), 'image/png'),
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}

export default function VeHinhPage() {
  const router = useRouter();
  const [problem, setProblem] = useState('');
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' });
  // Giữ hình cuối để `onClose` của editor trả về đúng nhịp `figure` (kèm banner
  // partial). Vào editor từ nhánh `error` thì chưa có hình → trả về `idle`.
  const lastFigure = useRef<{ jsonState: string; svg: string; partial?: string } | null>(null);

  const generate = useCallback(async () => {
    if (!problem.trim()) return;
    setPhase({ kind: 'generating' });
    // Deterministic, chạy THẲNG trong browser — không /api/, không token.
    const result = await handleGenerateFigure({ problem });
    if (!result.ok) {
      setPhase({ kind: 'error', message: result.message });
      return;
    }
    const jsonState = geometryStateToJsonState(result.state);
    const svg = await renderGeometrySvgFromState(jsonState);
    const partial = result.partial?.message;
    lastFigure.current = { jsonState, svg, partial };
    setPhase({ kind: 'figure', jsonState, svg, partial });
  }, [problem]);

  const openInWhiteboard = useCallback(
    (jsonState: string) => {
      try {
        sessionStorage.setItem(HANDOFF_KEY, JSON.stringify({ jsonState, ts: Date.now() }));
      } catch {
        alert('Không lưu được (sessionStorage đầy). Hãy tải ảnh về thay thế.');
        return;
      }
      router.push('/');
    },
    [router],
  );

  if (phase.kind === 'editing') {
    return (
      <div style={{ width: '100vw', height: '100vh' }}>
        <GeometryStudio
          initialJsonState={phase.jsonState || undefined}
          onCommit={(_jsonState, svg) => {
            download(new Blob([svg], { type: 'image/svg+xml' }), 'hinh.svg');
          }}
          onClose={() =>
            setPhase(lastFigure.current ? { kind: 'figure', ...lastFigure.current } : { kind: 'idle' })
          }
        />
      </div>
    );
  }

  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: 24, fontFamily: 'system-ui' }}>
      <h1 style={{ fontSize: 28, marginBottom: 4 }}>Dán đề hình học, xem hình ngay</h1>
      <p style={{ color: '#666', marginTop: 0 }}>
        Chạy hoàn toàn trong trình duyệt. Không gửi đề đi đâu cả.
      </p>

      <textarea
        value={problem}
        onChange={(e) => setProblem(e.target.value)}
        rows={5}
        placeholder="Cho tam giác ABC nội tiếp đường tròn (O). Gọi M là trung điểm BC…"
        style={{ width: '100%', padding: 12, fontSize: 16, fontFamily: 'inherit' }}
      />

      <button
        onClick={generate}
        disabled={phase.kind === 'generating' || !problem.trim()}
        style={{ marginTop: 12, padding: '10px 20px', fontSize: 16, cursor: 'pointer' }}
      >
        {phase.kind === 'generating' ? 'Đang dựng…' : 'Dựng hình'}
      </button>

      {phase.kind === 'error' && (
        <div style={{ marginTop: 20, padding: 12, background: '#fee', borderRadius: 6 }}>
          <p style={{ margin: 0 }}>{phase.message}</p>
          <button onClick={() => setPhase({ kind: 'editing', jsonState: '' })} style={{ marginTop: 8 }}>
            Tự vẽ trong editor
          </button>
        </div>
      )}

      {phase.kind === 'figure' && (
        <div style={{ marginTop: 20 }}>
          {phase.partial && (
            <div style={{ padding: 12, background: '#fff6e0', borderRadius: 6, marginBottom: 12 }}>
              <strong>Chưa dựng hết đề:</strong>
              <pre style={{ whiteSpace: 'pre-wrap', margin: '6px 0 0', fontFamily: 'inherit' }}>
                {phase.partial}
              </pre>
            </div>
          )}

          <div
            style={{ border: '1px solid #ddd', borderRadius: 6, padding: 8, background: '#fff' }}
            dangerouslySetInnerHTML={{ __html: phase.svg }}
          />

          <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
            <button onClick={() => setPhase({ kind: 'editing', jsonState: phase.jsonState })}>
              {phase.partial ? 'Sửa hình (còn thiếu)' : 'Sửa hình'}
            </button>
            <button
              onClick={() => download(new Blob([phase.svg], { type: 'image/svg+xml' }), 'hinh.svg')}
            >
              Tải SVG
            </button>
            <button onClick={async () => download(await svgToPngBlob(phase.svg), 'hinh.png')}>
              Tải PNG
            </button>
            <button onClick={() => openInWhiteboard(phase.jsonState)}>Mở trong bảng trắng</button>
          </div>
        </div>
      )}
    </main>
  );
}
