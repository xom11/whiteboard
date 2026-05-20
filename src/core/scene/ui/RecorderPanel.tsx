'use client';
import * as React from 'react';
import type { ActionRecorder } from './useActionRecorder';

export interface RecorderPanelProps {
  recorder: ActionRecorder;
  defaultOpen?: boolean;
}

export function RecorderPanel(props: RecorderPanelProps): React.ReactElement {
  const { recorder, defaultOpen = false } = props;
  const [open, setOpen] = React.useState(defaultOpen);

  return (
    <div className="fixed bottom-3 right-3 z-50 rounded-md border border-zinc-300 bg-white shadow-lg text-xs dark:border-zinc-700 dark:bg-zinc-900">
      <button
        type="button"
        aria-label="Toggle recorder"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 px-3 py-1.5 font-semibold"
      >
        <span>🎬 Recorder</span>
        <span
          data-testid="recorder-count"
          className="rounded bg-zinc-100 px-1.5 py-0.5 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
        >
          {recorder.history.length}
        </span>
      </button>
      {open ? (
        <div data-testid="recorder-body" className="border-t border-zinc-200 px-3 py-2 dark:border-zinc-800">
          <div className="mb-2 flex gap-1">
            {recorder.isRecording ? (
              <button
                type="button"
                aria-label="Stop recording"
                onClick={recorder.stop}
                className="rounded border border-zinc-300 px-2 py-1 dark:border-zinc-700"
              >
                ⏸ Stop
              </button>
            ) : (
              <button
                type="button"
                aria-label="Start recording"
                onClick={recorder.record}
                className="rounded border border-zinc-300 px-2 py-1 dark:border-zinc-700"
              >
                ⏺ Record
              </button>
            )}
            <button
              type="button"
              aria-label="Replay"
              disabled={recorder.isReplaying || recorder.history.length === 0}
              onClick={() => { void recorder.replay(100); }}
              className="rounded border border-zinc-300 px-2 py-1 disabled:opacity-50 dark:border-zinc-700"
            >
              ▶ Replay
            </button>
            <button
              type="button"
              aria-label="Clear history"
              onClick={recorder.clear}
              className="rounded border border-zinc-300 px-2 py-1 dark:border-zinc-700"
            >
              🗑
            </button>
          </div>
          <ul className="max-h-40 overflow-y-auto font-mono text-[10px]">
            {recorder.history.map((r, i) => (
              <li key={i} className="border-b border-zinc-100 py-0.5 dark:border-zinc-800">
                {r.action.type}
                {'payload' in r.action && (r.action as { payload: { id?: string } }).payload?.id
                  ? ` #${(r.action as { payload: { id?: string } }).payload.id}`
                  : ''}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
