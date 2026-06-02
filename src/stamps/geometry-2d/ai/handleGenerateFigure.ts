// Façade trên `generateFigure()` cho HTTP transport (Vite middleware,
// Next.js route, Cloudflare Worker, ...). Gói luôn mapping
// `GenerateResult` → `AiFigureUiResult` (shape client-safe) để mọi consumer
// không phải lặp lại logic.

import type { AiFigureUiResult } from '../../shared/types';
import { generateFigure, type GenerateOptions, type GenerateResult } from './buildFigure';

export interface HandleGenerateFigureInput {
  /** Đề bài tiếng Việt từ teacher. */
  problem: string;
}

export interface HandleGenerateFigureOptions extends GenerateOptions {
  /**
   * Optional telemetry hook. Gọi cho MỖI attempt với envelope nội bộ trước
   * khi map sang AiFigureUiResult — consumer dùng để log usage/cost/error.
   * Không throw từ logger — sẽ swallow để không vỡ response.
   *
   * @param result GenerateResult của attempt
   * @param attempt 1-indexed (1 = lần đầu, 2 = retry, ...)
   */
  onResult?: (result: GenerateResult, attempt: number) => void;
  /**
   * Số attempt tối đa khi nhận `transpile_error`. Default 2 (1 retry).
   * AI stochastic → lần 2 thường khá hơn. Min 1, max 5.
   */
  maxAttempts?: number;
}

const DEFAULT_MAX_ATTEMPTS = 2;

/**
 * Gọi AI orchestrator và trả về kết quả ở dạng `AiFigureUiResult` mà
 * `<Whiteboard generateGeometryFigure>` chấp nhận trực tiếp.
 *
 * Auto-retry: chỉ retry khi `transpile_error` (DSL không hợp lệ — model
 * stochastic có cơ hội emit khá hơn lần 2). KHÔNG retry `refused` (AI cố ý
 * từ chối), `parse_error` (envelope sai schema — chắc chắn sai mọi lần),
 * hay `api_error` (network / config — không liên quan model).
 *
 * Mapping:
 *   - ok=true             → { ok: true, state }
 *   - refused             → { ok: false, message: <message AI gửi> }
 *   - parse_error         → { ok: false, message: 'AI trả JSON không hợp lệ…' }
 *   - transpile_error     → { ok: false, message: 'AI tạo hình không hợp lệ…' }
 *   - api_error           → { ok: false, message: <message gốc> }
 *
 * Server-side caller giữ `GenerateResult` đầy đủ qua `onResult` callback cho
 * mục đích telemetry/logging.
 *
 * @deprecated Use `handleGenerateFigureIntent` instead.
 * DSL free-form pipeline sẽ remove ở 0.26.0.
 */
export async function handleGenerateFigure(
  input: HandleGenerateFigureInput,
  opts: HandleGenerateFigureOptions = {},
): Promise<AiFigureUiResult> {
  console.warn(
    '[whiteboard/ai] handleGenerateFigure (DSL free-form) is deprecated. ' +
    'Migrate to handleGenerateFigureIntent. Path will be removed in 0.26.0.',
  );
  const { onResult, maxAttempts: rawMax, ...generateOpts } = opts;
  const maxAttempts = clampAttempts(rawMax ?? DEFAULT_MAX_ATTEMPTS);

  let lastResult: GenerateResult | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const result = await generateFigure(input.problem, generateOpts);
    lastResult = result;

    if (onResult) {
      try {
        onResult(result, attempt);
      } catch {
        // Không cho lỗi telemetry vỡ HTTP response.
      }
    }

    // Thành công → return ngay
    if (result.ok) {
      return { ok: true, state: result.state };
    }

    // Retry chỉ với transpile_error
    if (result.reason === 'transpile_error' && attempt < maxAttempts) {
      continue;
    }

    // Không retry-able hoặc đã hết attempt
    break;
  }

  // lastResult chắc chắn không null sau loop
  return mapErrorToUi(lastResult!);
}

function clampAttempts(n: number): number {
  if (!Number.isFinite(n)) return DEFAULT_MAX_ATTEMPTS;
  return Math.max(1, Math.min(5, Math.floor(n)));
}

function mapErrorToUi(result: GenerateResult): AiFigureUiResult {
  if (result.ok) return { ok: true, state: result.state };

  switch (result.reason) {
    case 'refused':
      return { ok: false, message: result.message };
    case 'parse_error':
      return {
        ok: false,
        message: 'AI trả về dữ liệu không hợp lệ. Vui lòng thử lại hoặc diễn đạt lại đề bài.',
      };
    case 'transpile_error':
      return {
        ok: false,
        message:
          'AI tạo hình không hợp lệ (đã thử lại). Vui lòng tách thành 1 yêu cầu/lần hoặc diễn đạt khác.',
      };
    case 'api_error':
    default:
      return { ok: false, message: result.message };
  }
}
