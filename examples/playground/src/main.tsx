import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { ExcalidrawDemo } from './ExcalidrawDemo';

function Router() {
  const [route, setRoute] = useState<string>(() => (typeof location !== 'undefined' ? location.hash : ''));
  useEffect(() => {
    const onHash = () => setRoute(location.hash);
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  if (route.startsWith('#excalidraw')) return <ExcalidrawDemo />;
  return <App />;
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Router />
  </React.StrictMode>,
);
