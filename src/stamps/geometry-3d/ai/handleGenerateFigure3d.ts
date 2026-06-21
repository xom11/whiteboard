import type { State } from '../../../core/scene';
import { generateFigureIntent3d } from './buildFigureIntent3d';

export interface AiFigure3DResult {
  ok: boolean;
  state?: State;
  message?: string;
}

const MSG: Record<string, string> = {
  'no-match': 'Chưa nhận dạng được hình học 3D trong đề.',
  'incomplete-coverage': 'Một số chi tiết trong đề chưa dựng được tự động.',
  'build-throw': 'Không dựng được hình từ các quan hệ trong đề.',
  'verify-fail': 'Hình dựng ra chưa hợp lệ về mặt hình học.',
  'named-missing': 'Thiếu một số điểm được nêu tên trong đề.',
};

export function handleGenerateFigure3d(input: { problem: string }): AiFigure3DResult {
  const r = generateFigureIntent3d(input.problem);
  if (r.ok) return { ok: true, state: r.state };
  const message = MSG[r.reason] ?? `Không dựng được hình (${r.reason}).`;
  return { ok: false, message };
}
