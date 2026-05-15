// Shim for `next/dynamic` when running outside Next.js (Vite demo).
// Next's `dynamic(loader, opts)` returns a component; opts.ssr is irrelevant in
// a CSR-only Vite preview. Use React.lazy + Suspense with the loading fallback.

import { lazy, Suspense, createElement, type ComponentType, type ReactNode } from 'react';

interface DynamicOptions {
  ssr?: boolean;
  loading?: () => ReactNode;
}

export default function dynamic<TProps>(
  loader: () => Promise<ComponentType<TProps>>,
  options: DynamicOptions = {},
): ComponentType<TProps> {
  const Lazy = lazy(async () => {
    const result = await loader();
    // `loader` may return a component directly, or a default-style object.
    // We standardise to { default: Component } for React.lazy.
    const Component = result as unknown as ComponentType<TProps>;
    return { default: Component };
  });

  const fallback = options.loading?.() ?? null;

  return function DynamicShim(props: TProps) {
    return createElement(
      Suspense,
      { fallback },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      createElement(Lazy as any, props as any),
    );
  };
}
