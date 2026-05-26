const isDev = (() => {
  try {
    return typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production';
  } catch {
    return false;
  }
})();

/**
 * Wrap JSXGraph operations that can throw on stale/missing state.
 * In dev mode: log to console. In prod: silent swallow + return fallback.
 *
 * @param label    Short tag for grep-ability (vd "removeObject", "board.update").
 * @param fn       Operation to execute.
 * @param fallback Value to return if fn throws (default: undefined).
 */
export function safeJsx<T>(label: string, fn: () => T): T | undefined;
export function safeJsx<T>(label: string, fn: () => T, fallback: T): T;
export function safeJsx<T>(label: string, fn: () => T, fallback?: T): T | undefined {
  try {
    return fn();
  } catch (err) {
    if (isDev) {
       
      console.warn('[whiteboard:jsxgraph]', label, err);
    }
    return fallback;
  }
}
