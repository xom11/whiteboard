// src/stamps/geometry-2d/ai/index.ts
export { generateFigure } from './buildFigure';
export type {
  GenerateOptions,
  GenerateResult,
  TokenUsage,
} from './buildFigure';

// Provider abstraction.
export {
  AnthropicProvider,
  OllamaProvider,
  selectProvider,
} from './providers';
export type {
  AIProvider,
  ProviderOutput,
  ProviderRequest,
  ProviderTokenUsage,
  SelectProviderOptions,
} from './providers';

// Envelope (advanced consumers muốn skip generateFigure orchestrator).
export {
  FigureEnvelopeZ,
  envelopeJsonSchema,
  envelopeBuildDsl,
} from './envelope';
export type { FigureEnvelopeT } from './envelope';
