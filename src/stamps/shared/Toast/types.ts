export type ToastVariant = 'info' | 'warning' | 'error';

export interface ToastOptions {
  /** Color/icon family. Default: 'info'. */
  variant?: ToastVariant;
  /** Auto-dismiss delay in ms. Default: 3000. Pass 0 to make sticky. */
  duration?: number;
  /**
   * Stable id for dedup. If a visible toast already has this id, its message
   * is replaced and timer reset — no duplicate is pushed.
   */
  id?: string;
}

export type ShowToastFn = (message: string, opts?: ToastOptions) => void;
export type DismissToastFn = (id: string) => void;

export interface ToastItem {
  id: string;
  message: string;
  variant: ToastVariant;
  duration: number;
}
