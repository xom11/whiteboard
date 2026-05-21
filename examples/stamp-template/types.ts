// examples/stamp-template/types.ts
// TODO: Đổi 'color-swatch' thành kind unique của bạn (vd 'sticky-note').
import type { BaseStampCustomData } from '../../src/stamps/shared/types';

export interface ColorSwatchCustomData extends BaseStampCustomData {
  kind: 'color-swatch';
  version: 1;
  /** Màu fill — hex code (vd '#cccccc'). */
  color: string;
}

export function isColorSwatchCustomData(data: unknown): data is ColorSwatchCustomData {
  if (!data || typeof data !== 'object') return false;
  const d = data as Partial<ColorSwatchCustomData>;
  return d.kind === 'color-swatch' && d.version === 1 && typeof d.color === 'string';
}
