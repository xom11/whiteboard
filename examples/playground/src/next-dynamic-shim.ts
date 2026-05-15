// Vite shim cho `next/dynamic` — chạy ExcalidrawWhiteboardView ngoài Next.js.
// Tương đương với behavior `dynamic(() => import(...), { ssr: false })`:
// resolve loader sync trong useEffect → render component.

import React, { type ComponentType } from 'react';

interface DynamicOptions {
  ssr?: boolean;
  loading?: () => React.ReactNode;
}

export default function dynamic<P = Record<string, unknown>>(
  loader: () => Promise<{ default: ComponentType<P> } | ComponentType<P>>,
  _opts?: DynamicOptions,
): ComponentType<P> {
  const LazyComponent = React.lazy(async () => {
    const mod = await loader();
    if (typeof mod === 'function') return { default: mod };
    return mod as { default: ComponentType<P> };
  });
  const Wrapped: ComponentType<P> = (props) =>
    React.createElement(
      React.Suspense,
      { fallback: null },
      React.createElement(LazyComponent, props as React.Attributes & P),
    );
  Wrapped.displayName = 'DynamicShim';
  return Wrapped;
}
