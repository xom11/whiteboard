// Façade HTTP transport cho rule-engine intent pipeline (generateFigureIntent).
// Map IntentGenerateResult → AiFigureUiResult ({ ok, state }) — shape mà
// <Whiteboard generateGeometryFigure> + playground route dùng trực tiếp.
//
// 2026-06-09: repurpose từ path buildFigure (free-form DSL, đã xoá) sang intent
// pipeline. generateFigureIntent TỰ làm deterministic rules-first
// (tryDeterministicFigure → 21 rule + 4 gate) rồi mới LLM fallback, nên façade
// chỉ cần map kết quả. Contract AiFigureUiResult GIỮ NGUYÊN → consumer
// (playground, hoctotbachkhoa) không phải đổi route, tự hưởng rule engine khi upgrade.

import type { AiFigureUiResult } from '../../shared/types';
import {
  generateFigureIntent,
  type GenerateIntentOptions,
  type IntentGenerateResult,
} from './buildFigureIntent';

export interface HandleGenerateFigureInput {
  /** Đề bài tiếng Việt từ teacher. */
  problem: string;
}

export interface HandleGenerateFigureOptions extends GenerateIntentOptions {
  /**
   * Telemetry hook: gọi cho MỖI attempt với IntentGenerateResult nội bộ trước
   * khi map sang AiFigureUiResult — consumer dùng để log usage/cost/error.
   * Không throw từ logger (swallow để không vỡ response).
   *
   * @param result IntentGenerateResult của attempt
   * @param attempt 1-indexed (1 = lần đầu, 2 = retry, ...)
   */
  onResult?: (result: IntentGenerateResult, attempt: number) => void;
  /**
   * Số attempt tối đa khi build error (transpile/builder). Default 2 (1 retry).
   * LLM stochastic → lần 2 thường khá hơn. Clamp [1,5].
   */
  maxAttempts?: number;
}

const DEFAULT_MAX_ATTEMPTS = 2;

/**
 * Gọi rule-engine intent pipeline và trả về `AiFigureUiResult` mà
 * `<Whiteboard generateGeometryFigure>` chấp nhận trực tiếp.
 *
 * Track A (deterministic rules) chạy trong `generateFigureIntent` — đề dễ→trung
 * bình dựng KHÔNG tốn token. Miss → Track B (LLM intent).
 *
 * Auto-retry: chỉ retry khi `transpile_error`/`builder_error` (AI emit hình
 * structurally sai — model stochastic có cơ hội khá hơn lần 2). KHÔNG retry
 * `refused` (cố ý), `parse_error` (sai schema), `provider_error` (network/config).
 *
 * Server-side caller giữ `IntentGenerateResult` đầy đủ qua `onResult` cho
 * telemetry/logging.
 */
export async function handleGenerateFigure(
  input: HandleGenerateFigureInput,
  opts: HandleGenerateFigureOptions = {},
): Promise<AiFigureUiResult> {
  if (!input.problem.trim()) {
    return { ok: false, message: 'Đề bài rỗng' };
  }

  const { onResult, maxAttempts: rawMax, ...genOpts } = opts;
  const maxAttempts = clampAttempts(rawMax ?? DEFAULT_MAX_ATTEMPTS);

  let last: IntentGenerateResult | null = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const r = await generateFigureIntent(input.problem, genOpts);
    last = r;
    if (onResult) {
      try { onResult(r, attempt); } catch { /* swallow telemetry errors */ }
    }
    if (r.ok) return { ok: true, state: r.transpile.state };
    if ((r.reason === 'transpile_error' || r.reason === 'builder_error') && attempt < maxAttempts) {
      continue;
    }
    break;
  }
  return mapErrorToUi(last!);
}

function clampAttempts(n: number): number {
  if (!Number.isFinite(n)) return DEFAULT_MAX_ATTEMPTS;
  return Math.max(1, Math.min(5, Math.floor(n)));
}

function mapErrorToUi(result: IntentGenerateResult): AiFigureUiResult {
  if (result.ok) return { ok: true, state: result.transpile.state };

  switch (result.reason) {
    case 'refused':
      return { ok: false, message: result.message };
    case 'parse_error':
      return {
        ok: false,
        message: 'AI trả về dữ liệu không hợp lệ. Vui lòng thử lại hoặc diễn đạt lại đề bài.',
      };
    case 'builder_error':
    case 'transpile_error':
    case 'verify_error':
      return {
        ok: false,
        message:
          'AI tạo hình không hợp lệ (đã thử lại). Vui lòng tách thành 1 yêu cầu/lần hoặc diễn đạt khác.',
      };
    case 'deterministic_miss':
      // Chế độ chỉ-deterministic (đang tối ưu rule base, đã tắt LLM fallback):
      // rule base chưa phủ đề này → báo "không vẽ được" + lý do để debug rule.
      return {
        ok: false,
        message: `Không vẽ được (rule base chưa phủ đề này — LLM fallback đang tắt). ${result.message}`,
      };
    case 'provider_error':
    default:
      return { ok: false, message: result.message };
  }
}
