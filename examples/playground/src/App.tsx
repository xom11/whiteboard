import React, { useCallback, useState } from 'react';
import { JSXGraphMiniBoard, TOOLS, GROUP_LABELS, type MiniBoardHandle, type GeomTool } from '../../../src/stamp/JSXGraphMiniBoard';

declare global {
  interface Window {
    __board?: MiniBoardHandle;
    __JXG?: unknown;
  }
}

export const App: React.FC = () => {
  const [tool, setTool] = useState<GeomTool>('move');
  const [logCount, setLogCount] = useState(0);

  const onReady = useCallback((handle: MiniBoardHandle) => {
    window.__board = handle;
    // expose JXG too for test scripts
    // @ts-expect-error window probe
    window.__JXG = (window as { JXG?: unknown }).JXG;
    handle.subscribe(() => {
      setTool(handle.getTool());
      setLogCount(handle.getCreationLog().length);
    });
    setTool(handle.getTool());
  }, []);

  const pickTool = (t: GeomTool) => {
    setTool(t);
    window.__board?.setTool(t);
  };

  const groups = Array.from(new Set(TOOLS.map(t => t.group)));

  return (
    <div>
      <div className="toolbar" data-testid="toolbar">
        {groups.map((g) => (
          <React.Fragment key={g}>
            <span className="group">{GROUP_LABELS[g]}:</span>
            {TOOLS.filter(t => t.group === g).map(t => (
              <button
                key={t.key}
                data-testid={`tool-${t.key}`}
                title={t.hint}
                className={tool === t.key ? 'active' : ''}
                onClick={() => pickTool(t.key)}
              >
                {t.label}
              </button>
            ))}
          </React.Fragment>
        ))}
        <span style={{ marginLeft: 'auto', fontSize: 11, color: '#64748b' }}>
          tool: <code data-testid="active-tool">{tool}</code> · log: <code data-testid="log-count">{logCount}</code>
        </span>
      </div>
      <div className="board-wrap">
        <div className="board-host" data-testid="board-host">
          <JSXGraphMiniBoard onReady={onReady} initialState={null} />
        </div>
        <div className="info">
          <h3 style={{ margin: '0 0 8px 0', fontSize: 14 }}>Test helpers</h3>
          <p style={{ margin: '4px 0' }}>
            Active tool: <code>{tool}</code>
            <br/>Creation log entries: <code>{logCount}</code>
          </p>
          <p style={{ margin: '4px 0', color: '#64748b' }}>
            <strong>Window globals:</strong>
            <br/><code>window.__board</code> = MiniBoardHandle
            <br/><code>JXG.JSXGraph.boards</code> = boards by id
          </p>
          <p style={{ margin: '4px 0' }}>
            <button onClick={() => { window.__board?.setTool('move'); }}>Reset to Move</button>
            {' '}
            <button onClick={() => location.reload()}>Reload page</button>
          </p>
        </div>
      </div>
    </div>
  );
};
