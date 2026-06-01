// src/stamps/geometry-2d/ai/providers/types.ts
//
// Provider abstraction: 1 interface AIProvider, mọi LLM impl (Anthropic Claude,
// Ollama local Gemma, OpenAI/OpenRouter sau này) đều mạp về cùng output shape
// `ProviderOutput`.
//
// Orchestrator (buildFigure.ts) gọi provider.call() → nhận envelope JSON →
// validate + transpile DSL.

export interface ProviderTokenUsage {
  inputTokens: number;
  outputTokens: number;
  /** Anthropic prompt caching — local provider để 0. */
  cacheReadTokens?: number;
  /** Anthropic prompt caching — local provider để 0. */
  cacheCreationTokens?: number;
}

export interface ProviderRequest {
  systemPrompt: string;
  userPrompt: string;
  /**
   * JSON Schema mà provider phải honor để constrain output. Anthropic → wrap
   * thành tool input_schema. Ollama → pass thẳng vào `format` (v0.5+).
   */
  schema: Record<string, unknown>;
  /** Provider-specific model id (vd "gemma3:4b", "claude-opus-4-7"). */
  model: string;
  /** Token cap cho response. */
  maxTokens: number;
  signal?: AbortSignal;
}

export type ProviderOutput =
  | { kind: 'json'; data: unknown; usage?: ProviderTokenUsage }
  | { kind: 'error'; message: string; status?: number };

export interface AIProvider {
  /** Tên định danh ("anthropic", "ollama", ...). */
  readonly name: string;
  /** Default model id khi caller không truyền. */
  readonly defaultModel: string;
  call(req: ProviderRequest): Promise<ProviderOutput>;
}
