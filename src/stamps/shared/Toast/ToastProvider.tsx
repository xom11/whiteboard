import React, {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from 'react';
import type { ShowToastFn, DismissToastFn, ToastItem, ToastOptions } from './types';

export interface ToastContextValue {
  items: ToastItem[];
  showToast: ShowToastFn;
  dismiss: DismissToastFn;
}

export const ToastContext = createContext<ToastContextValue | null>(null);

type Action =
  | { type: 'PUSH'; item: ToastItem; maxVisible: number }
  | { type: 'REPLACE'; item: ToastItem }
  | { type: 'DISMISS'; id: string };

function reducer(state: ToastItem[], action: Action): ToastItem[] {
  switch (action.type) {
    case 'PUSH': {
      const next = [...state, action.item];
      return next.length > action.maxVisible ? next.slice(next.length - action.maxVisible) : next;
    }
    case 'REPLACE':
      return state.map((it) => (it.id === action.item.id ? action.item : it));
    case 'DISMISS':
      return state.filter((it) => it.id !== action.id);
  }
}

interface ToastProviderProps {
  children: React.ReactNode;
  /** Max simultaneously visible toasts. Default: 3. Pushing more drops oldest. */
  maxVisible?: number;
}

let autoIdCounter = 0;

export function ToastProvider({ children, maxVisible = 3 }: ToastProviderProps) {
  const [items, dispatch] = useReducer(reducer, [] as ToastItem[]);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const itemsRef = useRef(items);
  itemsRef.current = items;

  const clearTimer = useCallback((id: string) => {
    const t = timersRef.current.get(id);
    if (t) {
      clearTimeout(t);
      timersRef.current.delete(id);
    }
  }, []);

  const dismiss = useCallback<DismissToastFn>((id) => {
    clearTimer(id);
    dispatch({ type: 'DISMISS', id });
  }, [clearTimer]);

  const scheduleAutoDismiss = useCallback((id: string, duration: number) => {
    if (duration <= 0) return;
    const t = setTimeout(() => dismiss(id), duration);
    timersRef.current.set(id, t);
  }, [dismiss]);

  const showToast = useCallback<ShowToastFn>((message, opts: ToastOptions = {}) => {
    const variant = opts.variant ?? 'info';
    const duration = opts.duration ?? 3000;
    const id = opts.id ?? `toast-${++autoIdCounter}`;
    const item: ToastItem = { id, message, variant, duration };
    const existing = itemsRef.current.find((it) => it.id === id);
    if (existing) {
      clearTimer(id);
      dispatch({ type: 'REPLACE', item });
    } else {
      dispatch({ type: 'PUSH', item, maxVisible });
    }
    scheduleAutoDismiss(id, duration);
  }, [clearTimer, maxVisible, scheduleAutoDismiss]);

  useEffect(() => () => {
    timersRef.current.forEach((t) => clearTimeout(t));
    timersRef.current.clear();
  }, []);

  const value = useMemo(() => ({ items, showToast, dismiss }), [items, showToast, dismiss]);
  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
}
