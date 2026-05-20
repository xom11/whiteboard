'use client';
import * as React from 'react';
import type { Store } from '../store';
import type { Action } from '../types';

export interface RecordedAction {
  action: Action;
  at: number;
}

export interface ActionRecorder {
  history: ReadonlyArray<RecordedAction>;
  isRecording: boolean;
  isReplaying: boolean;
  record: () => void;
  stop: () => void;
  clear: () => void;
  replay: (delayMs?: number) => Promise<void>;
}

export function useActionRecorder(store: Store): ActionRecorder {
  const [history, setHistory] = React.useState<RecordedAction[]>([]);
  const isRecordingRef = React.useRef<boolean>(true);
  const isReplayingRef = React.useRef<boolean>(false);
  const [isRecording, setIsRecording] = React.useState<boolean>(true);
  const [isReplaying, setIsReplaying] = React.useState<boolean>(false);

  React.useEffect(() => {
    const unsub = store.subscribe((_next, _prev, action) => {
      if (!isRecordingRef.current) return;
      if (isReplayingRef.current) return;
      setHistory((h) => [...h, { action, at: Date.now() }]);
    });
    return unsub;
  }, [store]);

  const record = React.useCallback(() => {
    isRecordingRef.current = true;
    setIsRecording(true);
  }, []);

  const stop = React.useCallback(() => {
    isRecordingRef.current = false;
    setIsRecording(false);
  }, []);

  const clear = React.useCallback(() => {
    setHistory([]);
  }, []);

  const replay = React.useCallback(async (delayMs = 0) => {
    if (history.length === 0) return;
    isReplayingRef.current = true;
    setIsReplaying(true);
    try {
      store.dispatch({ type: 'RESET' });
      for (const { action } of history) {
        if (delayMs > 0) await new Promise((r) => setTimeout(r, delayMs));
        store.dispatch(action);
      }
    } finally {
      isReplayingRef.current = false;
      setIsReplaying(false);
    }
  }, [history, store]);

  return { history, isRecording, isReplaying, record, stop, clear, replay };
}
