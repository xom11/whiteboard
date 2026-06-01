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
  extractRequirements,
  applyDeterministicCompletion,
  type ValidatorIssue,
  type ValidatorResult,
  type PointStub,
  type ShapeStub,
  type RequirementExtraction,
  type CompletionAction,
  type CompletionResult,
} from './validator';

// Intent pipeline (4-stage: extract→translate→render→verify).
export {
  IntentZ,
  IntentEnvelopeZ,
  type IntentT,
  type IntentEnvelopeT,
  type DrawShapeIntentT,
  type AddPointIntentT,
  type ConnectIntentT,
  type DrawCircleIntentT,
} from './intent';
export { intentEnvelopeJsonSchema, envelopeIntentList } from './intentEnvelope';
export { intentsToDsl, IntentBuilderError } from './intentToDsl';
export { buildIntentSystemPrompt } from './intentPrompt';
export {
  generateFigureIntent,
  type GenerateIntentOptions,
  type IntentGenerateResult,
  type IntentSuccessResult,
  type IntentFailureResult,
} from './buildFigureIntent';
export {
  compareIntents,
  verifyGeometry,
  type VerifyIssue,
  type VerifyReport,
} from './verify';
