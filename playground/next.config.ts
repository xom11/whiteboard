import path from 'node:path';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: false,
  // Playground là harness test trực quan, không phải cổng type-safety. Typecheck thật
  // của thư viện nằm ở `npm run typecheck` repo gốc.
  typescript: { ignoreBuildErrors: true },
  // AI SDK server-only: giữ external (require runtime từ node_modules) thay vì bundle
  // → API route server dùng SDK thật ổn định, không lỗi bundle node SDK.
  serverExternalPackages: ['@anthropic-ai/claude-agent-sdk', '@anthropic-ai/sdk'],
  turbopack: {
    root: path.resolve(__dirname, '..'),
  },
  // Whiteboard src/ kéo theo provider AI server-only (@anthropic-ai/claude-agent-sdk,
  // @anthropic-ai/sdk) dùng node built-ins → không bundle được cho client. Playground
  // không có backend nên bỏ nguyên 2 SDK + stub node built-ins về false. Build bằng
  // webpack (next build --webpack) vì turbopack không stub được các module này.
  webpack: (config, { webpack, isServer }) => {
    // API route (server bundle) CẦN AI SDK thật → chỉ stub cho CLIENT bundle.
    if (isServer) return config;
    config.plugins.push(
      new webpack.NormalModuleReplacementPlugin(/^node:/, (resource: { request: string }) => {
        resource.request = resource.request.replace(/^node:/, '');
      }),
    );
    config.resolve = config.resolve ?? {};
    config.resolve.alias = {
      ...config.resolve.alias,
      '@anthropic-ai/claude-agent-sdk': false,
      '@anthropic-ai/sdk': false,
    };
    config.resolve.fallback = {
      ...config.resolve.fallback,
      async_hooks: false,
      child_process: false,
      module: false,
      fs: false,
      net: false,
      tls: false,
      os: false,
      path: false,
      crypto: false,
      stream: false,
      util: false,
      events: false,
      url: false,
      http: false,
      https: false,
      zlib: false,
    };
    return config;
  },
};

export default nextConfig;
