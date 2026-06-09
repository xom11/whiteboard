// src/stamps/geometry-2d/ai/deterministic/describeMiss.ts
//
// Dịch lý do deterministic miss (mã kỹ thuật) → câu tiếng Việt dễ hiểu cho
// chế độ deterministicOnly ("dùng tạm rule base, tắt LLM"). Phân 2 nhóm để người
// tối ưu rule base phân biệt ngay:
//   - "chưa phủ" (no-match / incomplete-coverage / named-missing) → CẦN THÊM RULE.
//   - "rule khớp nhưng dựng lỗi" (build/transpile/verify/intent-dropped) → có thể LỖI RULE.
// Hàm thuần, không I/O — message này được gán vào IntentFailureResult.message và
// nổi lên AiFigureUiResult để consumer (hoctotbachkhoa) hiển thị / ghi log.
import type { DeterministicReason } from './tryDeterministicFigure';
import type { CoverageReport } from './coverage';

export interface DeterministicMiss {
  reason: DeterministicReason;
  /** Chi tiết kỹ thuật theo reason (tên thiếu, mã lỗi transpile, …). */
  detail?: string;
  /** Báo cáo coverage — dùng `uncovered[].text` để nêu cụm đề chưa phủ. */
  coverage?: CoverageReport;
}

/** ", " sau detail nếu có (else chuỗi rỗng) — tránh "(undefined)". */
function detailSuffix(detail?: string): string {
  const d = detail?.trim();
  return d ? `: ${d}` : '';
}

/** "D,E" → "D, E" (thêm khoảng trắng sau phẩy cho dễ đọc). */
function formatNames(detail?: string): string {
  const names = (detail ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return names.length > 0 ? names.join(', ') : 'một số đối tượng';
}

export function describeDeterministicMiss(miss: DeterministicMiss): string {
  const { reason, detail, coverage } = miss;
  switch (reason) {
    // === Nhóm "chưa phủ" → cần bổ sung rule ===
    case 'no-match':
      return 'Rule base chưa nhận ra cấu trúc hình học nào trong đề (cần bổ sung rule cho dạng này).';
    case 'incomplete-coverage': {
      const parts = (coverage?.uncovered ?? []).map((c) => `«${c.text}»`);
      if (parts.length === 0) {
        return 'Rule base mới phủ được một phần đề (cần bổ sung rule cho phần còn lại).';
      }
      return `Rule base mới phủ được một phần đề. Chưa dựng được: ${parts.join('; ')} (cần bổ sung rule).`;
    }
    case 'named-missing':
      return `Đề nhắc tới ${formatNames(detail)} nhưng rule base chưa dựng được (cần bổ sung rule).`;

    // === Nhóm "rule khớp nhưng dựng lỗi" → có thể lỗi rule ===
    case 'build-throw':
      return `Rule đã khớp nhưng dựng hình thất bại — có thể lỗi rule${detailSuffix(detail)}.`;
    case 'transpile-throw':
    case 'transpile-fail':
      return `Rule đã khớp nhưng biên dịch hình lỗi — có thể lỗi rule${detailSuffix(detail)}.`;
    case 'verify-fail':
      return 'Rule dựng được hình nhưng sai kiểm tra hình học — có thể lỗi rule.';
    case 'intent-dropped':
      return `Rule khớp nhưng một số điểm phái sinh bị bỏ (${formatNames(detail)}) — có thể lỗi rule.`;

    default: {
      // Exhaustive guard: thêm reason mới mà quên xử lý → type error tại compile.
      const _never: never = reason;
      return `Rule base chưa dựng được (${String(_never)}).`;
    }
  }
}
