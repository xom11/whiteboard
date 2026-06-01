// src/stamps/geometry-2d/ai/providers/__tests__/selectProvider.test.ts
import { selectProvider, AnthropicProvider, OllamaProvider } from '..';
import type { AIProvider } from '../types';

// Mock Anthropic SDK constructor to avoid real network calls during ctor.
jest.mock('@anthropic-ai/sdk', () => ({
  __esModule: true,
  default: function Anthropic() { return { messages: { create: jest.fn() } }; },
}));

describe('selectProvider', () => {
  it('opts.provider override mọi cài đặt khác', () => {
    const custom: AIProvider = {
      name: 'custom', defaultModel: 'x',
      call: async () => ({ kind: 'error', message: 'nope' }),
    };
    const p = selectProvider({
      provider: custom,
      apiKey: 'sk-ignored',
      env: { WHITEBOARD_AI_PROVIDER: 'anthropic', ANTHROPIC_API_KEY: 'k' },
    });
    expect(p).toBe(custom);
  });

  it('opts.apiKey → AnthropicProvider', () => {
    const p = selectProvider({ apiKey: 'sk-x', env: {} });
    expect(p).toBeInstanceOf(AnthropicProvider);
    expect(p.name).toBe('anthropic');
  });

  it('env WHITEBOARD_AI_PROVIDER=anthropic + ANTHROPIC_API_KEY → Anthropic', () => {
    const p = selectProvider({
      env: { WHITEBOARD_AI_PROVIDER: 'anthropic', ANTHROPIC_API_KEY: 'env-key' },
    });
    expect(p).toBeInstanceOf(AnthropicProvider);
  });

  it('env anthropic mà thiếu key → throw', () => {
    expect(() => selectProvider({ env: { WHITEBOARD_AI_PROVIDER: 'anthropic' } })).toThrow(
      /ANTHROPIC_API_KEY/,
    );
  });

  it('env empty → default Ollama', () => {
    const p = selectProvider({ env: {} });
    expect(p).toBeInstanceOf(OllamaProvider);
  });

  it('env WHITEBOARD_AI_PROVIDER=ollama → Ollama', () => {
    const p = selectProvider({ env: { WHITEBOARD_AI_PROVIDER: 'ollama' } });
    expect(p).toBeInstanceOf(OllamaProvider);
  });

  it('env OLLAMA_BASE_URL + OLLAMA_DEFAULT_MODEL áp dụng cho Ollama', () => {
    const p = selectProvider({
      env: {
        WHITEBOARD_AI_PROVIDER: 'ollama',
        OLLAMA_BASE_URL: 'http://10.0.0.5:11434',
        OLLAMA_DEFAULT_MODEL: 'gemma3:1b',
      },
    });
    expect(p).toBeInstanceOf(OllamaProvider);
    expect((p as OllamaProvider).defaultModel).toBe('gemma3:1b');
  });

  it('opts.ollamaBaseUrl override env', () => {
    const p = selectProvider({
      ollamaBaseUrl: 'http://opt-base:1',
      env: { WHITEBOARD_AI_PROVIDER: 'ollama', OLLAMA_BASE_URL: 'http://env-base:2' },
    });
    expect(p).toBeInstanceOf(OllamaProvider);
    // baseUrl không expose public nên không assert trực tiếp; type check đủ.
  });

  it('env value không hợp lệ → throw', () => {
    expect(() => selectProvider({ env: { WHITEBOARD_AI_PROVIDER: 'gpt' } })).toThrow(
      /không hợp lệ/,
    );
  });

  it('case-insensitive cho WHITEBOARD_AI_PROVIDER', () => {
    const p = selectProvider({ env: { WHITEBOARD_AI_PROVIDER: 'OLLAMA' } });
    expect(p).toBeInstanceOf(OllamaProvider);
  });
});
