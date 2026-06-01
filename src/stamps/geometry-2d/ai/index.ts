// src/stamps/geometry-2d/ai/index.ts
export { generateFigure } from './buildFigure';
export type {
  GenerateOptions,
  GenerateResult,
  TokenUsage,
} from './buildFigure';

// Façade cho HTTP transport (Vite middleware, Next.js route, ...): gọi
// generateFigure() + map sang AiFigureUiResult sẵn sàng đẩy về client.
export { handleGenerateFigure } from './handleGenerateFigure';
export type {
  HandleGenerateFigureInput,
  HandleGenerateFigureOptions,
} from './handleGenerateFigure';

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

// Refine (multi-step) API
export {
  handleGenerateFigureDelta,
  type HandleGenerateFigureDeltaInput,
  type HandleGenerateFigureDeltaOptions,
} from './handleGenerateFigureDelta';
export {
  generateFigureDelta,
  type GenerateDeltaOptions,
  type GenerateDeltaResult,
  type GenerateFigureDeltaInput,
} from './buildFigureDelta';
export {
  FigureRefineEnvelopeZ,
  refineEnvelopeJsonSchema,
  type FigureRefineEnvelopeT,
} from './refineEnvelope';

// Keyword→kind validator (model-agnostic safety net).
export {
  validateKindCoverage,
  buildRetryHint,
  type ValidatorIssue,
  type ValidatorResult,
} from './validator';
