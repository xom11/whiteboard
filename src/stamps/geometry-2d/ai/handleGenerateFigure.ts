// Façade HTTP transport cho rule-engine intent pipeline (generateFigureIntent).
// Map IntentGenerateResult → AiFigureUiResult ({ ok, state }) — shape mà
// <Whiteboard generateGeometryFigure> + playground route dùng trực tiếp.
//
// 2026-06-09: repurpose từ path buildFigure (free-form DSL, đã xoá) sang intent
// pipeline DETERMINISTIC-ONLY. generateFigureIntent chạy rule engine
// (tryDeterministicFigure → 21 rule + 4 gate); miss → deterministic_miss (KHÔNG
// LLM). Façade chỉ cần map kết quả. Contract AiFigureUiResult GIỮ NGUYÊN →
// consumer (playground, hoctotbachkhoa) không phải đổi route.

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
   * Rule base deterministic → retry hiếm khi đổi kết quả, giữ để tương thích
   * contract cũ. Clamp [1,5].
   */
  maxAttempts?: number;
}

const DEFAULT_MAX_ATTEMPTS = 2;

/**
 * Gọi rule-engine intent pipeline và trả về `AiFigureUiResult` mà
 * `<Whiteboard generateGeometryFigure>` chấp nhận trực tiếp.
 *
 * Deterministic rule base chạy trong `generateFigureIntent` — đề dễ→trung bình
 * dựng KHÔNG tốn token. Miss → `deterministic_miss` (KHÔNG LLM fallback).
 *
 * Auto-retry: chỉ retry khi `transpile_error`/`builder_error`. KHÔNG retry
 * `deterministic_miss` (rule base ổn định, retry vô nghĩa).
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
    case 'builder_error':
    case 'transpile_error':
    case 'verify_error':
      return {
        ok: false,
        message:
          'Không dựng được hình (đã thử lại). Vui lòng tách thành 1 yêu cầu/lần hoặc diễn đạt khác.',
      };
    case 'deterministic_miss':
    default:
      // Rule base chưa phủ đề này: `message` đã là câu tiếng Việt dễ hiểu từ
      // describeDeterministicMiss (nêu rõ cần bổ sung rule / có thể lỗi rule +
      // phần đề chưa phủ) → trả thẳng cho UI/log, không bọc jargon.
      return { ok: false, message: result.message };
  }
}
