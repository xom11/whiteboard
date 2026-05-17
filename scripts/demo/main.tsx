import React, { StrictMode } from 'react';
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
createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
