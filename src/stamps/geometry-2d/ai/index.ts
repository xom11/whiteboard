// src/stamps/geometry-2d/ai/index.ts

// Façade HTTP transport (Vite middleware, Next.js route, ...): chạy rule-engine
// intent pipeline (generateFigureIntent — deterministic rules-first → LLM
// fallback) + map sang AiFigureUiResult ({ ok, state }) sẵn sàng đẩy về client.
// Là entry chính cho UI sinh hình.
export { handleGenerateFigure } from './handleGenerateFigure';
export type {
  HandleGenerateFigureInput,
  HandleGenerateFigureOptions,
} from './handleGenerateFigure';

// Provider abstraction (types + OllamaProvider — LLM-specific providers removed).
export {
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

// Intent Façade — HTTP transport wrapper cho generateFigureIntent.
export {
  handleGenerateFigureIntent,
  type HandleGenerateFigureIntentInput,
  type HandleGenerateFigureIntentOptions,
  type AiFigureIntentUiResult,
} from './handleGenerateFigureIntent';

// Deterministic rule engine (rules-first NLU → IntentT[] + 4 gate). Live API
// dùng nội bộ qua generateFigureIntent; export trực tiếp cho eval/test.
export {
  tryDeterministicFigure,
  type DeterministicFigure,
  type TryDeterministicResult,
} from './deterministic/tryDeterministicFigure';
// Hybrid partial-coverage building blocks (Phase 1 — deterministic-only, chưa wire):
// tryPartialDeterministic thu phần đã phủ + clause thiếu; mergeIntents gộp det+llm.
export {
  tryPartialDeterministic,
  type PartialDeterministicResult,
} from './deterministic/runDeterministicIntents';
export { mergeIntents } from './mergeIntents';

