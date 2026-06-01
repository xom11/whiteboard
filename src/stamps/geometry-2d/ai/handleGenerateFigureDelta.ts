// src/stamps/geometry-2d/ai/handleGenerateFigureDelta.ts
//
// Façade cho generateFigureDelta. Mirror handleGenerateFigure.ts với:
//   - Input thêm currentDsl
//   - Map name_collision + unresolved_ref → friendly Vietnamese message
//   - Retry chỉ với transpile_error (như handleGenerateFigure)

import type { AiFigureUiResult } from '../../shared/types';
import type { DslInputT } from '../dsl';
import {
  generateFigureDelta,
  type GenerateDeltaOptions,
  type GenerateDeltaResult,
} from './buildFigureDelta';

export interface HandleGenerateFigureDeltaInput {
  problem: string;
  currentDsl: DslInputT;
}

export interface HandleGenerateFigureDeltaOptions extends GenerateDeltaOptions {
  onResult?: (result: GenerateDeltaResult, attempt: number) => void;
  maxAttempts?: number;
}

const DEFAULT_MAX_ATTEMPTS = 2;

export async function handleGenerateFigureDelta(
  input: HandleGenerateFigureDeltaInput,
  opts: HandleGenerateFigureDeltaOptions = {},
): Promise<AiFigureUiResult> {
  const { onResult, maxAttempts: rawMax, ...generateOpts } = opts;
  const maxAttempts = clampAttempts(rawMax ?? DEFAULT_MAX_ATTEMPTS);

  let lastResult: GenerateDeltaResult | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const result = await generateFigureDelta(input, generateOpts);
    lastResult = result;

    if (onResult) {
      try {
        onResult(result, attempt);
      } catch {
        // Không cho lỗi telemetry vỡ HTTP response.
      }
    }

    if (result.ok) {
      return { ok: true, state: result.state };
    }

    if (result.reason === 'transpile_error' && attempt < maxAttempts) {
      continue;
    }

    break;
  }

  return mapErrorToUi(lastResult!);
}

function clampAttempts(n: number): number {
  if (!Number.isFinite(n)) return DEFAULT_MAX_ATTEMPTS;
  return Math.max(1, Math.min(5, Math.floor(n)));
}

function mapErrorToUi(result: GenerateDeltaResult): AiFigureUiResult {
  if (result.ok) return { ok: true, state: result.state };

  switch (result.reason) {
    case 'refused':
      return { ok: false, message: result.message };
    case 'parse_error':
      return {
        ok: false,
        message: 'AI trả về dữ liệu không hợp lệ. Vui lòng thử lại hoặc diễn đạt lại.',
      };
    case 'transpile_error':
      return {
        ok: false,
        message:
          'AI tạo hình không hợp lệ (đã thử lại). Vui lòng tách thành 1 yêu cầu/lần hoặc diễn đạt khác.',
      };
    case 'name_collision':
      return {
        ok: false,
        message: `AI tạo điểm trùng tên với hình hiện tại (${result.collisions.join(', ')}). Vui lòng diễn đạt lại.`,
      };
    case 'unresolved_ref':
      return {
        ok: false,
        message: `AI tham chiếu sai tên đối tượng (${result.refs.join(', ')}). Vui lòng diễn đạt lại.`,
      };
    case 'api_error':
    default:
      return { ok: false, message: result.message };
  }
}
