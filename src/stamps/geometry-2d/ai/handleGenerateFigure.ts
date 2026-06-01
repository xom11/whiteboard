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
   * Optional telemetry hook. Gọi với envelope nội bộ trước khi map sang
   * AiFigureUiResult — consumer dùng để log usage/cost/error.
   * Không throw từ logger — sẽ swallow để không vỡ response.
   */
  onResult?: (result: GenerateResult) => void;
}

/**
 * Gọi AI orchestrator và trả về kết quả ở dạng `AiFigureUiResult` mà
 * `<Whiteboard generateGeometryFigure>` chấp nhận trực tiếp.
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
 */
export async function handleGenerateFigure(
  input: HandleGenerateFigureInput,
  opts: HandleGenerateFigureOptions = {},
): Promise<AiFigureUiResult> {
  const { onResult, ...generateOpts } = opts;
  const result = await generateFigure(input.problem, generateOpts);

  if (onResult) {
    try {
      onResult(result);
    } catch {
      // Không cho lỗi telemetry vỡ HTTP response.
    }
  }

  if (result.ok) {
    return { ok: true, state: result.state };
  }

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
        message: 'AI tạo hình không hợp lệ. Vui lòng diễn đạt rõ hơn hoặc thử mô tả khác.',
      };
    case 'api_error':
    default:
      return { ok: false, message: result.message };
  }
}
