// src/stamps/geometry-2d/ai/providers/__tests__/index.test.ts
//
// Smoke test cho default provider của selectProvider().
// Tách riêng khỏi selectProvider.test.ts để tài liệu hoá rõ rule:
//   - env trống → claude-agent-sdk (default mới từ 0.27+)
//   - explicit ollama vẫn được phép (backward-compat dev/offline)

import { selectProvider } from '../index';

// Mock Anthropic SDK constructor (selectProvider.test.ts cũng mock — duplicate
// vô hại để file này standalone).
jest.mock('@anthropic-ai/sdk', () => ({
  __esModule: true,
  default: function Anthropic() {
    return { messages: { create: jest.fn() } };
  },
}));

describe('selectProvider defaults', () => {
  test('no env → claude-agent-sdk', () => {
    const p = selectProvider({ env: {} });
    expect(p.name).toBe('claude-agent-sdk');
  });

  test('explicit WHITEBOARD_AI_PROVIDER=ollama → ollama', () => {
    const p = selectProvider({ env: { WHITEBOARD_AI_PROVIDER: 'ollama' } });
    expect(p.name).toBe('ollama');
  });
});
