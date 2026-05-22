import React from 'react';
import { createRoot } from 'react-dom/client';
import { Whiteboard } from '@xom11/whiteboard';
import './tailwind.css';

function App() {
  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <Whiteboard />
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
