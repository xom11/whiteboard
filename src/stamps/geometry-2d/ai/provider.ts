// src/stamps/geometry-2d/ai/provider.ts
import Anthropic from '@anthropic-ai/sdk';

export interface ProviderSystemBlock {
  type: 'text';
  text: string;
  cache_control?: { type: 'ephemeral' };
}

export interface ProviderToolDef {
  name: string;
  description: string;
  input_schema: unknown;
}

export interface ProviderCallArgs {
  apiKey: string;
  model: string;
  maxTokens: number;
  system: ProviderSystemBlock[];
  tools: ProviderToolDef[];
  toolChoice: { type: 'any' } | { type: 'tool'; name: string };
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  signal?: AbortSignal;
}

export interface ProviderUsage {
  input_tokens: number;
  output_tokens: number;
  cache_read_input_tokens?: number;
  cache_creation_input_tokens?: number;
}

export type ProviderContentBlock =
  | { type: 'text'; text: string }
  | { type: 'tool_use'; id: string; name: string; input: unknown };

export interface ProviderResponse {
  content: ProviderContentBlock[];
  stop_reason: string;
  usage: ProviderUsage;
}

export async function callProvider(args: ProviderCallArgs): Promise<ProviderResponse> {
  const client = new Anthropic({ apiKey: args.apiKey });
  const resp = await client.messages.create(
    {
      model: args.model,
      max_tokens: args.maxTokens,
      system: args.system,
      tools: args.tools as never,
      tool_choice: args.toolChoice,
      messages: args.messages,
    },
    args.signal ? { signal: args.signal } : undefined,
  );
  return resp as unknown as ProviderResponse;
}
